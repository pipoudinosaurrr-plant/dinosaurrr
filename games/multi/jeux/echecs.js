/* Échecs — toutes les règles (roque, prise en passant, promotion, pat, nulles)
   + un ordinateur (recherche alpha-bêta, 3 niveaux).
   Plateau : 64 cases, index = ligne * 8 + colonne, ligne 0 = 8e rangée (côté noirs).
   Pièces : P C F T D R… en notation anglaise dans le code : P N B R Q K (blancs en majuscules). */
import { copieJoueurs, indexDe, classer } from './outils.js';

const VIDE = '.';
const estBlanc = p => p !== VIDE && p === p.toUpperCase();
const couleurDe = p => (p === VIDE ? -1 : estBlanc(p) ? 0 : 1);
const CAVALIER = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const ROI = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const FOU = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const TOUR = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const dans = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function positionDepart() {
  return [...'rnbqkbnr', ...'pppppppp', ...VIDE.repeat(32), ...'PPPPPPPP', ...'RNBQKBNR'];
}

// la case i est-elle attaquée par la couleur « par » ?
export function attaquee(b, i, par) {
  const r = i >> 3, c = i & 7;
  const pion = par === 0 ? 'P' : 'p', dir = par === 0 ? 1 : -1;   // un pion blanc attaque vers le haut
  for (const dc of [-1, 1]) { const rr = r + dir, cc = c + dc; if (dans(rr, cc) && b[rr * 8 + cc] === pion) return true; }
  const cav = par === 0 ? 'N' : 'n';
  for (const [dr, dc] of CAVALIER) { const rr = r + dr, cc = c + dc; if (dans(rr, cc) && b[rr * 8 + cc] === cav) return true; }
  const roi = par === 0 ? 'K' : 'k';
  for (const [dr, dc] of ROI) { const rr = r + dr, cc = c + dc; if (dans(rr, cc) && b[rr * 8 + cc] === roi) return true; }
  const [fou, tour, dame] = par === 0 ? ['B', 'R', 'Q'] : ['b', 'r', 'q'];
  for (const [dirs, p1] of [[FOU, fou], [TOUR, tour]]) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (dans(rr, cc)) {
        const p = b[rr * 8 + cc];
        if (p !== VIDE) { if (p === p1 || p === dame) return true; break; }
        rr += dr; cc += dc;
      }
    }
  }
  return false;
}

const roiDe = (b, coul) => b.indexOf(coul === 0 ? 'K' : 'k');
export const enEchec = (b, coul) => attaquee(b, roiDe(b, coul), 1 - coul);

// coups « pseudo-légaux » (sans vérifier si on laisse son roi en échec)
function pseudoCoups(p, coul) {
  const b = p.b, coups = [];
  for (let i = 0; i < 64; i++) {
    const piece = b[i];
    if (piece === VIDE || couleurDe(piece) !== coul) continue;
    const r = i >> 3, c = i & 7, t = piece.toUpperCase();
    const ajouter = (a, extra = {}) => coups.push({ de: i, a, prise: b[a] !== VIDE ? b[a] : null, ...extra });
    if (t === 'P') {
      const dir = coul === 0 ? -1 : 1, depart = coul === 0 ? 6 : 1, derniere = coul === 0 ? 0 : 7;
      const promo = (a, extra) => { if ((a >> 3) === derniere) for (const q of 'QRBN') ajouter(a, { ...extra, promo: q }); else ajouter(a, extra); };
      const un = i + dir * 8;
      if (dans(r + dir, c) && b[un] === VIDE) {
        promo(un);
        if (r === depart && b[un + dir * 8] === VIDE) ajouter(un + dir * 8, { double: true });
      }
      for (const dc of [-1, 1]) {
        if (!dans(r + dir, c + dc)) continue;
        const a = (r + dir) * 8 + c + dc;
        if (b[a] !== VIDE && couleurDe(b[a]) !== coul) promo(a);
        else if (a === p.ep) coups.push({ de: i, a, prise: coul === 0 ? 'p' : 'P', ep: true });
      }
    } else if (t === 'N' || t === 'K') {
      for (const [dr, dc] of t === 'N' ? CAVALIER : ROI) {
        const rr = r + dr, cc = c + dc;
        if (!dans(rr, cc)) continue;
        const a = rr * 8 + cc;
        if (b[a] === VIDE || couleurDe(b[a]) !== coul) ajouter(a);
      }
      if (t === 'K') {
        // roques
        const ligne = coul === 0 ? 7 : 0, k = ligne * 8 + 4;
        if (i === k && !attaquee(b, k, 1 - coul)) {
          const [pt, gt] = coul === 0 ? ['K', 'Q'] : ['k', 'q'];
          if (p.roque.includes(pt) && b[k + 1] === VIDE && b[k + 2] === VIDE && !attaquee(b, k + 1, 1 - coul) && !attaquee(b, k + 2, 1 - coul)) ajouter(k + 2, { roque: 'petit' });
          if (p.roque.includes(gt) && b[k - 1] === VIDE && b[k - 2] === VIDE && b[k - 3] === VIDE && !attaquee(b, k - 1, 1 - coul) && !attaquee(b, k - 2, 1 - coul)) ajouter(k - 2, { roque: 'grand' });
        }
      }
    } else {
      const dirs = t === 'B' ? FOU : t === 'R' ? TOUR : [...FOU, ...TOUR];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (dans(rr, cc)) {
          const a = rr * 8 + cc;
          if (b[a] === VIDE) ajouter(a);
          else { if (couleurDe(b[a]) !== coul) ajouter(a); break; }
          rr += dr; cc += dc;
        }
      }
    }
  }
  return coups;
}

// jouer un coup sur une position ; renvoie de quoi l'annuler
function faire(p, m) {
  const b = p.b;
  const sauve = { roque: p.roque, ep: p.ep, demi: p.demi, piece: b[m.de], prise: b[m.a] };
  const piece = b[m.de], coul = couleurDe(piece);
  b[m.a] = m.promo ? (coul === 0 ? m.promo : m.promo.toLowerCase()) : piece;
  b[m.de] = VIDE;
  if (m.ep) { const cap = m.a + (coul === 0 ? 8 : -8); sauve.epCase = cap; sauve.epPiece = b[cap]; b[cap] = VIDE; }
  if (m.roque) {
    const ligne = coul === 0 ? 56 : 0;
    if (m.roque === 'petit') { b[ligne + 5] = b[ligne + 7]; b[ligne + 7] = VIDE; }
    else { b[ligne + 3] = b[ligne]; b[ligne] = VIDE; }
  }
  // droits de roque
  let r = p.roque;
  if (piece === 'K') r = r.replace(/[KQ]/g, '');
  if (piece === 'k') r = r.replace(/[kq]/g, '');
  for (const [cas, l] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.de === cas || m.a === cas) r = r.replace(l, '');
  p.roque = r;
  p.ep = m.double ? (m.de + m.a) / 2 : -1;
  p.demi = (piece.toUpperCase() === 'P' || sauve.prise !== VIDE || m.ep) ? 0 : p.demi + 1;
  p.tour = 1 - p.tour;
  return sauve;
}
function defaire(p, m, s) {
  const b = p.b;
  b[m.de] = s.piece; b[m.a] = s.prise;
  if (m.ep) b[s.epCase] = s.epPiece;
  if (m.roque) {
    const ligne = couleurDe(s.piece) === 0 ? 56 : 0;
    if (m.roque === 'petit') { b[ligne + 7] = b[ligne + 5]; b[ligne + 5] = VIDE; }
    else { b[ligne] = b[ligne + 3]; b[ligne + 3] = VIDE; }
  }
  p.roque = s.roque; p.ep = s.ep; p.demi = s.demi; p.tour = 1 - p.tour;
}

export const _faire = (p, m) => faire(p, m), _defaire = (p, m, s) => defaire(p, m, s);
export function coupsLegaux(p, coul = p.tour) {
  const res = [];
  for (const m of pseudoCoups(p, coul)) {
    const s = faire(p, m);
    if (!enEchec(p.b, coul)) res.push(m);
    defaire(p, m, s);
  }
  return res;
}

const cle = p => p.b.join('') + p.tour + p.roque + p.ep;

function materielInsuffisant(b) {
  const pieces = b.filter(x => x !== VIDE && x.toUpperCase() !== 'K');
  if (!pieces.length) return true;
  if (pieces.length === 1 && 'BN'.includes(pieces[0].toUpperCase())) return true;
  return false;
}

/* ---------- Notation (en français : R D T F C) ---------- */
const LETTRE = { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C', P: '' };
const nomCase = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
function notation(p, m, legaux) {
  if (m.roque) return m.roque === 'petit' ? 'O-O' : 'O-O-O';
  const piece = p.b[m.de], t = piece.toUpperCase();
  let s = LETTRE[t];
  if (t !== 'P') {
    const autres = legaux.filter(x => x !== m && x.a === m.a && p.b[x.de] === piece);
    if (autres.length) {
      if (autres.every(x => (x.de & 7) !== (m.de & 7))) s += 'abcdefgh'[m.de & 7];
      else if (autres.every(x => (x.de >> 3) !== (m.de >> 3))) s += 8 - (m.de >> 3);
      else s += nomCase(m.de);
    }
  }
  if (m.prise || m.ep) s += (t === 'P' ? 'abcdefgh'[m.de & 7] : '') + 'x';
  s += nomCase(m.a);
  if (m.promo) s += '=' + LETTRE[m.promo];
  return s;
}

/* ---------- L'ordinateur ---------- */
const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
// bonus de placement (vue des blancs, ligne 0 = 8e rangée)
const PST = {
  P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
};
function evaluer(b) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (p === VIDE) continue;
    const t = p.toUpperCase();
    if (estBlanc(p)) s += VAL[t] + PST[t][i];
    else s -= VAL[t] + PST[t][(7 - (i >> 3)) * 8 + (i & 7)];
  }
  return s;
}
function trier(coups) {
  return coups.sort((a, b) => ((b.prise ? VAL[b.prise.toUpperCase()] * 10 : 0) + (b.promo ? 800 : 0)) - ((a.prise ? VAL[a.prise.toUpperCase()] * 10 : 0) + (a.promo ? 800 : 0)));
}
let noeuds = 0;
function negamax(p, prof, alpha, beta) {
  noeuds++;
  const coul = p.tour;
  if (prof === 0) return captures(p, alpha, beta, 4);
  let legal = 0, meilleur = -Infinity;
  for (const m of trier(pseudoCoups(p, coul))) {
    const s = faire(p, m);
    if (enEchec(p.b, coul)) { defaire(p, m, s); continue; }
    legal++;
    const v = -negamax(p, prof - 1, -beta, -alpha);
    defaire(p, m, s);
    if (v > meilleur) meilleur = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta || noeuds > 100000) break;
  }
  if (!legal) return enEchec(p.b, coul) ? -100000 - prof : 0;
  return meilleur;
}
// on regarde les captures au bout de la recherche, pour ne pas laisser une pièce en prise
function captures(p, alpha, beta, prof) {
  const coul = p.tour;
  const base = (coul === 0 ? 1 : -1) * evaluer(p.b);
  if (base >= beta || prof === 0) return base;
  if (base > alpha) alpha = base;
  for (const m of trier(pseudoCoups(p, coul).filter(m => m.prise))) {
    const s = faire(p, m);
    if (enEchec(p.b, coul)) { defaire(p, m, s); continue; }
    const v = -captures(p, -beta, -alpha, prof - 1);
    defaire(p, m, s);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}
export function meilleurCoup(pos, niveau = 2) {
  const p = { b: [...pos.b], tour: pos.tour, roque: pos.roque, ep: pos.ep, demi: pos.demi };
  const legaux = coupsLegaux(p);
  if (!legaux.length) return null;
  if (niveau <= 1 && Math.random() < 0.3) return legaux[Math.floor(Math.random() * legaux.length)];
  const prof = niveau <= 1 ? 1 : niveau === 2 ? 2 : 4;
  noeuds = 0;
  const notes = [];
  for (const m of trier(legaux)) {
    const s = faire(p, m);
    const v = -negamax(p, prof - 1, -Infinity, Infinity);
    defaire(p, m, s);
    notes.push([v + Math.random() * (niveau <= 1 ? 60 : niveau === 2 ? 12 : 4), m]);
  }
  notes.sort((a, b) => b[0] - a[0]);
  return notes[0][1];
}

/* ---------- Le jeu ---------- */
function finir(e, gagnant, raison) {
  e.fini = true; e.gagnant = gagnant; e.raison = raison;
  e.classement = classer(e.joueurs, j => (gagnant === -1 ? 0 : (indexDe(e, j.id) === gagnant ? 1 : 0)), j => (gagnant === -1 ? 'Nulle' : (indexDe(e, j.id) === gagnant ? 'Victoire' : 'Défaite')));
  e.evts.push(['fin', gagnant, raison]);
}

export default {
  id: 'echecs',
  titre: 'Échecs',
  min: 2,
  max: 2,
  bots: true,
  tic: 250,
  vueCommune: true,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 2);
    // les blancs sont tirés au sort (sauf à 2 sur le même écran : Joueur 1 a les blancs)
    if (!(joueurs[1] && joueurs[1].id === 'moi2') && Math.random() < 0.5) joueurs.reverse();
    const e = {
      joueurs, b: positionDepart(), tour: 0, roque: 'KQkq', ep: -1, demi: 0,
      cles: {}, san: [], dernier: null, prises: [[], []],
      tAction: t, fini: false, gagnant: -1, raison: '', classement: [], evts: []
    };
    e.cles[cle(e)] = 1;
    e.legaux = coupsLegaux(e);
    return e;
  },

  action(e, id, d, t) {
    if (e.fini || !d) return false;
    const i = indexDe(e, id);
    if (i < 0) return false;
    if (d.t === 'abandon') { finir(e, 1 - i, 'abandon'); return true; }
    if (d.t !== 'coup' || i !== e.tour) return false;
    const m = e.legaux.find(x => x.de === d.de && x.a === d.a && (x.promo || null) === (x.promo ? (d.promo || 'Q') : null));
    if (!m) return false;
    const san = notation(e, m, e.legaux);
    if (m.prise) e.prises[i].push(m.prise);
    faire(e, m);
    e.dernier = [m.de, m.a];
    e.tAction = t;
    e.legaux = coupsLegaux(e);
    const echec = enEchec(e.b, e.tour);
    e.san.push(san + (echec ? (e.legaux.length ? '+' : '#') : ''));
    e.evts.push([m.prise ? 'prise' : 'coup', echec ? 1 : 0]);
    const k = cle(e);
    e.cles[k] = (e.cles[k] || 0) + 1;
    if (!e.legaux.length) finir(e, echec ? i : -1, echec ? 'mat' : 'pat');
    else if (e.demi >= 100) finir(e, -1, '50 coups');
    else if (e.cles[k] >= 3) finir(e, -1, 'répétition');
    else if (materielInsuffisant(e.b)) finir(e, -1, 'matériel');
    return true;
  },

  etape() { return false; },

  bot(e, id, t) {
    const i = indexDe(e, id);
    if (e.fini || i !== e.tour || t - e.tAction < 450) return null;
    const niveau = (typeof globalThis !== 'undefined' && globalThis.ECHECS_NIVEAU) || 2;
    const m = meilleurCoup(e, niveau);
    if (!m) return null;
    return { t: 'coup', de: m.de, a: m.a, promo: m.promo };
  },

  retirer(e, id) {
    const i = indexDe(e, id);
    if (e.fini || i < 0) return false;
    finir(e, 1 - i, 'départ');
    return true;
  },

  vue(e) {
    return {
      b: e.b.join(''), tour: e.tour, j: e.joueurs.map(j => j.id),
      dernier: e.dernier, echec: enEchec(e.b, e.tour),
      coups: e.fini ? [] : e.legaux.map(m => (m.promo ? [m.de, m.a, 1] : [m.de, m.a])),
      san: e.san, prises: e.prises.map(l => l.join('')),
      fini: e.fini, gagnant: e.gagnant, raison: e.raison
    };
  }
};
