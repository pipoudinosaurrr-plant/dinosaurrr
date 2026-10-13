/* Bataille navale — 2 joueurs, grille 10 × 10 */
import { copieJoueurs, indexDe, classer } from './outils.js';

export const N = 10;
export const BATEAUX = [5, 4, 3, 3, 2];
// tirs : 0 = pas encore, 1 = à l'eau, 2 = touché, 3 = coulé

export function flotteAuHasard() {
  for (let essai = 0; essai < 200; essai++) {
    const occupe = Array(N * N).fill(false);
    const flotte = [];
    let ok = true;
    for (const taille of BATEAUX) {
      let place = false;
      for (let k = 0; k < 300 && !place; k++) {
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (horiz ? N : N - taille + 1));
        const c = Math.floor(Math.random() * (horiz ? N - taille + 1 : N));
        const cases = Array.from({ length: taille }, (_, i) => (horiz ? [r, c + i] : [r + i, c]));
        // les bateaux ne se touchent pas, même en diagonale
        const libre = cases.every(([rr, cc]) => {
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const a = rr + dr, b = cc + dc;
            if (a >= 0 && a < N && b >= 0 && b < N && occupe[a * N + b]) return false;
          }
          return true;
        });
        if (!libre) continue;
        cases.forEach(([rr, cc]) => { occupe[rr * N + cc] = true; });
        flotte.push({ taille, cases, touches: 0 });
        place = true;
      }
      if (!place) { ok = false; break; }
    }
    if (ok) return flotte;
  }
  return null;
}

const bateauEn = (flotte, r, c) => flotte.find(b => b.cases.some(([rr, cc]) => rr === r && cc === c));
const coule = b => b.touches >= b.taille;

/* ---------- L'ordinateur ---------- */

export function choisirTir(tirs) {
  const libre = k => k >= 0 && k < N * N && tirs[k] === 0;
  const voisins = k => {
    const r = Math.floor(k / N), c = k % N, v = [];
    if (r > 0) v.push(k - N);
    if (r < N - 1) v.push(k + N);
    if (c > 0) v.push(k - 1);
    if (c < N - 1) v.push(k + 1);
    return v;
  };
  const touches = [];
  tirs.forEach((v, k) => { if (v === 2) touches.push(k); });
  if (touches.length) {
    let alignes = [];
    if (touches.length >= 2) {
      for (const a of touches) for (const b of touches) {
        if (a === b) continue;
        if (Math.floor(a / N) === Math.floor(b / N) && Math.abs(a - b) === 1) alignes.push(...[a - 1, a + 1].filter(k => Math.floor(k / N) === Math.floor(a / N)));
        if (Math.abs(a - b) === N) alignes.push(a - N, a + N);
      }
      alignes = alignes.filter(libre);
    }
    const choix = alignes.length ? alignes : touches.flatMap(voisins).filter(libre);
    if (choix.length) return choix[Math.floor(Math.random() * choix.length)];
  }
  let libres = [];
  tirs.forEach((v, k) => { if (v === 0 && (Math.floor(k / N) + k % N) % 2 === 0) libres.push(k); });
  if (!libres.length) tirs.forEach((v, k) => { if (v === 0) libres.push(k); });
  return libres[Math.floor(Math.random() * libres.length)];
}

/* ---------- Le jeu ---------- */

function finir(e, gagnant) {
  e.fini = true;
  e.gagnant = gagnant;
  e.classement = classer(e.joueurs, j => (indexDe(e, j.id) === gagnant ? 1 : 0), j => {
    const i = indexDe(e, j.id);
    const restants = e.flottes[i].filter(b => !coule(b)).length;
    return i === gagnant ? `Victoire · ${restants} bateau${restants > 1 ? 'x' : ''} restant${restants > 1 ? 's' : ''}` : 'Flotte coulée';
  });
}

export default {
  id: 'navale',
  titre: 'Bataille navale',
  min: 2,
  max: 2,
  bots: true,
  tic: 200,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 2);
    return {
      joueurs,
      flottes: [flotteAuHasard(), flotteAuHasard()],
      tirs: [Array(N * N).fill(0), Array(N * N).fill(0)],
      prets: joueurs.map(j => !!j.bot),
      phase: 'placement',
      tour: Math.random() < 0.5 ? 0 : 1,
      dernier: null, gagnant: -1,
      tAction: t, fini: false, classement: [], evts: []
    };
  },

  action(e, id, d, t) {
    if (e.fini || !d) return false;
    const i = indexDe(e, id);
    if (i < 0) return false;
    if (e.phase === 'placement') {
      if (d.t === 'melanger' && !e.prets[i]) { e.flottes[i] = flotteAuHasard(); return true; }
      if (d.t === 'pret') {
        e.prets[i] = true;
        if (e.prets.every(Boolean)) { e.phase = 'tir'; e.tAction = t; }
        return true;
      }
      return false;
    }
    if (d.t !== 'tir' || i !== e.tour) return false;
    const k = Number(d.k) | 0;
    if (k < 0 || k >= N * N || e.tirs[i][k] !== 0) return false;
    const r = Math.floor(k / N), c = k % N;
    const b = bateauEn(e.flottes[1 - i], r, c);
    let resultat = 'eau';
    if (b) {
      b.touches++;
      e.tirs[i][k] = 2;
      resultat = 'touche';
      if (coule(b)) {
        resultat = 'coule';
        b.cases.forEach(([rr, cc]) => { e.tirs[i][rr * N + cc] = 3; });
      }
    } else e.tirs[i][k] = 1;
    e.dernier = { par: i, k, resultat, taille: b ? b.taille : 0 };
    e.tAction = t;
    if (e.flottes[1 - i].every(coule)) finir(e, i);
    else e.tour = 1 - i;
    return true;
  },

  etape(e, t) {
    if (e.phase === 'placement' && e.prets.every(Boolean)) { e.phase = 'tir'; e.tAction = t; return true; }
    return false;
  },

  bot(e, id, t) {
    const i = indexDe(e, id);
    if (e.fini || e.phase !== 'tir' || i !== e.tour || t - e.tAction < 900) return null;
    return { t: 'tir', k: choisirTir(e.tirs[i]) };
  },

  retirer(e, id) {
    const i = indexDe(e, id);
    if (e.fini || i < 0) return false;
    finir(e, 1 - i);
    return true;
  },

  vue(e, id) {
    const i = indexDe(e, id);
    const lui = i < 0 ? 1 : 1 - i;
    const moi = i < 0 ? 0 : i;
    const montrerTout = e.fini;
    return {
      phase: e.phase,
      tour: e.tour,
      j: e.joueurs.map(j => j.id),
      moi: i,
      prets: e.prets,
      flotte: i < 0 ? [] : e.flottes[i].map(b => ({ cases: b.cases, coule: coule(b) })),
      mesTirs: e.tirs[moi],
      sesTirs: e.tirs[lui],
      adverse: e.flottes[lui].filter(b => montrerTout || coule(b)).map(b => ({ cases: b.cases, coule: coule(b) })),
      restants: e.flottes.map(f => f.filter(b => !coule(b)).length),
      dernier: e.dernier,
      gagnant: e.gagnant,
      fini: e.fini
    };
  }
};
