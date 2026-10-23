/* Blocs en duel — de 2 à 4 joueurs
   Chacun a sa grille (10 × 20). Faire des lignes envoie des lignes grises chez un adversaire :
   2 lignes → 1, 3 lignes → 2, 4 lignes → 4 (+ bonus de combo et de « 4 lignes » d'affilée).
   Les lignes reçues attendent : si tu fais des lignes avant qu'elles arrivent, elles s'annulent.
   Le dernier encore en vie gagne. Plus la partie dure, plus les pièces tombent vite. */
import { copieJoueurs, indexDe, classer } from './outils.js';

export const COL = 10, LIG = 20;
export const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
// les pièces (rotation façon « SRS », comme dans Blocs)
const FORMES = {
  I: { f: [[0, 1], [1, 1], [2, 1], [3, 1]], n: 4 }, O: { f: [[1, 0], [2, 0], [1, 1], [2, 1]], n: 4 },
  T: { f: [[1, 0], [0, 1], [1, 1], [2, 1]], n: 3 }, S: { f: [[1, 0], [2, 0], [0, 1], [1, 1]], n: 3 },
  Z: { f: [[0, 0], [1, 0], [1, 1], [2, 1]], n: 3 }, J: { f: [[0, 0], [0, 1], [1, 1], [2, 1]], n: 3 },
  L: { f: [[2, 0], [0, 1], [1, 1], [2, 1]], n: 3 }
};
const KICKS = {
  '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
};
const KICKS_I = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
};
export function cases(type, rot) {
  const p = FORMES[type];
  let f = p.f.map(([x, y]) => [x, y]);
  if (type === 'O') return f;
  for (let i = 0; i < rot; i++) f = f.map(([x, y]) => [p.n - 1 - y, x]);
  return f;
}

const ATTAQUE = [0, 0, 1, 2, 4];
const VERROU = 500;           // temps au sol avant que la pièce se pose (ms)
const GRIS = 8;

/* ---------- Une grille ---------- */
function vide() { return Array.from({ length: LIG }, () => Array(COL).fill(0)); }
function collision(g, type, x, y, rot) {
  for (const [cx, cy] of cases(type, rot)) {
    const gx = x + cx, gy = y + cy;
    if (gx < 0 || gx >= COL || gy >= LIG) return true;
    if (gy >= 0 && g[gy][gx]) return true;
  }
  return false;
}
function nouvellePiece(e, j, t, type) {
  type = type || j.suivantes.shift();
  while (j.suivantes.length < 4) j.suivantes.push(tirerCommun(j));
  j.p = { type, rot: 0, x: 3, y: type === 'I' ? -1 : 0 };
  j.tSol = 0; j.mouvementsSol = 0; j.tChute = t;
  if (collision(j.g, type, j.p.x, j.p.y, 0)) mourir(e, j, t);
}
function mourir(e, j, t) {
  if (!j.vivant) return;
  j.vivant = false; j.mort = t; j.p = null;
  e.evts.push(['mort', j.id]);
  const vivants = e.joueurs.filter(x => x.vivant);
  if (vivants.length <= 1) finir(e, t);
}
function finir(e, t) {
  if (e.fini) return;
  e.fini = true;
  const MAX = Number.MAX_SAFE_INTEGER;
  e.classement = classer(e.joueurs, j => (j.vivant ? MAX : j.mort), j => `${j.envoyees} ligne${j.envoyees > 1 ? 's' : ''} envoyée${j.envoyees > 1 ? 's' : ''} · ${j.lignes} faite${j.lignes > 1 ? 's' : ''}`);
}
// vitesse de chute (ms par case) : de plus en plus vite
const vitesse = (e, t) => Math.max(110, 900 - (t - e.debut) / 1000 * 5.5);

function poser(e, j, t) {
  const { type, rot, x, y } = j.p;
  let dessus = false;
  for (const [cx, cy] of cases(type, rot)) { if (y + cy < 0) dessus = true; else j.g[y + cy][x + cx] = TYPES.indexOf(type) + 1; }
  if (dessus) { mourir(e, j, t); return; }
  // lignes complètes
  const pleines = [];
  for (let r = 0; r < LIG; r++) if (j.g[r].every(c => c)) pleines.push(r);
  if (pleines.length) {
    for (const r of pleines) { j.g.splice(r, 1); j.g.unshift(Array(COL).fill(0)); }
    j.lignes += pleines.length;
    j.combo++;
    let force = ATTAQUE[pleines.length] + (j.combo >= 4 ? 2 : j.combo >= 2 ? 1 : 0);
    if (pleines.length === 4) { if (j.b2b) force++; j.b2b = true; } else j.b2b = false;
    if (j.g.every(l => l.every(c => !c))) force += 4;      // grille vide : gros bonus
    e.evts.push(['lignes', j.id, pleines.length]);
    // d'abord on annule ce qu'on allait recevoir
    while (force > 0 && j.attente.length) {
      const a = Math.min(force, j.attente[0]);
      j.attente[0] -= a; force -= a;
      if (!j.attente[0]) j.attente.shift();
    }
    if (force > 0) {
      const cibles = e.joueurs.filter(o => o.vivant && o.id !== j.id);
      if (cibles.length) {
        // on vise celui qui a le moins de lignes en attente (plus juste à 3-4 joueurs)
        cibles.sort((a, b) => a.attente.reduce((s, n) => s + n, 0) - b.attente.reduce((s, n) => s + n, 0) || Math.random() - 0.5);
        const c = cibles[0];
        c.attente.push(force);
        j.envoyees += force;
        e.evts.push(['attaque', j.id, c.id, force]);
      }
    }
  } else {
    j.combo = -1;
    // les lignes reçues montent maintenant (8 au plus d'un coup)
    let n = 0;
    while (j.attente.length && n < 8) {
      const paquet = Math.min(j.attente[0], 8 - n);
      const trou = Math.floor(Math.random() * COL);
      for (let k = 0; k < paquet; k++) {
        const haut = j.g.shift();
        if (haut.some(c => c)) { j.g.unshift(haut); mourir(e, j, t); return; }
        const l = Array(COL).fill(GRIS); l[trou] = 0;
        j.g.push(l);
      }
      n += paquet;
      j.attente[0] -= paquet;
      if (!j.attente[0]) j.attente.shift();
    }
    if (n) e.evts.push(['monte', j.id, n]);
  }
  j.reserveUtilisee = false;
  j.pieces++;
  nouvellePiece(e, j, t);
}

/* ---------- Le robot : il essaie tous les placements et garde le meilleur ---------- */
function noter(g) {
  let hauteur = 0, trous = 0, bosses = 0, prec = -1, lignes = 0;
  for (let r = 0; r < LIG; r++) if (g[r].every(c => c)) lignes++;
  for (let c = 0; c < COL; c++) {
    let h = 0, vu = false;
    for (let r = 0; r < LIG; r++) {
      if (g[r][c]) { if (!vu) { h = LIG - r; vu = true; } } else if (vu) trous++;
    }
    hauteur += h;
    if (prec >= 0) bosses += Math.abs(h - prec);
    prec = h;
  }
  return -0.51 * hauteur + 0.76 * lignes * (lignes >= 2 ? 1.3 : 1) - 0.36 * trous * 2 - 0.18 * bosses;
}
function placements(g, type) {
  const res = [];
  for (let rot = 0; rot < (type === 'O' ? 1 : 4); rot++) {
    for (let x = -2; x < COL; x++) {
      let y = type === 'I' ? -1 : 0;
      if (collision(g, type, x, y, rot)) continue;
      while (!collision(g, type, x, y + 1, rot)) y++;
      const copie = g.map(l => [...l]);
      let dehors = false;
      for (const [cx, cy] of cases(type, rot)) { if (y + cy < 0) dehors = true; else copie[y + cy][x + cx] = 1; }
      if (dehors) continue;
      res.push({ rot, x, note: noter(copie) });
    }
  }
  return res.sort((a, b) => b.note - a.note);
}

/* ---------- Le moteur ---------- */
export default {
  id: 'duelblocs',
  titre: 'Blocs en duel',
  min: 2,
  max: 4,
  bots: true,
  tic: 50,
  vueCommune: true,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 4);
    for (const j of joueurs) Object.assign(j, { g: vide(), sac: [], suivantes: [], p: null, reserve: null, reserveUtilisee: false, attente: [], lignes: 0, envoyees: 0, combo: -1, b2b: false, vivant: true, mort: 0, pieces: 0, tSol: 0, mouvementsSol: 0, tChute: t });
    const e = { joueurs, debut: t + 3000, fini: false, classement: [], evts: [] };
    // tout le monde reçoit les mêmes pièces (c'est plus juste)
    let graine = Math.floor(Math.random() * 1e9);
    const sacCommun = () => { const s = [...TYPES]; for (let i = s.length - 1; i > 0; i--) { graine = (graine * 16807) % 2147483647; const k = graine % (i + 1); [s[i], s[k]] = [s[k], s[i]]; } return s; };
    const sacs = Array.from({ length: 60 }, sacCommun).flat();
    for (const j of joueurs) { j.file = [...sacs]; j.sac = []; while (j.suivantes.length < 4) j.suivantes.push(tirerCommun(j)); }
    return e;
  },

  action(e, id, d, t) {
    if (e.fini || !d || t < e.debut) return false;
    const j = e.joueurs[indexDe(e, id)];
    if (!j || !j.vivant) return false;
    if (!j.p) nouvellePiece(e, j, t, null);
    const p = j.p;
    if (!p) return false;
    const auSol = () => collision(j.g, p.type, p.x, p.y + 1, p.rot);
    const toucheSol = () => { if (auSol() && j.mouvementsSol < 15) { j.tSol = t; j.mouvementsSol++; } };
    switch (d.t) {
      case 'g': case 'd': {
        const dx = d.t === 'g' ? -1 : 1;
        if (collision(j.g, p.type, p.x + dx, p.y, p.rot)) return false;
        p.x += dx; toucheSol(); return true;
      }
      case 'r': {
        if (p.type === 'O') return false;
        const de = p.rot, vers = (p.rot + (d.s === -1 ? 3 : 1)) % 4;
        for (const [kx, ky] of (p.type === 'I' ? KICKS_I : KICKS)[de + '>' + vers]) {
          if (!collision(j.g, p.type, p.x + kx, p.y - ky, vers)) { p.x += kx; p.y -= ky; p.rot = vers; toucheSol(); return true; }
        }
        return false;
      }
      case 'b': {
        if (auSol()) return false;
        p.y++; j.tChute = t; return true;
      }
      case 'c': {
        while (!auSol()) p.y++;
        poser(e, j, t);
        e.evts.push(['pose', j.id]);
        return true;
      }
      case 'h': {
        if (j.reserveUtilisee) return false;
        const type = p.type;
        if (j.reserve) nouvellePiece(e, j, t, j.reserve); else nouvellePiece(e, j, t);
        j.reserve = type; j.reserveUtilisee = true;
        return true;
      }
    }
    return false;
  },

  etape(e, t) {
    if (e.fini || t < e.debut) return false;
    let change = false;
    const v = vitesse(e, t);
    for (const j of e.joueurs) {
      if (!j.vivant) continue;
      if (!j.p) { nouvellePiece(e, j, t); change = true; continue; }
      const p = j.p;
      const auSol = collision(j.g, p.type, p.x, p.y + 1, p.rot);
      if (auSol) {
        if (!j.tSol) j.tSol = t;
        if (t - j.tSol >= VERROU) { poser(e, j, t); change = true; }
      } else {
        j.tSol = 0;
        if (t - j.tChute >= v) { p.y++; j.tChute = t; change = true; }
      }
    }
    return change;
  },

  bot(e, id, t) {
    if (e.fini || t < e.debut) return null;
    const j = e.joueurs[indexDe(e, id)];
    if (!j || !j.vivant || !j.p) return null;
    // un robot n'est pas instantané : une action toutes les ~110 ms (plus vite quand ça presse)
    const rythme = 230 - Math.min(110, (t - e.debut) / 1500);
    if (t - (j.tBot || 0) < rythme) return null;
    j.tBot = t;
    if (!j.plan || j.plan.piece !== j.pieces) {
      // de temps en temps, le robot se trompe un peu (comme un humain)
      const liste = placements(j.g, j.p.type);
      const m = liste[Math.random() < 0.15 ? Math.min(liste.length - 1, 1 + Math.floor(Math.random() * 2)) : 0];
      j.plan = m ? { ...m, piece: j.pieces } : { rot: 0, x: j.p.x, piece: j.pieces };
    }
    const p = j.p, plan = j.plan;
    if (p.rot !== plan.rot) return { t: 'r', s: 1 };
    if (p.x < plan.x) return { t: 'd' };
    if (p.x > plan.x) return { t: 'g' };
    return { t: 'c' };
  },

  retirer(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (!j || !j.vivant || e.fini) return false;
    mourir(e, j, t);
    return true;
  },

  vue(e, id, t) {
    return {
      t0: Math.max(0, e.debut - t),
      vitesse: Math.round(vitesse(e, t)),
      j: e.joueurs.map(j => ({
        id: j.id,
        g: j.g.map(l => l.join('')).join(''),
        p: j.p ? { ...j.p } : null,
        s: j.suivantes.slice(0, 3),
        r: j.reserve,
        a: j.attente.reduce((s, n) => s + n, 0),
        l: j.lignes, env: j.envoyees, v: j.vivant, c: j.combo
      })),
      fini: e.fini
    };
  },

  admin: {
    commandes: [
      { id: 'vider', nom: 'Vider ma grille', icone: '🧹', texte: 'a vidé sa grille' },
      { id: 'attaque', nom: 'Envoyer 4 lignes à tout le monde', icone: '💥', texte: 'a envoyé 4 lignes à tout le monde' }
    ],
    faire(e, id, cmd, t) {
      const j = e.joueurs[indexDe(e, id)];
      if (!j || !j.vivant) return null;
      if (cmd === 'vider') { j.g = vide(); j.attente = []; return {}; }
      if (cmd === 'attaque') { for (const o of e.joueurs) if (o.vivant && o.id !== id) o.attente.push(4); return {}; }
      return null;
    },
    victoire(e, id, t) {
      for (const o of e.joueurs) if (o.id !== id && o.vivant) { o.vivant = false; o.mort = t; }
      finir(e, t);
    }
  }
};

// les pièces suivantes : la même suite pour tout le monde
function tirerCommun(j) {
  if (!j.sac.length) j.sac = j.file.length ? j.file.splice(0, 7).reverse() : [...TYPES].sort(() => Math.random() - 0.5);
  return j.sac.pop();
}
