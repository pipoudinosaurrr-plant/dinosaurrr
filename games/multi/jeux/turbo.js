/* Turbo en ligne — de 2 à 6 pilotes (les bots complètent)
   Chaque joueur pilote sa voiture dans son navigateur (même physique que le Turbo solo)
   et envoie sa position 10 fois par seconde ; le serveur la vérifie (pas de téléportation),
   fait rouler les bots, et donne le classement. 3 tours, le circuit est tiré au sort. */
import { copieJoueurs, indexDe, classer } from './outils.js';
import { longueurCircuit, VITESSE_MAX, NITRO_FACTEUR, TOURS, IA, NOMS_CIRCUITS } from '../../turbo/pistes.js';

export const CIRCUITS = Object.keys(IA);
export const VOIES = [-0.8, -0.48, -0.16, 0.16, 0.48, 0.8];   // place de chacun sur la ligne de départ
const DECOMPTE = 4500;
const APRES_PREMIER = 30000;     // 30 s après le premier arrivé, la course s'arrête
const DUREE_MAX = 6 * 60000;

const chrono = ms => { const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

function finir(e, t) {
  if (e.fini) return;
  e.fini = true;
  const total = TOURS * e.longueur;
  e.classement = classer(e.joueurs,
    j => (j.fini ? 1e12 - j.fini : Math.min(j.d, total - 1)) - (j.parti ? 2e12 : 0),
    j => (j.parti ? 'abandon' : j.fini ? chrono(j.fini) : `tour ${Math.min(TOURS, Math.floor(j.d / e.longueur) + 1)}/${TOURS}`));
}

export default {
  id: 'turbo',
  titre: 'Turbo',
  min: 2,
  max: 6,
  bots: true,
  tic: 100,
  tempsReel: true,
  vueCommune: true,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 6);
    const circuit = CIRCUITS[Math.floor(Math.random() * CIRCUITS.length)];
    const [vmin, vmax] = IA[circuit];
    joueurs.forEach((j, i) => Object.assign(j, {
      d: 0, x: VOIES[i], v: 0, fini: 0, maj: t + DECOMPTE, parti: false,
      // vitesse des bots : comme les adversaires du mode « moyen »
      base: j.bot ? VITESSE_MAX * (vmin + (vmax - vmin) * Math.random()) : 0, cibleX: VOIES[i]
    }));
    return { joueurs, circuit, longueur: longueurCircuit(circuit), depart: t + DECOMPTE, premier: 0, fini: false, classement: [], evts: [] };
  },

  action(e, id, d, t) {
    if (e.fini || !d || d.t !== 'pos' || t < e.depart) return false;
    const j = e.joueurs[indexDe(e, id)];
    if (!j || j.bot || j.fini || j.parti) return false;
    // pas de téléportation : au plus la vitesse max (+ nitro) depuis le dernier envoi, avec un peu de marge
    const dt = Math.max(0.05, (t - j.maj) / 1000);
    const max = j.d + VITESSE_MAX * NITRO_FACTEUR * 1.15 * dt + 600;
    const nd = Number(d.d);
    if (Number.isFinite(nd)) j.d = Math.max(Math.max(0, j.d - 4000), Math.min(nd, max));
    if (Number.isFinite(Number(d.x))) j.x = Math.max(-3, Math.min(3, Number(d.x)));
    if (Number.isFinite(Number(d.v))) j.v = Math.max(0, Math.min(VITESSE_MAX * NITRO_FACTEUR, Number(d.v)));
    j.maj = t;
    if (j.d >= TOURS * e.longueur) {
      j.fini = t - e.depart;
      if (!e.premier) e.premier = t;
      e.evts.push(['arrivee', j.id, j.fini]);
    }
    return false;
  },

  etape(e, t, dt) {
    if (e.fini || t < e.depart) return false;
    const s = dt / 1000;
    const humains = e.joueurs.filter(j => !j.bot && !j.parti);
    const tete = Math.max(0, ...humains.map(j => j.d));
    for (const j of e.joueurs) {
      if (!j.bot || j.fini) continue;
      // un peu d'élastique : les bots trop loin devant lèvent le pied, ceux trop loin derrière accélèrent
      const ecart = humains.length ? (j.d - tete) / e.longueur : 0;
      const cible = j.base * (1 - Math.max(-0.25, Math.min(0.25, ecart)) * 0.18);
      j.v += (Math.min(cible, VITESSE_MAX * 1.02) - j.v) * Math.min(1, s * 0.6);
      j.d += j.v * s;
      // changer de file de temps en temps
      if (Math.random() < s * 0.15) j.cibleX = VOIES[Math.floor(Math.random() * VOIES.length)];
      j.x += (j.cibleX - j.x) * Math.min(1, s * 1.5);
      if (j.d >= TOURS * e.longueur) { j.fini = t - e.depart; if (!e.premier) e.premier = t; e.evts.push(['arrivee', j.id, j.fini]); }
    }
    // fin : tous les humains arrivés, ou 30 s après le premier, ou trop long
    if ((humains.length && humains.every(j => j.fini)) || !humains.length || (e.premier && t - e.premier > APRES_PREMIER) || t - e.depart > DUREE_MAX) finir(e, t);
    return true;
  },

  bot() { return null; },

  retirer(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (!j || e.fini || j.fini) return false;
    j.parti = true;
    return true;
  },

  vue(e, id, t) {
    return {
      depart: Math.max(0, e.depart - t), circuit: e.circuit, nomCircuit: NOMS_CIRCUITS[e.circuit], longueur: e.longueur, tours: TOURS,
      j: e.joueurs.map(j => ({ id: j.id, d: Math.round(j.d), x: Math.round(j.x * 1000) / 1000, v: Math.round(j.v), fini: j.fini, parti: j.parti })),
      fini: e.fini
    };
  },

  admin: {
    commandes: [],
    faire() { return null; },
    victoire(e, id, t) {
      const j = e.joueurs[indexDe(e, id)];
      j.fini = Math.max(1, t - e.depart);
      for (const o of e.joueurs) if (o !== j && o.fini && o.fini <= j.fini) o.fini = j.fini + 1;
      finir(e, t);
    }
  }
};
