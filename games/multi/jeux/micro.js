/* Micro — course de petites voitures vue de dessus, de 1 à 4 pilotes (les bots complètent)
   En ligne, à plusieurs sur le même écran, ou contre l'ordinateur. 3 tours.
   La voiture glisse dans les virages (adhérence latérale), ralentit dans l'herbe,
   rebondit sur les bordures (collisions partagées avec le Flipper et le Mini-golf). */
import { copieJoueurs, indexDe, classer } from './outils.js';
import { construire, plusProche, IDS } from '../../micro/pistes.js';
import { contact, reponse, chocBilles } from '../../physique/collisions.js';

export const TOURS = 4;
export const RV = 9;                       // rayon d'une voiture (pour les chocs)
const VMAX = 330, VMAX_HERBE = 150, ACCEL = 520, FREIN = 760, RECUL = 120;
const ADHERENCE = { herbe: 8, carrelage: 4.5, bois: 6.5 };
const DECOMPTE = 3500;
const APRES_PREMIER = 20000;

function finir(e, t) {
  if (e.fini) return;
  e.fini = true;
  e.classement = classer(e.joueurs,
    j => (j.fini ? 1e12 - j.fini : j.passages * 1e4 + j.idx),
    j => (j.fini ? `${(j.fini / 1000).toFixed(2)} s` : `tour ${Math.max(1, Math.min(TOURS, j.passages))}/${TOURS}`));
}

function avancerVoiture(e, j, dt, t) {
  const P = e.piste;
  const fx = Math.cos(j.a), fy = Math.sin(j.a);
  const rx = -fy, ry = fx;
  let vf = j.vx * fx + j.vy * fy, vr = j.vx * rx + j.vy * ry;
  const proche = plusProche(P, j.x, j.y, j.idx);
  const herbe = proche.d > P.largeur / 2;
  const k = j.touches;
  const course = t >= e.depart && !j.fini;
  const vmax = (herbe ? VMAX_HERBE : VMAX) * (j.bot ? j.niveau : 1);
  if (course && k.a) vf = Math.min(vmax, vf + ACCEL * dt);
  else if (course && k.f) vf = Math.max(-RECUL, vf - FREIN * dt);
  if (vf > vmax) vf -= (vf - vmax) * Math.min(1, 3 * dt);
  vf *= 1 - (herbe ? 1.6 : 0.55) * dt;
  // la voiture tourne d'autant plus vite qu'elle roule (et dans l'autre sens en marche arrière)
  const braquage = (course ? (k.d ? 1 : 0) - (k.g ? 1 : 0) : 0);
  j.a += braquage * 3.3 * Math.min(1, Math.abs(vf) / 110) * Math.sign(vf || 1) * dt;
  // adhérence : la glisse sur le côté disparaît plus ou moins vite
  const adh = herbe ? ADHERENCE.herbe : (ADHERENCE[P.sol] || 7);
  vr *= Math.max(0, 1 - adh * dt);
  j.derapage = Math.abs(vr) > 60 && Math.abs(vf) > 120;
  const nfx = Math.cos(j.a), nfy = Math.sin(j.a);
  j.vx = nfx * vf + (-nfy) * vr; j.vy = nfy * vf + nfx * vr;
  j.x += j.vx * dt; j.y += j.vy * dt;
  for (const m of P.murs) {
    const c = contact(j, m, RV);
    if (c && c.vn < 0) { reponse(j, c.nx, c.ny, c.vn, 0.35, 0.2, 20); if (-c.vn > 120) e.evts.push(['choc', j.id]); }
  }
  // le tour : on compte les passages de la ligne (en ayant fait au moins la moitié du circuit)
  const avant = j.idx;
  j.idx = plusProche(P, j.x, j.y, j.idx).i;
  const n = P.n;
  if (j.idx > n * 0.4 && j.idx < n * 0.6) j.mi = true;
  if (avant > n * 0.85 && j.idx < n * 0.15) {
    if (j.mi || j.passages === 0) { j.passages++; j.mi = false; if (j.passages > 1) e.evts.push(['tour', j.id, j.passages]); }
  } else if (avant < n * 0.15 && j.idx > n * 0.85 && j.passages > 0) { j.passages--; j.mi = true; }
  if (!j.fini && j.passages > TOURS) {
    j.fini = t - e.depart;
    if (!e.premier) e.premier = t;
    e.evts.push(['arrivee', j.id, j.fini]);
  }
}

export default {
  id: 'micro',
  titre: 'Micro',
  min: 1,
  max: 4,
  bots: true,
  tic: 33,
  tempsReel: true,
  vueCommune: true,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 4);
    const id = IDS[Math.floor(Math.random() * IDS.length)];
    const piste = construire(id);
    joueurs.forEach((j, i) => {
      const d = piste.depart[i];
      Object.assign(j, { x: d.x, y: d.y, a: d.a, vx: 0, vy: 0, idx: plusProche(piste, d.x, d.y).i, passages: 0, mi: false, fini: 0, touches: { g: false, d: false, a: false, f: false }, derapage: false, niveau: 0.9 + Math.random() * 0.1 });
    });
    return { joueurs, circuit: id, piste, depart: t + DECOMPTE, premier: 0, fini: false, classement: [], evts: [] };
  },

  action(e, id, d, t) {
    if (e.fini || !d || d.t !== 'touches') return false;
    const j = e.joueurs[indexDe(e, id)];
    if (!j) return false;
    j.touches = { g: !!d.g, d: !!d.d, a: !!d.a, f: !!d.f };
    return false;
  },

  etape(e, t, dt) {
    if (e.fini) return false;
    const pas = 1 / 120;
    const n = Math.max(1, Math.round(Math.min(0.1, dt / 1000) / pas));
    for (let s = 0; s < n; s++) {
      for (const j of e.joueurs) avancerVoiture(e, j, pas, t);
      for (let a = 0; a < e.joueurs.length; a++) for (let b = a + 1; b < e.joueurs.length; b++) chocBilles(e.joueurs[a], e.joueurs[b], RV, 0.5);
    }
    const humains = e.joueurs.filter(j => !j.bot && !j.parti);
    if ((humains.length && humains.every(j => j.fini)) || (!humains.length && t > e.depart) || (e.premier && t - e.premier > APRES_PREMIER) || t - e.depart > 5 * 60000) finir(e, t);
    return true;
  },

  // l'ordinateur vise un point un peu plus loin sur le milieu de la route, et freine avant les virages serrés
  bot(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (!j || j.fini) return null;
    const P = e.piste, n = P.n;
    const vise = P.milieu[(j.idx + 9) % n];
    let diff = Math.atan2(vise[1] - j.y, vise[0] - j.x) - j.a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const d1 = P.dirs[j.idx], d2 = P.dirs[(j.idx + 16) % n];
    const virage = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1])));
    const vitesse = Math.hypot(j.vx, j.vy);
    const cible = VMAX * (1 - Math.min(0.55, virage * 0.6));
    const touches = { g: diff < -0.08, d: diff > 0.08, a: vitesse < cible, f: vitesse > cible + 50 };
    if (touches.g !== j.touches.g || touches.d !== j.touches.d || touches.a !== j.touches.a || touches.f !== j.touches.f) return { t: 'touches', ...touches };
    return null;
  },

  retirer(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (!j || e.fini) return false;
    j.parti = true; j.touches = { g: false, d: false, a: false, f: false };
    return true;
  },

  vue(e, id, t) {
    return {
      circuit: e.circuit, depart: Math.max(0, e.depart - t), tours: TOURS,
      v: e.joueurs.map(j => ({ id: j.id, x: Math.round(j.x * 10) / 10, y: Math.round(j.y * 10) / 10, a: Math.round(j.a * 1000) / 1000, s: Math.round(Math.hypot(j.vx, j.vy)), p: j.passages, i: j.idx, f: j.fini, d: j.derapage ? 1 : 0 })),
      fini: e.fini
    };
  },

  admin: {
    commandes: [{ id: 'turbo', nom: 'Turbo (+1 tour)', icone: '🚀', texte: 's’est donné un tour d’avance' }],
    faire(e, id, cmd) {
      const j = e.joueurs[indexDe(e, id)];
      if (!j || cmd !== 'turbo') return null;
      j.passages++;
      return {};
    },
    victoire(e, id, t) {
      const j = e.joueurs[indexDe(e, id)];
      j.fini = Math.max(1, t - e.depart);
      for (const o of e.joueurs) if (o !== j && o.fini && o.fini <= j.fini) o.fini = j.fini + 1;
      finir(e, t);
    }
  }
};
