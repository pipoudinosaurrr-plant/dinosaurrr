/* Morpion géant — grille 15 × 15, aligner 5 symboles */
import { copieJoueurs, indexDe, classer } from './outils.js';

export const N = 15;
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function alignement(g, r, c, p) {
  for (const [dr, dc] of DIRS) {
    const cases = [[r, c]];
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && g[rr * N + cc] === p) { cases.push([rr, cc]); rr += dr * s; cc += dc * s; }
    }
    if (cases.length >= 5) return cases;
  }
  return null;
}

/* ---------- L'ordinateur : il note chaque case libre ---------- */

function valeurLigne(g, r, c, p) {
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let suite = 1, ouverts = 0;
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && g[rr * N + cc] === p) { suite++; rr += dr * s; cc += dc * s; }
      if (rr >= 0 && rr < N && cc >= 0 && cc < N && g[rr * N + cc] === -1) ouverts++;
    }
    if (suite >= 5) total += 1000000;
    else if (suite === 4) total += ouverts === 2 ? 60000 : ouverts === 1 ? 6000 : 0;
    else if (suite === 3) total += ouverts === 2 ? 5000 : ouverts === 1 ? 400 : 0;
    else if (suite === 2) total += ouverts === 2 ? 300 : ouverts === 1 ? 40 : 0;
    else total += ouverts * 4;
  }
  return total;
}

export function meilleurCoup(g, p) {
  const o = 1 - p;
  let meilleur = null, score = -1;
  const vide = g.every(v => v === -1);
  if (vide) return [7, 7];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (g[r * N + c] !== -1) continue;
      let proche = false;
      for (let dr = -2; dr <= 2 && !proche; dr++) for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && g[rr * N + cc] !== -1) { proche = true; break; }
      }
      if (!proche) continue;
      const v = valeurLigne(g, r, c, p) * 1.1 + valeurLigne(g, r, c, o) + Math.random() * 3;
      if (v > score) { score = v; meilleur = [r, c]; }
    }
  }
  return meilleur;
}

/* ---------- Le jeu ---------- */

function finir(e, gagnant) {
  e.fini = true;
  e.gagnant = gagnant;
  e.classement = classer(e.joueurs, j => (gagnant === -1 ? 0 : (indexDe(e, j.id) === gagnant ? 1 : 0)), j => (gagnant === -1 ? 'Égalité' : (indexDe(e, j.id) === gagnant ? 'Victoire' : 'Défaite')));
}

export default {
  id: 'morpion',
  titre: 'Morpion géant',
  min: 2,
  max: 2,
  bots: true,
  tic: 200,
  vueCommune: true,

  creer(liste, t) {
    return {
      joueurs: copieJoueurs(liste).slice(0, 2),
      grille: Array(N * N).fill(-1),
      tour: 0,
      dernier: null, ligne: null, gagnant: -1, coups: 0,
      tAction: t, fini: false, classement: [], evts: []
    };
  },

  action(e, id, d, t) {
    if (e.fini || !d || d.t !== 'jouer') return false;
    const i = indexDe(e, id);
    if (i !== e.tour) return false;
    const r = Number(d.r) | 0, c = Number(d.c) | 0;
    if (r < 0 || r >= N || c < 0 || c >= N || e.grille[r * N + c] !== -1) return false;
    e.grille[r * N + c] = i;
    e.dernier = [r, c];
    e.coups++;
    e.tAction = t;
    const ligne = alignement(e.grille, r, c, i);
    if (ligne) { e.ligne = ligne; finir(e, i); }
    else if (e.coups >= N * N) finir(e, -1);
    else e.tour = 1 - i;
    return true;
  },

  etape() { return false; },

  bot(e, id, t) {
    const i = indexDe(e, id);
    if (e.fini || i !== e.tour || t - e.tAction < 650) return null;
    const [r, c] = meilleurCoup(e.grille, i);
    return { t: 'jouer', r, c };
  },

  retirer(e, id) {
    const i = indexDe(e, id);
    if (e.fini || i < 0) return false;
    finir(e, 1 - i);
    return true;
  },

  vue(e) {
    return { g: e.grille, tour: e.tour, j: e.joueurs.map(j => j.id), dernier: e.dernier, ligne: e.ligne, gagnant: e.gagnant, fini: e.fini };
  }
};
