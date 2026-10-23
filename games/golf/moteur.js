/* ==========================================================
   Mini-golf — le moteur physique et les parcours
   Vu du dessus. Le terrain fait 400 × 600 (en pixels), tout est en secondes.
   Les collisions (murs « gélules », ronds, rebond + frottement) viennent du
   moteur du Flipper : games/physique/collisions.js.
   En plus pour le golf :
   - frottement de roulement qui dépend du sol (gazon, sable, glace)
   - pentes (la balle accélère dans le sens de la pente), bosses et cuvettes
   - tapis accélérateurs, eau (1 coup de pénalité), tunnels
   - obstacles qui bougent : moulins et portes coulissantes (leur vitesse
     s'ajoute au rebond, comme les flippers)
   - le trou : la balle tombe si elle n'arrive pas trop vite, sinon elle saute par-dessus
   Ce fichier ne dessine rien : games/golf.html s'occupe de l'affichage.
   ========================================================== */
import { formes, contact, reponse } from '../physique/collisions.js';

export const LARGEUR = 400, HAUTEUR = 600;
export const RB = 6;                 // rayon de la balle
export const TROU = 10;              // rayon du trou
export const VMAX_TIR = 900;         // vitesse d'un tir à pleine puissance
export const COUPS_MAX = 8;          // au-delà, on passe au trou suivant
const PAS = 1 / 480;
const RAIL = 5;                      // épaisseur des bordures (moitié)

// les sols : freinage constant (px/s²) + freinage proportionnel (par seconde)
export const SOLS = {
  herbe: { frein: 260, colle: 0.35 },
  espace: { frein: 150, colle: 0.16 },
  sable: { frein: 1500, colle: 2.6 },
  glace: { frein: 38, colle: 0.05 },
  pont: { frein: 260, colle: 0.35 }
};

/* ---------- Petits outils pour dessiner les parcours ---------- */
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const cercle = (cx, cy, r, n = 20) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * r, cy + Math.sin(i / n * Math.PI * 2) * r]);

/* ---------- Les parcours ----------
   Un trou :
   nom, par, depart [x, y], trou [x, y]
   bords : liste de polygones (le terrain ; leurs côtés sont des bordures)
   murs : segments [x1, y1, x2, y2] en plus · ronds : poteaux [x, y, r] · bumpers : [x, y, r]
   zones : { sol: 'sable' | 'glace' | 'pont', forme } · { eau: true, forme } · { pente: [ax, ay], forme }
           { tapis: [ax, ay], forme } · { bosse: [cx, cy, r, force] } (force < 0 : cuvette)
   moulins : { x, y, l, n, w } (w en tours/s, signe = sens) · portes : { y | x, de, a, demi: [w, h], periode, phase }
   tunnels : { de: [x, y], vers: [x, y], dir: [dx, dy] } */
export const PARCOURS = {
  jardin: {
    nom: 'Le Jardin',
    sous: 'Pour bien commencer',
    trous: [
      { nom: 'Tout droit', par: 2, depart: [200, 505], trou: [200, 125], bords: [rect(130, 60, 140, 500)] },
      { nom: 'Le coude', par: 3, depart: [120, 505], trou: [290, 125], bords: [[[60, 560], [180, 560], [180, 190], [340, 190], [340, 60], [60, 60]]],
        ronds: [[180, 190, 6]] },
      { nom: 'La colline', par: 2, depart: [200, 505], trou: [200, 135], bords: [rect(110, 60, 180, 500)],
        zones: [{ pente: [0, 330], forme: rect(110, 250, 180, 120) }] },
      { nom: 'Les piquets', par: 3, depart: [200, 510], trou: [200, 110], bords: [rect(60, 60, 280, 500)],
        ronds: [[110, 210, 9], [170, 210, 9], [230, 210, 9], [290, 210, 9], [140, 290, 9], [200, 290, 9], [260, 290, 9], [110, 370, 9], [170, 370, 9], [230, 370, 9], [290, 370, 9]] },
      { nom: 'Le moulin', par: 3, depart: [200, 510], trou: [200, 130], bords: [rect(110, 60, 180, 500)],
        murs: [[110, 320, 164, 320], [236, 320, 290, 320]], moulins: [{ x: 200, y: 320, l: 40, n: 4, w: 0.22 }] },
      { nom: 'Le bac à sable', par: 3, depart: [110, 500], trou: [110, 135], bords: [rect(60, 60, 280, 500)],
        murs: [[60, 320, 250, 320]],
        zones: [{ sol: 'sable', forme: rect(255, 285, 85, 75) }, { sol: 'sable', forme: cercle(185, 150, 28) }] },
      { nom: 'Le lac', par: 3, depart: [200, 510], trou: [200, 120], bords: [rect(60, 60, 280, 500)],
        zones: [{ eau: true, forme: rect(60, 250, 120, 120) }, { eau: true, forme: rect(220, 250, 80, 120) }, { sol: 'pont', forme: rect(180, 250, 40, 120) }] },
      { nom: 'Les champignons', par: 3, depart: [200, 510], trou: [200, 125], bords: [rect(80, 60, 240, 500)],
        bumpers: [[200, 210, 17], [148, 262, 14], [252, 262, 14]] },
      { nom: 'Le grand final', par: 4, depart: [90, 505], trou: [90, 140],
        bords: [[[40, 560], [360, 560], [360, 60], [40, 60], [40, 240], [260, 240], [260, 440], [40, 440]]],
        zones: [{ pente: [0, 240], forme: rect(260, 260, 100, 160) }, { sol: 'sable', forme: cercle(300, 500, 26) }],
        portes: [{ x: 175, de: 106, a: 194, demi: [10, 25], periode: 3.2, phase: 0 }] }
    ]
  },
  glacier: {
    nom: 'Le Glacier',
    sous: 'Glace, tunnels et moulins',
    nuit: true,
    trous: [
      { nom: 'La patinoire', par: 2, depart: [200, 510], trou: [200, 115], bords: [rect(130, 60, 140, 500)],
        zones: [{ sol: 'glace', forme: rect(130, 170, 140, 280) }] },
      { nom: 'La flèche', par: 2, depart: [120, 505], trou: [295, 125], bords: [[[60, 560], [180, 560], [180, 190], [340, 190], [340, 60], [60, 60]]],
        zones: [{ tapis: [1500, 0], forme: rect(65, 65, 110, 120) }] },
      { nom: 'Le pont de glace', par: 3, depart: [200, 515], trou: [200, 120], bords: [rect(60, 60, 280, 500)],
        zones: [{ eau: true, forme: rect(60, 210, 110, 190) }, { eau: true, forme: rect(230, 210, 110, 190) }, { sol: 'glace', forme: rect(170, 210, 60, 190) }, { pente: [70, 0], forme: rect(170, 210, 60, 190) }] },
      { nom: 'Le tunnel', par: 3, depart: [110, 510], trou: [300, 115], bords: [rect(60, 360, 280, 200), rect(60, 60, 280, 240)],
        ronds: [[200, 450, 14]], bumpers: [[200, 190, 15]],
        tunnels: [{ de: [305, 395], vers: [95, 265], dir: [0, -1] }] },
      { nom: 'Les portes', par: 3, depart: [200, 515], trou: [200, 115], bords: [rect(110, 60, 180, 500)],
        murs: [[110, 390, 170, 390], [230, 390, 290, 390], [110, 240, 170, 240], [230, 240, 290, 240]],
        portes: [{ y: 372, de: 159, a: 241, demi: [30, 8], periode: 2.6, phase: 0 }, { y: 222, de: 159, a: 241, demi: [30, 8], periode: 2, phase: 1.4 }] },
      { nom: 'Double moulin', par: 3, depart: [200, 515], trou: [130, 120], bords: [rect(60, 60, 280, 500)],
        murs: [[60, 390, 96, 390], [164, 390, 340, 390], [60, 240, 236, 240], [304, 240, 340, 240]],
        moulins: [{ x: 130, y: 390, l: 40, n: 4, w: 0.24 }, { x: 270, y: 240, l: 40, n: 3, w: -0.3 }] },
      { nom: 'La bosse', par: 3, depart: [200, 515], trou: [200, 120], bords: [rect(60, 60, 280, 500)],
        zones: [{ bosse: [200, 300, 95, 300] }, { eau: true, forme: rect(60, 250, 45, 110) }, { eau: true, forme: rect(295, 250, 45, 110) }] },
      { nom: 'Le flipper', par: 3, depart: [200, 515], trou: [200, 110], bords: [rect(80, 60, 240, 500)],
        zones: [{ pente: [0, 170], forme: rect(80, 60, 240, 300) }],
        bumpers: [[150, 205, 16], [250, 205, 16], [200, 275, 16]] },
      { nom: 'Le sommet', par: 5, depart: [90, 510], trou: [310, 120], bords: [rect(40, 60, 320, 500)],
        murs: [[40, 440, 290, 440], [110, 280, 360, 280]],
        zones: [{ sol: 'glace', forme: rect(120, 290, 160, 140) }, { pente: [0, 200], forme: rect(290, 290, 70, 145) }, { sol: 'sable', forme: cercle(245, 120, 22) }],
        portes: [{ x: 190, de: 109, a: 231, demi: [10, 28], periode: 2.8, phase: 0 }] }
    ]
  },
  volcan: {
    nom: 'Le Volcan',
    sous: 'Lave, geysers et cratères',
    trous: [
      { nom: 'La coulée', par: 2, depart: [200, 510], trou: [200, 120], bords: [rect(130, 60, 140, 500)],
        zones: [{ lave: true, forme: rect(130, 240, 38, 170) }, { lave: true, forme: rect(232, 240, 38, 170) }] },
      { nom: 'Le cratère', par: 3, depart: [200, 520], trou: [200, 290], bords: [rect(60, 90, 280, 470)],
        zones: [{ bosse: [200, 290, 105, 330] }, { lave: true, forme: rect(60, 90, 70, 60) }, { lave: true, forme: rect(270, 90, 70, 60) }] },
      { nom: 'Les geysers', par: 3, depart: [200, 515], trou: [200, 110], bords: [rect(110, 60, 180, 500)],
        zones: [{ tapis: [900, 0], forme: rect(115, 380, 170, 40) }, { tapis: [-900, 0], forme: rect(115, 220, 170, 40) }],
        bumpers: [[145, 300, 13], [255, 300, 13]] },
      { nom: 'Le pont de basalte', par: 4, depart: [105, 515], trou: [295, 115], bords: [rect(60, 60, 280, 500)],
        zones: [{ lave: true, forme: rect(60, 210, 280, 190) }, { sol: 'pont', forme: rect(80, 300, 52, 100) }, { sol: 'pont', forme: rect(80, 300, 240, 50) }, { sol: 'pont', forme: rect(268, 210, 52, 140) }] },
      { nom: 'Les portes de feu', par: 3, depart: [200, 515], trou: [200, 115], bords: [rect(110, 60, 180, 500)],
        murs: [[110, 400, 170, 400], [230, 400, 290, 400], [110, 250, 170, 250], [230, 250, 290, 250]],
        zones: [{ lave: true, forme: rect(115, 405, 45, 40) }, { lave: true, forme: rect(240, 405, 45, 40) }],
        portes: [{ y: 382, de: 159, a: 241, demi: [30, 8], periode: 2.2, phase: 0.6 }, { y: 232, de: 159, a: 241, demi: [30, 8], periode: 1.7, phase: 2.2 }] },
      { nom: 'La cheminée', par: 4, depart: [90, 505], trou: [90, 140],
        bords: [[[40, 560], [360, 560], [360, 60], [40, 60], [40, 240], [260, 240], [260, 440], [40, 440]]],
        zones: [{ pente: [0, 260], forme: rect(260, 250, 100, 180) }, { lave: true, forme: rect(220, 445, 40, 40) }, { lave: true, forme: rect(220, 195, 40, 40) }, { bosse: [140, 150, 50, 220] }] },
      { nom: 'La rivière de lave', par: 3, depart: [200, 515], trou: [200, 115], bords: [rect(60, 60, 280, 500)],
        zones: [{ lave: true, forme: [[60, 300], [340, 250], [340, 330], [60, 380]] }, { sol: 'pont', forme: [[175, 250], [225, 250], [225, 380], [175, 380]] }],
        moulins: [{ x: 200, y: 410, l: 34, n: 2, w: 0.2 }] },
      { nom: 'Les éruptions', par: 3, depart: [200, 515], trou: [200, 115], bords: [rect(70, 60, 260, 500)],
        bumpers: [[140, 230, 14], [200, 210, 14], [260, 230, 14], [140, 300, 14], [200, 320, 14], [260, 300, 14]],
        zones: [{ lave: true, forme: cercle(110, 140, 22) }, { lave: true, forme: cercle(290, 140, 22) }] },
      { nom: 'Le sommet du volcan', par: 5, depart: [90, 510], trou: [310, 125], bords: [rect(40, 60, 320, 500)],
        murs: [[40, 440, 290, 440], [110, 280, 360, 280]],
        zones: [{ tapis: [1300, 0], forme: rect(45, 450, 90, 100) }, { lave: true, forme: rect(160, 290, 60, 70) }, { pente: [0, 220], forme: rect(290, 290, 70, 145) }, { bosse: [310, 125, 55, -260] }, { lave: true, forme: rect(150, 65, 60, 50) }] }
    ]
  },
  espace: {
    nom: 'L’Espace',
    sous: 'Planètes, trous noirs, téléporteurs',
    nuit: true,
    sol: 'espace',
    trous: [
      { nom: 'Décollage', par: 2, depart: [200, 515], trou: [200, 115], bords: [rect(130, 60, 140, 500)],
        zones: [{ tapis: [0, -1400], forme: rect(135, 330, 130, 60) }] },
      { nom: 'L’orbite', par: 3, depart: [200, 520], trou: [200, 110], bords: [rect(60, 60, 280, 500)],
        ronds: [[200, 310, 46]], zones: [{ bosse: [200, 310, 125, -170] }] },
      { nom: 'Le trou noir', par: 3, depart: [200, 520], trou: [200, 110], bords: [rect(60, 60, 280, 500)],
        zones: [{ vide: true, forme: cercle(200, 310, 26) }, { bosse: [200, 310, 135, -300] }] },
      { nom: 'Les téléporteurs', par: 3, depart: [110, 510], trou: [300, 115], bords: [rect(60, 430, 280, 130), rect(60, 255, 280, 130), rect(60, 60, 280, 150)],
        tunnels: [{ de: [305, 465], vers: [95, 370], dir: [0, -1] }, { de: [305, 290], vers: [95, 195], dir: [0, -1] }],
        ronds: [[200, 320, 12]] },
      { nom: 'Les astéroïdes', par: 3, depart: [200, 520], trou: [200, 105], bords: [rect(60, 60, 280, 500)],
        ronds: [[110, 200, 14], [175, 180, 10], [250, 210, 16], [300, 170, 9], [130, 290, 11], [215, 270, 13], [290, 300, 12], [160, 380, 15], [245, 360, 10], [100, 420, 9], [300, 410, 13]],
        bumpers: [[200, 330, 12]] },
      { nom: 'La station', par: 3, depart: [200, 515], trou: [200, 110], bords: [rect(90, 60, 220, 500)],
        murs: [[90, 380, 164, 380], [236, 380, 310, 380]],
        moulins: [{ x: 200, y: 380, l: 40, n: 3, w: 0.26 }],
        portes: [{ y: 230, de: 140, a: 260, demi: [26, 9], periode: 2.4, phase: 0 }] },
      { nom: 'Gravité zéro', par: 4, depart: [90, 520], trou: [200, 300], bords: [rect(60, 100, 280, 450)],
        murs: [[110, 540, 110, 160], [110, 160, 290, 160], [290, 160, 290, 470], [290, 470, 160, 470], [160, 470, 160, 220], [160, 220, 240, 220]],
        zones: [{ sol: 'glace', forme: rect(60, 100, 280, 450) }, { bosse: [200, 300, 40, -220] }] },
      { nom: 'Les anneaux', par: 3, depart: [200, 520], trou: [200, 110], bords: [rect(60, 60, 280, 500)],
        zones: [{ bosse: [140, 380, 70, 280] }, { bosse: [260, 260, 70, 280] }, { vide: true, forme: rect(60, 300, 34, 120) }, { vide: true, forme: rect(306, 200, 34, 120) }] },
      { nom: 'Retour sur Terre', par: 4, depart: [90, 505], trou: [90, 140],
        bords: [[[40, 560], [360, 560], [360, 60], [40, 60], [40, 240], [260, 240], [260, 440], [40, 440]]],
        zones: [{ tapis: [0, -1500], forme: rect(265, 300, 90, 100) }, { vide: true, forme: cercle(200, 150, 24) }, { bosse: [200, 150, 95, -230] }, { bosse: [90, 140, 45, -200] }] }
    ]
  }
};
export const PARCOURS_IDS = Object.keys(PARCOURS);
export const parTotal = id => PARCOURS[id].trous.reduce((s, t) => s + t.par, 0);

/* ---------- Construire un trou ---------- */
function dansPoly(pts, x, y) {
  let dedans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}
export { dansPoly };

export function construireTrou(def) {
  const o = formes({ r: RAIL, e: 0.72, f: 0.1 });
  for (const b of def.bords) o.poly([...b, b[0]]);
  for (const [x1, y1, x2, y2] of def.murs || []) o.seg(x1, y1, x2, y2);
  for (const [x, y, r] of def.ronds || []) o.rond(x, y, r, { e: 0.7, f: 0.08 });
  for (const [x, y, r] of def.bumpers || []) o.rond(x, y, r, { e: 0.9, f: 0.02, nom: 'bumper' });
  for (const m of def.moulins || []) o.rond(m.x, m.y, 9, { e: 0.6, nom: 'moyeu' });
  return {
    def,
    murs: o.c,
    zones: def.zones || [],
    moulins: def.moulins || [],
    portes: def.portes || [],
    tunnels: def.tunnels || []
  };
}

/* ---------- Les obstacles qui bougent (position au temps t) ---------- */
// un moulin : n pales qui tournent autour du moyeu
export function pales(m, t) {
  const a0 = m.w * Math.PI * 2 * t;
  return Array.from({ length: m.n }, (_, k) => {
    const a = a0 + k * Math.PI * 2 / m.n;
    const c = Math.cos(a), s = Math.sin(a);
    return { ax: m.x + c * 8, ay: m.y + s * 8, bx: m.x + c * m.l, by: m.y + s * m.l, a };
  });
}
// une porte : un bloc qui glisse (horizontalement si y est donné, verticalement si x est donné)
export function porte(pt, t) {
  const k = 0.5 - 0.5 * Math.cos(Math.PI * 2 * t / pt.periode + pt.phase);
  const dk = 0.5 * Math.sin(Math.PI * 2 * t / pt.periode + pt.phase) * Math.PI * 2 / pt.periode;
  const pos = pt.de + (pt.a - pt.de) * k, vit = (pt.a - pt.de) * dk;
  return pt.y !== undefined ? { cx: pos, cy: pt.y, vx: vit, vy: 0, w: pt.demi[0], h: pt.demi[1] } : { cx: pt.x, cy: pos, vx: 0, vy: vit, w: pt.demi[0], h: pt.demi[1] };
}

// choc contre un mur qui bouge : on fait rebondir la vitesse relative
function chocMobile(b, m, vwx, vwy, e, f) {
  const c = contact(b, m, RB);
  if (!c) return 0;
  const rx = b.vx - vwx, ry = b.vy - vwy;
  const vn = rx * c.nx + ry * c.ny;
  if (vn >= 0) return 0;
  const tmp = { vx: rx, vy: ry };
  reponse(tmp, c.nx, c.ny, vn, e, f, 8);
  b.vx = tmp.vx + vwx; b.vy = tmp.vy + vwy;
  return -vn;
}

/* ---------- Le sol sous la balle ---------- */
export function sol(trou, x, y) {
  const s = { sol: trou.def.solDefaut || 'herbe', ax: 0, ay: 0, eau: false, danger: null };
  for (const z of trou.zones) {
    if (z.bosse) {
      const [cx, cy, r, force] = z.bosse;
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      if (d < r && d > 4) { const k = force * Math.min(1, d / 18); s.ax += dx / d * k; s.ay += dy / d * k; }
      continue;
    }
    if (!dansPoly(z.forme, x, y)) continue;
    if (z.eau) { s.eau = true; s.danger = 'eau'; }
    if (z.lave) { s.eau = true; s.danger = 'lave'; }
    if (z.vide) { s.eau = true; s.danger = 'vide'; }
    if (z.sol) { s.sol = z.sol; if (z.sol === 'pont') s.eau = false; }
    if (z.pente) { s.ax += z.pente[0]; s.ay += z.pente[1]; }
    if (z.tapis) { s.ax += z.tapis[0]; s.ay += z.tapis[1]; s.tapis = true; }
  }
  // le pont passe au-dessus de l'eau
  if (s.sol === 'pont') s.eau = false;
  return s;
}

/* ---------- Une partie ---------- */
export function creerPartie(parcours = 'jardin') {
  if (!PARCOURS[parcours]) parcours = 'jardin';
  const p = { parcours, n: 0, cartes: [], t: 0, evts: [], fini: false };
  commencerTrou(p, 0);
  return p;
}
export function commencerTrou(p, n) {
  p.n = n;
  p.trou = construireTrou({ ...PARCOURS[p.parcours].trous[n], solDefaut: PARCOURS[p.parcours].sol });
  const [x, y] = p.trou.def.depart;
  p.balle = { x, y, vx: 0, vy: 0, z: 1 };
  p.dernier = { x, y };
  p.coups = 0;
  p.phase = 'vise';      // vise → roule → (vise | tombe) … → trouFini
  p.roule = 0;
  p.calme = 0;
  p.tunnelPret = true;
}

const evt = (p, nom, d = {}) => p.evts.push({ nom, ...d });

// tirer : angle en radians, puissance de 0 à 1
export function tirer(p, angle, puissance) {
  if (p.phase !== 'vise' || p.fini) return false;
  const v = VMAX_TIR * Math.max(0.03, Math.min(1, puissance));
  p.dernier = { x: p.balle.x, y: p.balle.y };
  p.balle.vx = Math.cos(angle) * v; p.balle.vy = Math.sin(angle) * v;
  p.coups++;
  p.phase = 'roule';
  p.roule = 0;
  p.calme = 0;
  evt(p, 'tir', { force: puissance });
  return true;
}

export function avancer(p, dt) {
  const n = Math.max(1, Math.ceil(Math.min(dt, 0.05) / PAS));
  const h = Math.min(dt, 0.05) / n;
  for (let i = 0; i < n; i++) sousPas(p, h);
}

function sousPas(p, h) {
  p.t += h;
  const b = p.balle, T = p.trou;
  if (p.phase === 'tombe') {
    // la balle disparaît dans le trou
    b.z -= h * 3;
    const [tx, ty] = T.def.trou;
    b.x += (tx - b.x) * Math.min(1, h * 14); b.y += (ty - b.y) * Math.min(1, h * 14);
    if (b.z <= 0) { b.z = 0; finirTrou(p); }
    return;
  }
  if (p.phase === 'plouf') {
    b.z -= h * 2.5;
    if (b.z <= 0) { b.x = p.dernier.x; b.y = p.dernier.y; b.vx = b.vy = 0; b.z = 1; p.phase = 'vise'; p.coups++; evt(p, 'retour'); verifierMax(p); }
    return;
  }
  if (p.phase === 'trouFini') return;

  const s = sol(T, b.x, b.y);
  const S = SOLS[s.sol];
  // les pentes et les tapis poussent la balle
  b.vx += s.ax * h; b.vy += s.ay * h;
  // le roulement freine
  let v = Math.hypot(b.vx, b.vy);
  if (v > 0) {
    const perte = S.frein * h + v * S.colle * h;
    if (v <= perte) { b.vx = 0; b.vy = 0; v = 0; } else { b.vx *= (v - perte) / v; b.vy *= (v - perte) / v; v -= perte; }
  }
  b.x += b.vx * h; b.y += b.vy * h;

  // les obstacles qui bougent
  for (const m of T.moulins) {
    for (const pa of pales(m, p.t)) {
      const seg = { type: 's', ax: pa.ax, ay: pa.ay, bx: pa.bx, by: pa.by, r: 3, dx: pa.bx - pa.ax, dy: pa.by - pa.ay };
      seg.l2 = seg.dx * seg.dx + seg.dy * seg.dy;
      // vitesse de la pale au point le plus proche de la balle : ω × r
      const w = m.w * Math.PI * 2;
      const f = chocMobile(b, seg, -w * (b.y - m.y), w * (b.x - m.x), 0.55, 0.1);
      if (f > 40) evt(p, 'pale', { force: f });
    }
  }
  for (const pt of T.portes) {
    const q = porte(pt, p.t);
    const x1 = q.cx - q.w, x2 = q.cx + q.w, y1 = q.cy - q.h, y2 = q.cy + q.h;
    const cotes = [[x1, y1, x2, y1], [x2, y1, x2, y2], [x2, y2, x1, y2], [x1, y2, x1, y1]];
    for (const [ax, ay, bx, by] of cotes) {
      const seg = { type: 's', ax, ay, bx, by, r: 2, dx: bx - ax, dy: by - ay };
      seg.l2 = seg.dx * seg.dx + seg.dy * seg.dy || 1;
      const f = chocMobile(b, seg, q.vx, q.vy, 0.6, 0.08);
      if (f > 40) evt(p, 'porte', { force: f });
    }
  }
  // les murs fixes (deux passages pour les coins)
  for (let k = 0; k < 2; k++) {
    for (const m of T.murs) {
      const c = contact(b, m, RB);
      if (!c || c.vn >= 0) continue;
      reponse(b, c.nx, c.ny, c.vn, m.e, m.f, 8);
      if (m.nom === 'bumper') {
        // le champignon renvoie la balle plus fort
        const kick = 170;
        b.vx += c.nx * kick; b.vy += c.ny * kick;
        evt(p, 'bumper', { force: -c.vn });
      } else if (-c.vn > 40) evt(p, 'mur', { force: -c.vn });
    }
  }
  v = Math.hypot(b.vx, b.vy);
  if (v > 1600) { b.vx *= 1600 / v; b.vy *= 1600 / v; }

  // tunnels
  let dansTunnel = false;
  for (const tu of T.tunnels) {
    if (Math.hypot(b.x - tu.de[0], b.y - tu.de[1]) < 11) {
      dansTunnel = true;
      if (p.tunnelPret) {
        const vit = Math.max(160, Math.hypot(b.vx, b.vy) * 0.85);
        b.x = tu.vers[0] + tu.dir[0] * 16; b.y = tu.vers[1] + tu.dir[1] * 16;
        b.vx = tu.dir[0] * vit; b.vy = tu.dir[1] * vit;
        p.tunnelPret = false;
        evt(p, 'tunnel');
      }
    }
  }
  if (!dansTunnel) p.tunnelPret = true;

  // le trou
  const [tx, ty] = T.def.trou;
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
  if (d < TROU) {
    v = Math.hypot(b.vx, b.vy);
    if (d < TROU - RB * 0.35 && v < 380) { p.phase = 'tombe'; b.vx = b.vy = 0; evt(p, 'trou'); return; }
    // trop vite : le bord du trou dévie un peu la balle (elle « lèche » le trou)
    b.vx += dx / (d || 1) * 1800 * h; b.vy += dy / (d || 1) * 1800 * h;
  }

  // l'eau (et sécurité : la balle ne peut pas sortir du terrain)
  const s2 = sol(T, b.x, b.y);
  if (s2.eau || !T.def.bords.some(bo => dansPoly(bo, b.x, b.y))) {
    p.phase = 'plouf'; b.vx = b.vy = 0; evt(p, 'plouf', { danger: s2.danger || 'eau' });
    return;
  }

  // la balle s'arrête ? (sur une pente forte, elle continue de rouler)
  v = Math.hypot(b.vx, b.vy);
  if (p.phase === 'roule') {
    p.roule += h;
    const pousse = Math.hypot(s2.ax, s2.ay);
    if (v < 4 && pousse <= SOLS[s2.sol].frein * 0.9) p.calme += h; else p.calme = 0;
    if (p.calme > 0.12 || p.roule > 25) { b.vx = b.vy = 0; p.phase = 'vise'; evt(p, 'arret'); verifierMax(p); }
  } else if (p.phase === 'vise' && v > 20) {
    // poussée par un obstacle pendant qu'on vise
    p.phase = 'roule'; p.roule = 0; p.calme = 0;
  }
}

function verifierMax(p) {
  if (p.phase === 'vise' && p.coups >= COUPS_MAX) { evt(p, 'max'); finirTrou(p, true); }
}

function finirTrou(p, max = false) {
  if (p.phase === 'trouFini') return;
  p.phase = 'trouFini';
  const par = p.trou.def.par;
  const coups = max ? COUPS_MAX : p.coups;
  p.cartes[p.n] = coups;
  evt(p, 'fini', { coups, par, max });
}

// passer au trou suivant (renvoie false à la fin du parcours)
export function trouSuivant(p) {
  if (p.n + 1 >= PARCOURS[p.parcours].trous.length) { p.fini = true; return false; }
  commencerTrou(p, p.n + 1);
  return true;
}

export const total = p => p.cartes.reduce((s, c) => s + (c || 0), 0);
export const nomScore = (coups, par) => (coups === 1 ? 'Trou en un !' : ({ '-3': 'Albatros !', '-2': 'Eagle !', '-1': 'Birdie !', 0: 'Par', 1: 'Bogey', 2: 'Double bogey' })[coups - par] || `+${coups - par}`);
