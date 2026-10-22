/* Bomberman — 2 à 4 joueurs, le dernier debout gagne
   - arène 15 × 13 : murs fixes, caisses à casser (certaines cachent un bonus)
   - bombe : explose après 2,5 s en croix ; les flammes cassent la 1re caisse,
     font sauter les autres bombes (réaction en chaîne) et éliminent les joueurs
   - bonus : +1 bombe, +1 portée, +vitesse
   - après 2 minutes : mort subite, des blocs tombent en spirale
   Les positions des joueurs sont en cases (le centre d'une case = nombre entier). */
import { copieJoueurs, indexDe, classer } from './outils.js';

export const L = 15, H = 13;
export const VIDE = 0, MUR = 1, CAISSE = 2, B_BOMBE = 3, B_FLAMME = 4, B_VITESSE = 5;
export const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const MECHE = 2500;            // ms avant l'explosion
const FLAMME = 550;            // ms pendant lesquelles les flammes brûlent
const DEPART = 3000;           // décompte
const MORT_SUBITE = 120000;    // ms avant que l'arène se referme
const CHUTE = 260;             // ms entre deux blocs qui tombent
const VITESSE = [3.4, 4.1, 4.8, 5.5, 6.2, 6.8];   // cases / seconde selon le nombre de bonus vitesse
const COINS = [[1, 1], [L - 2, H - 2], [L - 2, 1], [1, H - 2]];

const k = (x, y) => y * L + x;
const dans = (x, y) => x >= 0 && y >= 0 && x < L && y < H;

/* ---------- L'arène ---------- */
function nouvelleArene(n) {
  const g = new Uint8Array(L * H);
  const cache = new Uint8Array(L * H);   // bonus cachés sous les caisses
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
    if (x === 0 || y === 0 || x === L - 1 || y === H - 1 || (x % 2 === 0 && y % 2 === 0)) g[k(x, y)] = MUR;
  }
  // zones libres autour des points de départ
  const libre = new Set();
  for (const [cx, cy] of COINS.slice(0, Math.max(2, n))) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) libre.add(k(cx + dx, cy + dy));
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < L - 1; x++) {
    const i = k(x, y);
    if (g[i] === MUR || libre.has(i) || Math.random() > 0.72) continue;
    g[i] = CAISSE;
    const r = Math.random();
    cache[i] = r < 0.13 ? B_BOMBE : r < 0.26 ? B_FLAMME : r < 0.34 ? B_VITESSE : VIDE;
  }
  return { g, cache };
}

// l'ordre dans lequel les blocs tombent pendant la mort subite (spirale de l'extérieur vers le centre)
function spirale() {
  const ordre = [];
  let x0 = 1, y0 = 1, x1 = L - 2, y1 = H - 2;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) ordre.push([x, y0]);
    for (let y = y0 + 1; y <= y1; y++) ordre.push([x1, y]);
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) ordre.push([x, y1]);
    if (x1 > x0) for (let y = y1 - 1; y > y0; y--) ordre.push([x0, y]);
    x0++; y0++; x1--; y1--;
  }
  return ordre;
}

const caseDe = j => [Math.round(j.x), Math.round(j.y)];
const bombeEn = (e, x, y) => e.bombes.find(b => b.x === x && b.y === y);

// peut-on entrer dans cette case ? (on peut ressortir d'une bombe qu'on vient de poser)
function libre(e, x, y, j) {
  if (!dans(x, y)) return false;
  const v = e.g[k(x, y)];
  if (v === MUR || v === CAISSE) return false;
  const b = bombeEn(e, x, y);
  if (b && !(j && b.passants.has(j.id))) return false;
  return true;
}

function deplacer(e, j, d, dist) {
  const [cx, cy] = caseDe(j);
  const horiz = d === 1 || d === 3;
  // 1) se recaler au milieu du couloir (permet de tourner facilement aux croisements)
  const ecart = horiz ? cy - j.y : cx - j.x;
  if (Math.abs(ecart) > 1e-3) {
    // si le couloir d'à côté est ouvert dans cette direction, on s'y glisse plutôt
    const s = Math.min(dist, Math.abs(ecart));
    if (horiz) j.y += Math.sign(ecart) * s; else j.x += Math.sign(ecart) * s;
    dist -= s;
    if (dist <= 1e-6) return;
  }
  // 2) avancer jusqu'au centre de la case suivante si elle est libre, sinon jusqu'au centre de la case actuelle
  const pos = horiz ? j.x : j.y;
  const centre = horiz ? cx : cy;
  const sens = horiz ? DX[d] : DY[d];
  let cible = pos + sens * dist;
  const devantX = cx + DX[d], devantY = cy + DY[d];
  if (!libre(e, devantX, devantY, j)) {
    // bloqué : on ne dépasse pas le centre de sa case
    if ((sens > 0 && pos <= centre) || (sens < 0 && pos >= centre)) cible = sens > 0 ? Math.min(cible, centre) : Math.max(cible, centre);
    else cible = pos;   // déjà passé le centre (ne devrait pas arriver) : on reste
  } else {
    // ne pas sauter plus d'une case par pas
    const limite = centre + sens;
    cible = sens > 0 ? Math.min(cible, limite) : Math.max(cible, limite);
  }
  if (horiz) j.x = cible; else j.y = cible;
}

function exploser(e, b, t, chaine) {
  const i = e.bombes.indexOf(b);
  if (i < 0) return;
  e.bombes.splice(i, 1);
  const p = e.joueurs.find(j => j.id === b.par);
  if (p) p.posees = Math.max(0, p.posees - 1);
  const cases = [[b.x, b.y, 'c']];
  const autres = [];
  for (let d = 0; d < 4; d++) {
    for (let r = 1; r <= b.portee; r++) {
      const x = b.x + DX[d] * r, y = b.y + DY[d] * r;
      if (!dans(x, y)) break;
      const v = e.g[k(x, y)];
      if (v === MUR) break;
      const bout = r === b.portee;
      if (v === CAISSE) {
        e.g[k(x, y)] = VIDE;
        e.casses.push([x, y, e.cache[k(x, y)]]);
        cases.push([x, y, 'x']);
        break;
      }
      // un bonus touché par les flammes disparaît
      if (v >= B_BOMBE) e.g[k(x, y)] = VIDE;
      cases.push([x, y, d % 2 ? (bout ? 'h' + d : 'h') : (bout ? 'v' + d : 'v')]);
      const autre = bombeEn(e, x, y);
      if (autre) { autres.push(autre); break; }
    }
  }
  for (const [x, y, forme] of cases) e.flammes.push({ x, y, forme, fin: t + FLAMME });
  e.evts.push(['boum', b.x, b.y, chaine ? 1 : 0]);
  for (const a of autres) exploser(e, a, t, true);
}

function eliminer(e, j, t) {
  if (!j.vivant) return;
  j.vivant = false;
  j.mort = t;
  e.evts.push(['mort', indexDe(e, j.id), j.x, j.y]);
}

function finir(e) {
  e.fini = true;
  // classement : le dernier debout, puis ceux qui ont tenu le plus longtemps
  e.classement = classer(e.joueurs, j => (j.vivant ? Number.MAX_SAFE_INTEGER : j.mort), j => (j.vivant ? 'Dernier debout !' : `Éliminé à ${Math.max(0, Math.round((j.mort - e.debut) / 1000))} s`));
  const v = e.joueurs.findIndex(j => j.vivant);
  e.gagnant = v;
}

/* ---------- L'ordinateur ---------- */
// carte du danger : pour chaque case, dans combien de ms elle brûlera (Infinity = jamais)
function carteDanger(e, t, extra) {
  const dg = new Float64Array(L * H).fill(Infinity);
  for (const f of e.flammes) dg[k(f.x, f.y)] = 0;
  const bombes = extra ? [...e.bombes, extra] : e.bombes;
  // les bombes en chaîne explosent avec la plus pressée
  const quand = new Map(bombes.map(b => [b, b.t - t]));
  let change = true;
  while (change) {
    change = false;
    for (const b of bombes) for (const [x, y] of portee(e, b)) {
      const autre = bombes.find(o => o !== b && o.x === x && o.y === y);
      if (autre && quand.get(autre) > quand.get(b)) { quand.set(autre, quand.get(b)); change = true; }
    }
  }
  for (const b of bombes) for (const [x, y] of portee(e, b)) dg[k(x, y)] = Math.min(dg[k(x, y)], quand.get(b));
  return dg;
}
function portee(e, b) {
  const r = [[b.x, b.y]];
  for (let d = 0; d < 4; d++) for (let i = 1; i <= b.portee; i++) {
    const x = b.x + DX[d] * i, y = b.y + DY[d] * i;
    if (!dans(x, y) || e.g[k(x, y)] === MUR) break;
    r.push([x, y]);
    if (e.g[k(x, y)] === CAISSE) break;
  }
  return r;
}
// chemin le plus court (en cases) vers une case qui vérifie but(x, y)
function chercher(e, j, depart, but, danger, vitesse, bombeEnPlus) {
  const vu = new Int16Array(L * H).fill(-1);
  const [sx, sy] = depart;
  const file = [[sx, sy, 0]];
  vu[k(sx, sy)] = -2;
  while (file.length) {
    const [x, y, n] = file.shift();
    if (but(x, y, n)) {
      // remonter jusqu'au 1er pas
      let cx = x, cy = y;
      while (vu[k(cx, cy)] >= 0) { const p = vu[k(cx, cy)]; const px = p % L, py = (p - px) / L; if (px === sx && py === sy) break; cx = px; cy = py; }
      return { x: cx, y: cy, n };
    }
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d];
      if (!dans(nx, ny) || vu[k(nx, ny)] !== -1) continue;
      if (!libre(e, nx, ny, j) && !(bombeEnPlus && nx === bombeEnPlus.x && ny === bombeEnPlus.y)) continue;
      // n'entre pas dans une case qui brûlera quand on y passera
      const arrivee = ((n + 1) / vitesse) * 1000;
      const brule = danger[k(nx, ny)];
      if (brule <= 0 || (brule < Infinity && Math.abs(brule - arrivee) < 700)) continue;
      vu[k(nx, ny)] = k(x, y);
      file.push([nx, ny, n + 1]);
    }
  }
  return null;
}

export default {
  id: 'bomberman',
  titre: 'Bomberman',
  min: 2,
  max: 4,
  bots: true,
  tic: 50,
  tempsReel: true,
  vueCommune: true,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 4);
    const { g, cache } = nouvelleArene(joueurs.length);
    joueurs.forEach((j, i) => {
      const [x, y] = COINS[i];
      Object.assign(j, { x, y, d: -1, regard: 2, vivant: true, mort: 0, bombes: 1, portee: 2, vitesse: 0, posees: 0, bouge: false });
    });
    return { joueurs, g, cache, bombes: [], flammes: [], casses: [], debut: t + DEPART, chute: spirale(), prochaineChute: t + DEPART + MORT_SUBITE, tombes: [], fini: false, gagnant: -1, classement: [], evts: [], dernier: t };
  },

  action(e, id, d, t) {
    if (e.fini || !d) return false;
    const j = e.joueurs[indexDe(e, id)];
    if (!j || !j.vivant) return false;
    if (d.t === 'dir') { const v = Number(d.d); j.d = v >= 0 && v <= 3 ? v | 0 : -1; if (j.d >= 0) j.regard = j.d; return false; }
    if (d.t === 'bombe') {
      if (t < e.debut || j.posees >= j.bombes) return false;
      const [x, y] = caseDe(j);
      if (bombeEn(e, x, y) || e.g[k(x, y)] !== VIDE && e.g[k(x, y)] < B_BOMBE) return false;
      // tous ceux qui sont sur la case peuvent en sortir
      const passants = new Set(e.joueurs.filter(o => o.vivant && Math.abs(o.x - x) < 1 && Math.abs(o.y - y) < 1).map(o => o.id));
      e.bombes.push({ x, y, t: t + MECHE, par: j.id, portee: j.portee, passants });
      j.posees++;
      e.evts.push(['pose', x, y]);
      return true;
    }
    return false;
  },

  etape(e, t) {
    if (e.fini) return false;
    const dt = Math.min(0.1, (t - e.dernier) / 1000);
    e.dernier = t;
    if (t < e.debut) return true;
    e.casses = [];
    // déplacements
    for (const j of e.joueurs) {
      j.bouge = false;
      if (!j.vivant || j.d < 0) continue;
      const avant = j.x + j.y;
      deplacer(e, j, j.d, VITESSE[Math.min(j.vitesse, VITESSE.length - 1)] * dt);
      j.bouge = Math.abs(j.x + j.y - avant) > 1e-4;
      // bonus ramassé
      const [cx, cy] = caseDe(j);
      const v = e.g[k(cx, cy)];
      if (v >= B_BOMBE) {
        if (v === B_BOMBE) j.bombes = Math.min(8, j.bombes + 1);
        if (v === B_FLAMME) j.portee = Math.min(8, j.portee + 1);
        if (v === B_VITESSE) j.vitesse = Math.min(VITESSE.length - 1, j.vitesse + 1);
        e.g[k(cx, cy)] = VIDE;
        e.evts.push(['bonus', indexDe(e, j.id), v]);
      }
    }
    // ceux qui sont sortis de leur bombe ne peuvent plus y revenir
    for (const b of e.bombes) for (const id of [...b.passants]) {
      const j = e.joueurs.find(o => o.id === id);
      if (!j || !j.vivant || Math.abs(j.x - b.x) >= 0.98 || Math.abs(j.y - b.y) >= 0.98) b.passants.delete(id);
    }
    // explosions
    for (const b of [...e.bombes]) if (t >= b.t) exploser(e, b, t, false);
    // les bonus cachés apparaissent
    for (const [x, y, bonus] of e.casses) if (bonus) e.g[k(x, y)] = bonus;
    e.flammes = e.flammes.filter(f => f.fin > t);
    // mort subite : les blocs tombent
    if (t >= e.prochaineChute && e.chute.length) {
      if (!e.mortSubite) { e.mortSubite = true; e.evts.push(['subite']); }
      const [x, y] = e.chute.shift();
      e.prochaineChute = t + CHUTE;
      e.g[k(x, y)] = MUR;
      const b = bombeEn(e, x, y);
      if (b) { e.bombes.splice(e.bombes.indexOf(b), 1); const p = e.joueurs.find(j => j.id === b.par); if (p) p.posees--; }
      e.tombes.push([x, y]);
      for (const j of e.joueurs) if (j.vivant) { const [cx, cy] = caseDe(j); if (cx === x && cy === y) eliminer(e, j, t); }
    }
    // les flammes éliminent
    for (const j of e.joueurs) {
      if (!j.vivant || j.invincible > t) continue;
      const [cx, cy] = caseDe(j);
      if (e.flammes.some(f => f.x === cx && f.y === cy)) eliminer(e, j, t);
    }
    const vivants = e.joueurs.filter(j => j.vivant);
    if (vivants.length <= 1 && e.joueurs.length > 1) finir(e);
    else if (!vivants.length) finir(e);
    return true;
  },

  bot(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (e.fini || !j || !j.vivant || t < e.debut) return null;
    const [cx, cy] = caseDe(j);
    const vit = VITESSE[j.vitesse];
    const danger = carteDanger(e, t);
    const dirVers = (x, y) => (x > cx ? 1 : x < cx ? 3 : y > cy ? 2 : y < cy ? 0 : -1);
    const ennemis = e.joueurs.filter(o => o.vivant && o !== j);
    const sur = (x, y) => danger[k(x, y)] === Infinity;
    // 1) en danger : fuir vers la case sûre la plus proche (on y repense à chaque instant)
    if (!sur(cx, cy)) {
      const p = chercher(e, j, [cx, cy], (x, y) => sur(x, y), danger, vit);
      // arrivé au bout du chemin mais pas encore centré : on finit de se placer
      const d = p ? dirVers(p.x, p.y) : -1;
      return d !== j.d ? { t: 'dir', d } : null;
    }
    // la case où l'on va est dangereuse : on s'arrête
    if (j.d >= 0) {
      const nx = cx + DX[j.d], ny = cy + DY[j.d];
      if (dans(nx, ny) && !sur(nx, ny) && Math.abs(j.x - cx) < 0.15 && Math.abs(j.y - cy) < 0.15) return { t: 'dir', d: -1 };
    }
    const centre = Math.abs(j.x - cx) < 0.12 && Math.abs(j.y - cy) < 0.12;
    // pour le reste, on ne décide qu'au centre d'une case (sinon on continue tout droit)
    if (!centre && j.d >= 0 && t - (j.decide || 0) < 600) return null;
    j.decide = t;
    // 2) poser une bombe si ça sert (caisse ou ennemi à portée) et qu'on peut s'abriter ensuite
    const peutPoser = j.posees < j.bombes && !bombeEn(e, cx, cy);
    if (peutPoser) {
      const b = { x: cx, y: cy, t: t + MECHE, portee: j.portee, passants: new Set([j.id]) };
      const zone = portee(e, b);
      const utile = zone.some(([x, y]) => e.g[k(x, y)] === CAISSE) || ennemis.some(o => zone.some(([x, y]) => Math.round(o.x) === x && Math.round(o.y) === y));
      if (utile && Math.random() < 0.9) {
        const dg2 = carteDanger(e, t, b);
        const abri = chercher(e, j, [cx, cy], (x, y) => dg2[k(x, y)] === Infinity, dg2, vit, b);
        if (abri && abri.n <= 5) return { t: 'bombe' };
      }
    }
    // 3) aller chercher un bonus, une caisse à casser, ou un ennemi
    const cibleBonus = chercher(e, j, [cx, cy], (x, y, n) => n > 0 && n < 9 && e.g[k(x, y)] >= B_BOMBE, danger, vit);
    if (cibleBonus) return { t: 'dir', d: dirVers(cibleBonus.x, cibleBonus.y) };
    const pres = (x, y) => [0, 1, 2, 3].some(d => e.g[k(x + DX[d], y + DY[d])] === CAISSE);
    const versCaisse = chercher(e, j, [cx, cy], (x, y, n) => n > 0 && pres(x, y) && sur(x, y), danger, vit);
    const versEnnemi = ennemis.length ? chercher(e, j, [cx, cy], (x, y, n) => n > 0 && ennemis.some(o => Math.abs(Math.round(o.x) - x) + Math.abs(Math.round(o.y) - y) <= 2), danger, vit) : null;
    const choix = (versEnnemi && (!versCaisse || Math.random() < 0.35)) ? versEnnemi : versCaisse;
    if (choix) return { t: 'dir', d: dirVers(choix.x, choix.y) };
    // rien à faire : on attend en sécurité (ou on se balade un peu)
    if (Math.random() < 0.3) {
      const ds = [0, 1, 2, 3].filter(d => libre(e, cx + DX[d], cy + DY[d], j) && sur(cx + DX[d], cy + DY[d]));
      if (ds.length) return { t: 'dir', d: ds[Math.floor(Math.random() * ds.length)] };
    }
    return j.d !== -1 ? { t: 'dir', d: -1 } : null;
  },

  retirer(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (e.fini || !j || !j.vivant) return false;
    eliminer(e, j, t);
    const vivants = e.joueurs.filter(o => o.vivant);
    if (vivants.length <= 1) finir(e);
    return true;
  },

  vue(e, id, t) {
    return {
      depart: Math.max(0, Math.round(e.debut - t)),
      subite: Math.max(0, Math.round(e.debut + MORT_SUBITE - t)),
      j: e.joueurs.map(j => j.id),
      p: e.joueurs.map(j => [Math.round(j.x * 100) / 100, Math.round(j.y * 100) / 100, j.vivant ? 1 : 0, j.regard, j.bouge ? 1 : 0, j.bombes, j.portee, j.vitesse, j.invincible > t ? 1 : 0]),
      g: Array.from(e.g).join(''),
      b: e.bombes.map(b => [b.x, b.y, Math.max(0, b.t - t)]),
      f: e.flammes.map(f => [f.x, f.y, f.forme]),
      fini: e.fini,
      gagnant: e.gagnant
    };
  },

  admin: {
    commandes: [
      { id: 'max', nom: 'Tous les bonus au maximum', icone: '💪', texte: 'a pris tous les bonus' },
      { id: 'invincible', nom: 'Invincible 15 secondes', icone: '🛡️', texte: 'est invincible 15 secondes' },
      { id: 'caisses', nom: 'Faire exploser toutes les caisses', icone: '💥', texte: 'a fait sauter toutes les caisses' }
    ],
    faire(e, id, cmd, t) {
      const j = e.joueurs[indexDe(e, id)];
      if (!j || !j.vivant) return null;
      if (cmd === 'max') { j.bombes = 8; j.portee = 8; j.vitesse = VITESSE.length - 1; return {}; }
      if (cmd === 'invincible') { j.invincible = t + 15000; return {}; }
      if (cmd === 'caisses') {
        for (let i = 0; i < L * H; i++) if (e.g[i] === CAISSE) { e.g[i] = e.cache[i] || VIDE; e.flammes.push({ x: i % L, y: Math.floor(i / L), forme: 'x', fin: t + 400 }); }
        return {};
      }
      return null;
    }
  }
};
