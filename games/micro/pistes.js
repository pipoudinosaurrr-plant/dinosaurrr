/* ==========================================================
   Micro — les circuits (vue de dessus, monde de 1000 × 700)
   Un circuit = des points de passage (le milieu de la route) qu'on lisse en une courbe fermée.
   On en tire : les points du milieu (pour l'ordinateur et le compte des tours) et les murs des deux bords.
   Partagé par le jeu (games/micro.html) et le serveur (games/multi/jeux/micro.js).
   ========================================================== */
import { formes } from '../physique/collisions.js';

export const MONDE = { l: 1000, h: 700 };

export const CIRCUITS = {
  ovale: {
    nom: 'Le petit ovale', largeur: 96, sol: 'herbe',
    points: [[180, 350], [200, 190], [330, 110], [670, 110], [800, 190], [820, 350], [800, 510], [670, 590], [330, 590], [200, 510]]
  },
  huit: {
    nom: 'La cuisine', largeur: 84, sol: 'carrelage',
    points: [[140, 560], [110, 380], [170, 220], [320, 150], [480, 190], [560, 300], [660, 340], [760, 300], [810, 190], [900, 180], [935, 320], [905, 480], [790, 590], [620, 610], [470, 560], [330, 615]]
  },
  serpent: {
    nom: 'Le bureau', largeur: 78, sol: 'bois',
    points: [[120, 620], [100, 470], [150, 330], [110, 190], [200, 90], [330, 120], [360, 250], [300, 370], [360, 470], [480, 450], [520, 330], [480, 200], [560, 100], [700, 110], [760, 220], [700, 330], [760, 430], [880, 420], [920, 560], [820, 640], [600, 600], [420, 630], [260, 650]]
  }
};
export const IDS = Object.keys(CIRCUITS);

// courbe de Catmull-Rom fermée : des points réguliers tous les ~pas pixels
function lisser(points, pas = 12) {
  const n = points.length;
  const res = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const longueur = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.max(2, Math.round(longueur / pas));
    for (let s = 0; s < k; s++) {
      const t = s / k, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      res.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return res;
}

const cache = {};
export function construire(id) {
  if (cache[id]) return cache[id];
  const c = CIRCUITS[id] || CIRCUITS.ovale;
  const milieu = lisser(c.points);
  const n = milieu.length;
  // la direction et la normale en chaque point
  const dirs = milieu.map((p, i) => { const a = milieu[(i - 1 + n) % n], b = milieu[(i + 1) % n]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; });
  const demi = c.largeur / 2;
  const gauche = milieu.map((p, i) => [p[0] + dirs[i][1] * demi, p[1] - dirs[i][0] * demi]);
  const droite = milieu.map((p, i) => [p[0] - dirs[i][1] * demi, p[1] + dirs[i][0] * demi]);
  // les murs (bords de la route), avec un peu de marge pour l'herbe
  const o = formes({ r: 4, e: 0.35, f: 0.15 });
  const marge = 14;
  const g2 = milieu.map((p, i) => [p[0] + dirs[i][1] * (demi + marge), p[1] - dirs[i][0] * (demi + marge)]);
  const d2 = milieu.map((p, i) => [p[0] - dirs[i][1] * (demi + marge), p[1] + dirs[i][0] * (demi + marge)]);
  o.poly([...g2, g2[0]]);
  o.poly([...d2, d2[0]]);
  // la grille de départ : 4 places juste derrière la ligne
  const depart = [0, 1, 2, 3].map(k => {
    const i = (n - 3 - Math.floor(k / 2) * 3) % n;
    const cote = k % 2 ? -1 : 1;
    const p = milieu[i];
    return { x: p[0] + dirs[i][1] * demi * 0.45 * cote, y: p[1] - dirs[i][0] * demi * 0.45 * cote, a: Math.atan2(dirs[i][1], dirs[i][0]) };
  });
  cache[id] = { id, nom: c.nom, sol: c.sol, largeur: c.largeur, milieu, dirs, gauche, droite, murs: o.c, depart, n };
  return cache[id];
}

// l'index du point du milieu le plus proche (en cherchant autour de l'ancien, pour aller vite)
export function plusProche(piste, x, y, autour = -1) {
  const n = piste.n;
  let meilleur = -1, d = Infinity;
  const cherche = i => { const p = piste.milieu[(i + n) % n]; const dd = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (dd < d) { d = dd; meilleur = (i + n) % n; } };
  if (autour < 0) for (let i = 0; i < n; i++) cherche(i);
  else for (let k = -12; k <= 12; k++) cherche(autour + k);
  return { i: meilleur, d: Math.sqrt(d) };
}
