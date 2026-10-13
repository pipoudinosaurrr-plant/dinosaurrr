/* Tron — 2 à 8 motos de lumière, le dernier encore en piste gagne */
import { copieJoueurs, indexDe, classer } from './outils.js';

export const N = 56;
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
const PAS = 85;          // une case toutes les 85 ms
const DEPART = 3000;     // décompte

export function encoder(grille) {
  const runs = [];
  let v = grille[0], n = 0;
  for (const x of grille) {
    if (x === v) n++;
    else { runs.push((v < 0 ? '.' : String(v)) + n); v = x; n = 1; }
  }
  runs.push((v < 0 ? '.' : String(v)) + n);
  return runs.join(',');
}

export function decoder(texte, taille = N * N) {
  const g = new Int8Array(taille).fill(-1);
  let k = 0;
  for (const run of texte.split(',')) {
    const v = run[0] === '.' ? -1 : Number(run[0]);
    const n = Number(run.slice(1));
    g.fill(v, k, k + n);
    k += n;
  }
  return g;
}

function positionsDepart(n) {
  if (n === 2) return [[8, N / 2, 1], [N - 9, N / 2 - 1, 3]];
  const places = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(N / 2 + Math.cos(a) * N * 0.36);
    const y = Math.round(N / 2 + Math.sin(a) * N * 0.36);
    // on part en tournant autour du centre (pas de face-à-face au départ)
    const tx = -Math.sin(a), ty = Math.cos(a);
    const d = Math.abs(tx) > Math.abs(ty) ? (tx > 0 ? 1 : 3) : (ty > 0 ? 2 : 0);
    places.push([x, y, d]);
  }
  return places;
}

/* ---------- L'ordinateur : il va là où il y a le plus de place ---------- */

function espace(g, x, y, limite) {
  if (x < 0 || y < 0 || x >= N || y >= N || g[y * N + x] !== -1) return 0;
  const vu = new Uint8Array(N * N);
  const pile = [y * N + x];
  vu[y * N + x] = 1;
  let n = 0;
  while (pile.length && n < limite) {
    const k = pile.pop();
    n++;
    const cx = k % N, cy = (k - cx) / N;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const q = ny * N + nx;
      if (vu[q] || g[q] !== -1) continue;
      vu[q] = 1;
      pile.push(q);
    }
  }
  return n;
}

/* ---------- Le jeu ---------- */

function finir(e) {
  e.fini = true;
  e.classement = classer(e.joueurs, j => -j.place, j => (j.place === 1 ? 'Dernier en piste' : `Tenu ${(j.temps / 1000).toFixed(1).replace('.', ',')} s`));
}

export default {
  id: 'tron',
  titre: 'Tron',
  min: 2,
  max: 8,
  bots: true,
  tic: 30,
  vueCommune: true,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 8);
    const grille = new Int8Array(N * N).fill(-1);
    const depart = positionsDepart(joueurs.length);
    joueurs.forEach((j, i) => {
      const [x, y, d] = depart[i];
      Object.assign(j, { x, y, d, file: [], vivant: true, place: 0, temps: 0 });
      grille[y * N + x] = i;
    });
    return { joueurs, grille, pas: 0, journal: [], debut: t + DEPART, prochain: t + DEPART, restants: joueurs.length, fini: false, classement: [], evts: [] };
  },

  action(e, id, d) {
    if (e.fini || !d || d.t !== 'dir') return false;
    const j = e.joueurs[indexDe(e, id)];
    if (!j || !j.vivant) return false;
    const dir = Number(d.d) | 0;
    if (dir < 0 || dir > 3) return false;
    const derniere = j.file.length ? j.file[j.file.length - 1] : j.d;
    if (dir === derniere || dir === (derniere + 2) % 4 || j.file.length >= 2) return false;
    j.file.push(dir);
    return false;
  },

  etape(e, t) {
    if (e.fini || t < e.prochain) return false;
    let change = false;
    while (t >= e.prochain && !e.fini) {
      e.prochain += PAS;
      e.pas++;
      const vivants = e.joueurs.filter(j => j.vivant);
      const cibles = new Map();
      for (const j of vivants) {
        if (j.file.length) j.d = j.file.shift();
        j.nx = j.x + DX[j.d];
        j.ny = j.y + DY[j.d];
        const k = j.ny * N + j.nx;
        j.crash = j.nx < 0 || j.ny < 0 || j.nx >= N || j.ny >= N || e.grille[k] !== -1;
        if (!j.crash) cibles.set(k, (cibles.get(k) || 0) + 1);
      }
      const morts = [];
      const nouvelles = [];
      for (const j of vivants) {
        const k = j.ny * N + j.nx;
        if (j.crash || cibles.get(k) > 1) morts.push(j);
        else {
          j.x = j.nx; j.y = j.ny;
          const i = indexDe(e, j.id);
          e.grille[k] = i;
          nouvelles.push(j.x, j.y, i);
        }
      }
      // les cases des derniers pas, pour que chaque écran rattrape ce qu'il aurait manqué
      e.journal.push(nouvelles);
      if (e.journal.length > 6) e.journal.shift();
      if (morts.length) {
        const place = e.restants - morts.length + 1;
        for (const j of morts) {
          j.vivant = false;
          j.place = place;
          j.temps = t - e.debut;
          e.evts.push(['crash', indexDe(e, j.id), j.x, j.y]);
        }
        e.restants -= morts.length;
      }
      if ((e.joueurs.length > 1 && e.restants <= 1) || e.restants <= 0) {
        const dernier = e.joueurs.find(j => j.vivant);
        if (dernier) { dernier.place = 1; dernier.temps = t - e.debut; }
        finir(e);
      }
      change = true;
    }
    return change;
  },

  bot(e, id, t) {
    const i = indexDe(e, id);
    const j = e.joueurs[i];
    if (e.fini || !j || !j.vivant || j.file.length || t < e.debut - 200) return null;
    if (j.dernierPas === e.pas) return null;
    j.dernierPas = e.pas;
    let meilleur = j.d, score = -1;
    for (const d of [j.d, (j.d + 1) % 4, (j.d + 3) % 4]) {
      const s = espace(e.grille, j.x + DX[d], j.y + DY[d], 500) + (d === j.d ? 0.5 : 0) + Math.random() * 0.8;
      if (s > score) { score = s; meilleur = d; }
    }
    return meilleur !== j.d ? { t: 'dir', d: meilleur } : null;
  },

  retirer(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (e.fini || !j || !j.vivant) return false;
    j.vivant = false;
    j.place = e.restants;
    j.temps = t - e.debut;
    e.restants--;
    if ((e.joueurs.length > 1 && e.restants <= 1) || e.restants <= 0) {
      const dernier = e.joueurs.find(x => x.vivant);
      if (dernier) { dernier.place = 1; dernier.temps = t - e.debut; }
      finir(e);
    }
    return true;
  },

  vue(e, id, t) {
    return {
      pas: e.pas,
      depart: Math.max(0, Math.round(e.debut - (t || 0))),
      j: e.joueurs.map(j => j.id),
      tetes: e.joueurs.map(j => [j.x, j.y, j.vivant ? 1 : 0, j.d]),
      cases: e.journal.flat(),
      plein: e.pas % 8 === 0 || e.pas <= 1 || e.fini ? encoder(e.grille) : undefined,
      restants: e.restants,
      fini: e.fini
    };
  }
};
