/* Course de réflexes — 2 à 8 joueurs, 5 manches : le premier à cliquer au vert marque le plus */
import { copieJoueurs, indexDe, classer, hasard } from './outils.js';

export const MANCHES = 5;
const POINTS = [5, 3, 2, 1];

function nouvelleManche(e, t) {
  e.manche++;
  e.phase = 'attente';
  e.reponses = {};
  e.tGo = t + hasard(1600, 4200);
  e.bilan = null;
  for (const j of e.joueurs) if (j.bot) j.plan = { reflexe: hasard(205, 420), tropTot: Math.random() < 0.06 };
}

function finir(e) {
  e.fini = true;
  e.classement = classer(e.joueurs, j => e.points[j.id] * 10000 - (j.meilleur || 9999), j => `${e.points[j.id]} pts${j.meilleur ? ` · record ${j.meilleur} ms` : ''}`);
}

export default {
  id: 'course',
  titre: 'Course de réflexes',
  min: 2,
  max: 8,
  bots: true,
  tic: 50,
  vueCommune: true,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 8);
    const points = {};
    joueurs.forEach(j => { points[j.id] = 0; });
    return { joueurs, points, manche: 0, phase: 'intro', tPhase: t + 2500, tGo: 0, tFin: 0, reponses: {}, bilan: null, fini: false, classement: [], evts: [] };
  },

  action(e, id, d) {
    if (e.fini || !d || d.t !== 'clic') return false;
    const j = e.joueurs[indexDe(e, id)];
    if (!j || e.reponses[id] || (e.phase !== 'attente' && e.phase !== 'go')) return false;
    // cliquer avant le vert (sur son écran) = trop tôt pour cette manche
    if (e.phase === 'attente' || d.tot) { e.reponses[id] = { tot: true }; return true; }
    const ms = Math.round(Number(d.ms));
    if (!Number.isFinite(ms)) return false;
    e.reponses[id] = { ms: Math.max(90, Math.min(3000, ms)) };
    return true;
  },

  etape(e, t) {
    if (e.fini) return false;
    if (e.phase === 'intro' && t >= e.tPhase) { nouvelleManche(e, t); return true; }
    if (e.phase === 'attente' && t >= e.tGo) { e.phase = 'go'; e.tFin = t + 2500; return true; }
    if (e.phase === 'go') {
      const tous = e.joueurs.every(j => j.parti || e.reponses[j.id]);
      if (!tous && t < e.tFin) return false;
      const valides = e.joueurs.filter(j => e.reponses[j.id] && e.reponses[j.id].ms).sort((a, b) => e.reponses[a.id].ms - e.reponses[b.id].ms);
      e.bilan = e.joueurs.map(j => {
        const r = e.reponses[j.id];
        const rang = valides.indexOf(j);
        const gain = rang >= 0 ? (POINTS[rang] ?? 1) : 0;
        e.points[j.id] += gain;
        if (r && r.ms && (!j.meilleur || r.ms < j.meilleur)) j.meilleur = r.ms;
        return { id: j.id, ms: r && r.ms ? r.ms : null, tot: !!(r && r.tot), gain };
      }).sort((a, b) => b.gain - a.gain || (a.ms || 9999) - (b.ms || 9999));
      e.phase = 'bilan';
      e.tPhase = t + 2800;
      return true;
    }
    if (e.phase === 'bilan' && t >= e.tPhase) {
      if (e.manche >= MANCHES) finir(e);
      else nouvelleManche(e, t);
      return true;
    }
    return false;
  },

  bot(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (!j || e.reponses[id] || !j.plan) return null;
    if (e.phase === 'attente' && j.plan.tropTot && t > e.tGo - 500) return { t: 'clic', tot: true };
    if (e.phase === 'go' && t - (e.tFin - 2500) >= j.plan.reflexe) return { t: 'clic', ms: j.plan.reflexe };
    return null;
  },

  retirer(e, id) {
    if (e.fini) return false;
    const j = e.joueurs[indexDe(e, id)];
    if (!j) return false;
    j.parti = true;
    return true;
  },

  vue(e) {
    return {
      phase: e.phase,
      manche: e.manche,
      total: MANCHES,
      j: e.joueurs.map(j => j.id),
      repondu: Object.keys(e.reponses),
      points: e.points,
      bilan: e.bilan,
      fini: e.fini
    };
  }
};
