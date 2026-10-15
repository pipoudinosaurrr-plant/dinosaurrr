/* ==========================================================
   Le Cercle — moteur du jeu
   Ce fichier est utilisé à deux endroits :
     - dans le navigateur, pour le mode solo contre des bots ;
     - sur le serveur Cloudflare (dossier serveur/), pour le mode en ligne.
   Il ne touche ni à la page ni au réseau : uniquement les règles et la physique.
   ========================================================== */

export const TAILLE = 1000;
export const CENTRE = TAILLE / 2;
export const RAYON_JOUEUR = 14;
export const MAX_JOUEURS = 8;
export const COULEURS = ['#22c55e', '#3b82f6', '#f97316', '#ec4899', '#a855f7', '#eab308', '#06b6d4', '#f43f5e'];
export const NOMS_BOTS = ['Atlas', 'Nova', 'Orion', 'Echo', 'Volt', 'Nyx', 'Zéro', 'Pixel'];

export const COMPTE = 3;             // décompte avant le départ (s)
const R0 = 420;                      // rayon du cercle au départ
const GRACE = 4;                     // le cercle commence à rétrécir après… (s)

const V_CTRL = 520;                  // vitesse max qu'un joueur peut se donner
const A_CTRL = 1900;                 // accélération max d'un joueur
const GAIN_POS = 7;
const GAIN_VIT = 9;
const V_MAX = 2200;

export const DASH_RECHARGE = 2.2;
const DASH_V = 620;
const DASH_T = 0.2;
const DASH_MASSE = 2.2;
const REBOND = 0.3;

export const BOMBE_RAYON = 190;
export const BOMBE_MECHE = 2;
const BOMBE_FORCE = 1050;

export const TOURBILLON_RAYON = 230;

/* ---------- Hasard reproductible ---------- */

export function alea(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;

/* ---------- Création d'une partie ---------- */

// liste : [{ id, nom, couleur, bot }]
export function creerPartie(liste, graine = (Math.random() * 4294967296) >>> 0) {
  const rnd = alea(graine);
  const n = liste.length;
  const decalage = rnd() * Math.PI * 2;
  const joueurs = liste.map((p, i) => {
    const a = decalage + (i / n) * Math.PI * 2;
    const x = CENTRE + Math.cos(a) * R0 * 0.55;
    const y = CENTRE + Math.sin(a) * R0 * 0.55;
    return {
      id: p.id, nom: p.nom, couleur: p.couleur, bot: !!p.bot,
      x, y, vx: 0, vy: 0, tx: x, ty: y,
      vivant: true, place: 0, tSortie: 0,
      cd: 0, dash: 0, choc: 0, coupPar: null, coupT: -9,
      ia: 0, agressif: 0.25 + rnd() * 0.45, angleIA: rnd() * Math.PI * 2
    };
  });
  return {
    t: -COMPTE, r: R0, cx: CENTRE, cy: CENTRE, tcx: CENTRE, tcy: CENTRE,
    prochainDeplacement: GRACE + 18,
    joueurs, bombes: [], idBombe: 0, prochaineBombe: 4,
    vent: null, prochainVent: 8 + rnd() * 4,
    tourbillon: null, prochainTourbillon: 15 + rnd() * 5,
    nb: n, restants: n, fini: false, classement: [], evts: [], rnd
  };
}

const trouver = (e, id) => e.joueurs.find(j => j.id === id);
const tard = e => Math.min(1, Math.max(0, 1 - e.r / R0));

/* ---------- Commandes des joueurs ---------- */

export function viser(e, id, x, y) {
  const j = trouver(e, id);
  if (!j || !j.vivant || !Number.isFinite(x) || !Number.isFinite(y)) return;
  j.tx = Math.max(-200, Math.min(TAILLE + 200, x));
  j.ty = Math.max(-200, Math.min(TAILLE + 200, y));
}

export function foncer(e, id) {
  const j = trouver(e, id);
  if (!j || !j.vivant || e.t < 0 || e.fini || (j.cd > 0 && !j.infini)) return;
  let dx = j.tx - j.x, dy = j.ty - j.y;
  let d = Math.hypot(dx, dy);
  if (d < 8) { dx = j.vx; dy = j.vy; d = Math.hypot(dx, dy); }
  if (d < 1) { const a = e.rnd() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
  j.vx += dx / d * DASH_V;
  j.vy += dy / d * DASH_V;
  j.dash = DASH_T;
  j.cd = j.infini ? 0 : DASH_RECHARGE;
  e.evts.push(['dash', j.id]);
}

// Un joueur qui quitte la partie en cours compte comme sorti
export function retirer(e, id) {
  const j = trouver(e, id);
  if (!j || !j.vivant || e.fini) return;
  sortir(e, [[j, 0]]);
}

/* ---------- Une étape de simulation ---------- */

export function etape(e, dt) {
  if (e.fini) return;
  e.t += dt;
  if (e.t < 0) return;
  e.r = rayonVoulu(e.t);
  deplacerCentre(e, dt);
  gererBombes(e, dt);
  gererVent(e);
  gererTourbillon(e);
  bougerJoueurs(e, dt);
  collisions(e);
  eliminer(e);
}

function rayonVoulu(t) {
  if (t < GRACE) return R0;
  const s = t - GRACE;
  return Math.max(0, R0 - 4.2 * s - 0.055 * s * s);
}

function deplacerCentre(e, dt) {
  if (e.t >= e.prochainDeplacement) {
    e.prochainDeplacement = e.t + 7;
    const a = e.rnd() * Math.PI * 2;
    const d = e.rnd() * e.r * 0.35;
    let x = e.cx + Math.cos(a) * d, y = e.cy + Math.sin(a) * d;
    const dc = Math.hypot(x - CENTRE, y - CENTRE);
    const max = Math.max(0, 470 - e.r);
    if (dc > max) { x = CENTRE + (x - CENTRE) / dc * max; y = CENTRE + (y - CENTRE) / dc * max; }
    e.tcx = x; e.tcy = y;
  }
  const dx = e.tcx - e.cx, dy = e.tcy - e.cy, d = Math.hypot(dx, dy);
  const pas = Math.min(d, 9 * dt);
  if (d > 0.01) { e.cx += dx / d * pas; e.cy += dy / d * pas; }
}

function pointDansCercle(e, marge) {
  const a = e.rnd() * Math.PI * 2;
  const d = Math.sqrt(e.rnd()) * e.r * marge;
  return [e.cx + Math.cos(a) * d, e.cy + Math.sin(a) * d];
}

function gererBombes(e, dt) {
  e.prochaineBombe -= dt;
  if (e.prochaineBombe <= 0 && e.bombes.length < 5 && e.t > 1.5) {
    e.prochaineBombe = 4.2 - 2.5 * tard(e) + e.rnd() * 1.2;
    let x, y;
    const vivants = e.joueurs.filter(j => j.vivant);
    if (vivants.length && e.rnd() < 0.55) {
      const cible = vivants[Math.floor(e.rnd() * vivants.length)];
      const a = e.rnd() * Math.PI * 2, d = 40 + e.rnd() * 110;
      x = cible.x + Math.cos(a) * d; y = cible.y + Math.sin(a) * d;
    } else {
      [x, y] = pointDansCercle(e, 0.9);
    }
    const dx = x - e.cx, dy = y - e.cy, d = Math.hypot(dx, dy), max = e.r * 0.92;
    if (d > max && d > 0) { x = e.cx + dx / d * max; y = e.cy + dy / d * max; }
    e.bombes.push({ id: ++e.idBombe, x, y, meche: BOMBE_MECHE });
  }
  for (const b of e.bombes) {
    b.meche -= dt;
    if (b.meche <= 0) exploser(e, b);
  }
  e.bombes = e.bombes.filter(b => b.meche > 0);
}

function exploser(e, b) {
  for (const j of e.joueurs) {
    if (!j.vivant) continue;
    let dx = j.x - b.x, dy = j.y - b.y;
    let d = Math.hypot(dx, dy);
    if (d >= BOMBE_RAYON) continue;
    if (d < 0.5) { const a = e.rnd() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
    const k = Math.pow(1 - d / BOMBE_RAYON, 0.6);
    j.vx += dx / d * BOMBE_FORCE * k;
    j.vy += dy / d * BOMBE_FORCE * k;
    j.choc = Math.max(j.choc, 0.35 * k + 0.1);
    j.coupPar = null;
  }
  e.evts.push(['boum', Math.round(b.x), Math.round(b.y)]);
}

function gererVent(e) {
  if (!e.vent && e.t >= e.prochainVent) {
    const a = e.rnd() * Math.PI * 2;
    e.vent = { dx: Math.cos(a), dy: Math.sin(a), force: 750 + 650 * tard(e), debut: e.t + 1.6, fin: e.t + 6.1, i: 0 };
  }
  const v = e.vent;
  if (!v) return;
  if (e.t >= v.fin) { e.vent = null; e.prochainVent = e.t + 7 + e.rnd() * 6; return; }
  v.i = e.t < v.debut ? 0 : Math.max(0, Math.min(1, (e.t - v.debut) / 0.6, (v.fin - e.t) / 0.8));
}

function gererTourbillon(e) {
  if (!e.tourbillon && e.t >= e.prochainTourbillon && e.r > 90) {
    const a = e.rnd() * Math.PI * 2, d = e.r * (0.25 + 0.55 * e.rnd());
    e.tourbillon = {
      x: e.cx + Math.cos(a) * d, y: e.cy + Math.sin(a) * d,
      sens: e.rnd() < 0.5 ? -1 : 1, force: 1500 + 600 * tard(e),
      debut: e.t + 1.6, fin: e.t + 5.6, i: 0
    };
  }
  const w = e.tourbillon;
  if (!w) return;
  if (e.t >= w.fin) { e.tourbillon = null; e.prochainTourbillon = e.t + 14 + e.rnd() * 8; return; }
  w.i = e.t < w.debut ? 0 : Math.max(0, Math.min(1, (e.t - w.debut) / 0.5, (w.fin - e.t) / 0.6));
}

function bougerJoueurs(e, dt) {
  const v = e.vent, w = e.tourbillon;
  for (const j of e.joueurs) {
    if (!j.vivant) continue;
    j.cd = Math.max(0, j.cd - dt);
    j.dash = Math.max(0, j.dash - dt);
    j.choc = Math.max(0, j.choc - dt);

    // le curseur essaie d'aller vers la souris…
    let vdx = (j.tx - j.x) * GAIN_POS, vdy = (j.ty - j.y) * GAIN_POS;
    const vd = Math.hypot(vdx, vdy);
    if (vd > V_CTRL) { vdx *= V_CTRL / vd; vdy *= V_CTRL / vd; }
    let ax = (vdx - j.vx) * GAIN_VIT, ay = (vdy - j.vy) * GAIN_VIT;
    const am = Math.hypot(ax, ay);
    const amax = A_CTRL * (j.choc > 0 ? 0.25 : 1) * (j.dash > 0 ? 0.2 : 1);
    if (am > amax) { ax *= amax / am; ay *= amax / am; }

    // …mais le vent et le tourbillon s'en mêlent
    if (v && v.i > 0) { ax += v.dx * v.force * v.i; ay += v.dy * v.force * v.i; }
    if (w && w.i > 0) {
      const dx = w.x - j.x, dy = w.y - j.y, d = Math.hypot(dx, dy);
      if (d < TOURBILLON_RAYON && d > 0.5) {
        const k = (1 - d / TOURBILLON_RAYON) * w.i * Math.min(1, d / 30);
        ax += dx / d * w.force * k - dy / d * w.force * 0.45 * k * w.sens;
        ay += dy / d * w.force * k + dx / d * w.force * 0.45 * k * w.sens;
      }
    }

    j.vx += ax * dt;
    j.vy += ay * dt;
    const s = Math.hypot(j.vx, j.vy);
    if (s > V_MAX) { j.vx *= V_MAX / s; j.vy *= V_MAX / s; }
    j.x += j.vx * dt;
    j.y += j.vy * dt;
  }
}

function collisions(e) {
  const js = e.joueurs.filter(j => j.vivant);
  const D = RAYON_JOUEUR * 2;
  for (let a = 0; a < js.length; a++) {
    for (let b = a + 1; b < js.length; b++) {
      const p = js[a], q = js[b];
      let dx = q.x - p.x, dy = q.y - p.y;
      let d = Math.hypot(dx, dy);
      if (d >= D) continue;
      if (d < 0.01) { dx = 1; dy = 0; d = 1; }
      const nx = dx / d, ny = dy / d;
      const mp = p.invincible ? 40 : p.dash > 0 ? DASH_MASSE : 1, mq = q.invincible ? 40 : q.dash > 0 ? DASH_MASSE : 1;
      const recouvre = D - Math.min(d, D);
      p.x -= nx * recouvre * mq / (mp + mq); p.y -= ny * recouvre * mq / (mp + mq);
      q.x += nx * recouvre * mp / (mp + mq); q.y += ny * recouvre * mp / (mp + mq);
      const vn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
      if (vn >= 0) continue;
      const imp = -(1 + REBOND) * vn / (1 / mp + 1 / mq);
      p.vx -= imp * nx / mp; p.vy -= imp * ny / mp;
      q.vx += imp * nx / mq; q.vy += imp * ny / mq;
      if (q.dash > 0 && p.dash === 0) p.choc = 0.3;
      if (p.dash > 0 && q.dash === 0) q.choc = 0.3;
      p.coupPar = q.id; p.coupT = e.t;
      q.coupPar = p.id; q.coupT = e.t;
      if (-vn > 450) e.evts.push(['choc', Math.round((p.x + q.x) / 2), Math.round((p.y + q.y) / 2), Math.min(9, Math.round(-vn / 200))]);
    }
  }
}

function eliminer(e) {
  const dehors = [];
  for (const j of e.joueurs) {
    if (!j.vivant) continue;
    const d = Math.hypot(j.x - e.cx, j.y - e.cy);
    if (d > e.r && j.invincible) {
      // invincible (pouvoir admin) : le bord le renvoie dans le cercle
      const k = (e.r - RAYON_JOUEUR) / d;
      j.x = e.cx + (j.x - e.cx) * k; j.y = e.cy + (j.y - e.cy) * k;
      j.vx *= -0.5; j.vy *= -0.5;
      continue;
    }
    if (d > e.r) dehors.push([j, d - e.r]);
  }
  if (dehors.length) sortir(e, dehors);
}

function sortir(e, liste) {
  // le plus loin dehors sort en premier (donc moins bonne place)
  liste.sort((a, b) => b[1] - a[1]);
  for (const [j] of liste) {
    j.place = e.restants;
    e.restants--;
    j.vivant = false;
    j.tSortie = Math.max(0, e.t);
    const par = j.coupPar && e.t - j.coupT < 2.5 && j.coupPar !== j.id ? j.coupPar : null;
    e.evts.push(['sortie', j.id, j.place, Math.round(j.x), Math.round(j.y), par]);
  }
  if ((e.nb > 1 && e.restants <= 1) || e.restants <= 0) {
    const dernier = e.joueurs.find(j => j.vivant);
    if (dernier) { dernier.place = 1; dernier.tSortie = e.t; }
    e.fini = true;
    e.classement = [...e.joueurs]
      .sort((a, b) => a.place - b.place)
      .map(j => ({ id: j.id, nom: j.nom, couleur: j.couleur, bot: j.bot, place: j.place, temps: r1(j.tSortie) }));
    e.evts.push(['fin']);
  }
}

/* ---------- Pouvoirs admin (compte du propriétaire seulement) ---------- */

export const COMMANDES_ADMIN = [
  { id: 'invincible', nom: 'Invincible', icone: '🛡️', texte: 'est devenu invincible' },
  { id: 'dash', nom: 'Dash infini', icone: '⚡', texte: 'a le dash infini' },
  { id: 'souffle', nom: 'Souffler tout le monde', icone: '🌪️', texte: 'a soufflé tout le monde' },
  { id: 'victoire', nom: 'Éjecter tout le monde', icone: '🏆', texte: 'a éjecté tout le monde' }
];

export function admin(e, id, cmd) {
  const j = trouver(e, id);
  const c = COMMANDES_ADMIN.find(x => x.id === cmd);
  if (!j || !j.vivant || e.fini || !c) return null;
  const autres = e.joueurs.filter(o => o.vivant && o !== j);
  if (cmd === 'invincible') j.invincible = true;
  if (cmd === 'dash') { j.infini = true; j.cd = 0; }
  if (cmd === 'souffle') {
    for (const o of autres) {
      const dx = o.x - j.x, dy = o.y - j.y, d = Math.hypot(dx, dy) || 1;
      o.vx += dx / d * 1400; o.vy += dy / d * 1400;
      o.coupPar = j.id; o.coupT = e.t;
    }
  }
  if (cmd === 'victoire') {
    if (!autres.length) return null;
    for (const o of autres) { o.coupPar = j.id; o.coupT = e.t; }
    sortir(e, autres.map(o => [o, 1]));
  }
  e.triche = true;
  return { texte: c.texte };
}

/* ---------- Les bots ---------- */

export function piloterBots(e, dt) {
  if (e.t < 0 || e.fini) return;
  const v = e.vent, w = e.tourbillon;
  for (const j of e.joueurs) {
    if (!j.bot || !j.vivant) continue;
    j.ia -= dt;
    if (j.ia > 0) continue;
    j.ia = 0.12 + e.rnd() * 0.12;

    // chaque bot a son coin préféré, pas trop loin du centre
    j.angleIA += (e.rnd() - 0.5) * 0.6;
    let gx = e.cx + Math.cos(j.angleIA) * e.r * 0.3;
    let gy = e.cy + Math.sin(j.angleIA) * e.r * 0.3;

    // contre le vent : se placer du côté d'où il vient
    if (v) { gx -= v.dx * e.r * 0.3; gy -= v.dy * e.r * 0.3; }

    // fuir le tourbillon
    if (w) {
      const dx = j.x - w.x, dy = j.y - w.y, d = Math.hypot(dx, dy) || 1;
      if (d < TOURBILLON_RAYON + 50) { gx = w.x + dx / d * (TOURBILLON_RAYON + 70); gy = w.y + dy / d * (TOURBILLON_RAYON + 70); }
    }

    // fuir les bombes qui vont exploser
    for (const b of e.bombes) {
      if (b.meche > 1.4) continue;
      const dx = j.x - b.x, dy = j.y - b.y, d = Math.hypot(dx, dy) || 1;
      if (d < BOMBE_RAYON + 30) { gx = b.x + dx / d * (BOMBE_RAYON + 50); gy = b.y + dy / d * (BOMBE_RAYON + 50); }
    }

    // rester dans le cercle
    let dx = gx - e.cx, dy = gy - e.cy, d = Math.hypot(dx, dy);
    const max = e.r * 0.72;
    if (d > max && d > 0) { gx = e.cx + dx / d * max; gy = e.cy + dy / d * max; }

    // pousser quelqu'un qui est plus près du bord
    if (j.cd === 0 && e.rnd() < j.agressif * 0.18 * Math.min(1, e.t / 12)) {
      const moi = Math.hypot(j.x - e.cx, j.y - e.cy);
      let cible = null, meilleur = 170;
      for (const o of e.joueurs) {
        if (o === j || !o.vivant) continue;
        const dd = Math.hypot(o.x - j.x, o.y - j.y);
        const bord = Math.hypot(o.x - e.cx, o.y - e.cy);
        if (dd < meilleur && bord > moi + 10 && bord > e.r * 0.45) { meilleur = dd; cible = o; }
      }
      if (cible) {
        j.tx = cible.x + cible.vx * 0.1;
        j.ty = cible.y + cible.vy * 0.1;
        foncer(e, j.id);
        continue;
      }
    }

    j.tx = gx + (e.rnd() - 0.5) * 30;
    j.ty = gy + (e.rnd() - 0.5) * 30;
  }
}

/* ---------- Ce qu'on envoie aux écrans ---------- */

export function equipe(e) {
  return e.joueurs.map(j => ({ id: j.id, nom: j.nom, couleur: j.couleur, bot: j.bot }));
}

export function instantane(e) {
  return {
    t: r2(e.t),
    r: r1(e.r),
    c: [r1(e.cx), r1(e.cy)],
    n: e.restants,
    j: e.joueurs.map(j => [j.id, r1(j.x), r1(j.y), j.vivant ? 1 : 0, r1(j.cd), j.dash > 0 ? 1 : 0, j.choc > 0 ? 1 : 0]),
    b: e.bombes.map(b => [b.id, Math.round(b.x), Math.round(b.y), r2(b.meche)]),
    v: e.vent ? [r2(e.vent.dx), r2(e.vent.dy), r2(e.vent.i), e.t < e.vent.debut ? 1 : 0] : 0,
    w: e.tourbillon ? [Math.round(e.tourbillon.x), Math.round(e.tourbillon.y), r2(e.tourbillon.i), e.t < e.tourbillon.debut ? 1 : 0, e.tourbillon.sens] : 0
  };
}
