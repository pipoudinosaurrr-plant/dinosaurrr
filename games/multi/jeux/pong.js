/* Pong — 1 contre 1 en temps réel, premier à 7 points */
import { copieJoueurs, indexDe, classer } from './outils.js';

export const W = 1000, H = 600;
export const RAQ_X = [30, 970];
export const RAQ_DEMI = 55;
export const RAQ_EP = 14;
export const BALLE = 9;
export const BUT = 7;
const V_RAQ = 950;
const V_DEPART = 540;
const V_MAX = 1150;

function servir(e, vers, t, attente) {
  const a = (Math.random() * 40 - 20) * Math.PI / 180;
  e.b = { x: W / 2, y: H / 2 + (Math.random() * 160 - 80), vx: Math.cos(a) * V_DEPART * (vers === 0 ? -1 : 1), vy: Math.sin(a) * V_DEPART };
  e.pause = t + attente;
}

function replier(y) {
  const min = BALLE, max = H - BALLE, L = max - min;
  let v = (y - min) % (2 * L);
  if (v < 0) v += 2 * L;
  return min + (v > L ? 2 * L - v : v);
}

function finir(e) {
  e.fini = true;
  e.gagnant = e.s[0] > e.s[1] ? 0 : 1;
  e.classement = classer(e.joueurs, j => e.s[indexDe(e, j.id)], j => e.s[indexDe(e, j.id)] + ' point' + (e.s[indexDe(e, j.id)] > 1 ? 's' : ''));
}

export default {
  id: 'pong',
  titre: 'Pong',
  min: 2,
  max: 2,
  bots: true,
  tic: 33,
  tempsReel: true,
  vueCommune: true,

  creer(liste, t) {
    const e = {
      joueurs: copieJoueurs(liste).slice(0, 2),
      p: [{ y: H / 2, cible: H / 2 }, { y: H / 2, cible: H / 2 }],
      s: [0, 0],
      b: null, pause: 0, gagnant: -1,
      ia: [{ prochain: 0, cible: H / 2 }, { prochain: 0, cible: H / 2 }],
      fini: false, classement: [], evts: []
    };
    servir(e, Math.random() < 0.5 ? 0 : 1, t, 2500);
    return e;
  },

  action(e, id, d) {
    if (e.fini || !d || d.t !== 'y') return false;
    const i = indexDe(e, id);
    if (i < 0) return false;
    const y = Number(d.y);
    if (!Number.isFinite(y)) return false;
    e.p[i].cible = Math.max(RAQ_DEMI, Math.min(H - RAQ_DEMI, y));
    return false;
  },

  etape(e, t, dt) {
    if (e.fini) return false;
    let reste = Math.min(dt, 100) / 1000;
    while (reste > 0) {
      const h = Math.min(reste, 0.006);
      reste -= h;
      for (const p of e.p) {
        const d = p.cible - p.y;
        p.y += Math.sign(d) * Math.min(Math.abs(d), V_RAQ * h);
      }
      if (t < e.pause) continue;
      const b = e.b;
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.y < BALLE) { b.y = BALLE; b.vy = Math.abs(b.vy); }
      if (b.y > H - BALLE) { b.y = H - BALLE; b.vy = -Math.abs(b.vy); }
      for (let i = 0; i < 2; i++) {
        const vers = i === 0 ? -1 : 1;
        if (Math.sign(b.vx) !== vers) continue;
        const face = RAQ_X[i] - vers * RAQ_EP / 2;
        const bord = b.x + vers * BALLE;
        const dedans = vers < 0 ? bord <= face && bord >= face - RAQ_EP - 14 : bord >= face && bord <= face + RAQ_EP + 14;
        if (!dedans || Math.abs(b.y - e.p[i].y) > RAQ_DEMI + BALLE) continue;
        const decal = Math.max(-1, Math.min(1, (b.y - e.p[i].y) / (RAQ_DEMI + BALLE)));
        const vitesse = Math.min(V_MAX, Math.hypot(b.vx, b.vy) * 1.08);
        const angle = decal * 58 * Math.PI / 180;
        b.vx = -vers * Math.cos(angle) * vitesse;
        b.vy = Math.sin(angle) * vitesse;
        b.x = face - vers * BALLE;
        e.evts.push(['tape', i]);
      }
      if (b.x < -30 || b.x > W + 30) {
        const marque = b.x < 0 ? 1 : 0;
        e.s[marque]++;
        e.evts.push(['point', marque]);
        if (e.s[marque] >= BUT) { finir(e); return true; }
        servir(e, 1 - marque, t, 1100);
      }
    }
    return true;
  },

  bot(e, id, t) {
    const i = indexDe(e, id);
    if (e.fini || i < 0) return null;
    const ia = e.ia[i];
    if (t < ia.prochain) return null;
    ia.prochain = t + 110 + Math.random() * 60;
    const b = e.b;
    const vers = i === 0 ? -1 : 1;
    let cible = H / 2;
    if (Math.sign(b.vx) === vers && t >= e.pause) {
      const temps = (RAQ_X[i] - b.x) / b.vx;
      const vitesse = Math.hypot(b.vx, b.vy);
      const erreur = (Math.random() - 0.5) * (30 + vitesse / 5.5);
      cible = replier(b.y + b.vy * temps) + erreur;
    }
    return { t: 'y', y: cible };
  },

  retirer(e, id) {
    const i = indexDe(e, id);
    if (e.fini || i < 0) return false;
    e.s[1 - i] = Math.max(e.s[1 - i], BUT);
    finir(e);
    return true;
  },

  vue(e, id, t) {
    const r = v => Math.round(v * 10) / 10;
    return {
      b: [r(e.b.x), r(e.b.y)],
      v: [r(e.b.vx), r(e.b.vy)],
      p: [r(e.p[0].y), r(e.p[1].y)],
      s: e.s,
      pause: Math.max(0, Math.round(e.pause - (t || 0))),
      j: e.joueurs.map(j => j.id),
      gagnant: e.gagnant,
      fini: e.fini
    };
  }
};
