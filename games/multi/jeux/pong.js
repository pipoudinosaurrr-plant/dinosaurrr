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

const demi = (e, i, t) => (e.geant && t < e.geant[i] ? RAQ_DEMI * 2.2 : RAQ_DEMI);

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
      gel: [0, 0], geant: [0, 0],
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
      e.p.forEach((p, k) => {
        if (t < e.gel[k]) return;   // raquette gelée (pouvoir admin)
        const dm = demi(e, k, t);
        const d = Math.max(dm, Math.min(H - dm, p.cible)) - p.y;
        p.y += Math.sign(d) * Math.min(Math.abs(d), V_RAQ * h);
      });
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
        if (!dedans || Math.abs(b.y - e.p[i].y) > demi(e, i, t) + BALLE) continue;
        const decal = Math.max(-1, Math.min(1, (b.y - e.p[i].y) / (demi(e, i, t) + BALLE)));
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

  // pouvoirs admin (voir games/multi/admin.js)
  admin: {
    commandes: [
      { id: 'pt1', nom: '+1 point', icone: '➕', texte: '+1 point' },
      { id: 'pt5', nom: '+5 points', icone: '🔥', texte: '+5 points' },
      { id: 'geant', nom: 'Raquette géante 10 s', icone: '📏', texte: 'a une raquette géante' },
      { id: 'geler', nom: 'Geler l’adversaire 5 s', icone: '🧊', texte: 'a gelé son adversaire' }
    ],
    faire(e, id, cmd, t) {
      const i = indexDe(e, id);
      if (cmd === 'pt1' || cmd === 'pt5') {
        e.s[i] += cmd === 'pt1' ? 1 : 5;
        e.evts.push(['point', i]);
        if (e.s[i] >= BUT) finir(e);
        return {};
      }
      if (cmd === 'geant') { e.geant[i] = t + 10000; return {}; }
      if (cmd === 'geler') { e.gel[1 - i] = t + 5000; return {}; }
      return null;
    },
    victoire(e, id) { const i = indexDe(e, id); e.s[i] = Math.max(e.s[i], BUT); finir(e); }
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
      g: [demi(e, 0, t || 0), demi(e, 1, t || 0)],
      gel: e.gel.map(x => Math.max(0, Math.round(x - (t || 0)))),
      s: e.s,
      pause: Math.max(0, Math.round(e.pause - (t || 0))),
      j: e.joueurs.map(j => j.id),
      gagnant: e.gagnant,
      fini: e.fini
    };
  }
};
