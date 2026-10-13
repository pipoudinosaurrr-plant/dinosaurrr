/* Puissance 4 — 2 joueurs, chacun son tour */
import { copieJoueurs, indexDe, classer } from './outils.js';

const L = 7, H = 6;
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function ligneLibre(g, c) {
  for (let r = H - 1; r >= 0; r--) if (g[r * L + c] === -1) return r;
  return -1;
}

function alignement(g, r, c, p) {
  for (const [dr, dc] of DIRS) {
    const cases = [[r, c]];
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < H && cc >= 0 && cc < L && g[rr * L + cc] === p) { cases.push([rr, cc]); rr += dr * s; cc += dc * s; }
    }
    if (cases.length >= 4) return cases;
  }
  return null;
}

/* ---------- L'ordinateur (minimax) ---------- */

function noterFenetre(a, b, c, d, p) {
  let moi = 0, lui = 0, vide = 0;
  for (const v of [a, b, c, d]) { if (v === p) moi++; else if (v === -1) vide++; else lui++; }
  if (moi === 4) return 100000;
  if (lui === 4) return -100000;
  if (moi === 3 && vide === 1) return 8;
  if (moi === 2 && vide === 2) return 3;
  if (lui === 3 && vide === 1) return -10;
  if (lui === 2 && vide === 2) return -2;
  return 0;
}

function evaluer(g, p) {
  let s = 0;
  for (let r = 0; r < H; r++) if (g[r * L + 3] === p) s += 4;
  for (let r = 0; r < H; r++) for (let c = 0; c < L; c++) {
    for (const [dr, dc] of DIRS) {
      const r3 = r + dr * 3, c3 = c + dc * 3;
      if (r3 < 0 || r3 >= H || c3 < 0 || c3 >= L) continue;
      s += noterFenetre(g[r * L + c], g[(r + dr) * L + c + dc], g[(r + 2 * dr) * L + c + 2 * dc], g[r3 * L + c3], p);
    }
  }
  return s;
}

const ORDRE = [3, 2, 4, 1, 5, 0, 6];

function minimax(g, prof, alpha, beta, tour, p) {
  const coups = ORDRE.filter(c => ligneLibre(g, c) >= 0);
  if (!coups.length) return 0;
  if (prof === 0) return evaluer(g, p);
  if (tour === p) {
    let meilleur = -Infinity;
    for (const c of coups) {
      const r = ligneLibre(g, c);
      g[r * L + c] = tour;
      const v = alignement(g, r, c, tour) ? 1000000 + prof : minimax(g, prof - 1, alpha, beta, 1 - tour, p);
      g[r * L + c] = -1;
      meilleur = Math.max(meilleur, v);
      alpha = Math.max(alpha, v);
      if (alpha >= beta) break;
    }
    return meilleur;
  }
  let pire = Infinity;
  for (const c of coups) {
    const r = ligneLibre(g, c);
    g[r * L + c] = tour;
    const v = alignement(g, r, c, tour) ? -1000000 - prof : minimax(g, prof - 1, alpha, beta, 1 - tour, p);
    g[r * L + c] = -1;
    pire = Math.min(pire, v);
    beta = Math.min(beta, v);
    if (alpha >= beta) break;
  }
  return pire;
}

export function meilleurCoup(grille, p, prof = 5) {
  const g = [...grille];
  let meilleur = null, score = -Infinity;
  for (const c of ORDRE) {
    const r = ligneLibre(g, c);
    if (r < 0) continue;
    g[r * L + c] = p;
    let v = alignement(g, r, c, p) ? 2000000 : minimax(g, prof - 1, -Infinity, Infinity, 1 - p, p);
    g[r * L + c] = -1;
    v += Math.random() * 2; // un peu de variété
    if (v > score) { score = v; meilleur = c; }
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
  id: 'puissance4',
  titre: 'Puissance 4',
  min: 2,
  max: 2,
  bots: true,
  tic: 200,
  vueCommune: true,

  creer(liste, t) {
    return {
      joueurs: copieJoueurs(liste).slice(0, 2),
      grille: Array(L * H).fill(-1),
      tour: Math.random() < 0.5 ? 0 : 1,
      dernier: null, ligne: null, gagnant: -1,
      tAction: t, fini: false, classement: [], evts: []
    };
  },

  action(e, id, d, t) {
    if (e.fini || !d || d.t !== 'jouer') return false;
    const i = indexDe(e, id);
    if (i !== e.tour) return false;
    const c = Number(d.col) | 0;
    if (c < 0 || c >= L) return false;
    const r = ligneLibre(e.grille, c);
    if (r < 0) return false;
    e.grille[r * L + c] = i;
    e.dernier = [r, c];
    e.tAction = t;
    const ligne = alignement(e.grille, r, c, i);
    if (ligne) { e.ligne = ligne; finir(e, i); }
    else if (e.grille.every(v => v !== -1)) finir(e, -1);
    else e.tour = 1 - i;
    return true;
  },

  etape() { return false; },

  bot(e, id, t) {
    const i = indexDe(e, id);
    if (e.fini || i !== e.tour || t - e.tAction < 700) return null;
    return { t: 'jouer', col: meilleurCoup(e.grille, i, 5) };
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
