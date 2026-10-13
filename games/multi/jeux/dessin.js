/* Dessine et devine — 2 à 8 joueurs : un joueur dessine, les autres devinent le mot.
   Les mots proposés ne sont jamais montrés aux autres joueurs (pas de chat). */
import { copieJoueurs, indexDe, classer, melanger, normaliser, distance } from './outils.js';
import MOTS from './mots.js';

export const DUREE = 75000;
const DUREE_CHOIX = 12000;
const COULEURS_OK = ['#111111', '#ffffff', '#9ca3af', '#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#92400e'];

function dessinateur(e) {
  if (e.tour < 0) return null;
  const id = e.ordre[e.tour % e.ordre.length];
  const j = e.joueurs[indexDe(e, id)];
  return j && !j.parti ? id : null;
}

function prochainDessinateur(e, t) {
  for (;;) {
    e.tour++;
    if (e.tour >= e.ordre.length * e.nbTours) return finir(e);
    const id = e.ordre[e.tour % e.ordre.length];
    if (!e.joueurs[indexDe(e, id)].parti) break;
  }
  e.phase = 'choix';
  e.tFin = t + DUREE_CHOIX;
  e.choix = melanger(MOTS).slice(0, 3);
  e.mot = '';
  e.trouves = [];
  e.indices = [];
  e.traits = [];
  e.evts.push(['effacer']);
}

function commencerDessin(e, mot, t) {
  e.mot = mot;
  e.phase = 'dessin';
  e.tDebut = t;
  e.tFin = t + DUREE;
}

function masque(e) {
  return [...e.mot].map((ch, i) => (/[a-zàâäéèêëîïôöùûüçœ]/i.test(ch) && !e.indices.includes(i) ? '_' : ch)).join('');
}

function finir(e) {
  e.fini = true;
  e.phase = 'fin';
  e.classement = classer(e.joueurs, j => e.scores[j.id], j => `${e.scores[j.id]} pts`);
}

function devineurs(e) {
  const d = dessinateur(e);
  return e.joueurs.filter(j => j.id !== d && !j.parti);
}

export default {
  id: 'dessin',
  titre: 'Dessine et devine',
  min: 2,
  max: 8,
  bots: false,
  tic: 250,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).filter(j => !j.bot).slice(0, 8);
    const scores = {};
    joueurs.forEach(j => { scores[j.id] = 0; });
    return {
      joueurs, scores,
      ordre: joueurs.map(j => j.id),
      nbTours: joueurs.length <= 3 ? 2 : 1,
      tour: -1, phase: 'intro', tFin: t + 2500, tDebut: 0,
      choix: [], mot: '', dernierMot: '', trouves: [], indices: [], traits: [],
      fini: false, classement: [], evts: []
    };
  },

  action(e, id, d, t) {
    if (e.fini || !d) return false;
    const i = indexDe(e, id);
    if (i < 0) return false;
    const dessine = dessinateur(e) === id;

    if (d.t === 'mot' && dessine && e.phase === 'choix') {
      const mot = e.choix[Number(d.i) | 0];
      if (!mot) return false;
      commencerDessin(e, mot, t);
      return true;
    }

    if (d.t === 'trait' && dessine && e.phase === 'dessin') {
      if (!Array.isArray(d.p) || d.p.length < 2 || d.p.length > 400 || d.p.length % 2) return false;
      const p = d.p.map(v => Math.max(0, Math.min(1000, Math.round(Number(v) || 0))));
      const c = COULEURS_OK.includes(d.c) ? d.c : '#111111';
      const w = Math.max(2, Math.min(48, Number(d.w) | 0));
      if (e.traits.length < 4000) e.traits.push({ p, c, w });
      e.evts.push({ d: ['trait', p, c, w], sauf: id });
      return false;
    }

    if (d.t === 'effacer' && dessine && e.phase === 'dessin') {
      e.traits = [];
      e.evts.push({ d: ['effacer'], sauf: id });
      return false;
    }

    if (d.t === 'devine' && !dessine && e.phase === 'dessin' && !e.trouves.includes(id)) {
      const essai = normaliser(String(d.mot || '').slice(0, 40));
      if (!essai) return false;
      const juste = normaliser(e.mot);
      if (essai === juste) {
        const reste = Math.max(0, e.tFin - t) / DUREE;
        const gain = Math.round((100 + 300 * reste + (e.trouves.length === 0 ? 50 : 0)) / 5) * 5;
        e.scores[id] += gain;
        e.scores[dessinateur(e)] += 60;
        e.trouves.push(id);
        e.evts.push(['trouve', id, gain]);
        return true;
      }
      e.evts.push({ d: [juste.length >= 4 && distance(essai, juste) <= 1 ? 'presque' : 'rate', essai], pour: id });
      return false;
    }
    return false;
  },

  etape(e, t) {
    if (e.fini) return false;
    if (e.phase === 'intro' && t >= e.tFin) { prochainDessinateur(e, t); return true; }
    if (e.phase === 'choix') {
      if (!dessinateur(e)) { prochainDessinateur(e, t); return true; }
      if (t >= e.tFin) { commencerDessin(e, e.choix[0], t); return true; }
      return false;
    }
    if (e.phase === 'dessin') {
      const qui = dessinateur(e);
      const restants = devineurs(e).filter(j => !e.trouves.includes(j.id));
      if (!qui || t >= e.tFin || !restants.length) {
        e.phase = 'bilan';
        e.dernierMot = e.mot;
        e.tFin = t + 4500;
        return true;
      }
      // indices : une lettre à 45 % du temps, une autre à 70 %
      const ecoule = (t - e.tDebut) / DUREE;
      const voulus = ecoule > 0.7 ? 2 : ecoule > 0.45 ? 1 : 0;
      if (e.indices.length < voulus) {
        const libres = [...e.mot].map((ch, i) => i).filter(i => /[a-zàâäéèêëîïôöùûüçœ]/i.test(e.mot[i]) && !e.indices.includes(i));
        if (libres.length > 1) { e.indices.push(libres[Math.floor(Math.random() * libres.length)]); return true; }
      }
      return false;
    }
    if (e.phase === 'bilan' && t >= e.tFin) { prochainDessinateur(e, t); return true; }
    return false;
  },

  retirer(e, id) {
    const j = e.joueurs[indexDe(e, id)];
    if (!j || e.fini) return false;
    j.parti = true;
    if (e.joueurs.filter(x => !x.parti).length < 2) finir(e);
    return true;
  },

  vue(e, id, t) {
    const qui = dessinateur(e);
    const voitMot = id === qui || e.trouves.includes(id) || e.phase === 'bilan';
    return {
      phase: e.phase,
      tour: e.tour + 1,
      nbTours: e.ordre.length * e.nbTours,
      dessinateur: qui,
      j: e.joueurs.map(j => j.id),
      choix: id === qui && e.phase === 'choix' ? e.choix : null,
      mot: voitMot && e.phase !== 'choix' ? e.mot : null,
      masque: e.phase === 'dessin' ? masque(e) : null,
      dernierMot: e.phase === 'bilan' ? e.dernierMot : null,
      reste: Math.max(0, Math.round(e.tFin - (t || 0))),
      duree: e.phase === 'choix' ? DUREE_CHOIX : DUREE,
      scores: e.scores,
      trouves: e.trouves,
      fini: e.fini
    };
  }
};
