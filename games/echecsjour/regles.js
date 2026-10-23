/* ==========================================================
   Échecs du jour — les outils communs (page du jeu, serveur, générateur)
   Les règles viennent du moteur des Échecs : games/multi/jeux/echecs.js
   Un problème : { fen: 64 cases (ligne 8 → ligne 1) + 'w' ou 'b' (qui joue), n: mat en n coups }
   ========================================================== */
import { coupsLegaux, _faire, _defaire, enEchec } from '../multi/jeux/echecs.js';

export const position = pb => ({ b: [...pb.fen.slice(0, 64)], tour: pb.fen[64] === 'b' ? 1 : 0, roque: '', ep: -1, demi: 0 });
export const texteCoup = m => 'abcdefgh'[m.de & 7] + (8 - (m.de >> 3)) + 'abcdefgh'[m.a & 7] + (8 - (m.a >> 3)) + (m.promo ? m.promo.toLowerCase() : '');
export const estMat = p => enEchec(p.b, p.tour) && coupsLegaux(p).length === 0;

// le camp qui joue peut-il mater en n coups (au plus), quoi que fasse l'autre ?
export function matEn(p, n) {
  for (const m of coupsLegaux(p)) {
    const s = _faire(p, m);
    // pour mater au dernier coup, il faut au moins faire échec (beaucoup plus rapide)
    if (n === 1 && !enEchec(p.b, p.tour)) { _defaire(p, m, s); continue; }
    let ok;
    const reponses = coupsLegaux(p);
    if (!reponses.length) ok = enEchec(p.b, p.tour);          // mat (pas pat)
    else if (n === 1) ok = false;
    else {
      ok = true;
      for (const r of reponses) {
        const s2 = _faire(p, r);
        const v = matEn(p, n - 1);
        _defaire(p, r, s2);
        if (!v) { ok = false; break; }
      }
    }
    _defaire(p, m, s);
    if (ok) return m;
  }
  return null;
}

// les coups qui gagnent (mat en n) : pour accepter toutes les bonnes réponses
export function coupsGagnants(p, n) {
  const res = [];
  for (const m of coupsLegaux(p)) {
    const s = _faire(p, m);
    if (n === 1 && !enEchec(p.b, p.tour)) { _defaire(p, m, s); continue; }
    const reponses = coupsLegaux(p);
    let ok;
    if (!reponses.length) ok = enEchec(p.b, p.tour);
    else if (n === 1) ok = false;
    else {
      ok = true;
      for (const r of reponses) { const s2 = _faire(p, r); const v = matEn(p, n - 1); _defaire(p, r, s2); if (!v) { ok = false; break; } }
    }
    _defaire(p, m, s);
    if (ok) res.push(m);
  }
  return res;
}

// la meilleure défense : celle qui retarde le plus le mat (sinon une au hasard)
export function defense(p, nRestant) {
  const reponses = coupsLegaux(p);
  if (!reponses.length) return null;
  let pire = [];
  for (const r of reponses) {
    const s = _faire(p, r);
    // si le joueur ne peut plus mater dans le temps qui reste : excellente défense
    let k = 1;
    while (k <= nRestant && !matEn(p, k)) k++;
    _defaire(p, r, s);
    if (!pire.length || k > pire[0][0]) pire = [[k, r]];
    else if (k === pire[0][0]) pire.push([k, r]);
  }
  return pire[Math.floor(Math.random() * pire.length)][1];
}

// vérifier une partie : coups = ['e2e4', …] (joueur, adversaire, joueur…). { mat: vrai/faux } ou null si un coup est faux
export function verifierSolution(pb, coups) {
  const p = position(pb);
  const joueur = p.tour;
  let coupsJoueur = 0;
  for (const c of coups) {
    const m = coupsLegaux(p).find(x => texteCoup(x) === String(c));
    if (!m) return null;
    if (p.tour === joueur) coupsJoueur++;
    _faire(p, m);
    if (coupsJoueur > pb.n) return { mat: false };
  }
  return { mat: p.tour !== joueur && estMat(p) };
}
