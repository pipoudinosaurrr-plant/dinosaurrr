/* Poker (Texas Hold'em) — de 2 à 6 joueurs, avec des JETONS VIRTUELS (pas d'argent)
   - chacun commence avec 1 000 jetons ; petite et grosse blinde (elles doublent toutes les 6 mains)
   - 2 cartes cachées par joueur, puis 5 cartes communes (flop, tournant, rivière)
   - à chaque tour d'enchères : passer (se coucher), suivre / parole, relancer, tapis
   - la meilleure combinaison de 5 cartes gagne le pot (avec des pots séparés en cas de tapis)
   - la partie s'arrête quand il ne reste qu'un joueur avec des jetons (ou après 40 mains)
   Les bots estiment leurs chances en jouant des milliers de fins de main au hasard… et bluffent parfois. */
import { copieJoueurs, indexDe, classer, melanger } from './outils.js';

export const RANGS = '23456789TJQKA';
export const COULEURS = 'pcdt';     // pique, cœur, carreau, trèfle
const DEPART = 1000;
const TEMPS = 25000;
const MAINS_MAX = 40;

/* ---------- Évaluer une main ---------- */
export const NOMS_COMBI = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Quinte', 'Couleur', 'Full', 'Carré', 'Quinte flush'];
// note d'une main de 5 cartes (plus grand = mieux)
function note5(c) {
  const r = c.map(x => RANGS.indexOf(x[0])).sort((a, b) => b - a);
  const couleur = c.every(x => x[1] === c[0][1]);
  let quinte = -1;
  const u = [...new Set(r)];
  if (u.length === 5 && r[0] - r[4] === 4) quinte = r[0];
  if (u.length === 5 && r[0] === 12 && r[1] === 3) quinte = 3;   // A-2-3-4-5
  const compte = {};
  for (const x of r) compte[x] = (compte[x] || 0) + 1;
  const groupes = Object.entries(compte).map(([k, n]) => [n, Number(k)]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const ordre = groupes.map(g => g[1]);
  let cat;
  if (quinte >= 0 && couleur) cat = 8;
  else if (groupes[0][0] === 4) cat = 7;
  else if (groupes[0][0] === 3 && groupes[1][0] === 2) cat = 6;
  else if (couleur) cat = 5;
  else if (quinte >= 0) cat = 4;
  else if (groupes[0][0] === 3) cat = 3;
  else if (groupes[0][0] === 2 && groupes[1][0] === 2) cat = 2;
  else if (groupes[0][0] === 2) cat = 1;
  else cat = 0;
  const depart = (cat === 4 || cat === 8) ? [quinte] : ordre;
  let v = cat;
  for (let i = 0; i < 5; i++) v = v * 15 + (depart[i] ?? 0);
  return v;
}
// la meilleure note avec 5 à 7 cartes (on essaie toutes les façons d'en garder 5)
export function evaluer(cartes) {
  const n = cartes.length;
  if (n <= 5) return note5(cartes);
  let meilleur = -1;
  if (n === 6) {
    for (let a = 0; a < 6; a++) { const v = note5(cartes.filter((_, i) => i !== a)); if (v > meilleur) meilleur = v; }
    return meilleur;
  }
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const v = note5(cartes.filter((_, i) => i !== a && i !== b));
    if (v > meilleur) meilleur = v;
  }
  return meilleur;
}
export const combinaison = note => NOMS_COMBI[Math.floor(note / 15 ** 5)];
const nouveauPaquet = () => melanger(RANGS.split('').flatMap(r => COULEURS.split('').map(c => r + c)));

/* ---------- Le déroulement d'une main ---------- */
const actifs = e => e.joueurs.filter(j => !j.elimine);
const enJeu = e => e.joueurs.filter(j => !j.elimine && !j.couche);
const peutJouer = j => !j.elimine && !j.couche && !j.tapis;
const suivant = (e, i) => { const n = e.joueurs.length; for (let k = 1; k <= n; k++) { const j = e.joueurs[(i + k) % n]; if (!j.elimine) return (i + k) % n; } return i; };
const suivantQuiJoue = (e, i) => { const n = e.joueurs.length; for (let k = 1; k <= n; k++) { const j = e.joueurs[(i + k) % n]; if (peutJouer(j)) return (i + k) % n; } return -1; };

function miser(e, j, montant) {
  const m = Math.min(montant, j.jetons);
  j.jetons -= m; j.mise += m; j.total += m;
  if (j.jetons === 0) j.tapis = true;
  return m;
}

function nouvelleMain(e, t) {
  const restants = actifs(e);
  if (restants.length <= 1 || e.main >= MAINS_MAX) return finir(e, t);
  e.main++;
  if (e.main > 1 && (e.main - 1) % 6 === 0) { e.petite *= 2; e.grosse *= 2; e.evts.push(['blindes', e.petite, e.grosse]); }
  e.paquet = nouveauPaquet();
  e.table = [];
  e.etape = 'preflop';
  e.resultat = null;
  for (const j of e.joueurs) Object.assign(j, { cartes: j.elimine ? [] : [e.paquet.pop(), e.paquet.pop()], couche: j.elimine, tapis: false, mise: 0, total: 0, aParle: false, montre: false, derniere: null });
  e.donneur = suivant(e, e.donneur);
  // à 2 joueurs, le donneur met la petite blinde
  const pb = restants.length === 2 ? e.donneur : suivant(e, e.donneur);
  const gb = suivant(e, pb);
  miser(e, e.joueurs[pb], e.petite); e.joueurs[pb].derniere = 'petite blinde';
  miser(e, e.joueurs[gb], e.grosse); e.joueurs[gb].derniere = 'grosse blinde';
  e.miseMax = e.grosse; e.relanceMin = e.grosse;
  e.tour = suivantQuiJoue(e, gb);
  e.tTour = t;
  e.evts.push(['main', e.main]);
  if (e.tour < 0 || enJeu(e).filter(peutJouer).length === 0) avancerEtape(e, t);
}

// tout le monde a parlé et a misé pareil ?
function tourFini(e) {
  const qui = enJeu(e);
  if (qui.length <= 1) return true;
  return qui.filter(peutJouer).every(j => j.aParle && j.mise === e.miseMax);
}

function avancerEtape(e, t) {
  // fin des enchères de cette étape
  for (const j of e.joueurs) { j.mise = 0; j.aParle = false; }
  e.miseMax = 0; e.relanceMin = e.grosse;
  if (enJeu(e).length <= 1) return abattage(e, t);
  const etapes = { preflop: ['flop', 3], flop: ['tournant', 1], tournant: ['riviere', 1] };
  if (!etapes[e.etape]) return abattage(e, t);
  const [nom, n] = etapes[e.etape];
  e.paquet.pop();   // carte brûlée
  for (let k = 0; k < n; k++) e.table.push(e.paquet.pop());
  e.etape = nom;
  e.evts.push(['cartes', nom]);
  // plus personne ne peut miser (tapis) : on déroule jusqu'au bout
  const peuvent = enJeu(e).filter(peutJouer);
  if (peuvent.length <= 1) { e.tour = -1; e.attente = t + 1200; return; }
  e.tour = suivantQuiJoue(e, e.donneur);
  e.tTour = t;
}

function abattage(e, t) {
  e.etape = 'abattage';
  e.tour = -1;
  const encore = enJeu(e);
  // les pots : chaque « niveau » de mise forme un pot, que seuls ceux qui ont misé jusque-là peuvent gagner
  const niveaux = [...new Set(e.joueurs.filter(j => j.total > 0 && !j.couche).map(j => j.total))].sort((a, b) => a - b);
  const notes = new Map(encore.map(j => [j.id, encore.length > 1 ? evaluer([...j.cartes, ...e.table]) : 0]));
  const gains = new Map();
  let avant = 0;
  const pots = [];
  for (const niv of niveaux) {
    let pot = 0;
    for (const j of e.joueurs) pot += Math.max(0, Math.min(j.total, niv) - avant);
    const candidats = encore.filter(j => j.total >= niv);
    if (pot > 0 && candidats.length) pots.push({ pot, candidats });
    avant = niv;
  }
  // l'argent misé par ceux qui se sont couchés au-delà du dernier niveau revient au dernier pot
  const misTotal = e.joueurs.reduce((s, j) => s + j.total, 0);
  const distribue = pots.reduce((s, p) => s + p.pot, 0);
  if (pots.length && misTotal > distribue) pots[pots.length - 1].pot += misTotal - distribue;
  if (!pots.length && encore.length) pots.push({ pot: misTotal, candidats: encore });
  const gagnants = new Set();
  for (const { pot, candidats } of pots) {
    const meilleure = Math.max(...candidats.map(j => notes.get(j.id)));
    const g = candidats.filter(j => notes.get(j.id) === meilleure);
    const part = Math.floor(pot / g.length);
    g.forEach((j, i) => { const v = part + (i === 0 ? pot - part * g.length : 0); gains.set(j.id, (gains.get(j.id) || 0) + v); gagnants.add(j.id); });
  }
  for (const [id, v] of gains) e.joueurs.find(j => j.id === id).jetons += v;
  // on montre les cartes à l'abattage (s'il reste au moins 2 joueurs)
  if (encore.length > 1) for (const j of encore) j.montre = true;
  e.resultat = {
    gagnants: [...gagnants],
    gains: Object.fromEntries(gains),
    combi: encore.length > 1 ? Object.fromEntries(encore.map(j => [j.id, combinaison(notes.get(j.id))])) : null
  };
  e.evts.push(['gagne', [...gagnants], Object.fromEntries(gains)]);
  for (const j of e.joueurs) if (!j.elimine && j.jetons === 0) { j.elimine = true; j.tElimine = t + e.main; e.evts.push(['elimine', j.id]); }
  e.attente = t + (encore.length > 1 ? 5500 : 2500);
}

function finir(e, t) {
  if (e.fini) return;
  e.fini = true;
  e.etape = 'fin';
  e.classement = classer(e.joueurs, j => (j.elimine ? j.tElimine : 1e9 + j.jetons), j => (j.elimine ? 'éliminé' : `${j.jetons.toLocaleString('fr-FR')} jetons`));
}

/* ---------- Les bots ---------- */
// chances de gagner : on joue la fin de la main au hasard plein de fois
function chances(e, j, n = 220) {
  const adversaires = enJeu(e).length - 1;
  if (adversaires <= 0) return 1;
  const connues = new Set([...j.cartes, ...e.table]);
  const reste = RANGS.split('').flatMap(r => COULEURS.split('').map(c => r + c)).filter(c => !connues.has(c));
  let gagne = 0;
  for (let s = 0; s < n; s++) {
    // mélange partiel
    for (let i = 0; i < 5 - e.table.length + adversaires * 2; i++) { const k = i + Math.floor(Math.random() * (reste.length - i)); [reste[i], reste[k]] = [reste[k], reste[i]]; }
    let p = 0;
    const table = [...e.table, ...reste.slice(0, 5 - e.table.length)];
    p = 5 - e.table.length;
    const moi = evaluer([...j.cartes, ...table]);
    let meilleur = true, egal = 0;
    for (let a = 0; a < adversaires; a++) {
      const v = evaluer([reste[p], reste[p + 1], ...table]); p += 2;
      if (v > moi) { meilleur = false; break; }
      if (v === moi) egal++;
    }
    if (meilleur) gagne += egal ? 1 / (egal + 1) : 1;
  }
  return gagne / n;
}

/* ---------- Le moteur ---------- */
export default {
  id: 'poker',
  titre: 'Poker',
  min: 2,
  max: 6,
  bots: true,
  tic: 250,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 6);
    for (const j of joueurs) Object.assign(j, { jetons: DEPART, cartes: [], couche: false, tapis: false, mise: 0, total: 0, aParle: false, elimine: false, tElimine: 0, montre: false, derniere: null, style: Math.random() });
    const e = { joueurs, main: 0, donneur: Math.floor(Math.random() * joueurs.length), petite: 10, grosse: 20, paquet: [], table: [], etape: 'attente', tour: -1, tTour: t, miseMax: 0, relanceMin: 20, attente: t + 1500, resultat: null, fini: false, classement: [], evts: [] };
    return e;
  },

  action(e, id, d, t) {
    if (e.fini || !d || e.tour < 0) return false;
    const i = indexDe(e, id);
    if (i !== e.tour) return false;
    const j = e.joueurs[i];
    const aPayer = e.miseMax - j.mise;
    if (d.t === 'passe') {
      if (aPayer === 0) { j.aParle = true; j.derniere = 'parole'; }   // rien à payer : se coucher = parole
      else { j.couche = true; j.derniere = 'couché'; }
    } else if (d.t === 'suivre') {
      const m = miser(e, j, aPayer);
      j.aParle = true; j.derniere = m === 0 ? 'parole' : j.tapis ? 'tapis' : 'suit';
    } else if (d.t === 'relance' || d.t === 'tapis') {
      // relance : la mise totale voulue (au moins mise max + relance mini), ou tout le tapis
      const total = d.t === 'tapis' ? j.mise + j.jetons : Math.max(e.miseMax + e.relanceMin, Math.min(j.mise + j.jetons, Math.floor(Number(d.montant) || 0)));
      if (total <= e.miseMax) { const m = miser(e, j, aPayer); j.derniere = m ? 'suit' : 'parole'; }
      else {
        const hausse = total - e.miseMax;
        miser(e, j, total - j.mise);
        if (hausse >= e.relanceMin) { e.relanceMin = hausse; for (const o of e.joueurs) if (o !== j) o.aParle = false; }
        e.miseMax = Math.max(e.miseMax, j.mise);
        j.derniere = j.tapis ? 'tapis' : 'relance ' + j.mise;
      }
      j.aParle = true;
    } else return false;
    e.evts.push(['action', id, j.derniere]);
    if (enJeu(e).length <= 1) { abattage(e, t); return true; }
    if (tourFini(e)) avancerEtape(e, t);
    else { e.tour = suivantQuiJoue(e, i); e.tTour = t; if (e.tour < 0) avancerEtape(e, t); }
    return true;
  },

  etape(e, t) {
    if (e.fini) return false;
    if (e.attente && t >= e.attente) {
      e.attente = 0;
      if (e.etape === 'abattage' || e.etape === 'attente') { nouvelleMain(e, t); return true; }
      // tout le monde est à tapis : on retourne les cartes une à une
      avancerEtape(e, t);
      return true;
    }
    // trop long : on passe (ou parole) pour le joueur
    if (e.tour >= 0 && t - e.tTour > TEMPS) {
      const j = e.joueurs[e.tour];
      this.action(e, j.id, { t: 'passe' }, t);
      e.evts.push(['temps', j.id]);
      return true;
    }
    return false;
  },

  bot(e, id, t) {
    if (e.fini || e.tour < 0) return null;
    const j = e.joueurs[e.tour];
    if (!j || j.id !== id || t - e.tTour < 900 + (id.charCodeAt(id.length - 1) % 5) * 250) return null;
    const p = chances(e, j);
    const aPayer = e.miseMax - j.mise;
    const pot = e.joueurs.reduce((s, o) => s + o.total, 0);
    const coteDuPot = aPayer / Math.max(1, pot + aPayer);
    const audace = 0.85 + j.style * 0.3;            // chaque bot a son caractère
    const force = p * enJeu(e).length * audace;     // 1 = une main moyenne, 2 = deux fois plus de chances
    const bluff = Math.random() < 0.04 + j.style * 0.05;
    const relancer = montant => ({ t: 'relance', montant: Math.round(e.miseMax + Math.max(e.relanceMin, montant)) });
    if (force > 2.3 && e.etape !== 'preflop' && Math.random() < 0.35) return { t: 'tapis' };
    if (force > 1.6 || (bluff && e.etape !== 'riviere' && aPayer === 0)) return Math.random() < 0.7 ? relancer(pot * (0.4 + Math.random() * 0.4)) : { t: 'suivre' };
    if (aPayer === 0) return force > 1.15 && Math.random() < 0.3 ? relancer(pot * 0.35) : { t: 'suivre' };
    if (p >= coteDuPot * 0.95 && (aPayer < j.jetons * 0.5 || force > 1.3)) return { t: 'suivre' };
    return { t: 'passe' };
  },

  retirer(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (!j || e.fini || j.elimine) return false;
    j.couche = true; j.elimine = true; j.tElimine = t; j.jetons = 0;
    if (e.joueurs[e.tour] === j) this.action(e, id, { t: 'passe' }, t);
    if (actifs(e).length <= 1) finir(e, t);
    return true;
  },

  vue(e, id, t) {
    const moi = e.joueurs.find(j => j.id === id);
    const i = e.joueurs.indexOf(moi);
    return {
      main: e.main, etape: e.etape, table: e.table, petite: e.petite, grosse: e.grosse,
      pot: e.joueurs.reduce((s, j) => s + j.total, 0),
      tour: e.tour >= 0 ? e.joueurs[e.tour].id : null, reste: e.tour >= 0 ? Math.max(0, TEMPS - (t - e.tTour)) : 0,
      donneur: e.joueurs[e.donneur] ? e.joueurs[e.donneur].id : null,
      j: e.joueurs.map(j => ({
        id: j.id, jetons: j.jetons, mise: j.mise, couche: j.couche, tapis: j.tapis, elimine: j.elimine, derniere: j.derniere,
        cartes: j === moi || j.montre ? j.cartes : (j.cartes.length && !j.couche ? ['?', '?'] : [])
      })),
      moi: moi ? { cartes: moi.cartes, aPayer: e.miseMax - moi.mise, relanceMin: e.miseMax + e.relanceMin, max: moi.mise + moi.jetons, combi: moi.cartes.length && e.table.length ? combinaison(evaluer([...moi.cartes, ...e.table])) : null } : null,
      resultat: e.resultat, fini: e.fini,
      monTour: i >= 0 && i === e.tour
    };
  },

  admin: {
    commandes: [
      { id: 'cartes', nom: 'Voir les cartes de tout le monde', icone: '👀', texte: 'a regardé les cartes de tout le monde' },
      { id: 'jetons', nom: '+1 000 jetons', icone: '💰', texte: 's’est donné 1 000 jetons' }
    ],
    faire(e, id, cmd, t) {
      const j = e.joueurs[indexDe(e, id)];
      if (cmd === 'cartes') return { prive: e.joueurs.filter(o => o.cartes.length).map(o => `${o.nom} : ${o.cartes.join(' ')}`).join(' · ') + (e.paquet.length ? ` · prochaines : ${e.paquet.slice(-5).reverse().join(' ')}` : '') };
      if (cmd === 'jetons' && j) { j.jetons += 1000; return {}; }
      return null;
    },
    victoire(e, id, t) {
      for (const o of e.joueurs) if (o.id !== id) { o.jetons = 0; o.elimine = true; o.tElimine = t; }
      finir(e, t);
    }
  }
};
