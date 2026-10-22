/* ==========================================================
   Progression des joueurs : niveaux, titres, avatars, succès, défis du jour
   Fichier partagé : le serveur (comptes) et les pages du site l'utilisent.
   Pour ajouter un succès ou un défi, ajoute une ligne dans les listes ci-dessous.
   ========================================================== */

// XP gagnée
export const XP = {
  partie: 5,            // une partie d'un jeu solo (ou contre l'ordinateur)
  victoireSolo: 10,     // une victoire contre l'ordinateur
  partieEnLigne: 10,    // une partie en ligne avec au moins un autre joueur
  victoireEnLigne: 30,  // une victoire en ligne
  defi: 100,            // le défi du jour
  succes: 40,           // chaque succès débloqué
  tournoi: 200,         // gagner un tournoi
  maxSoloParJour: 300   // les parties solo rapportent au plus 300 XP par jour
};

// niveau 1 à 0 XP, niveau 2 à 100, 3 à 300, 4 à 600, 5 à 1000, 10 à 4500…
export const xpPourNiveau = n => 50 * n * (n - 1);
export function niveauDe(xp) {
  let n = 1;
  while (xp >= xpPourNiveau(n + 1)) n++;
  return n;
}

export const TITRES = [
  [1, 'Débutant'], [3, 'Apprenti'], [5, 'Confirmé'], [8, 'Expert'],
  [10, 'Maître'], [15, 'Grand maître'], [20, 'Légende']
];
export function titreDe(niveau) {
  let t = TITRES[0][1];
  for (const [n, nom] of TITRES) if (niveau >= n) t = nom;
  return t;
}

// avatars : les initiales du joueur dans un rond de couleur ; certains styles se débloquent avec le niveau
export const AVATARS = [
  { id: 'vert', nom: 'Vert', couleur: '#22c55e', acc: '', niveau: 1 },
  { id: 'bleu', nom: 'Bleu', couleur: '#3b82f6', acc: '', niveau: 1 },
  { id: 'orange', nom: 'Orange', couleur: '#f97316', acc: '', niveau: 1 },
  { id: 'rose', nom: 'Rose', couleur: '#ec4899', acc: '', niveau: 1 },
  { id: 'violet', nom: 'Violet', couleur: '#a855f7', acc: '', niveau: 1 },
  { id: 'jaune', nom: 'Jaune', couleur: '#eab308', acc: '', niveau: 1 },
  { id: 'casquette', nom: 'Cadre argent', couleur: '#06b6d4', acc: 'casquette', niveau: 3 },
  { id: 'lunettes', nom: 'Dégradé', couleur: '#f43f5e', acc: 'lunettes', niveau: 5 },
  { id: 'fete', nom: 'Double cadre', couleur: '#84cc16', acc: 'fete', niveau: 8 },
  { id: 'casque', nom: 'Néon', couleur: '#8b5cf6', acc: 'casque', niveau: 10 },
  { id: 'cornes', nom: 'Cadre or', couleur: '#14b8a6', acc: 'cornes', niveau: 15 },
  { id: 'couronne', nom: 'Légende (or animé)', couleur: '#f59e0b', acc: 'couronne', niveau: 20 }
];
export const avatarDe = id => AVATARS.find(a => a.id === id) || AVATARS[0];

// les classements de tous les temps (sens : '+' plus haut = mieux, '-' plus bas = mieux)
export const CLASSEMENTS = {
  dinorun: { nom: 'Runner', sens: '+' },
  flap: { nom: 'Flap', sens: '+' },
  2048: { nom: '2048', sens: '+' },
  serpent: { nom: 'Serpent', sens: '+' },
  blocs: { nom: 'Blocs', sens: '+' },
  briques: { nom: 'Casse-briques', sens: '+' },
  blaster: { nom: 'Blaster', sens: '+' },
  meteorites: { nom: 'Pluie de météorites', sens: '+' },
  dinoio: { nom: 'Arène.io (taille max)', sens: '+' },
  solitaire: { nom: 'Solitaire', sens: '+' },
  reflexes: { nom: 'Test de réflexes (ms)', sens: '-' },
  flipper: { nom: 'Flipper', sens: '+' },
  route: { nom: 'Traverse la route', sens: '+' },
  tuyaux: { nom: 'Tuyaux', sens: '+' }
};

// les jeux qui peuvent envoyer une fin de partie
export const JEUX_PROGRES = new Set(['dinorun', 'flap', '2048', 'serpent', 'blocs', 'briques', 'blaster', 'meteorites', 'dinoio', 'solitaire', 'reflexes',
  'turbo', 'aventure', 'pendu', 'demineur', 'clicker', 'bouton', 'cercle', 'puissance4', 'morpion', 'navale', 'pong', 'tron', 'course', 'quiz', 'dessin', 'echecs', 'hockey',
  'flipper', 'route', 'tuyaux', 'uno', 'bomberman']);

/* ---------- Succès ----------
   test(e) : e = { ev: la partie qui vient de finir (ou null), parties, victoires, jeux, defis, niveau, amis, chat, tournois }
   ev = { jeu, score, gagne, enligne } */
const score = (jeu, min) => e => e.ev && e.ev.jeu === jeu && Number(e.ev.score) >= min;
const gagne = (jeu, enligne) => e => e.ev && e.ev.jeu === jeu && e.ev.gagne && (!enligne || e.ev.enligne);
export const SUCCES = [
  { id: 'premiere', nom: 'C’est parti !', desc: 'Jouer ta première partie.', icone: '▶️', test: e => e.parties >= 1 },
  { id: 'habitue', nom: 'Habitué', desc: 'Jouer 25 parties.', icone: '🎲', test: e => e.parties >= 25 },
  { id: 'accro', nom: 'Accro', desc: 'Jouer 100 parties.', icone: '🔥', test: e => e.parties >= 100 },
  { id: 'legende', nom: 'Légende du site', desc: 'Jouer 500 parties.', icone: '🏛️', test: e => e.parties >= 500 },
  { id: 'touche', nom: 'Touche-à-tout', desc: 'Jouer à 8 jeux différents.', icone: '🎮', test: e => e.jeux >= 8 },
  { id: 'collection', nom: 'Collectionneur', desc: 'Jouer à 18 jeux différents.', icone: '🗂️', test: e => e.jeux >= 18 },
  { id: 'victoire1', nom: 'Premier sang', desc: 'Gagner une partie en ligne.', icone: '⚔️', test: e => e.victoires >= 1 },
  { id: 'victoire10', nom: 'Champion du quartier', desc: 'Gagner 10 parties en ligne.', icone: '🥉', test: e => e.victoires >= 10 },
  { id: 'victoire50', nom: 'Invincible', desc: 'Gagner 50 parties en ligne.', icone: '🥇', test: e => e.victoires >= 50 },
  { id: 'niveau5', nom: 'Ça grandit', desc: 'Atteindre le niveau 5.', icone: '📈', test: e => e.niveau >= 5 },
  { id: 'niveau10', nom: 'Maître', desc: 'Atteindre le niveau 10.', icone: '🎖️', test: e => e.niveau >= 10 },
  { id: 'defi1', nom: 'Relevé !', desc: 'Réussir un défi du jour.', icone: '🎯', test: e => e.defis >= 1 },
  { id: 'defi7', nom: 'Une semaine de défis', desc: 'Réussir 7 défis du jour.', icone: '📅', test: e => e.defis >= 7 },
  { id: 'ami1', nom: 'Pas tout seul', desc: 'Avoir un ami sur le site.', icone: '🤝', test: e => e.amis >= 1 },
  { id: 'chat1', nom: 'Bavard', desc: 'Envoyer un message dans le chat.', icone: '💬', test: e => e.chat >= 1 },
  { id: 'champion', nom: 'Champion de tournoi', desc: 'Gagner un tournoi.', icone: '🏆', test: e => e.tournois >= 1 },
  { id: 'dinorun1000', nom: 'Coureur de fond', desc: 'Faire 1 000 à Runner.', icone: '🏃', test: score('dinorun', 1000) },
  { id: 'flap20', nom: 'Haut vol', desc: 'Passer 20 tuyaux à Flap.', icone: '🪽', test: score('flap', 20) },
  { id: '2048', nom: 'Mathématicien', desc: 'Faire 5 000 points à 2048.', icone: '🔢', test: score('2048', 5000) },
  { id: 'serpent300', nom: 'Long comme un bras', desc: 'Faire 300 points au Serpent.', icone: '🐍', test: score('serpent', 300) },
  { id: 'blocs10k', nom: 'Empileur', desc: 'Faire 10 000 points à Blocs.', icone: '🧱', test: score('blocs', 10000) },
  { id: 'blaster20k', nom: 'As de l’espace', desc: 'Faire 20 000 points à Blaster.', icone: '🚀', test: score('blaster', 20000) },
  { id: 'dinoio500', nom: 'Poids lourd', desc: 'Atteindre une taille de 500 à Arène.io.', icone: '⚫', test: score('dinoio', 500) },
  { id: 'turbo', nom: 'Pilote de course', desc: 'Gagner une course à Turbo.', icone: '🏁', test: gagne('turbo') },
  { id: 'solitaire', nom: 'Patient', desc: 'Gagner une partie de Solitaire.', icone: '🃏', test: gagne('solitaire') },
  { id: 'pendu', nom: 'Sauvé !', desc: 'Gagner au Pendu.', icone: '🔤', test: gagne('pendu') },
  { id: 'demineur', nom: 'Démineur pro', desc: 'Gagner au Démineur.', icone: '💣', test: gagne('demineur') },
  { id: 'echecs', nom: 'Grand maître', desc: 'Gagner aux échecs (contre l’ordinateur ou en ligne).', icone: '♟️', test: gagne('echecs') },
  { id: 'hockey', nom: 'Roi de la glisse', desc: 'Gagner à l’Air hockey.', icone: '🏒', test: gagne('hockey') },
  { id: 'flipper', nom: 'Sorcier du flipper', desc: 'Faire 250 000 points au Flipper.', icone: '🎱', test: score('flipper', 250000) },
  { id: 'route50', nom: 'Traverseur', desc: 'Avancer de 50 rangées à Traverse la route.', icone: '🚸', test: score('route', 50) },
  { id: 'tuyaux', nom: 'Plombier', desc: 'Faire 5 000 points à Tuyaux.', icone: '🔧', test: score('tuyaux', 5000) },
  { id: 'uno', nom: 'UNO !', desc: 'Gagner une partie de Uno.', icone: '🃏', test: gagne('uno') },
  { id: 'bomberman', nom: 'Artificier', desc: 'Gagner une partie de Bomberman.', icone: '💣', test: gagne('bomberman') }
];

/* ---------- Défi du jour ----------
   Un défi différent chaque jour (le même pour tout le monde). */
export const DEFIS = [
  { texte: 'Fais au moins 500 à Runner.', jeu: 'dinorun', score: 500 },
  { texte: 'Passe 10 tuyaux à Flap.', jeu: 'flap', score: 10 },
  { texte: 'Fais 2 000 points à 2048.', jeu: '2048', score: 2000 },
  { texte: 'Fais 150 points au Serpent.', jeu: 'serpent', score: 150 },
  { texte: 'Fais 3 000 points à Blocs.', jeu: 'blocs', score: 3000 },
  { texte: 'Fais 2 000 points au Casse-briques.', jeu: 'briques', score: 2000 },
  { texte: 'Fais 8 000 points à Blaster.', jeu: 'blaster', score: 8000 },
  { texte: 'Atteins une taille de 200 à Arène.io.', jeu: 'dinoio', score: 200 },
  { texte: 'Gagne une course à Turbo.', jeu: 'turbo', gagne: true },
  { texte: 'Gagne une partie de Solitaire.', jeu: 'solitaire', gagne: true },
  { texte: 'Gagne une partie de Pendu.', jeu: 'pendu', gagne: true },
  { texte: 'Gagne au Démineur.', jeu: 'demineur', gagne: true },
  { texte: 'Bats l’ordinateur aux échecs.', jeu: 'echecs', gagne: true },
  { texte: 'Gagne une partie d’Air hockey.', jeu: 'hockey', gagne: true },
  { texte: 'Gagne une partie de Puissance 4.', jeu: 'puissance4', gagne: true },
  { texte: 'Gagne une partie de Pong.', jeu: 'pong', gagne: true },
  { texte: 'Gagne une partie du Cercle.', jeu: 'cercle', gagne: true },
  { texte: 'Gagne une partie en ligne contre un vrai joueur.', enligne: true, gagne: true },
  { texte: 'Fais 1 500 points à la Pluie de météorites.', jeu: 'meteorites', score: 1500 },
  { texte: 'Fais 100 000 points au Flipper.', jeu: 'flipper', score: 100000 },
  { texte: 'Avance de 30 rangées à Traverse la route.', jeu: 'route', score: 30 },
  { texte: 'Fais 2 500 points à Tuyaux.', jeu: 'tuyaux', score: 2500 },
  { texte: 'Gagne une partie de Uno.', jeu: 'uno', gagne: true },
  { texte: 'Gagne une partie de Bomberman.', jeu: 'bomberman', gagne: true }
];

// le jour (à Bruxelles) sous la forme 2026-10-21
export function jourDe(t = Date.now()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
}
// la semaine (du lundi au dimanche, à Bruxelles) sous la forme du lundi : 2026-10-19
export function semaineDe(t = Date.now()) {
  const j = jourDe(t);
  const d = new Date(j + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
// le lundi de la semaine d'avant
export const semainePrecedente = (t = Date.now()) => semaineDe(Date.parse(semaineDe(t) + 'T12:00:00Z') - 3 * 86400000);
export function defiDuJour(jour = jourDe()) {
  const n = Math.floor(Date.parse(jour + 'T12:00:00Z') / 86400000);
  // un mélange simple pour que deux jours qui se suivent n'aient pas des défis voisins
  return { ...DEFIS[(n * 7 + 3) % DEFIS.length], jour };
}
export function defiReussi(defi, ev) {
  if (!ev) return false;
  if (defi.jeu && ev.jeu !== defi.jeu) return false;
  if (defi.enligne && !ev.enligne) return false;
  if (defi.gagne && !ev.gagne) return false;
  if (defi.score && !(Number(ev.score) >= defi.score)) return false;
  return true;
}
