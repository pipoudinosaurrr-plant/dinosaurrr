/* ==========================================================
   Physique commune : une bille (disque) contre des murs
   Utilisée par le Flipper (games/flipper/moteur.js) et le Mini-golf (games/golf/moteur.js).
   - les murs sont des « gélules » (segments aux bouts arrondis) : pas d'angle vif,
     la bille glisse sans accroc d'un morceau de mur à l'autre
   - les ronds sont des disques (bumpers, poteaux…)
   - rebond (e) + frottement de Coulomb (f) au contact
   Ce fichier ne connaît pas les règles des jeux : il dit seulement « il y a contact ici ».
   ========================================================== */

// fabrique de murs : seg(ax, ay, bx, by, options), poly([[x, y], …]), rond(x, y, r)
export function formes(defaut = {}) {
  const c = [];
  const E = defaut.e ?? 0.5, F = defaut.f ?? 0.06, R = defaut.r ?? 3, EC = defaut.eRond ?? 0.6, FC = defaut.fRond ?? 0.05;
  const seg = (ax, ay, bx, by, o = {}) => {
    const s = { type: 's', ax, ay, bx, by, r: o.r ?? R, e: o.e ?? E, f: o.f ?? F, ...o };
    s.dx = bx - ax; s.dy = by - ay; s.l2 = s.dx * s.dx + s.dy * s.dy || 1;
    c.push(s);
    return s;
  };
  const poly = (pts, o) => { for (let i = 0; i < pts.length - 1; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o); };
  const rond = (x, y, r, o = {}) => { const s = { type: 'c', x, y, r, e: o.e ?? EC, f: o.f ?? FC, ...o }; c.push(s); return s; };
  return { c, seg, poly, rond };
}

// la bille (rayon rb) touche-t-elle le mur m ? Si oui : on la sort du mur et on renvoie la normale
// et la vitesse vers le mur (vn < 0 : elle fonce dedans). Sinon : null.
export function contact(b, m, rb) {
  let dx, dy, R;
  if (m.type === 's') {
    let t = ((b.x - m.ax) * m.dx + (b.y - m.ay) * m.dy) / m.l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    dx = b.x - (m.ax + m.dx * t); dy = b.y - (m.ay + m.dy * t);
    R = rb + m.r;
  } else {
    dx = b.x - m.x; dy = b.y - m.y;
    R = rb + m.r;
  }
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return null;
  if (m.sens && (b.x - m.ax) * m.sens[0] + (b.y - m.ay) * m.sens[1] < 0) return null;   // portillon : de l'autre côté, on passe
  const d = Math.sqrt(d2) || 1e-6;
  const nx = dx / d, ny = dy / d;
  b.x += nx * (R - d); b.y += ny * (R - d);
  return { nx, ny, vn: b.vx * nx + b.vy * ny };
}

// rebond + frottement (vn < 0)
export function reponse(b, nx, ny, vn, e, f, doux = 35) {
  if (vn > -doux) e = 0;                     // contact doux : la bille se pose au lieu de sautiller
  b.vx -= (1 + e) * vn * nx;
  b.vy -= (1 + e) * vn * ny;
  const tx = -ny, ty = nx;
  const vt = b.vx * tx + b.vy * ty;
  const fr = Math.min(Math.abs(vt), f * (1 + e) * -vn) * Math.sign(vt);
  b.vx -= fr * tx; b.vy -= fr * ty;
}

// deux billes qui se cognent (même masse)
export function chocBilles(a, b, rb, e = 0.9) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d2 = dx * dx + dy * dy, R = 2 * rb;
  if (d2 >= R * R || d2 === 0) return false;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
  const pousse = (R - d) / 2;
  a.x -= nx * pousse; a.y -= ny * pousse; b.x += nx * pousse; b.y += ny * pousse;
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return false;
  const j = -(1 + e) * vn / 2;
  a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny;
  return true;
}
