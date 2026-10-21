/* Uno — de 2 à 6 joueurs
   Règles classiques (108 cartes) :
   - on pose une carte de la même couleur, du même chiffre ou du même symbole
   - Passe, Inversion, +2, Joker (choix de la couleur), +4
   - pas de carte possible : on pioche 1 carte ; si elle va, on peut la poser tout de suite
   - quand il ne te reste qu'une carte, il faut dire « UNO ! » ;
     si un autre te prend sur le fait avant, tu pioches 2 cartes
   - le premier qui n'a plus de cartes gagne ; les autres sont classés par points en main */
import { copieJoueurs, indexDe, classer, melanger } from './outils.js';

export const COULEURS = ['R', 'J', 'V', 'B'];
const TOUR_MAX = 30000;          // 30 s pour jouer, sinon on pioche / on passe pour toi
const DELAI_CONTRE = 3500;       // temps pendant lequel on peut se faire prendre sans avoir dit UNO

export function creerPaquet() {
  const p = [];
  let id = 1;
  for (const c of COULEURS) {
    p.push({ id: id++, c, v: '0' });
    for (let k = 0; k < 2; k++) {
      for (let n = 1; n <= 9; n++) p.push({ id: id++, c, v: String(n) });
      for (const v of ['passe', 'inverse', '+2']) p.push({ id: id++, c, v });
    }
  }
  for (let k = 0; k < 4; k++) { p.push({ id: id++, c: 'N', v: 'joker' }); p.push({ id: id++, c: 'N', v: '+4' }); }
  return melanger(p);
}

export const jouable = (carte, dessus, couleur) => carte.c === 'N' || carte.c === couleur || carte.v === dessus.v;
export const points = carte => (/^\d$/.test(carte.v) ? Number(carte.v) : carte.c === 'N' ? 50 : 20);
const totalPoints = main => main.reduce((s, c) => s + points(c), 0);

function piocher(e, i, n) {
  const pris = [];
  for (let k = 0; k < n; k++) {
    if (!e.pioche.length) {
      // on remélange la défausse (sauf la carte du dessus)
      const dessus = e.defausse.pop();
      e.pioche = melanger(e.defausse);
      e.defausse = [dessus];
      if (!e.pioche.length) break;
    }
    const c = e.pioche.pop();
    e.mains[i].push(c);
    pris.push(c);
  }
  return pris;
}

const suivant = (e, i, pas = 1) => ((i + e.sens * pas) % e.joueurs.length + e.joueurs.length) % e.joueurs.length;

function finir(e, gagnant) {
  e.fini = true;
  e.gagnant = gagnant;
  e.classement = classer(e.joueurs,
    j => { const i = indexDe(e, j.id); return i === gagnant ? 1e6 : -totalPoints(e.mains[i]) - e.mains[i].length * 0.01; },
    j => { const i = indexDe(e, j.id); return i === gagnant ? 'Gagné !' : `${e.mains[i].length} carte${e.mains[i].length > 1 ? 's' : ''} · ${totalPoints(e.mains[i])} pts`; });
}

function nouveauTour(e, i, t) {
  e.tour = i;
  e.tTour = t;
  e.aPioche = null;
}

// effet d'une carte qu'on vient de poser
function appliquer(e, i, carte, t) {
  const n = e.joueurs.length;
  if (carte.v === 'inverse') {
    e.sens = -e.sens;
    if (n === 2) return nouveauTour(e, i, t);            // à deux : l'inversion fait rejouer
    return nouveauTour(e, suivant(e, i), t);
  }
  if (carte.v === 'passe') { e.evts.push(['passe', e.joueurs[suivant(e, i)].id]); return nouveauTour(e, suivant(e, i, 2), t); }
  if (carte.v === '+2' || carte.v === '+4') {
    const k = suivant(e, i);
    const nb = carte.v === '+2' ? 2 : 4;
    piocher(e, k, nb);
    e.evts.push(['pioche', e.joueurs[k].id, nb]);
    return nouveauTour(e, suivant(e, i, 2), t);
  }
  nouveauTour(e, suivant(e, i), t);
}

function meilleureCouleur(main) {
  const n = { R: 0, J: 0, V: 0, B: 0 };
  for (const c of main) if (c.c !== 'N') n[c.c] += 1 + (/\d/.test(c.v) ? 0 : 0.5);
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0];
}

/* ---------- L'ordinateur ---------- */
function choixBot(e, i) {
  const main = e.mains[i];
  const dessus = e.defausse[e.defausse.length - 1];
  const possibles = main.filter(c => jouable(c, dessus, e.couleur));
  if (!possibles.length) return null;
  const prochain = suivant(e, i);
  const menace = e.mains[prochain].length <= 2;
  const note = c => {
    let s = 0;
    if (c.c === 'N') s -= c.v === '+4' ? 40 : 25;             // garder les jokers pour la fin
    if (c.c === e.couleur) s += 10;
    if (/\d/.test(c.v)) s += Number(c.v) * 0.6;                 // se débarrasser des gros chiffres
    if (['passe', '+2', 'inverse'].includes(c.v)) s += menace ? 30 : 6;
    if (c.v === '+4' && menace) s += 60;
    s += main.filter(x => x.c === c.c).length * 2;               // garder le contrôle de sa couleur
    return s + Math.random() * 3;
  };
  return possibles.sort((a, b) => note(b) - note(a))[0];
}

export default {
  id: 'uno',
  titre: 'Uno',
  min: 2,
  max: 6,
  bots: true,
  tic: 200,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 6);
    const e = {
      joueurs, mains: joueurs.map(() => []), pioche: creerPaquet(), defausse: [], couleur: 'R', sens: 1,
      tour: 0, tTour: t, aPioche: null, unoDit: {}, oubli: null, fini: false, gagnant: -1, classement: [], evts: [], dernier: null
    };
    joueurs.forEach((_, i) => piocher(e, i, 7));
    // première carte : pas un +4
    let premiere;
    for (;;) {
      premiere = e.pioche.pop();
      if (premiere.v !== '+4') break;
      e.pioche.unshift(premiere);
    }
    e.defausse.push(premiere);
    e.couleur = premiere.c === 'N' ? COULEURS[Math.floor(Math.random() * 4)] : premiere.c;
    const debut = Math.floor(Math.random() * joueurs.length);
    // la première carte compte, comme si le joueur d'avant l'avait posée
    if (['passe', 'inverse', '+2'].includes(premiere.v)) appliquer(e, (debut - 1 + joueurs.length) % joueurs.length, premiere, t);
    else nouveauTour(e, debut, t);
    return e;
  },

  action(e, id, d, t) {
    if (e.fini || !d) return false;
    const i = indexDe(e, id);
    if (i < 0) return false;

    // dire UNO (avant de poser l'avant-dernière carte, ou juste après pour se rattraper)
    if (d.t === 'uno') {
      if (e.mains[i].length > 2) return false;
      e.unoDit[id] = true;
      if (e.oubli && e.oubli.id === id) e.oubli = null;
      e.evts.push(['uno', id]);
      return true;
    }
    // prendre quelqu'un qui a oublié de dire UNO
    if (d.t === 'contre') {
      if (!e.oubli || e.oubli.id === id || t - e.oubli.t > DELAI_CONTRE) return false;
      const k = indexDe(e, e.oubli.id);
      e.oubli = null;
      if (k < 0 || e.mains[k].length !== 1) return false;
      piocher(e, k, 2);
      e.evts.push(['contre', id, e.joueurs[k].id]);
      return true;
    }

    if (i !== e.tour) return false;
    const dessus = e.defausse[e.defausse.length - 1];

    if (d.t === 'piocher') {
      if (e.aPioche) return false;
      const [c] = piocher(e, i, 1);
      e.evts.push(['pioche', id, 1]);
      if (c && jouable(c, dessus, e.couleur)) { e.aPioche = c.id; e.tTour = t; }   // on peut la poser tout de suite
      else nouveauTour(e, suivant(e, i), t);
      e.dernier = { id, quoi: 'pioche' };
      return true;
    }
    if (d.t === 'passer') {
      if (!e.aPioche) return false;
      nouveauTour(e, suivant(e, i), t);
      e.dernier = { id, quoi: 'passe' };
      return true;
    }
    if (d.t === 'jouer') {
      const k = e.mains[i].findIndex(c => c.id === Number(d.carte));
      if (k < 0) return false;
      const carte = e.mains[i][k];
      if (e.aPioche && carte.id !== e.aPioche) return false;   // après avoir pioché : seulement la carte piochée
      if (!jouable(carte, dessus, e.couleur)) return false;
      if (d.uno) e.unoDit[id] = true;
      e.mains[i].splice(k, 1);
      e.defausse.push(carte);
      e.couleur = carte.c === 'N' ? (COULEURS.includes(d.couleur) ? d.couleur : meilleureCouleur(e.mains[i])) : carte.c;
      e.dernier = { id, quoi: 'joue', carte };
      e.evts.push(['joue', id, carte, e.couleur]);
      if (e.oubli && t - e.oubli.t > DELAI_CONTRE) e.oubli = null;
      if (!e.mains[i].length) { finir(e, i); return true; }
      if (e.mains[i].length === 1) {
        if (e.unoDit[id]) e.evts.push(['uno', id]);
        else e.oubli = { id, t };
      }
      if (e.mains[i].length > 1) delete e.unoDit[id];
      appliquer(e, i, carte, t);
      return true;
    }
    return false;
  },

  etape(e, t) {
    if (e.fini) return false;
    let change = false;
    if (e.oubli && t - e.oubli.t > DELAI_CONTRE) { e.oubli = null; change = true; }
    // trop long : on joue à la place du joueur (pioche ou passe)
    if (t - e.tTour > TOUR_MAX) {
      const id = e.joueurs[e.tour].id;
      e.evts.push(['temps', id]);
      if (e.aPioche) this.action(e, id, { t: 'passer' }, t);
      else this.action(e, id, { t: 'piocher' }, t);
      if (e.aPioche && e.joueurs[e.tour].id === id) this.action(e, id, { t: 'passer' }, t);
      change = true;
    }
    return change;
  },

  bot(e, id, t) {
    if (e.fini) return null;
    const i = indexDe(e, id);
    // attraper un oubli de UNO (pas tout de suite, et pas à chaque fois)
    if (e.oubli && e.oubli.id !== id && !e.oubli['vu' + id]) {
      if (t - e.oubli.t > 900 + (i * 377) % 1400) {
        e.oubli['vu' + id] = true;
        if (Math.random() < 0.55) return { t: 'contre' };
      }
    }
    if (i !== e.tour || t - e.tTour < 1000 + (i * 211) % 700) return null;
    if (e.aPioche) {
      const c = e.mains[i].find(x => x.id === e.aPioche);
      return c ? { t: 'jouer', carte: c.id, couleur: meilleureCouleur(e.mains[i].filter(x => x !== c)), uno: e.mains[i].length === 2 && Math.random() < 0.85 } : { t: 'passer' };
    }
    const c = choixBot(e, i);
    if (!c) return { t: 'piocher' };
    return { t: 'jouer', carte: c.id, couleur: meilleureCouleur(e.mains[i].filter(x => x !== c)), uno: e.mains[i].length === 2 && Math.random() < 0.85 };
  },

  retirer(e, id) {
    const i = indexDe(e, id);
    if (e.fini || i < 0) return false;
    // un joueur part : ses cartes retournent sous la pioche, et la partie continue
    e.pioche.unshift(...e.mains[i]);
    e.mains.splice(i, 1);
    e.joueurs.splice(i, 1);
    if (e.joueurs.length < 2) { finir(e, 0); return true; }
    if (e.tour > i) e.tour--;
    else if (e.tour === i) nouveauTour(e, e.tour % e.joueurs.length, Date.now());
    e.tour %= e.joueurs.length;
    return true;
  },

  vue(e, id, t) {
    const i = indexDe(e, id);
    return {
      j: e.joueurs.map(j => j.id),
      nb: e.mains.map(m => m.length),
      main: i >= 0 ? e.mains[i] : [],
      dessus: e.defausse[e.defausse.length - 1],
      couleur: e.couleur,
      sens: e.sens,
      tour: e.tour,
      pioche: e.pioche.length,
      aPioche: i >= 0 && i === e.tour ? e.aPioche : null,
      oubli: e.oubli && t - e.oubli.t <= DELAI_CONTRE ? e.oubli.id : null,
      unoDit: Object.keys(e.unoDit).filter(k => e.unoDit[k]),
      reste: Math.max(0, Math.ceil((TOUR_MAX - (t - e.tTour)) / 1000)),
      dernier: e.dernier,
      fini: e.fini,
      gagnant: e.gagnant,
      // en fin de partie, on montre les mains de tout le monde
      mains: e.fini ? e.mains : null
    };
  },

  // pouvoirs du compte admin
  admin: {
    commandes: [
      { id: 'vider', nom: 'Garder une seule carte', icone: '🃏', texte: 'n’a plus qu’une carte' },
      { id: 'plus4', nom: 'Tous les autres piochent 4', icone: '➕', texte: 'a fait piocher 4 cartes à tout le monde' },
      { id: 'jokers', nom: 'Recevoir 3 jokers', icone: '🌈', texte: 'a reçu 3 jokers' },
      { id: 'voir', nom: 'Voir les cartes des autres', icone: '👀', texte: 'a regardé les cartes des autres' }
    ],
    faire(e, id, cmd, t) {
      const i = indexDe(e, id);
      if (cmd === 'vider') {
        if (e.mains[i].length <= 1) return null;
        const garde = e.mains[i].find(c => c.c === 'N') || e.mains[i][0];
        e.pioche.unshift(...e.mains[i].filter(c => c !== garde));
        e.mains[i] = [garde];
        e.unoDit[id] = true;
        return {};
      }
      if (cmd === 'plus4') { e.joueurs.forEach((j, k) => { if (k !== i) piocher(e, k, 4); }); return {}; }
      if (cmd === 'jokers') { for (let k = 0; k < 3; k++) e.mains[i].push({ id: 1000 + Math.floor(Math.random() * 1e6), c: 'N', v: k % 2 ? '+4' : 'joker' }); return {}; }
      if (cmd === 'voir') {
        const nom = { R: 'rouge', J: 'jaune', V: 'vert', B: 'bleu', N: '' };
        return { prive: e.joueurs.filter((_, k) => k !== i).map(j => `${j.nom} : ${e.mains[indexDe(e, j.id)].map(c => (c.c === 'N' ? c.v : c.v + ' ' + nom[c.c])).join(', ')}`).join(' — ') };
      }
      return null;
    },
    victoire(e, id) {
      const i = indexDe(e, id);
      e.pioche.unshift(...e.mains[i]);
      e.mains[i] = [];
      finir(e, i);
    }
  }
};
