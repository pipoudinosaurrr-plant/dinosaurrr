/* Quiz battle — 2 à 8 joueurs, 10 questions, plus on répond vite et juste, plus on marque */
import { copieJoueurs, indexDe, classer, melanger, hasard } from './outils.js';
import DONNEES from './questions.json' with { type: 'json' };

// les questions sont dans questions.json (modifiables avec Pages CMS « Questions du quiz »)
const BANQUE = DONNEES
  .filter(q => q && q.question && q.bonne && q.mauvaise1 && q.mauvaise2 && q.mauvaise3)
  .map(q => [q.question, q.bonne, q.mauvaise1, q.mauvaise2, q.mauvaise3]);

export const NB_QUESTIONS = 10;
export const DUREE = 15000;
const CORRECTION = 3800;

function questionSuivante(e, t) {
  e.n++;
  const q = e.questions[e.n];
  e.phase = 'question';
  e.tDebut = t;
  e.tFin = t + DUREE;
  e.reponses = {};
  e.gains = {};
  for (const j of e.joueurs) if (j.bot) j.plan = { delai: hasard(2500, 11000), juste: Math.random() < 0.62 };
  return q;
}

function finir(e) {
  e.fini = true;
  e.classement = classer(e.joueurs, j => e.scores[j.id], j => `${e.scores[j.id]} pts · ${e.justes[j.id]}/${NB_QUESTIONS} bonnes réponses`);
}

export default {
  id: 'quiz',
  titre: 'Quiz battle',
  min: 2,
  max: 8,
  bots: true,
  tic: 200,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 8);
    const questions = melanger(BANQUE).slice(0, NB_QUESTIONS).map(([texte, bonne, ...fausses]) => {
      const choix = melanger([bonne, ...fausses]);
      return { texte, choix, bonne: choix.indexOf(bonne) };
    });
    const scores = {}, justes = {};
    joueurs.forEach(j => { scores[j.id] = 0; justes[j.id] = 0; });
    return { joueurs, questions, scores, justes, n: -1, phase: 'intro', tPhase: t + 2500, tDebut: 0, tFin: 0, reponses: {}, gains: {}, fini: false, classement: [], evts: [] };
  },

  action(e, id, d, t) {
    if (e.fini || e.phase !== 'question' || !d || d.t !== 'rep') return false;
    if (indexDe(e, id) < 0 || e.reponses[id] !== undefined) return false;
    const i = Number(d.i) | 0;
    if (i < 0 || i > 3) return false;
    e.reponses[id] = i;
    const q = e.questions[e.n];
    if (i === q.bonne) {
      const reste = Math.max(0, e.tFin - t) / DUREE;
      e.gains[id] = Math.round((500 + 500 * reste) / 10) * 10;
      e.scores[id] += e.gains[id];
      e.justes[id]++;
    } else e.gains[id] = 0;
    return true;
  },

  etape(e, t) {
    if (e.fini) return false;
    if (e.phase === 'intro' && t >= e.tPhase) { questionSuivante(e, t); return true; }
    if (e.phase === 'question') {
      const tous = e.joueurs.every(j => j.parti || e.reponses[j.id] !== undefined);
      if (tous || t >= e.tFin) { e.phase = 'correction'; e.tPhase = t + CORRECTION; return true; }
      return false;
    }
    if (e.phase === 'correction' && t >= e.tPhase) {
      if (e.n + 1 >= e.questions.length) finir(e);
      else questionSuivante(e, t);
      return true;
    }
    return false;
  },

  bot(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (!j || e.phase !== 'question' || e.reponses[id] !== undefined || !j.plan) return null;
    if (t - e.tDebut < j.plan.delai) return null;
    const q = e.questions[e.n];
    if (j.plan.juste) return { t: 'rep', i: q.bonne };
    const fausses = [0, 1, 2, 3].filter(i => i !== q.bonne);
    return { t: 'rep', i: fausses[Math.floor(Math.random() * 3)] };
  },

  retirer(e, id) {
    const j = e.joueurs[indexDe(e, id)];
    if (!j || e.fini) return false;
    j.parti = true;
    return true;
  },

  vue(e, id, t) {
    const q = e.questions[e.n];
    const correction = e.phase === 'correction';
    return {
      phase: e.phase,
      numero: e.n + 1,
      total: e.questions.length,
      j: e.joueurs.map(j => j.id),
      question: q ? q.texte : '',
      choix: q ? q.choix : [],
      reste: e.phase === 'question' ? Math.max(0, Math.round(e.tFin - (t || 0))) : 0,
      duree: DUREE,
      maReponse: e.reponses[id] !== undefined ? e.reponses[id] : null,
      ontRepondu: Object.keys(e.reponses),
      scores: e.scores,
      bonne: correction ? q.bonne : null,
      reponses: correction ? e.reponses : null,
      gains: correction ? e.gains : null,
      fini: e.fini
    };
  }
};
