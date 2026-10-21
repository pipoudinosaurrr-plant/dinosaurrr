/* ==========================================================
   Arène.io — une grande arène ouverte à tout le monde
   Mange les points pour grossir, absorbe les joueurs plus petits que toi.
   Le même fichier sert au serveur (arène en ligne) et au mode hors ligne.
   ========================================================== */

export const MONDE = 3600;            // taille de l'arène (carrée)
export const NB_OEUFS = 520;          // nourriture
export const NB_CACTUS = 14;
export const MASSE_DEPART = 20;
export const MAX_CELLULES = 8;
export const BOTS_MIN = 11;           // joueurs + bots : au moins ça
export const COULEURS = ['#22c55e', '#3b82f6', '#f97316', '#ec4899', '#a855f7', '#eab308', '#06b6d4', '#f43f5e', '#84cc16', '#14b8a6', '#fb7185', '#8b5cf6'];
export const NOMS_BOTS = ['Atlas', 'Nova', 'Orion', 'Vega', 'Lyra', 'Titan', 'Iris', 'Zéphyr', 'Kai', 'Luna', 'Neo', 'Sol', 'Rio', 'Mira', 'Axel'];
const CACTUS_MASSE = 130;             // un dino plus gros que ça éclate sur un cactus
const FUSION = 12;                    // secondes avant que tes morceaux se recollent

export const rayon = m => 4 + Math.sqrt(m) * 6;
const vitesse = m => 560 / Math.pow(m, 0.24);
const hasard = (a, b) => a + Math.random() * (b - a);

/* ---------- Le monde ---------- */

export function creerMonde() {
  const w = { t: 0, idc: 1, joueurs: new Map(), prochainNum: 1, oeufs: [], oeufsChanges: new Set(), cactus: [], evts: [] };
  for (let i = 0; i < NB_OEUFS; i++) w.oeufs.push(nouvelOeuf());
  for (let i = 0; i < NB_CACTUS; i++) w.cactus.push({ x: hasard(200, MONDE - 200), y: hasard(200, MONDE - 200) });
  return w;
}

function nouvelOeuf() { return { x: Math.round(hasard(20, MONDE - 20)), y: Math.round(hasard(20, MONDE - 20)), c: Math.floor(Math.random() * 6) }; }

function endroitLibre(w) {
  // un endroit loin des gros dinos
  let meilleur = null, score = -1;
  for (let essai = 0; essai < 12; essai++) {
    const x = hasard(150, MONDE - 150), y = hasard(150, MONDE - 150);
    let d = Infinity;
    for (const j of w.joueurs.values()) for (const c of j.cellules) if (c.m > MASSE_DEPART * 1.5) d = Math.min(d, Math.hypot(c.x - x, c.y - y) - rayon(c.m));
    if (d > score) { score = d; meilleur = { x, y }; }
    if (d > 600) break;
  }
  return meilleur;
}

export function ajouterJoueur(w, id, nom, couleur, bot = false) {
  const j = { id, num: w.prochainNum++, nom, couleur: couleur || COULEURS[Math.floor(Math.random() * COULEURS.length)], bot, cellules: [], tx: 0, ty: 0, vivant: false, meilleur: 0, mangePar: '', invincible: 0, ia: 0, iaCible: null };
  w.joueurs.set(id, j);
  naitre(w, id);
  return j;
}

export function naitre(w, id) {
  const j = w.joueurs.get(id);
  if (!j || j.vivant) return false;
  const p = endroitLibre(w);
  j.cellules = [{ id: w.idc++, x: p.x, y: p.y, m: MASSE_DEPART, vx: 0, vy: 0, fusion: 0 }];
  j.tx = p.x; j.ty = p.y;
  j.vivant = true;
  j.meilleur = MASSE_DEPART;
  j.mangePar = '';
  j.ne = w.t;
  return true;
}

export function retirerJoueur(w, id) { w.joueurs.delete(id); }

export const masse = j => j.cellules.reduce((s, c) => s + c.m, 0);

/* ---------- Commandes ---------- */

export function viser(w, id, x, y) {
  const j = w.joueurs.get(id);
  if (!j || !Number.isFinite(x) || !Number.isFinite(y)) return;
  j.tx = Math.max(-200, Math.min(MONDE + 200, x));
  j.ty = Math.max(-200, Math.min(MONDE + 200, y));
}

// Espace : chaque morceau assez gros se coupe en deux et part vers la souris
export function diviser(w, id) {
  const j = w.joueurs.get(id);
  if (!j || !j.vivant) return;
  const avant = [...j.cellules];
  for (const c of avant) {
    if (j.cellules.length >= MAX_CELLULES || c.m < 36) continue;
    c.m /= 2;
    const dx = j.tx - c.x, dy = j.ty - c.y, d = Math.hypot(dx, dy) || 1;
    const r = rayon(c.m);
    j.cellules.push({ id: w.idc++, x: c.x + dx / d * r, y: c.y + dy / d * r, m: c.m, vx: dx / d * 1100, vy: dy / d * 1100, fusion: w.t + FUSION });
    c.fusion = w.t + FUSION;
  }
}

/* ---------- Une étape de simulation ---------- */

export function etape(w, dt) {
  w.t += dt;
  for (const j of w.joueurs.values()) if (j.vivant) bouger(w, j, dt);
  manger(w);
  for (const j of w.joueurs.values()) {
    if (!j.vivant) continue;
    const m = masse(j);
    if (m > j.meilleur) j.meilleur = m;
    // les très gros fondent doucement
    for (const c of j.cellules) if (c.m > 100) c.m -= c.m * 0.002 * dt;
  }
}

function bouger(w, j, dt) {
  for (const c of j.cellules) {
    const dx = j.tx - c.x, dy = j.ty - c.y, d = Math.hypot(dx, dy);
    const v = vitesse(c.m) * Math.min(1, d / 60);
    if (d > 1) { c.x += dx / d * v * dt; c.y += dy / d * v * dt; }
    // élan après une division (ou un cactus)
    c.x += c.vx * dt; c.y += c.vy * dt;
    const f = Math.pow(0.02, dt);
    c.vx *= f; c.vy *= f;
  }
  // mes morceaux se poussent (ou fusionnent quand c'est l'heure)
  for (let a = 0; a < j.cellules.length; a++) {
    for (let b = a + 1; b < j.cellules.length; b++) {
      const p = j.cellules[a], q = j.cellules[b];
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 0.01;
      const rp = rayon(p.m), rq = rayon(q.m);
      if (w.t > p.fusion && w.t > q.fusion) {
        if (d < Math.max(rp, rq) * 0.9) { p.m += q.m; q.m = 0; }
      } else if (d < rp + rq) {
        const pousse = (rp + rq - d) * 0.5;
        p.x -= dx / d * pousse; p.y -= dy / d * pousse;
        q.x += dx / d * pousse; q.y += dy / d * pousse;
      }
    }
  }
  j.cellules = j.cellules.filter(c => c.m > 0);
  for (const c of j.cellules) {
    const r = rayon(c.m) * 0.5;
    c.x = Math.max(r, Math.min(MONDE - r, c.x));
    c.y = Math.max(r, Math.min(MONDE - r, c.y));
  }
}

function manger(w) {
  const toutes = [];
  for (const j of w.joueurs.values()) if (j.vivant) for (const c of j.cellules) toutes.push({ j, c });

  // les œufs
  for (const { c } of toutes) {
    const r = rayon(c.m);
    for (let i = 0; i < w.oeufs.length; i++) {
      const o = w.oeufs[i];
      if (Math.abs(o.x - c.x) > r || Math.abs(o.y - c.y) > r) continue;
      if ((o.x - c.x) ** 2 + (o.y - c.y) ** 2 < r * r) {
        c.m += 1;
        w.oeufs[i] = nouvelOeuf();
        w.oeufsChanges.add(i);
      }
    }
  }

  // les cactus : un gros dino éclate en morceaux
  for (const { j, c } of toutes) {
    if (c.m < CACTUS_MASSE || j.cellules.length >= MAX_CELLULES) continue;
    for (const k of w.cactus) {
      if (Math.hypot(k.x - c.x, k.y - c.y) > rayon(c.m) - 10) continue;
      const n = Math.min(MAX_CELLULES - j.cellules.length, 6);
      if (n < 1) break;
      const part = c.m / (n + 1);
      c.m = part;
      c.fusion = w.t + FUSION;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random();
        j.cellules.push({ id: w.idc++, x: c.x, y: c.y, m: part, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, fusion: w.t + FUSION });
      }
      // le cactus repousse ailleurs
      k.x = hasard(200, MONDE - 200); k.y = hasard(200, MONDE - 200);
      w.evts.push(['cactus', j.id]);
      break;
    }
  }

  // les dinos entre eux : on mange si on est 25 % plus gros et qu'on le recouvre
  for (const a of toutes) {
    if (a.c.m <= 0) continue;
    for (const b of toutes) {
      if (a === b || b.c.m <= 0 || a.j === b.j) continue;
      if (a.c.m < b.c.m * 1.25) continue;
      if (b.j.invincible > w.t) continue;
      const d = Math.hypot(a.c.x - b.c.x, a.c.y - b.c.y);
      if (d > rayon(a.c.m) - rayon(b.c.m) * 0.4) continue;
      a.c.m += b.c.m;
      b.c.m = 0;
      w.evts.push(['mange', a.j.id, b.j.id]);
      if (!b.j.cellules.some(c => c.m > 0)) b.j.mangePar = a.j.nom;
    }
  }
  for (const j of w.joueurs.values()) {
    if (!j.vivant) continue;
    j.cellules = j.cellules.filter(c => c.m > 0);
    if (!j.cellules.length) {
      j.vivant = false;
      w.evts.push(['mort', j.id, j.mangePar, Math.round(j.meilleur)]);
    }
  }
}

/* ---------- Les bots ---------- */

// garde assez de monde dans l'arène (les bots partent quand des joueurs arrivent)
export function equilibrerBots(w) {
  const humains = [...w.joueurs.values()].filter(j => !j.bot).length;
  const bots = [...w.joueurs.values()].filter(j => j.bot);
  const voulu = Math.max(0, BOTS_MIN - humains);
  if (bots.length < voulu) {
    const pris = new Set(bots.map(b => b.nom));
    const nom = NOMS_BOTS.find(n => !pris.has(n)) || 'Dino';
    ajouterJoueur(w, 'bot-' + Math.random().toString(36).slice(2, 8), nom, null, true);
  } else if (bots.length > voulu) {
    // on retire d'abord un bot mort ou petit
    const b = bots.sort((x, y) => (x.vivant - y.vivant) || masse(x) - masse(y))[0];
    retirerJoueur(w, b.id);
  }
  for (const b of bots) if (!b.vivant && w.t - (b.mortT || (b.mortT = w.t)) > 3) { b.mortT = 0; naitre(w, b.id); }
}

export function piloterBots(w, dt) {
  for (const j of w.joueurs.values()) {
    if (!j.bot || !j.vivant) continue;
    j.ia -= dt;
    if (j.ia > 0) continue;
    j.ia = 0.25 + Math.random() * 0.2;
    const moi = j.cellules.reduce((a, c) => (c.m > a.m ? c : a), j.cellules[0]);
    const r = rayon(moi.m);
    let fx = 0, fy = 0, proie = null, dProie = 700;
    for (const o of w.joueurs.values()) {
      if (o === j || !o.vivant) continue;
      for (const c of o.cellules) {
        const d = Math.hypot(c.x - moi.x, c.y - moi.y);
        if (c.m > moi.m * 1.25 && d < 380 + rayon(c.m)) {
          // fuir les plus gros
          fx -= (c.x - moi.x) / (d || 1) * (1 + 300 / (d || 1));
          fy -= (c.y - moi.y) / (d || 1) * (1 + 300 / (d || 1));
        } else if (moi.m > c.m * 1.3 && d < dProie && o.invincible <= w.t) { proie = c; dProie = d; }
      }
    }
    for (const k of w.cactus) {
      if (moi.m < CACTUS_MASSE) break;
      const d = Math.hypot(k.x - moi.x, k.y - moi.y);
      if (d < r + 120) { fx -= (k.x - moi.x) / (d || 1); fy -= (k.y - moi.y) / (d || 1); }
    }
    if (fx || fy) { j.tx = moi.x + fx * 300; j.ty = moi.y + fy * 300; continue; }
    if (proie) {
      j.tx = proie.x; j.ty = proie.y;
      // un coup de division pour attraper une proie proche
      if (j.cellules.length === 1 && moi.m > proie.m * 2.8 && dProie < r + 260 && Math.random() < 0.25) diviser(w, j.id);
      continue;
    }
    // sinon : les œufs les plus proches
    if (!j.iaCible || Math.random() < 0.3) {
      let best = null, bd = Infinity;
      for (let i = 0; i < w.oeufs.length; i += 3) {
        const o = w.oeufs[i];
        const d = Math.hypot(o.x - moi.x, o.y - moi.y);
        if (d < bd) { bd = d; best = o; }
      }
      j.iaCible = best;
    }
    if (j.iaCible) { j.tx = j.iaCible.x + hasard(-40, 40); j.ty = j.iaCible.y + hasard(-40, 40); }
  }
}

/* ---------- Pouvoirs admin (compte du propriétaire seulement) ---------- */

export const COMMANDES_ADMIN = [
  { id: 'masse', nom: '+500 de masse', icone: '➕', texte: 'a pris 500 de masse' },
  { id: 'geant', nom: 'Devenir géant (×3)', icone: '⬆️', texte: 'est devenu géant' },
  { id: 'invincible', nom: 'Invincible 30 s', icone: '🛡️', texte: 'est invincible 30 s' },
  { id: 'aimant', nom: 'Aspirer les points autour', icone: '🧲', texte: 'a aspiré tous les points' }
];

export function admin(w, id, cmd) {
  const j = w.joueurs.get(id);
  const c = COMMANDES_ADMIN.find(x => x.id === cmd);
  if (!j || !j.vivant || !c) return null;
  const gros = j.cellules.reduce((a, x) => (x.m > a.m ? x : a), j.cellules[0]);
  if (cmd === 'masse') gros.m += 500;
  if (cmd === 'geant') for (const x of j.cellules) x.m *= 3;
  if (cmd === 'invincible') j.invincible = w.t + 30;
  if (cmd === 'aimant') {
    for (let i = 0; i < w.oeufs.length; i++) {
      const o = w.oeufs[i];
      if (Math.hypot(o.x - gros.x, o.y - gros.y) < 900) { gros.m += 1; w.oeufs[i] = nouvelOeuf(); w.oeufsChanges.add(i); }
    }
  }
  return { texte: c.texte };
}

/* ---------- Ce qu'on envoie aux écrans ---------- */

const r1 = v => Math.round(v);

export function infosJoueurs(w) {
  return [...w.joueurs.values()].map(j => [j.num, j.nom, j.couleur, j.bot ? 1 : 0]);
}

export function instantane(w) {
  const c = [];
  for (const j of w.joueurs.values()) {
    if (!j.vivant) continue;
    for (const x of j.cellules) c.push(j.num, x.id, r1(x.x), r1(x.y), Math.round(x.m * 10) / 10);
  }
  const top = [...w.joueurs.values()].filter(j => j.vivant).map(j => [j.num, Math.round(masse(j))]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const changes = [];
  for (const i of w.oeufsChanges) { const o = w.oeufs[i]; changes.push(i, o.x, o.y, o.c); }
  w.oeufsChanges.clear();
  const inv = [...w.joueurs.values()].filter(j => j.invincible > w.t).map(j => j.num);
  return { c, top, o: changes, k: w.cactus.map(k => [r1(k.x), r1(k.y)]), inv };
}

export function tousLesOeufs(w) {
  const t = [];
  for (const o of w.oeufs) t.push(o.x, o.y, o.c);
  return t;
}
