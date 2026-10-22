/* Loup-garou — de 4 à 12 joueurs (les bots complètent)
   Rôles : loups-garous, voyante, sorcière, chasseur, villageois.
   Chaque nuit : les loups choisissent une victime, la voyante découvre un rôle,
   la sorcière peut sauver la victime (1 fois) et empoisonner quelqu'un (1 fois).
   Chaque jour : on découvre qui est mort, on discute, puis on vote pour éliminer un suspect.
   Le chasseur, en mourant, élimine quelqu'un avec lui.
   Le village gagne quand tous les loups sont morts ; les loups gagnent quand ils sont aussi nombreux que les autres. */
import { copieJoueurs, indexDe, classer, melanger } from './outils.js';

export const ROLES = {
  loup: { nom: 'Loup-garou', camp: 'loups', icone: '🐺', desc: 'La nuit, avec les autres loups, choisis une victime. Le jour, fais semblant d’être un villageois.' },
  voyante: { nom: 'Voyante', camp: 'village', icone: '🔮', desc: 'Chaque nuit, découvre le vrai rôle d’un joueur. Aide le village sans te faire repérer par les loups.' },
  sorciere: { nom: 'Sorcière', camp: 'village', icone: '🧪', desc: 'Tu as une potion pour sauver la victime des loups et une potion pour empoisonner quelqu’un. Une seule fois chacune.' },
  chasseur: { nom: 'Chasseur', camp: 'village', icone: '🏹', desc: 'Si tu meurs, tu tires une dernière flèche sur le joueur de ton choix.' },
  villageois: { nom: 'Villageois', camp: 'village', icone: '🧑‍🌾', desc: 'Pas de pouvoir, mais ton vote compte : démasque les loups pendant le débat !' }
};

const DUREES = { roles: 7000, loups: 25000, voyante: 15000, sorciere: 18000, aube: 7000, chasseur: 15000, vote: 25000, resultat: 6000 };
const dureeDebat = n => Math.min(120000, 35000 + n * 8000);

function distribuer(n) {
  const nbLoups = n <= 6 ? 1 : n <= 10 ? 2 : 3;
  const roles = Array(nbLoups).fill('loup');
  roles.push('voyante');
  if (n >= 6) roles.push('sorciere');
  if (n >= 7) roles.push('chasseur');
  while (roles.length < n) roles.push('villageois');
  return melanger(roles);
}

const vivants = e => e.joueurs.filter(j => j.vivant);
const nom = (e, id) => (e.joueurs.find(j => j.id === id) || {}).nom || '?';
function raconter(e, texte, t) { e.recit.push({ texte, t }); if (e.recit.length > 60) e.recit.shift(); }
function dire(e, j, texte, t, loups) {
  const m = { de: j.id, nom: j.nom, texte: String(texte).slice(0, 200), t };
  if (loups) { e.chatLoups.push(m); if (e.chatLoups.length > 60) e.chatLoups.shift(); }
  else { e.chat.push(m); if (e.chat.length > 80) e.chat.shift(); }
}

function phase(e, nomPhase, t, duree) { e.phase = nomPhase; e.debutPhase = t; e.finPhase = t + duree; e.votes = {}; }

function mourir(e, j, t, cause) {
  if (!j || !j.vivant) return;
  j.vivant = false;
  j.mort = t;
  j.revele = true;
  e.mortsDuMoment.push({ id: j.id, cause });
}

// qui a gagné ?
function verifierFin(e, t) {
  const v = vivants(e);
  const loups = v.filter(j => j.role === 'loup').length;
  if (loups === 0) return finir(e, 'village', t);
  if (loups >= v.length - loups) return finir(e, 'loups', t);
  return false;
}
function finir(e, camp, t) {
  e.fini = true;
  e.gagnant = camp;
  e.phase = 'fin';
  e.joueurs.forEach(j => { j.revele = true; });
  raconter(e, camp === 'village' ? '🌞 Tous les loups-garous sont morts : le village a gagné !' : '🌕 Les loups-garous ont dévoré le village : les loups ont gagné !', t);
  e.classement = classer(e.joueurs, j => (ROLES[j.role].camp === camp ? 2 : 1),
    j => `${ROLES[j.role].icone} ${ROLES[j.role].nom}${ROLES[j.role].camp === camp ? ' · gagné' : ''}${j.vivant ? '' : ' · mort'}`);
  return true;
}

// passer à la phase suivante quand le temps est écoulé (ou que tout le monde a joué)
function suivante(e, t) {
  const v = vivants(e);
  const a = r => v.find(j => j.role === r);
  switch (e.phase) {
    case 'roles':
    case 'nuitDebut': {
      e.nuit++;
      e.victime = null; e.empoisonne = null; e.sauve = false; e.mortsDuMoment = [];
      raconter(e, `🌙 Nuit ${e.nuit}. Le village s’endort… Les loups-garous se réveillent.`, t);
      phase(e, 'loups', t, DUREES.loups);
      return;
    }
    case 'loups': {
      // la victime : celle qui a le plus de voix des loups (au hasard en cas d'égalité, ou si personne n'a voté)
      const voix = {};
      for (const [id, cible] of Object.entries(e.votes)) if (v.some(j => j.id === id && j.role === 'loup')) voix[cible] = (voix[cible] || 0) + 1;
      const max = Math.max(0, ...Object.values(voix));
      const options = max ? Object.keys(voix).filter(k => voix[k] === max) : v.filter(j => j.role !== 'loup').map(j => j.id);
      e.victime = options[Math.floor(Math.random() * options.length)] || null;
      if (a('voyante')) { raconter(e, '🔮 La voyante se réveille et observe quelqu’un…', t); phase(e, 'voyante', t, DUREES.voyante); return; }
      e.phase = 'voyante';
      return suivante(e, t);
    }
    case 'voyante': {
      if (a('sorciere') && (e.potionVie || e.potionMort)) { raconter(e, '🧪 La sorcière se réveille…', t); phase(e, 'sorciere', t, DUREES.sorciere); return; }
      e.phase = 'sorciere';
      return suivante(e, t);
    }
    case 'sorciere': {
      // l'aube : on découvre les morts
      e.mortsDuMoment = [];
      if (e.victime && !e.sauve) mourir(e, e.joueurs.find(j => j.id === e.victime), t, 'loups');
      if (e.empoisonne) mourir(e, e.joueurs.find(j => j.id === e.empoisonne), t, 'poison');
      if (!e.mortsDuMoment.length) raconter(e, '🌅 Le jour se lève… Miracle : personne n’est mort cette nuit !', t);
      else for (const m of e.mortsDuMoment) { const j = e.joueurs.find(x => x.id === m.id); raconter(e, `🌅 Le jour se lève… ${j.nom} est mort${m.cause === 'poison' ? ' (empoisonné)' : ''}. C’était ${articleRole(j.role)}.`, t); }
      e.apres = 'debat';
      phase(e, 'aube', t, DUREES.aube);
      return;
    }
    case 'aube':
    case 'resultat': {
      if (verifierFin(e, t)) return;
      // un chasseur vient de mourir ?
      const ch = e.joueurs.find(j => j.role === 'chasseur' && !j.vivant && !j.aTire && e.mortsDuMoment.some(m => m.id === j.id));
      if (ch) { raconter(e, `🏹 ${ch.nom} était le chasseur : il tire une dernière flèche…`, t); e.chasseur = ch.id; phase(e, 'chasseur', t, DUREES.chasseur); return; }
      return apres(e, t);
    }
    case 'chasseur': {
      const ch = e.joueurs.find(j => j.id === e.chasseur);
      if (ch) ch.aTire = true;
      let cible = e.votes[e.chasseur];
      if (!cible) { const options = v.filter(j => j.id !== e.chasseur); cible = options.length ? options[Math.floor(Math.random() * options.length)].id : null; }
      e.mortsDuMoment = [];
      const j = e.joueurs.find(x => x.id === cible);
      if (j && j.vivant) { mourir(e, j, t, 'chasseur'); raconter(e, `🏹 La flèche du chasseur touche ${j.nom}. C’était ${articleRole(j.role)}.`, t); }
      if (verifierFin(e, t)) return;
      return apres(e, t);
    }
    case 'debat': {
      raconter(e, '🗳️ C’est l’heure du vote : qui est le loup-garou ?', t);
      phase(e, 'vote', t, DUREES.vote);
      return;
    }
    case 'vote': {
      const voix = {};
      for (const [id, cible] of Object.entries(e.votes)) if (v.some(j => j.id === id) && cible) voix[cible] = (voix[cible] || 0) + 1;
      e.dernierVote = { ...e.votes };
      const max = Math.max(0, ...Object.values(voix));
      const tete = Object.keys(voix).filter(k => voix[k] === max);
      e.mortsDuMoment = [];
      if (!max || tete.length > 1) raconter(e, max ? '⚖️ Égalité : personne n’est éliminé aujourd’hui.' : '⚖️ Personne n’a voté : personne n’est éliminé.', t);
      else {
        const j = e.joueurs.find(x => x.id === tete[0]);
        mourir(e, j, t, 'vote');
        raconter(e, `⚖️ Le village a éliminé ${j.nom} (${max} voix). C’était ${articleRole(j.role)}.`, t);
      }
      e.apres = 'nuit';
      phase(e, 'resultat', t, DUREES.resultat);
      return;
    }
  }
}
function apres(e, t) {
  if (e.apres === 'debat') {
    const n = vivants(e).length;
    e.joueurs.forEach(j => { j.parle = 0; j.aDit = false; });
    for (const k in e.soupcons) e.soupcons[k] *= 0.5;
    raconter(e, '💬 Débat : discutez et trouvez les loups-garous !', t);
    phase(e, 'debat', t, dureeDebat(n));
  } else { e.phase = 'nuitDebut'; suivante(e, t); }
}
const articleRole = r => ({ loup: 'un loup-garou 🐺', voyante: 'la voyante 🔮', sorciere: 'la sorcière 🧪', chasseur: 'le chasseur 🏹', villageois: 'un villageois 🧑‍🌾' })[r];

// tout le monde a-t-il fini son action ? (pour ne pas attendre la fin du chrono)
function toutFait(e) {
  const v = vivants(e);
  if (e.phase === 'loups') return v.filter(j => j.role === 'loup').every(j => e.votes[j.id]);
  if (e.phase === 'voyante') return !!e.votes._voyante;
  if (e.phase === 'sorciere') return !!e.votes._sorciere;
  if (e.phase === 'chasseur') return !!e.votes[e.chasseur];
  if (e.phase === 'vote') return v.every(j => e.votes[j.id]);
  if (e.phase === 'debat') return v.every(j => e.passe && e.passe[j.id]);
  return false;
}

/* ---------- Les bots ---------- */
const PHRASES = {
  innocent: ['Je suis villageois, je vous le jure !', 'Ce n’est pas moi, regardez ailleurs…', 'Pourquoi vous me regardez comme ça ?', 'Je n’ai rien vu cette nuit, je dormais.'],
  soupcon: ['{x} est bien trop silencieux…', 'Je trouve {x} louche.', 'Moi je vote {x}, je le sens pas.', '{x} a l’air de cacher quelque chose.', 'On devrait surveiller {x}.'],
  defense: ['Arrêtez de m’accuser, je suis innocent !', 'Si vous m’éliminez, vous allez le regretter…', 'C’est exactement ce que dirait un loup !'],
  voyante: ['J’ai une info : {x} est un loup-garou ! Votez contre lui !', 'Je suis la voyante. {x} est un loup, croyez-moi.'],
  accord: ['Je suis d’accord.', 'Ok, on vote {x} alors.', 'Bonne idée.', 'Hmm, possible…']
};
const choisir = l => l[Math.floor(Math.random() * l.length)];

export default {
  id: 'loupgarou',
  titre: 'Loup-garou',
  min: 4,
  max: 12,
  bots: true,
  tic: 250,

  creer(liste, t) {
    const joueurs = copieJoueurs(liste).slice(0, 12);
    const roles = distribuer(joueurs.length);
    joueurs.forEach((j, i) => Object.assign(j, { role: roles[i], vivant: true, revele: false, mort: 0, aTire: false }));
    const e = {
      joueurs, nuit: 0, phase: 'roles', debutPhase: t, finPhase: t + DUREES.roles, votes: {},
      victime: null, empoisonne: null, sauve: false, potionVie: true, potionMort: true,
      vus: {}, chat: [], chatLoups: [], recit: [], mortsDuMoment: [], soupcons: {}, passe: {},
      fini: false, gagnant: null, classement: [], evts: []
    };
    raconter(e, '🏘️ Bienvenue au village de Thiercelieux. Des loups-garous se cachent parmi vous… Regarde ta carte !', t);
    return e;
  },

  action(e, id, d, t) {
    if (e.fini || !d) return false;
    const j = e.joueurs[indexDe(e, id)];
    if (!j) return false;
    const cible = d.cible ? e.joueurs.find(x => x.id === d.cible) : null;
    // discussion : le jour pour les vivants, la nuit entre loups
    if (d.t === 'msg') {
      const texte = String(d.texte || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!texte || !j.vivant) return false;
      if (t - (j.dernierMsg || 0) < 900) return false;
      j.dernierMsg = t;
      if (e.phase === 'loups' && j.role === 'loup') { dire(e, j, texte, t, true); return true; }
      if (['debat', 'vote', 'aube', 'resultat'].includes(e.phase)) {
        dire(e, j, texte, t, false);
        // les bots se souviennent de qui accuse qui
        const bas = texte.toLowerCase();
        const fort = /voyante|loup/.test(bas) ? 2.5 : 1;
        if (/voyante|une info/.test(bas) && /est un loup/.test(bas)) e.annonceVoyante = j.id;
        for (const o of vivants(e)) if (o.id !== j.id && bas.includes(o.nom.toLowerCase())) e.soupcons[o.id] = (e.soupcons[o.id] || 0) + fort;
        return true;
      }
      return false;
    }
    if (d.t === 'passer' && e.phase === 'debat' && j.vivant) { e.passe[id] = true; return true; }
    if (d.t !== 'choisir' || !j.vivant) {
      // le chasseur mort peut encore tirer
      if (!(d.t === 'choisir' && e.phase === 'chasseur' && e.chasseur === id)) return false;
    }
    switch (e.phase) {
      case 'loups':
        if (j.role !== 'loup' || !cible || !cible.vivant || cible.role === 'loup') return false;
        e.votes[id] = cible.id; return true;
      case 'voyante':
        if (j.role !== 'voyante' || !cible || !cible.vivant || cible.id === id || e.votes._voyante) return false;
        e.votes._voyante = cible.id; e.vus[cible.id] = cible.role; return true;
      case 'sorciere':
        if (j.role !== 'sorciere' || e.votes._sorciere) return false;
        if (d.sauver && e.potionVie && e.victime) { e.sauve = true; e.potionVie = false; }
        if (d.poison && e.potionMort) { const p = e.joueurs.find(x => x.id === d.poison); if (p && p.vivant && p.id !== id) { e.empoisonne = p.id; e.potionMort = false; } }
        e.votes._sorciere = true; return true;
      case 'chasseur':
        if (e.chasseur !== id || !cible || !cible.vivant || cible.id === id) return false;
        e.votes[id] = cible.id; return true;
      case 'vote':
        if (!cible || !cible.vivant || cible.id === id) return false;
        e.votes[id] = cible.id; return true;
    }
    return false;
  },

  etape(e, t) {
    if (e.fini) return false;
    if (t >= e.finPhase || (toutFait(e) && t - e.debutPhase > 1500)) {
      // un petit temps après la dernière action, puis on avance
      suivante(e, t);
      e.passe = {};
      return true;
    }
    return false;
  },

  bot(e, id, t) {
    if (e.fini) return null;
    const j = e.joueurs[indexDe(e, id)];
    if (!j) return null;
    const v = vivants(e).filter(o => o.id !== id);
    const delai = t - e.debutPhase;
    const rnd = (id.charCodeAt(id.length - 1) * 97) % 3000;
    const suspect = () => {
      // la voyante sait ; les autres suivent les soupçons ; les loups accusent un non-loup
      if (j.role === 'voyante') { const loup = v.find(o => e.vus[o.id] === 'loup'); if (loup) return loup; }
      const pool = j.role === 'loup' ? v.filter(o => o.role !== 'loup') : v.filter(o => !(j.role === 'voyante' && e.vus[o.id] && e.vus[o.id] !== 'loup'));
      if (!pool.length) return null;
      const s = pool.slice().sort((a, b) => (e.soupcons[b.id] || 0) - (e.soupcons[a.id] || 0) + (Math.random() - 0.5) * 1.5);
      return s[0];
    };
    if (e.phase === 'loups' && j.role === 'loup' && j.vivant && !e.votes[id] && delai > 3000 + rnd) {
      const autre = Object.entries(e.votes).find(([k]) => e.joueurs.some(o => o.id === k && o.role === 'loup'));
      const cibles = v.filter(o => o.role !== 'loup');
      const annonce = cibles.find(o => o.id === e.annonceVoyante);
      const c = autre && Math.random() < 0.8 ? autre[1] : (annonce || choisir(cibles) || {}).id;
      if (!e.chatLoups.some(m => m.de === id) && Math.random() < 0.6 && c) return { t: 'msg', texte: `On mange ${nom(e, c)} ?` };
      return c ? { t: 'choisir', cible: c } : null;
    }
    if (e.phase === 'voyante' && j.role === 'voyante' && j.vivant && !e.votes._voyante && delai > 2500 + rnd) {
      const inconnus = v.filter(o => !e.vus[o.id]);
      const c = choisir(inconnus.length ? inconnus : v);
      return c ? { t: 'choisir', cible: c.id } : null;
    }
    if (e.phase === 'sorciere' && j.role === 'sorciere' && j.vivant && !e.votes._sorciere && delai > 3000 + rnd) {
      const sauver = e.potionVie && e.victime && (e.victime === id || Math.random() < 0.45);
      const plusSuspect = Object.entries(e.soupcons).filter(([k]) => v.some(o => o.id === k)).sort((a, b) => b[1] - a[1])[0];
      const poison = e.potionMort && e.nuit >= 2 && plusSuspect && plusSuspect[1] >= 2 && Math.random() < 0.5 ? plusSuspect[0] : null;
      return { t: 'choisir', sauver, poison };
    }
    if (e.phase === 'chasseur' && e.chasseur === id && !e.votes[id] && delai > 3000) {
      const s = suspect();
      return s ? { t: 'choisir', cible: s.id } : null;
    }
    if (!j.vivant) return null;
    if (e.phase === 'debat') {
      // parler de temps en temps (pas trop)
      j.parle = j.parle || 0;
      if (j.role === 'voyante' && !j.aDit && delai > 3000 + rnd / 2) {
        const loupVu = v.find(o => e.vus[o.id] === 'loup');
        if (loupVu && Math.random() < 0.7) { j.aDit = true; j.parle++; return { t: 'msg', texte: choisir(PHRASES.voyante).replace('{x}', loupVu.nom) }; }
        if (loupVu) j.aDit = true;
      }
      if (t - (j.dernierMsg || 0) > 9000 + rnd * 2 && j.parle < 3 && Math.random() < 0.08) {
        j.parle++;
        const s = suspect();
        if (j.role === 'voyante' && s && e.vus[s.id] === 'loup') return { t: 'msg', texte: choisir(PHRASES.voyante).replace('{x}', s.nom) };
        if ((e.soupcons[id] || 0) >= 2 && Math.random() < 0.5) return { t: 'msg', texte: choisir(PHRASES.defense) };
        if (s && Math.random() < 0.7) return { t: 'msg', texte: choisir(PHRASES.soupcon).replace('{x}', s.nom) };
        return { t: 'msg', texte: choisir(PHRASES.innocent) };
      }
      if (j.parle >= 1 && !e.passe[id] && delai > 20000 + rnd) return { t: 'passer' };
      return null;
    }
    if (e.phase === 'vote' && !e.votes[id] && delai > 2500 + rnd * 1.5) {
      // suivre un peu les autres votes, sinon son suspect
      const voix = {};
      for (const c of Object.values(e.votes)) voix[c] = (voix[c] || 0) + 1;
      const meneur = Object.entries(voix).sort((a, b) => b[1] - a[1])[0];
      let s = suspect();
      const conviction = s ? e.soupcons[s.id] || 0 : 0;
      if (meneur && conviction < 2.5 && Math.random() < 0.45) { const m = v.find(o => o.id === meneur[0]); if (m && !(j.role === 'loup' && m.role === 'loup')) s = m; }
      return s ? { t: 'choisir', cible: s.id } : null;
    }
    return null;
  },

  retirer(e, id, t) {
    const j = e.joueurs[indexDe(e, id)];
    if (e.fini || !j || !j.vivant) return false;
    j.vivant = false; j.mort = t; j.revele = true;
    raconter(e, `🚪 ${j.nom} a quitté le village. C’était ${articleRole(j.role)}.`, t);
    verifierFin(e, t);
    return true;
  },

  vue(e, id, t) {
    const moi = e.joueurs.find(j => j.id === id);
    const loup = moi && moi.role === 'loup';
    const voyante = moi && moi.role === 'voyante';
    const montrerVotes = ['vote'].includes(e.phase);
    return {
      phase: e.phase, nuit: e.nuit, reste: Math.max(0, e.finPhase - t),
      j: e.joueurs.map(j => ({
        id: j.id, vivant: j.vivant,
        role: j.revele || (moi && j.id === id) || (loup && j.role === 'loup') ? j.role : (voyante && e.vus[j.id] ? e.vus[j.id] : null),
        vote: montrerVotes ? e.votes[j.id] || null : (e.phase === 'loups' && loup && j.role === 'loup' ? e.votes[j.id] || null : null),
        passe: !!e.passe[j.id]
      })),
      moi: moi ? { role: moi.role, vivant: moi.vivant } : null,
      // ce que la sorcière doit savoir pendant son tour
      sorciere: moi && moi.role === 'sorciere' && e.phase === 'sorciere' ? { victime: e.victime, vie: e.potionVie, mort: e.potionMort, fait: !!e.votes._sorciere } : (moi && moi.role === 'sorciere' ? { vie: e.potionVie, mort: e.potionMort } : null),
      vu: voyante && e.votes._voyante ? { id: e.votes._voyante, role: e.vus[e.votes._voyante] } : null,
      chasseur: e.phase === 'chasseur' ? e.chasseur : null,
      monVote: moi ? (e.phase === 'voyante' && voyante ? e.votes._voyante : e.votes[id]) || null : null,
      dernierVote: e.phase === 'resultat' ? e.dernierVote : null,
      chat: e.chat.slice(-60),
      chatLoups: loup ? e.chatLoups.slice(-40) : null,
      recit: e.recit.slice(-12),
      fini: e.fini, gagnant: e.gagnant
    };
  },

  admin: {
    commandes: [
      { id: 'roles', nom: 'Voir tous les rôles', icone: '👀', texte: 'a regardé les rôles de tout le monde' },
      { id: 'abreger', nom: 'Passer à la phase suivante', icone: '⏩', texte: 'a accéléré le temps' }
    ],
    faire(e, id, cmd, t) {
      if (cmd === 'roles') return { prive: e.joueurs.map(j => `${j.nom} : ${ROLES[j.role].nom}`).join(' · ') };
      if (cmd === 'abreger') { e.finPhase = t; return {}; }
      return null;
    },
    victoire(e, id, t) {
      const j = e.joueurs[indexDe(e, id)];
      finir(e, ROLES[j.role].camp, t);
    }
  }
};
