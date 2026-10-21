/* ==========================================================
   Flipper — le moteur physique et les règles
   Tout est en pixels et en secondes. La table fait 500 × 900.
   - la bille est un disque (rayon 9) soumis à la pente de la table
   - les murs sont des « gélules » (segments arrondis) : pas d'angle vif,
     la bille roule sans accroc d'un morceau de mur à l'autre
   - les flippers sont des gélules qui s'affinent vers le bout et qui
     tournent vraiment : la vitesse du flipper au point de contact
     s'ajoute à la bille (tir fort près du bout, doux près de l'axe)
   - petits pas de calcul (720 par seconde) pour que rien ne traverse
   Ce fichier ne dessine rien : games/flipper.html s'occupe de l'affichage.
   ========================================================== */

export const LARGEUR = 500, HAUTEUR = 900;
export const BR = 9;                      // rayon de la bille
const GRAVITE = 980;                      // pente de la table (≈ 6,5° pour une vraie bille)
const FROTTEMENT_AIR = 0.012;             // freinage de roulement (par seconde)
const VMAX = 3400;                        // vitesse maximale de la bille
const PAS = 1 / 720;                      // pas de calcul

// flippers : axe, longueur, rayons (base → bout), angles (radians, 0 = horizontal)
export const FLIP = { L: 76, R1: 11, R2: 5.5, REPOS: 0.52, HAUT: -0.46, ACC: 1150, WMAX: 34, ACC_RET: 700, WMAX_RET: 22 };
const MIROIR = x => 470 - x;              // la table est symétrique autour de x = 235 (hors couloir de lancement)

// lanceur (couloir de droite)
export const LANCEUR = { x1: 451, x2: 475, y: 872, course: 36 };
export const SAUCER = { x: 392, y: 400, r: 14 };
export const BUMPERS = [{ x: 180, y: 215, r: 22 }, { x: 290, y: 215, r: 22 }, { x: 235, y: 292, r: 22 }];
export const COULOIRS_HAUT = [195, 235, 275];          // centres des 3 couloirs du haut
export const CIBLES_NOVA = [330, 372, 414, 456];        // cibles fixes N O V A (mur de gauche)
export const CIBLES_TOMBANTES = [205, 235, 265];        // 3 cibles qui tombent (au milieu)

/* ---------- La forme de la table ---------- */

function construire() {
  const c = [];
  const seg = (ax, ay, bx, by, o = {}) => {
    const s = { type: 's', ax, ay, bx, by, r: o.r ?? 3, e: o.e ?? 0.5, f: o.f ?? 0.06, ...o };
    s.dx = bx - ax; s.dy = by - ay; s.l2 = s.dx * s.dx + s.dy * s.dy || 1;
    c.push(s);
    return s;
  };
  const poly = (pts, o) => { for (let i = 0; i < pts.length - 1; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o); };
  const rond = (x, y, r, o = {}) => { const s = { type: 'c', x, y, r, e: o.e ?? 0.6, f: o.f ?? 0.05, ...o }; c.push(s); return s; };

  // le tour : mur de gauche, grand arc en haut, mur extérieur droit
  seg(22, 250, 22, 910);
  const N = 48;
  const arc = [];
  for (let i = 0; i <= N; i++) { const a = Math.PI + Math.PI * i / N; arc.push([250 + 228 * Math.cos(a), 250 + 228 * Math.sin(a)]); }
  poly(arc, { r: 3, e: 0.45, f: 0.03 });
  seg(478, 250, 478, 910);
  // couloir de lancement + portillon à sens unique (on monte, on ne redescend pas)
  seg(448, 266, 448, 910, { e: 0.4 });
  const nx = -26, ny = -30, nl = Math.hypot(nx, ny);
  seg(448, 266, 478, 240, { sens: [nx / nl, ny / nl], e: 0.3, nom: 'portillon' });

  // déflecteur caoutchouc sur le mur de gauche (renvoie la bille vers le centre)
  // (fermé par-dessous : la bille ne peut pas se coincer derrière)
  seg(22, 520, 46, 556, { e: 0.75, r: 4, nom: 'caoutchouc' });
  seg(46, 556, 22, 562, { e: 0.4, r: 3 });
  seg(MIROIR(22), 520, MIROIR(46), 556, { e: 0.75, r: 4, nom: 'caoutchouc' });
  seg(MIROIR(46), 556, MIROIR(22), 562, { e: 0.4, r: 3 });

  // séparateurs couloir extérieur / couloir intérieur, qui guident vers les flippers
  // le bout du guide s'arrête juste au-dessus de l'axe du flipper : en berceau, la bille s'y appuie
  // à droite de l'axe, et quand on lâche, elle roule le long du flipper (comme sur un vrai)
  poly([[60, 600], [60, 700], [151, 754]], { e: 0.45 });
  poly([[MIROIR(60), 600], [MIROIR(60), 700], [MIROIR(151), 754]], { e: 0.45 });
  rond(60, 600, 5, { e: 0.7, nom: 'poteau' });
  rond(MIROIR(60), 600, 5, { e: 0.7, nom: 'poteau' });

  // lance-pierres (triangles au-dessus des flippers) : la face intérieure renvoie la bille
  for (const s of [1, -1]) {
    const X = x => (s === 1 ? x : MIROIR(x));
    const A = [X(92), 610], B = [X(92), 684], C = [X(138), 712];
    seg(A[0], A[1], B[0], B[1], { e: 0.5 });
    seg(B[0], B[1], C[0], C[1], { e: 0.4 });
    const dx = C[0] - A[0], dy = C[1] - A[1], l = Math.hypot(dx, dy);
    let nxs = dy / l, nys = -dx / l;
    if ((B[0] - A[0]) * nxs + (B[1] - A[1]) * nys > 0) { nxs = -nxs; nys = -nys; }
    seg(A[0], A[1], C[0], C[1], { e: 0.6, r: 4, nom: 'lancepierre', cote: s, nsort: [nxs, nys] });
  }

  // bumpers
  BUMPERS.forEach((b, i) => rond(b.x, b.y, b.r, { e: 0.85, nom: 'bumper', i }));

  // poteaux des couloirs du haut
  for (const x of [175, 215, 255, 295]) seg(x, 80, x, 122, { r: 4, e: 0.55, nom: 'poteau-haut' });

  // cibles N O V A (fixes) et cibles tombantes
  CIBLES_NOVA.forEach((y, i) => seg(30, y - 11, 30, y + 11, { r: 3, e: 0.35, nom: 'nova', i }));
  CIBLES_TOMBANTES.forEach((x, i) => seg(x - 11, 470, x + 11, 470, { r: 4, e: 0.3, nom: 'tombante', i }));

  return c;
}

// capteurs (la bille passe dessus sans rebondir)
const CAPTEURS = [
  ...COULOIRS_HAUT.map((x, i) => ({ nom: 'couloir', i, x, y: 100, r: 13 })),
  { nom: 'interieur', i: 0, x: 76, y: 650, r: 12 }, { nom: 'interieur', i: 1, x: MIROIR(76), y: 650, r: 12 },
  { nom: 'exterieur', i: 0, x: 41, y: 690, r: 14 }, { nom: 'exterieur', i: 1, x: MIROIR(41), y: 690, r: 14 }
];

/* ---------- La partie ---------- */

export function creerPartie() {
  const p = {
    murs: construire(),
    flippers: [
      { px: 150, py: 768, s: 1, a: FLIP.REPOS, w: 0, appui: false },
      { px: MIROIR(150), py: 768, s: -1, a: FLIP.REPOS, w: 0, appui: false }
    ],
    billes: [],
    lanceur: { tire: 0, lache: false, y: LANCEUR.y, v: 0 },
    score: 0, bille: 1, billesMax: 3, billesBonus: 0, bonus: 0, mult: 1,
    couloirs: [false, false, false], nova: [false, false, false, false], tombantes: [false, false, false],
    verrou: false, verrous: 0, billeBonusAllumee: false, jackpot: false, multibille: false,
    tirParfait: { actif: false, couloir: 0, t: 0 }, sauvetage: 0, inclinaison: 0, tilt: false, avertissements: 0,
    attente: 0, phase: 'jeu', evts: [], t: 0, flash: {}, remiseTombantes: 0, bumpersTouches: 0
  };
  p.murs.forEach(m => { if (m.nom) m.ref = m; });
  nouvelleBille(p);
  return p;
}

const evt = (p, nom, d = {}) => p.evts.push({ nom, ...d });
function points(p, n, bonus = 0) { if (p.tilt) return; p.score += n; p.bonus += bonus; }

function nouvelleBille(p) {
  p.billes.push({ x: 463, y: LANCEUR.y - BR - 0.5, vx: 0, vy: 0, lanceur: true, prise: 0, dans: new Set(), id: Math.random() });
  p.tirParfait = { actif: true, couloir: Math.floor(Math.random() * 3), t: 0, change: 0 };
  p.sauvetage = 0;
}

// une bille de plus (multibille) : envoyée toute seule dans le couloir de lancement
function billeAuto(p) {
  p.billes.push({ x: 463, y: LANCEUR.y - BR - 0.5, vx: 0, vy: -1650 - Math.random() * 150, lanceur: true, prise: 0, dans: new Set(), id: Math.random(), auto: true });
}

// une bille attend sur le ressort du lanceur
export const billeAuLanceur = p => p.billes.some(b => b.lanceur && b.x > 448 && b.y > LANCEUR.y - BR - 45 && Math.abs(b.vy) < 120);

/* ---------- Collisions ---------- */

function reponse(b, nx, ny, vn, e, f) {
  // vn < 0 : la bille fonce dans l'obstacle
  if (vn > -35) e = 0;                       // contact doux : la bille se pose au lieu de sautiller
  b.vx -= (1 + e) * vn * nx;
  b.vy -= (1 + e) * vn * ny;
  // frottement de Coulomb : limité par la force du choc
  const tx = -ny, ty = nx;
  const vt = b.vx * tx + b.vy * ty;
  const fr = Math.min(Math.abs(vt), f * (1 + e) * -vn) * Math.sign(vt);
  b.vx -= fr * tx; b.vy -= fr * ty;
}

function toucheMur(p, b, m) {
  if (m.eteint) return;
  if (m.type === 's') {
    let t = ((b.x - m.ax) * m.dx + (b.y - m.ay) * m.dy) / m.l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = m.ax + m.dx * t, cy = m.ay + m.dy * t;
    let dx = b.x - cx, dy = b.y - cy;
    const R = BR + m.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    if (m.sens && (b.x - m.ax) * m.sens[0] + (b.y - m.ay) * m.sens[1] < 0) return;   // portillon : de l'autre côté, on passe
    const d = Math.sqrt(d2) || 1e-6;
    const nx = dx / d, ny = dy / d;
    b.x += nx * (R - d); b.y += ny * (R - d);
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { reponse(b, nx, ny, vn, m.e, m.f); choc(p, b, m, nx, ny, -vn); }
  } else {
    const dx = b.x - m.x, dy = b.y - m.y;
    const R = BR + m.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 1e-6;
    const nx = dx / d, ny = dy / d;
    b.x += nx * (R - d); b.y += ny * (R - d);
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { reponse(b, nx, ny, vn, m.e, m.f); choc(p, b, m, nx, ny, -vn); }
  }
}

// ce qui se passe quand la bille touche un élément actif
function choc(p, b, m, nx, ny, force) {
  const ici = p.flash;
  if (m.nom === 'bumper') {
    // le bumper « tape » la bille : elle repart toujours vite
    const kick = 430;
    b.vx += nx * kick; b.vy += ny * kick;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 520) { b.vx += nx * (520 - vn); b.vy += ny * (520 - vn); }
    ici['bumper' + m.i] = 0.12;
    p.bumpersTouches++;
    points(p, p.multibille ? 200 : 100, 100);
    evt(p, 'bumper', { i: m.i });
  } else if (m.nom === 'lancepierre') {
    if (force > 70 && nx * m.nsort[0] + ny * m.nsort[1] > 0.6) {
      b.vx += m.nsort[0] * 480; b.vy += m.nsort[1] * 480;
      ici['lp' + m.cote] = 0.12;
      points(p, 10);
      evt(p, 'lancepierre');
    }
  } else if (m.nom === 'nova') {
    if (force > 40) {
      ici['nova' + m.i] = 0.25;
      points(p, 750, 1000);
      evt(p, 'cible');
      if (!p.nova[m.i]) {
        p.nova[m.i] = true;
        if (p.nova.every(Boolean)) {
          points(p, 10000);
          p.nova = [false, false, false, false];
          if (!p.billeBonusAllumee) { p.billeBonusAllumee = true; evt(p, 'message', { texte: 'NOVA ! BILLE BONUS ALLUMÉE', son: 'bonus' }); }
          else { points(p, 25000); evt(p, 'message', { texte: 'NOVA ! +25 000', son: 'bonus' }); }
        }
      }
    }
  } else if (m.nom === 'tombante') {
    if (force > 30) {
      m.eteint = true;
      p.tombantes[m.i] = true;
      points(p, 1000, 1500);
      evt(p, 'tombe');
      if (p.tombantes.every(Boolean)) {
        points(p, 5000);
        if (!p.multibille) { p.verrou = true; evt(p, 'message', { texte: 'VERROU ALLUMÉ : VISE LE TROU', son: 'bonus' }); }
        p.remiseTombantes = 1.2;
      }
    }
  } else if (m.nom === 'caoutchouc' || m.nom === 'poteau') {
    if (force > 120) evt(p, 'caoutchouc');
  } else if (force > 260) evt(p, 'mur', { force });
}

function toucheFlipper(b, f) {
  const ux = f.s * Math.cos(f.a), uy = Math.sin(f.a);
  const rx = b.x - f.px, ry = b.y - f.py;
  let t = (rx * ux + ry * uy) / FLIP.L;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = f.px + ux * FLIP.L * t, cy = f.py + uy * FLIP.L * t;
  const rad = FLIP.R1 + (FLIP.R2 - FLIP.R1) * t;
  const dx = b.x - cx, dy = b.y - cy;
  const R = BR + rad;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return 0;
  const d = Math.sqrt(d2) || 1e-6;
  const nx = dx / d, ny = dy / d;
  b.x += nx * (R - d); b.y += ny * (R - d);
  // vitesse du flipper au point de contact (il tourne autour de son axe)
  const om = f.s * f.w;
  const qx = cx + nx * rad - f.px, qy = cy + ny * rad - f.py;
  const sx = -om * qy, sy = om * qx;
  let rvx = b.vx - sx, rvy = b.vy - sy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return 0;
  // caoutchouc : rebondit moins quand le choc est violent
  let e = 0.62 - Math.min(0.22, -vn / 9000);
  if (vn > -35) e = 0;
  rvx -= (1 + e) * vn * nx; rvy -= (1 + e) * vn * ny;
  const tx = -ny, ty = nx;
  const vt = rvx * tx + rvy * ty;
  const fr = Math.min(Math.abs(vt), 0.08 * (1 + e) * -vn) * Math.sign(vt);
  rvx -= fr * tx; rvy -= fr * ty;
  b.vx = sx + rvx; b.vy = sy + rvy;
  return -vn;
}

function toucheBilles(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 >= 4 * BR * BR || d2 === 0) return;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = (2 * BR - d) / 2;
  a.x -= nx * pen; a.y -= ny * pen; b.x += nx * pen; b.y += ny * pen;
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  const j = -(1 + 0.9) * vn / 2;
  a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny;
}

/* ---------- Un pas de temps ---------- */

// commandes : { gauche, droite, tirer, secouer (vrai une seule fois) }
export function avancer(p, dt, cmd) {
  dt = Math.min(dt, 1 / 30);
  p.t += dt;
  for (const k in p.flash) { p.flash[k] -= dt; if (p.flash[k] <= 0) delete p.flash[k]; }
  if (p.phase !== 'jeu') return;
  minuteries(p);

  // changement de couloir allumé avec les flippers (comme sur un vrai flipper)
  const g = !!cmd.gauche && !p.tilt, d = !!cmd.droite && !p.tilt;
  if (g && !p.flippers[0].appui) { p.couloirs.push(p.couloirs.shift()); evt(p, 'flipper'); }
  if (d && !p.flippers[1].appui) { p.couloirs.unshift(p.couloirs.pop()); evt(p, 'flipper'); }
  p.flippers[0].appui = g; p.flippers[1].appui = d;

  // secouer la table (attention au TILT)
  p.inclinaison = Math.max(0, p.inclinaison - dt * 0.55);
  if (cmd.secouer && !p.tilt) {
    for (const b of p.billes) if (!b.lanceur && !b.prise) { b.vy -= 150; b.vx += (Math.random() - 0.5) * 110; }
    p.inclinaison += 1;
    evt(p, 'secousse');
    if (p.inclinaison > 3.3) { p.tilt = true; p.flippers.forEach(f => { f.appui = false; }); evt(p, 'tilt'); }
    else if (p.inclinaison > 2.1) evt(p, 'message', { texte: 'ATTENTION !', son: 'alerte' });
  }

  // lanceur : on tire le ressort, on lâche
  const l = p.lanceur;
  if (cmd.tirer) { l.tire = Math.min(1, l.tire + dt * 1.25); l.lache = false; }
  else if (l.tire > 0) {
    const force = l.tire;
    l.tire = 0;
    for (const b of p.billes) if (b.lanceur && b.y > LANCEUR.y - BR - 40 && b.x > 448) {
      b.vy = -(520 + 1500 * force) * (0.985 + Math.random() * 0.03);
      evt(p, 'lancer', { force });
    }
  }
  l.y = LANCEUR.y + l.tire * LANCEUR.course;

  // tir parfait : le couloir du haut à viser clignote pendant que la bille attend
  const tp = p.tirParfait;
  if (tp.actif) {
    if (billeAuLanceur(p)) { tp.change += dt; if (tp.change > 0.55) { tp.change = 0; tp.couloir = (tp.couloir + 1) % 3; } }
    else { tp.t += dt; if (tp.t > 4.5) tp.actif = false; }
  }

  if (p.remiseTombantes > 0) {
    p.remiseTombantes -= dt;
    if (p.remiseTombantes <= 0) {
      const libre = p.billes.every(b => Math.abs(b.y - 470) > 20 || b.x < 185 || b.x > 285);
      if (libre) { p.tombantes = [false, false, false]; p.murs.forEach(m => { if (m.nom === 'tombante') m.eteint = false; }); evt(p, 'remise'); }
      else p.remiseTombantes = 0.3;
    }
  }
  if (p.sauvetage > 0) p.sauvetage -= dt;

  const n = Math.max(1, Math.ceil(dt / PAS));
  const h = dt / n;
  for (let k = 0; k < n; k++) sousPas(p, h);

  // billes perdues
  for (let i = p.billes.length - 1; i >= 0; i--) {
    const b = p.billes[i];
    if (b.y > HAUTEUR + 30) {
      p.billes.splice(i, 1);
      if (p.sauvetage > 0 && !p.tilt) { evt(p, 'message', { texte: 'BILLE SAUVÉE !', son: 'bonus' }); billeAuto(p); p.sauvetage = 0; }
      else evt(p, 'perdue');
    }
  }
  if (p.multibille && p.billes.length <= 1) { p.multibille = false; p.jackpot = false; evt(p, 'message', { texte: 'FIN DU MULTIBILLE' }); }
  if (!p.billes.length) finDeBille(p);
}

function sousPas(p, h) {
  for (const f of p.flippers) {
    if (f.appui) {
      f.w = Math.max(-FLIP.WMAX, f.w - FLIP.ACC * h);
      f.a += f.w * h;
      if (f.a <= FLIP.HAUT) { f.a = FLIP.HAUT; f.w = 0; }
    } else {
      f.w = Math.min(FLIP.WMAX_RET, f.w + FLIP.ACC_RET * h);
      f.a += f.w * h;
      if (f.a >= FLIP.REPOS) { f.a = FLIP.REPOS; f.w = 0; }
    }
  }
  const frein = 1 - FROTTEMENT_AIR * h;
  for (const b of p.billes) {
    if (b.prise > 0) {
      // la bille est dans le trou : elle attend puis repart vers le flipper gauche
      b.prise -= h;
      b.x = SAUCER.x; b.y = SAUCER.y; b.vx = 0; b.vy = 0;
      if (b.prise <= 0) { b.vx = -0.53 * 400; b.vy = 0.85 * 400 - 120; b.sortie = 0.4; evt(p, 'ejecte'); }
      continue;
    }
    if (b.sortie > 0) b.sortie -= h;
    b.vy += GRAVITE * h;
    b.vx *= frein; b.vy *= frein;
    const v2 = b.vx * b.vx + b.vy * b.vy;
    if (v2 > VMAX * VMAX) { const k = VMAX / Math.sqrt(v2); b.vx *= k; b.vy *= k; }
    b.x += b.vx * h; b.y += b.vy * h;
    for (const m of p.murs) toucheMur(p, b, m);
    for (const f of p.flippers) toucheFlipper(b, f);
    // 2e passage : corrige les coins où deux murs se rejoignent
    for (const m of p.murs) if (!m.nom || m.nom === 'caoutchouc') toucheMur(p, b, m);
    // filet de sécurité : une bille du plateau ne peut jamais finir dans le couloir de lancement
    if (!b.lanceur && b.x > 448 - BR && b.x < 478 && b.y > 300) b.x = 448 - 3 - BR;
    // le ressort du lanceur sert de sol au couloir
    if (b.x > 448 && b.y + BR > p.lanceur.y) { b.y = p.lanceur.y - BR; if (b.vy > 0) b.vy = b.vy > 60 ? -b.vy * 0.25 : 0; }
    if (b.lanceur && b.x > 448 && b.y < 255) { b.lanceur = false; if (!b.auto) p.sauvetage = 7; }
    if (b.lanceur && b.x < 448) b.lanceur = false;
    capteurs(p, b);
  }
  for (let i = 0; i < p.billes.length; i++) for (let j = i + 1; j < p.billes.length; j++) {
    if (!p.billes[i].prise && !p.billes[j].prise) toucheBilles(p.billes[i], p.billes[j]);
  }
}

function capteurs(p, b) {
  for (const c of CAPTEURS) {
    const dedans = (b.x - c.x) ** 2 + (b.y - c.y) ** 2 < c.r * c.r;
    const cle = c.nom + c.i;
    if (dedans && !b.dans.has(cle)) { b.dans.add(cle); passage(p, b, c); }
    else if (!dedans) b.dans.delete(cle);
  }
  // le trou (saucer) : attrape la bille si elle n'arrive pas trop vite
  if (!b.sortie) {
    const d2 = (b.x - SAUCER.x) ** 2 + (b.y - SAUCER.y) ** 2;
    if (d2 < SAUCER.r * SAUCER.r && b.vx * b.vx + b.vy * b.vy < 1100 * 1100) trou(p, b);
  }
}

function passage(p, b, c) {
  if (c.nom === 'couloir') {
    if (b.vy < 0) return;   // compte seulement en descendant dans le couloir
    const tp = p.tirParfait;
    if (tp.actif) {
      tp.actif = false;
      if (tp.couloir === c.i) { points(p, 25000); evt(p, 'message', { texte: 'TIR PARFAIT ! +25 000', son: 'gagne' }); }
    }
    points(p, 500, 1000);
    p.flash['couloir' + c.i] = 0.3;
    evt(p, 'couloir');
    p.couloirs[c.i] = true;
    if (p.couloirs.every(Boolean)) {
      p.couloirs = [false, false, false];
      if (p.mult < 6) { p.mult++; evt(p, 'message', { texte: `BONUS ×${p.mult}`, son: 'bonus' }); }
      else { points(p, 20000); evt(p, 'message', { texte: '+20 000', son: 'bonus' }); }
    }
  } else if (c.nom === 'interieur') {
    points(p, 1000, 1000);
    p.flash['interieur' + c.i] = 0.3;
    evt(p, 'couloir');
  } else if (c.nom === 'exterieur') {
    points(p, 2000, 500);
    p.flash['exterieur' + c.i] = 0.4;
    evt(p, 'exterieur');
  }
}

function trou(p, b) {
  b.prise = 1.1;
  points(p, 2500, 2500);
  evt(p, 'trou');
  p.flash.trou = 1.1;
  if (p.multibille && p.jackpot) {
    points(p, 50000);
    evt(p, 'message', { texte: 'JACKPOT ! +50 000', son: 'gagne' });
  } else if (p.verrou && !p.multibille) {
    p.verrou = false;
    p.verrous++;
    if (p.verrous >= 2) {
      p.verrous = 0;
      p.multibille = true;
      p.jackpot = true;
      evt(p, 'message', { texte: 'MULTIBILLE !!!', son: 'gagne' });
      billeAuto(p);
      setTimeoutJeu(p, 0.8, () => billeAuto(p));
    } else evt(p, 'message', { texte: 'BILLE VERROUILLÉE 1', son: 'bonus' });
  }
  if (p.billeBonusAllumee) {
    p.billeBonusAllumee = false;
    p.billesBonus++;
    evt(p, 'message', { texte: 'BILLE BONUS !', son: 'gagne' });
  }
}

// petite minuterie dans le temps du jeu (s'arrête avec la pause)
function setTimeoutJeu(p, s, f) {
  const fin = p.t + s;
  const verifier = { fin, f };
  (p.minuteries = p.minuteries || []).push(verifier);
}
export function minuteries(p) {
  if (!p.minuteries) return;
  p.minuteries = p.minuteries.filter(m => { if (p.t >= m.fin) { m.f(); return false; } return true; });
}

function finDeBille(p) {
  const total = p.tilt ? 0 : p.bonus * p.mult;
  p.score += total;
  evt(p, 'finBille', { bonus: p.bonus, mult: p.mult, total, tilt: p.tilt });
  p.bonus = 0;
  p.mult = 1;
  p.tilt = false;
  p.inclinaison = 0;
  p.multibille = false; p.jackpot = false;
  if (p.billesBonus > 0) { p.billesBonus--; p.phase = 'attente'; p.suite = 'rejouer'; }
  else if (p.bille >= p.billesMax) { p.phase = 'attente'; p.suite = 'fin'; }
  else { p.phase = 'attente'; p.suite = 'suivante'; }
}

// appelé par l'affichage quand le décompte du bonus est fini
export function continuer(p) {
  if (p.phase !== 'attente') return;
  if (p.suite === 'fin') { p.phase = 'fin'; evt(p, 'finPartie', { score: p.score }); return; }
  if (p.suite === 'suivante') p.bille++;
  else evt(p, 'message', { texte: 'REJOUE LA MÊME BILLE', son: 'bonus' });
  p.phase = 'jeu';
  nouvelleBille(p);
}
