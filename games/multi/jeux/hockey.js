/* Air hockey — 1 contre 1 en temps réel, premier à 7 buts.
   La table est verticale : le joueur 0 en bas, le joueur 1 en haut. */
import { copieJoueurs, indexDe, classer } from './outils.js';

export const W = 500, H = 860;
export const BUT_L = 200;          // largeur des buts
export const R_PALET = 22, R_MAILLET = 34;
export const BUTS = 7;
const V_MAILLET = 1800, V_MAX = 1200, FROTTEMENT = 0.45, REBOND = 0.85;

const rayon = (e, i, t) => (t < (e.geant ? e.geant[i] : 0) ? R_MAILLET * 1.8 : R_MAILLET);
const butOuvert = (e, k, t) => !(e.mur && t < e.mur[k]);

function servir(e, cote, t) {
  // le palet repart dans le camp de celui qui vient d'encaisser
  e.p = { x: W / 2, y: cote === 0 ? H * 0.68 : H * 0.32, vx: 0, vy: 0 };
  e.pause = t + 1000;
}
function finir(e) {
  e.fini = true;
  e.gagnant = e.s[0] > e.s[1] ? 0 : 1;
  e.classement = classer(e.joueurs, j => e.s[indexDe(e, j.id)], j => e.s[indexDe(e, j.id)] + ' but' + (e.s[indexDe(e, j.id)] > 1 ? 's' : ''));
}
// chaque maillet reste dans sa moitié de table
function borner(i, x, y) {
  const minY = i === 0 ? H / 2 + R_MAILLET : R_MAILLET, maxY = i === 0 ? H - R_MAILLET : H / 2 - R_MAILLET;
  return [Math.max(R_MAILLET, Math.min(W - R_MAILLET, x)), Math.max(minY, Math.min(maxY, y))];
}

export default {
  id: 'hockey',
  titre: 'Air hockey',
  min: 2,
  max: 2,
  bots: true,
  tic: 33,
  tempsReel: true,
  vueCommune: true,

  creer(liste, t) {
    const e = {
      joueurs: copieJoueurs(liste).slice(0, 2),
      m: [{ x: W / 2, y: H - 90, cx: W / 2, cy: H - 90, vx: 0, vy: 0 }, { x: W / 2, y: 90, cx: W / 2, cy: 90, vx: 0, vy: 0 }],
      s: [0, 0], p: null, pause: 0, gagnant: -1,
      ia: [{ prochain: 0 }, { prochain: 0 }],
      gel: [0, 0], mur: [0, 0], geant: [0, 0],
      fini: false, classement: [], evts: []
    };
    servir(e, Math.random() < 0.5 ? 0 : 1, t);
    e.pause = t + 1800;
    return e;
  },

  action(e, id, d) {
    if (e.fini || !d || d.t !== 'pos') return false;
    const i = indexDe(e, id);
    if (i < 0) return false;
    const x = Number(d.x), y = Number(d.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    [e.m[i].cx, e.m[i].cy] = borner(i, x, y);
    return false;
  },

  etape(e, t, dt) {
    if (e.fini) return false;
    let reste = Math.min(dt, 100) / 1000;
    while (reste > 0) {
      const h = Math.min(reste, 0.004);
      reste -= h;
      // les maillets vont vers la position voulue (vitesse limitée)
      for (const [k, m] of e.m.entries()) {
        if (t < e.gel[k]) { m.vx = 0; m.vy = 0; continue; }   // maillet gelé (pouvoir admin)
        const dx = m.cx - m.x, dy = m.cy - m.y, d = Math.hypot(dx, dy);
        const pas = Math.min(d, V_MAILLET * h);
        const nx = d > 0 ? m.x + dx / d * pas : m.x, ny = d > 0 ? m.y + dy / d * pas : m.y;
        m.vx = (nx - m.x) / h; m.vy = (ny - m.y) / h;
        m.x = nx; m.y = ny;
      }
      if (t < e.pause) continue;
      const p = e.p;
      p.x += p.vx * h; p.y += p.vy * h;
      const f = Math.max(0, 1 - FROTTEMENT * h);
      p.vx *= f; p.vy *= f;
      // bords
      if (p.x < R_PALET) { p.x = R_PALET; p.vx = Math.abs(p.vx) * REBOND; e.evts.push(['bord']); }
      if (p.x > W - R_PALET) { p.x = W - R_PALET; p.vx = -Math.abs(p.vx) * REBOND; e.evts.push(['bord']); }
      const dansBut = Math.abs(p.x - W / 2) < BUT_L / 2 - R_PALET * 0.4;
      // (un but bloqué par un pouvoir admin fait rebondir le palet comme un mur)
      if ((!dansBut || !butOuvert(e, 1, t)) && p.y < R_PALET) { p.y = R_PALET; p.vy = Math.abs(p.vy) * REBOND; e.evts.push(['bord']); }
      if ((!dansBut || !butOuvert(e, 0, t)) && p.y > H - R_PALET) { p.y = H - R_PALET; p.vy = -Math.abs(p.vy) * REBOND; e.evts.push(['bord']); }
      // but !
      if (p.y < -R_PALET || p.y > H + R_PALET) {
        const marque = p.y < 0 ? 0 : 1;
        e.s[marque]++;
        e.evts.push(['but', marque]);
        if (e.s[marque] >= BUTS) { finir(e); return true; }
        servir(e, 1 - marque, t);
        continue;
      }
      // chocs avec les maillets
      for (let i = 0; i < 2; i++) {
        const m = e.m[i];
        const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy), min = R_PALET + rayon(e, i, t);
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        p.x = m.x + nx * min; p.y = m.y + ny * min;
        const rvx = p.vx - m.vx, rvy = p.vy - m.vy;
        const dot = rvx * nx + rvy * ny;
        if (dot < 0) {
          p.vx -= (1 + REBOND) * dot * nx;
          p.vy -= (1 + REBOND) * dot * ny;
          e.evts.push(['tape', i]);
        }
        const v = Math.hypot(p.vx, p.vy);
        if (v > V_MAX) { p.vx *= V_MAX / v; p.vy *= V_MAX / v; }
      }
      // un maillet ne peut pas pousser le palet à travers les bords
      if (p.x < R_PALET) { p.x = R_PALET; p.vx = Math.abs(p.vx) * 0.6; }
      if (p.x > W - R_PALET) { p.x = W - R_PALET; p.vx = -Math.abs(p.vx) * 0.6; }
      if (Math.abs(p.x - W / 2) >= BUT_L / 2 - R_PALET * 0.4) {
        if (p.y < R_PALET) { p.y = R_PALET; p.vy = Math.abs(p.vy) * 0.6; }
        if (p.y > H - R_PALET) { p.y = H - R_PALET; p.vy = -Math.abs(p.vy) * 0.6; }
      }
      // un maillet ne peut pas s'asseoir sur le palet bloqué contre un bord
      for (const [k, m] of e.m.entries()) {
        const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy), min = R_PALET + rayon(e, k, t);
        if (d < min) {
          const nx = d > 0 ? dx / d : 0, ny = d > 0 ? dy / d : (m === e.m[0] ? 1 : -1);
          m.x = p.x + nx * min; m.y = p.y + ny * min;
        }
      }
      // le palet ne reste pas coincé immobile sur la ligne du milieu
      if (Math.hypot(p.vx, p.vy) < 6 && Math.abs(p.y - H / 2) < 3) p.vy += (Math.random() < 0.5 ? -1 : 1) * 40;
    }
    // palet bloqué dans un coin ou contre un bord : un petit souffle le décoince
    const p = e.p;
    if (t >= e.pause) {
      // (on regarde si le palet a vraiment bougé, pas sa vitesse : coincé entre
      // un maillet et le bord, il peut vibrer très vite sans avancer)
      const contreBord = p.x < R_PALET + 6 || p.x > W - R_PALET - 6 || p.y < R_PALET + 6 || p.y > H - R_PALET - 6;
      if (!e.ancre || !contreBord || Math.hypot(p.x - e.ancre.x, p.y - e.ancre.y) > 20) e.ancre = { x: p.x, y: p.y, t };
      else if (t - e.ancre.t > 1500) {
        const dx = W / 2 - p.x, dy = (p.y < H / 2 ? H * 0.3 : H * 0.7) - p.y, d = Math.hypot(dx, dy) || 1;
        p.vx = dx / d * 320; p.vy = dy / d * 320;
        p.x += dx / d * 4; p.y += dy / d * 4;
        e.ancre = null;
      }
    }
    return true;
  },

  bot(e, id, t) {
    const i = indexDe(e, id);
    if (e.fini || i < 0) return null;
    const ia = e.ia[i];
    if (t < ia.prochain) return null;
    ia.prochain = t + 130 + Math.random() * 90;     // temps de réaction
    const p = e.p, m = e.m[i];
    const sens = i === 0 ? 1 : -1;                   // +1 : mon but est en bas
    const ligne = i === 0 ? H - 70 : 70;             // ma ligne de défense
    const versMoi = sens * p.vy;                     // > 0 : le palet vient vers mon but
    const monCamp = sens * (p.y - H / 2) > 0;
    const derriere = sens * (p.y - m.y) > -6;        // palet entre moi et mon but
    const contact = R_PALET + R_MAILLET;
    let x, y;

    if (t < e.pause) {
      x = W / 2; y = ligne;
    } else if (derriere) {
      // le palet est passé derrière moi : je recule par le côté, sans le toucher
      const cote = m.x >= p.x ? 1 : -1;
      x = p.x + cote * (contact + 45);
      if (x < R_MAILLET || x > W - R_MAILLET) x = p.x - cote * (contact + 45);
      y = p.y + sens * 40;
    } else if (versMoi > 80) {
      // interception : où le palet arrivera sur ma ligne (en comptant les rebonds)
      const temps = Math.max(0, (ligne - p.y) / p.vy);
      const L = W - 2 * R_PALET;
      let tx = ((p.x + p.vx * temps - R_PALET) % (2 * L) + 2 * L) % (2 * L);
      tx = R_PALET + (tx > L ? 2 * L - tx : tx);
      // le bot se trompe un peu (sinon il arrête tout)
      if (!ia.erreurT || t > ia.erreurT) { ia.erreur = (Math.random() - 0.5) * 150; ia.erreurT = t + 700; }
      x = Math.max(W / 2 - BUT_L / 2 - 25, Math.min(W / 2 + BUT_L / 2 + 25, tx + ia.erreur));
      y = ligne;
    } else if (monCamp) {
      // attaque : je vise le but d'en face (un peu au hasard pour varier)
      if (!ia.visee || t > ia.viseeT) { ia.visee = W / 2 + (Math.random() - 0.5) * (BUT_L - 60); ia.viseeT = t + 900; }
      const gy = i === 0 ? -60 : H + 60;
      let dx = ia.visee - p.x, dy = gy - p.y;
      const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const pret = (p.x - m.x) * dx + (p.y - m.y) * dy > contact * 0.6;
      if (pret) { x = p.x + dx * 100; y = p.y + dy * 100; }       // on frappe à travers
      else { x = p.x - dx * (contact + 12); y = p.y - dy * (contact + 12); }   // on se place derrière
      const [bx, by] = borner(i, x, y);
      if (Math.abs(by - y) > 20) {
        // palet collé à mon bord du fond : je le pousse vers le côté le plus proche
        const vers = p.x < W / 2 ? -1 : 1;
        x = p.x - vers * (pret ? -60 : contact + 10); y = p.y;
      } else { x = bx; y = by; }
    } else {
      // le palet est chez l'autre : je garde mon but
      x = W / 2 + (p.x - W / 2) * 0.45;
      y = ligne;
    }
    x += (Math.random() - 0.5) * 16;
    return { t: 'pos', x, y };
  },

  // pouvoirs admin (voir games/multi/admin.js)
  admin: {
    commandes: [
      { id: 'but1', nom: '+1 but', icone: '⚽', texte: '+1 but' },
      { id: 'but5', nom: '+5 buts', icone: '🥅', texte: '+5 buts' },
      { id: 'tir', nom: 'Tir surpuissant', icone: '💥', texte: 'a lancé un tir surpuissant' },
      { id: 'geler', nom: 'Geler l’adversaire 5 s', icone: '🧊', texte: 'a gelé son adversaire' },
      { id: 'mur', nom: 'Bloquer mon but 10 s', icone: '🧱', texte: 'a bloqué son but' },
      { id: 'geant', nom: 'Maillet géant 10 s', icone: '🔴', texte: 'a un maillet géant' }
    ],
    faire(e, id, cmd, t) {
      const i = indexDe(e, id), j = 1 - i;
      if (cmd === 'but1' || cmd === 'but5') {
        e.s[i] += cmd === 'but1' ? 1 : 5;
        e.evts.push(['but', i]);
        if (e.s[i] >= BUTS) finir(e);
        return {};
      }
      if (cmd === 'tir') {
        const m = e.m[i], cible = { x: W / 2, y: i === 0 ? -40 : H + 40 };
        const px = m.x, py = m.y + (i === 0 ? -1 : 1) * (R_PALET + rayon(e, i, t) + 2);
        const dx = cible.x - px, dy = cible.y - py, d = Math.hypot(dx, dy) || 1;
        e.p = { x: px, y: py, vx: dx / d * 2200, vy: dy / d * 2200 };
        if (t < e.pause) e.pause = t;
        e.evts.push(['tape', i]);
        return {};
      }
      if (cmd === 'geler') { e.gel[j] = t + 5000; return {}; }
      if (cmd === 'mur') { e.mur[i] = t + 10000; return {}; }
      if (cmd === 'geant') { e.geant[i] = t + 10000; return {}; }
      return null;
    },
    victoire(e, id) { const i = indexDe(e, id); e.s[i] = Math.max(e.s[i], BUTS); finir(e); }
  },

  retirer(e, id) {
    const i = indexDe(e, id);
    if (e.fini || i < 0) return false;
    e.s[1 - i] = Math.max(e.s[1 - i], BUTS);
    finir(e);
    return true;
  },

  vue(e, id, t) {
    const r = v => Math.round(v * 10) / 10;
    return {
      p: [r(e.p.x), r(e.p.y)], v: [r(e.p.vx), r(e.p.vy)],
      m: e.m.map(m => [r(m.x), r(m.y)]),
      s: e.s, pause: Math.max(0, Math.round(e.pause - (t || 0))),
      gel: e.gel.map(g => Math.max(0, Math.round(g - (t || 0)))),
      mur: e.mur.map(g => Math.max(0, Math.round(g - (t || 0)))),
      r: [rayon(e, 0, t || 0), rayon(e, 1, t || 0)],
      j: e.joueurs.map(j => j.id), gagnant: e.gagnant, fini: e.fini
    };
  }
};
