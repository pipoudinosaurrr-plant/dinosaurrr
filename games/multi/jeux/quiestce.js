/* Qui est-ce ? — 2 joueurs (ou contre l'ordinateur)
   24 personnages inventés (tirés au hasard à chaque partie). Chacun a un personnage secret.
   À ton tour : pose UNE question (lunettes ? cheveux roux ? chapeau ?…) — la réponse est donnée
   automatiquement (pas de triche possible) et les personnages qui ne vont pas sont retournés.
   Tu peux aussi tenter « C'est … ! » : si c'est juste tu gagnes, sinon tu perds. */
import { copieJoueurs, indexDe, classer, melanger } from './outils.js';

const PRENOMS = ['Alba', 'Bilal', 'Cléo', 'Dario', 'Elsa', 'Firmin', 'Gaïa', 'Hugo', 'Inès', 'Jonas', 'Kenza', 'Lino', 'Maëlle', 'Noé', 'Orla', 'Paco', 'Quentin', 'Rosa', 'Sacha', 'Tilio', 'Ulla', 'Victor', 'Wendy', 'Yanis', 'Zoé', 'Adem', 'Billie', 'Côme', 'Diane', 'Ezra', 'Flore', 'Gaspard', 'Hana', 'Isaac', 'Jade', 'Kylian', 'Lou', 'Malo', 'Nina', 'Oscar'];
export const VALEURS = {
  peau: ['claire', 'mate', 'foncée'],
  cheveux: ['noirs', 'bruns', 'blonds', 'roux', 'blancs'],
  coiffure: ['courts', 'longs', 'bouclés', 'chauve'],
  yeux: ['marron', 'bleus', 'verts'],
  haut: ['rouge', 'bleu', 'vert', 'jaune']
};
const OUI_NON = ['lunettes', 'chapeau', 'barbe', 'moustache', 'boucles', 'taches', 'sourire'];

// toutes les questions possibles : texte + test
export const QUESTIONS = [
  ...VALEURS.cheveux.map(c => ({ id: 'cheveux-' + c, texte: `A-t-il/elle les cheveux ${c} ?`, test: p => p.coiffure !== 'chauve' && p.cheveux === c })),
  { id: 'coiffure-longs', texte: 'A-t-il/elle les cheveux longs ?', test: p => p.coiffure === 'longs' },
  { id: 'coiffure-courts', texte: 'A-t-il/elle les cheveux courts ?', test: p => p.coiffure === 'courts' },
  { id: 'coiffure-boucles', texte: 'A-t-il/elle les cheveux bouclés ?', test: p => p.coiffure === 'bouclés' },
  { id: 'coiffure-chauve', texte: 'Est-il/elle chauve ?', test: p => p.coiffure === 'chauve' },
  { id: 'lunettes', texte: 'Porte-t-il/elle des lunettes ?', test: p => p.lunettes },
  { id: 'chapeau', texte: 'Porte-t-il/elle un chapeau ou une casquette ?', test: p => p.chapeau },
  { id: 'barbe', texte: 'A-t-il une barbe ?', test: p => p.barbe },
  { id: 'moustache', texte: 'A-t-il une moustache ?', test: p => p.moustache },
  { id: 'boucles', texte: 'Porte-t-il/elle des boucles d’oreilles ?', test: p => p.boucles },
  { id: 'taches', texte: 'A-t-il/elle des taches de rousseur ?', test: p => p.taches },
  { id: 'sourire', texte: 'Sourit-il/elle de toutes ses dents ?', test: p => p.sourire },
  ...VALEURS.yeux.map(c => ({ id: 'yeux-' + c, texte: `A-t-il/elle les yeux ${c} ?`, test: p => p.yeux === c })),
  ...VALEURS.haut.map(c => ({ id: 'haut-' + c, texte: `Porte-t-il/elle un haut ${c} ?`, test: p => p.haut === c })),
  ...VALEURS.peau.map(c => ({ id: 'peau-' + c, texte: `A-t-il/elle la peau ${c} ?`, test: p => p.peau === c }))
];
const QUESTION = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
const TEMPS = 45000;

// 24 personnages tous différents, avec chaque trait ni trop rare ni trop courant
function plateau() {
  const choix = l => l[Math.floor(Math.random() * l.length)];
  const prenoms = melanger(PRENOMS).slice(0, 24);
  const res = [];
  const vus = new Set();
  while (res.length < 24) {
    const p = {
      peau: choix(VALEURS.peau), cheveux: choix(VALEURS.cheveux), coiffure: choix(VALEURS.coiffure), yeux: choix(VALEURS.yeux), haut: choix(VALEURS.haut),
      lunettes: Math.random() < 0.3, chapeau: Math.random() < 0.25, barbe: Math.random() < 0.22, moustache: Math.random() < 0.2,
      boucles: Math.random() < 0.28, taches: Math.random() < 0.2, sourire: Math.random() < 0.45
    };
    if (p.coiffure === 'chauve' && p.chapeau) p.chapeau = false;
    const cle = JSON.stringify(p);
    if (vus.has(cle)) continue;
    vus.add(cle);
    res.push({ id: res.length, nom: prenoms[res.length], ...p });
  }
  return res;
}

function finir(e, gagnant, t, raison) {
  e.fini = true;
  e.gagnant = gagnant;
  e.raison = raison;
  e.classement = classer(e.joueurs, j => (j.id === gagnant ? 1 : 0), j => `${j.id === gagnant ? 'a trouvé' : 'cherchait'} · secret : ${e.persos[j.secret].nom}`);
}

export default {
  id: 'quiestce',
  titre: 'Qui est-ce ?',
  min: 2,
  max: 2,
  bots: true,
  tic: 250,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 2);
    const persos = plateau();
    const secrets = melanger(persos.map(p => p.id));
    joueurs.forEach((j, i) => Object.assign(j, { secret: secrets[i], baisses: [], questions: 0 }));
    return { joueurs, persos, tour: Math.floor(Math.random() * 2), tTour: t, histo: [], fini: false, gagnant: null, raison: '', classement: [], evts: [] };
  },

  action(e, id, d, t) {
    if (e.fini || !d) return false;
    const i = indexDe(e, id);
    if (i < 0) return false;
    const j = e.joueurs[i], adv = e.joueurs[1 - i];
    // retourner / redresser un personnage à la main (sur son propre plateau)
    if (d.t === 'baisser') {
      const k = Number(d.perso);
      if (!(k >= 0 && k < 24)) return false;
      j.baisses = j.baisses.includes(k) ? j.baisses.filter(x => x !== k) : [...j.baisses, k];
      return true;
    }
    if (i !== e.tour) return false;
    if (d.t === 'question') {
      const q = QUESTION[d.q];
      if (!q) return false;
      const oui = q.test(e.persos[adv.secret]);
      // on retourne automatiquement ceux qui ne correspondent pas
      for (const p of e.persos) if (q.test(p) !== oui && !j.baisses.includes(p.id)) j.baisses.push(p.id);
      j.questions++;
      e.histo.push({ de: id, q: q.id, texte: q.texte, oui });
      if (e.histo.length > 40) e.histo.shift();
      e.evts.push(['question', id, q.id, oui]);
      e.tour = 1 - i; e.tTour = t;
      return true;
    }
    if (d.t === 'deviner') {
      const k = Number(d.perso);
      if (!(k >= 0 && k < 24)) return false;
      const bon = k === adv.secret;
      e.histo.push({ de: id, devine: k, oui: bon });
      e.evts.push(['devine', id, k, bon]);
      finir(e, bon ? id : adv.id, t, bon ? 'trouve' : 'rate');
      return true;
    }
    return false;
  },

  etape(e, t) {
    if (e.fini) return false;
    if (t - e.tTour > TEMPS) { e.evts.push(['temps', e.joueurs[e.tour].id]); e.tour = 1 - e.tour; e.tTour = t; return true; }
    return false;
  },

  // l'ordinateur pose la question qui coupe les candidats restants le plus près de la moitié
  bot(e, id, t) {
    const i = indexDe(e, id);
    if (e.fini || i !== e.tour || t - e.tTour < 1600) return null;
    const j = e.joueurs[i];
    const restants = e.persos.filter(p => !j.baisses.includes(p.id));
    if (restants.length <= 1) return { t: 'deviner', perso: restants.length ? restants[0].id : 0 };
    // l'adversaire est presque sûr de trouver au prochain tour ? on tente sa chance
    const adv = e.joueurs[1 - i];
    if (24 - adv.baisses.length <= 2 && restants.length <= 3 && Math.random() < 0.6) return { t: 'deviner', perso: restants[Math.floor(Math.random() * restants.length)].id };
    let meilleure = null, ecart = Infinity;
    for (const q of melanger(QUESTIONS)) {
      const oui = restants.filter(q.test).length;
      if (!oui || oui === restants.length) continue;
      const d = Math.abs(oui - restants.length / 2);
      if (d < ecart) { ecart = d; meilleure = q; }
    }
    return meilleure ? { t: 'question', q: meilleure.id } : { t: 'deviner', perso: restants[0].id };
  },

  retirer(e, id, t) {
    if (e.fini) return false;
    const i = indexDe(e, id);
    if (i < 0) return false;
    finir(e, e.joueurs[1 - i].id, t, 'parti');
    return true;
  },

  vue(e, id, t) {
    const moi = e.joueurs.find(j => j.id === id);
    const adv = e.joueurs.find(j => j.id !== id);
    return {
      persos: e.persos.map(({ id: k, nom, peau, cheveux, coiffure, yeux, haut, lunettes, chapeau, barbe, moustache, boucles, taches, sourire }) => ({ id: k, nom, peau, cheveux, coiffure, yeux, haut, lunettes, chapeau, barbe, moustache, boucles, taches, sourire })),
      secret: moi ? moi.secret : null,
      baisses: moi ? moi.baisses : [],
      restantsAdv: adv ? 24 - adv.baisses.length : 24,
      tour: e.joueurs[e.tour].id, reste: Math.max(0, TEMPS - (t - e.tTour)),
      histo: e.histo.slice(-12),
      deja: moi ? e.histo.filter(h => h.de === id && h.q).map(h => h.q) : [],
      fini: e.fini, gagnant: e.gagnant, raison: e.raison,
      secretAdv: e.fini && adv ? adv.secret : null
    };
  },

  admin: {
    commandes: [{ id: 'secret', nom: 'Voir le personnage de l’autre', icone: '👀', texte: 'a regardé le personnage secret de l’autre' }],
    faire(e, id, cmd) {
      const adv = e.joueurs.find(j => j.id !== id);
      if (cmd === 'secret' && adv) return { prive: 'Son personnage : ' + e.persos[adv.secret].nom };
      return null;
    },
    victoire(e, id, t) { finir(e, id, t, 'trouve'); }
  }
};
