/* ==========================================================
   Filtre du chat (et des pseudos)
   La liste des mots est dans _data/filtre-chat.json
   → Pages CMS « Filtre du chat ». Le serveur se remet à jour tout seul.
   Dans la liste :
     - « mot »       bloque exactement ce mot (« con » ne touche pas « content »)
     - « mot* »      bloque tous les mots qui commencent par ça (« salop* » → salope, salopard…)
     - « deux mots » bloque l'expression
   Le filtre voit aussi : les accents (é = e), les chiffres à la place des lettres
   (c0nn4rd), les lettres étirées (connnnard) et les lettres espacées (c o n n a r d).
   ========================================================== */
import REGLAGES from '../_data/filtre-chat.json' with { type: 'json' };

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '€': 'e', '!': 'i' };

// texte → forme « simplifiée » : minuscules, sans accents, chiffres → lettres
export function simplifier(texte) {
  return String(texte || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$€!]/g, c => LEET[c] || c)
    .replace(/[^a-z\s']/g, '');
}
const sansDoubles = t => t.replace(/(.)\1+/g, '$1');
const etire = t => /(.)\1\1/.test(t);   // une lettre répétée 3 fois ou plus : « connnnard »

// la liste, préparée une fois pour toutes
const ENTREES = (Array.isArray(REGLAGES.mots) ? REGLAGES.mots : [])
  .map(m => String(m || '').trim()).filter(Boolean)
  .map(m => {
    const prefixe = m.endsWith('*');
    const mots = simplifier(m.replace(/\*$/, '')).split(/[\s']+/).filter(Boolean);
    return { mots, prefixe, courts: mots.map(sansDoubles) };
  })
  .filter(e => e.mots.length && e.mots.join('').length >= 2);

export const filtreActif = () => REGLAGES.actif !== false && ENTREES.length > 0;

// est-ce que la suite de mots simplifiés commence par cette entrée ?
// (les lettres doublées ne sont ignorées que si le mot est « étiré » : sinon « cône » ressemblerait à « conne »)
function correspond(simples, i, e) {
  for (let k = 0; k < e.mots.length; k++) {
    const m = simples[i + k];
    if (m === undefined) return false;
    const prefixe = k === e.mots.length - 1 && e.prefixe;
    const egal = (a, b) => (prefixe ? a.startsWith(b) : a === b);
    if (!egal(m, e.mots[k]) && !(etire(m) && egal(sansDoubles(m), e.courts[k]))) return false;
  }
  return true;
}

// découpe le texte en morceaux (mots et séparateurs), en regroupant les lettres espacées « c o n »
const MOT = /[\p{L}\p{N}@$€!]+(?:-[\p{L}\p{N}@$€!]+)*/gu;   // « cul-de-sac » = un seul mot
function decouper(texte) {
  const morceaux = [];
  let fin = 0, m;
  MOT.lastIndex = 0;
  while ((m = MOT.exec(texte))) {
    if (m.index > fin) morceaux.push({ sep: true, t: texte.slice(fin, m.index) });
    morceaux.push({ sep: false, t: m[0] });
    fin = m.index + m[0].length;
  }
  if (fin < texte.length) morceaux.push({ sep: true, t: texte.slice(fin) });
  // lettres seules séparées par des espaces ou des points : on les recolle (au moins 3)
  const res = [];
  for (let i = 0; i < morceaux.length; i++) {
    const a = morceaux[i];
    if (!a.sep && a.t.length === 1) {
      let j = i, colle = a.t;
      const parties = [a];
      while (morceaux[j + 1] && morceaux[j + 1].sep && /^[\s.\-_*]{1,2}$/.test(morceaux[j + 1].t) && morceaux[j + 2] && !morceaux[j + 2].sep && morceaux[j + 2].t.length === 1) {
        parties.push(morceaux[j + 1], morceaux[j + 2]); colle += morceaux[j + 2].t; j += 2;
      }
      if (colle.length >= 3) { res.push({ sep: false, t: parties.map(p => p.t).join(''), colle }); i = j; continue; }
    }
    res.push(a);
  }
  return res;
}

const masquer = t => t.replace(/[\p{L}\p{N}@$€!]/gu, (c, i) => (i === 0 ? c : '*'));

// remplace les mots interdits par des étoiles (garde la première lettre)
export function censurer(texte) {
  if (!filtreActif()) return { texte, change: false };
  const morceaux = decouper(texte);
  const mots = morceaux.filter(m => !m.sep);
  // un mot avec des tirets compte comme un seul mot (« cul-de-sac »), sauf pour les expressions (« suicide-toi »)
  const simples = mots.map(m => simplifier((m.colle || m.t).replace(/-/g, ' ')).replace(/[\s']/g, ''));
  const aMasquer = new Set();
  for (let i = 0; i < mots.length; i++) {
    for (const e of ENTREES) if (correspond(simples, i, e)) for (let k = 0; k < e.mots.length; k++) aMasquer.add(i + k);
    if (mots[i].t.includes('-')) {
      const sous = simplifier(mots[i].t.replace(/-/g, ' ')).split(/[\s']+/).filter(Boolean);
      if (ENTREES.some(e => e.mots.length > 1 && sous.some((_, k) => correspond(sous, k, e)))) aMasquer.add(i);
    }
  }
  if (!aMasquer.size) return { texte, change: false };
  let n = 0;
  const sortie = morceaux.map(m => (m.sep ? m.t : aMasquer.has(n++) ? masquer(m.t) : m.t)).join('');
  return { texte: sortie, change: true };
}

// pour les pseudos : vrai si le pseudo contient un mot interdit (même collé : « JeanConnard »)
export function pseudoInterdit(nom) {
  if (!filtreActif() || REGLAGES.pseudos === false) return false;
  const s = simplifier(String(nom || '').replace(/\d+$/, '')).replace(/[^a-z]/g, '');   // « Pute123 » = « pute »
  return ENTREES.some(e => {
    const m = e.mots.join('');
    // les mots courts (con, pd, pute…) seulement si c'est tout le pseudo, sinon trop de faux positifs
    return m.length <= 4 ? s === m || sansDoubles(s) === sansDoubles(m) : s.includes(m) || sansDoubles(s).includes(sansDoubles(m));
  });
}
