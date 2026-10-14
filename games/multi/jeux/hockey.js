/* Air hockey — 1 contre 1 en temps réel, premier à 7 buts.
   La table est verticale : le joueur 0 en bas, le joueur 1 en haut. */
import { copieJoueurs, indexDe, classer } from './outils.js';

export const W = 500, H = 860;
export const BUT_L = 170;          // largeur des buts
export const R_PALET = 22, R_MAILLET = 34;
export const BUTS = 7;
const V_MAILLET = 2600, V_MAX = 1700, FROTTEMENT = 0.35, REBOND = 0.9;

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
      for (const m of e.m) {
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
      if (!dansBut) {
        if (p.y < R_PALET) { p.y = R_PALET; p.vy = Math.abs(p.vy) * REBOND; e.evts.push(['bord']); }
        if (p.y > H - R_PALET) { p.y = H - R_PALET; p.vy = -Math.abs(p.vy) * REBOND; e.evts.push(['bord']); }
      }
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
        const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy), min = R_PALET + R_MAILLET;
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
      for (const m of e.m) {
        const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy), min = R_PALET + R_MAILLET;
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
    ia.prochain = t + 45 + Math.random() * 40;
    const p = e.p, m = e.m[i];
    const monCamp = i === 0 ? p.y > H / 2 : p.y < H / 2;
    const butY = i === 0 ? H - 60 : 60;
    let x, y;
    if (monCamp && t >= e.pause) {
      // direction du but adverse (un peu au hasard pour varier les tirs)
      if (!ia.visee || t > ia.viseeT) { ia.visee = W / 2 + (Math.random() - 0.5) * 110; ia.viseeT = t + 900; }
      const gx = ia.visee, gy = i === 0 ? -60 : H + 60;
      let dx = gx - p.x, dy = gy - p.y;
      const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const devant = (p.x - m.x) * dx + (p.y - m.y) * dy;
      if (devant > 8) {
        // le palet est entre moi et le but : on frappe à travers
        x = p.x + dx * 110; y = p.y + dy * 110;
      } else {
        // on se replace derrière le palet en le contournant
        const cote = (p.x - m.x) * dy - (p.y - m.y) * dx > 0 ? 1 : -1;
        x = p.x - dx * 62 + dy * cote * 46;
        y = p.y - dy * 62 - dx * cote * 46;
        const [bx, by] = borner(i, x, y);
        if (Math.hypot(bx - x, by - y) > 25) {
          // impossible de passer derrière (palet contre mon bord) : on le frappe
          // depuis le centre de ma moitié pour qu'il rebondisse vers l'avant
          const cx = W / 2, cy = i === 0 ? H * 0.72 : H * 0.28;
          const ex = p.x - cx, ey = p.y - cy, de = Math.hypot(ex, ey) || 1;
          // on frappe un coup sec puis on recule pour le laisser ressortir
          const proche = Math.hypot(p.x - m.x, p.y - m.y) < R_PALET + R_MAILLET + 30;
          if (proche && !(t < ia.recul)) ia.recul = t + 160 + 380;
          const frappe = ia.recul && t < ia.recul - 380;
          const loin = ia.recul && t < ia.recul && !frappe;
          const k = frappe ? -60 : loin ? 130 : 70;
          x = p.x - ex / de * k; y = p.y - ey / de * k;
        }
      }
    } else {
      // défense : entre le palet et le but
      x = W / 2 + (p.x - W / 2) * 0.55;
      y = butY + (i === 0 ? -1 : 1) * 30;
    }
    x += (Math.random() - 0.5) * 24;
    return { t: 'pos', x, y };
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
      j: e.joueurs.map(j => j.id), gagnant: e.gagnant, fini: e.fini
    };
  }
};
