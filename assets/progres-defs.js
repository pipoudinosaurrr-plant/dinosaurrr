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
  [1, 'Bébé dino'], [3, 'Petit raptor'], [5, 'Raptor'], [8, 'Tricératops'],
  [10, 'T-Rex'], [15, 'Roi des dinos'], [20, 'Légende vivante']
];
export function titreDe(niveau) {
  let t = TITRES[0][1];
  for (const [n, nom] of TITRES) if (niveau >= n) t = nom;
  return t;
}

// avatars : un dino de couleur + un accessoire ; certains se débloquent avec le niveau
export const AVATARS = [
  { id: 'vert', nom: 'Dino vert', couleur: '#22c55e', acc: '', niveau: 1 },
  { id: 'bleu', nom: 'Dino bleu', couleur: '#3b82f6', acc: '', niveau: 1 },
  { id: 'orange', nom: 'Dino orange', couleur: '#f97316', acc: '', niveau: 1 },
  { id: 'rose', nom: 'Dino rose', couleur: '#ec4899', acc: '', niveau: 1 },
  { id: 'violet', nom: 'Dino violet', couleur: '#a855f7', acc: '', niveau: 1 },
  { id: 'jaune', nom: 'Dino jaune', couleur: '#eab308', acc: '', niveau: 1 },
  { id: 'casquette', nom: 'Dino casquette', couleur: '#06b6d4', acc: 'casquette', niveau: 3 },
  { id: 'lunettes', nom: 'Dino lunettes de soleil', couleur: '#f43f5e', acc: 'lunettes', niveau: 5 },
  { id: 'fete', nom: 'Dino chapeau de fête', couleur: '#84cc16', acc: 'fete', niveau: 8 },
  { id: 'casque', nom: 'Dino casque audio', couleur: '#8b5cf6', acc: 'casque', niveau: 10 },
  { id: 'cornes', nom: 'Tricératops', couleur: '#14b8a6', acc: 'cornes', niveau: 15 },
  { id: 'couronne', nom: 'Roi dino', couleur: '#f59e0b', acc: 'couronne', niveau: 20 }
];
export const avatarDe = id => AVATARS.find(a => a.id === id) || AVATARS[0];

// les classements de tous les temps (sens : '+' plus haut = mieux, '-' plus bas = mieux)
export const CLASSEMENTS = {
  dinorun: { nom: 'Dino Run', sens: '+' },
  flap: { nom: 'Dino Flap', sens: '+' },
  2048: { nom: '2048', sens: '+' },
  serpent: { nom: 'Serpent', sens: '+' },
  blocs: { nom: 'Blocs', sens: '+' },
  briques: { nom: 'Casse-briques', sens: '+' },
  blaster: { nom: 'Dino Blaster', sens: '+' },
  meteorites: { nom: 'Pluie de météorites', sens: '+' },
  dinoio: { nom: 'Dino.io (taille max)', sens: '+' },
  solitaire: { nom: 'Solitaire', sens: '+' },
  reflexes: { nom: 'Test de réflexes (ms)', sens: '-' }
};

// les jeux qui peuvent envoyer une fin de partie
export const JEUX_PROGRES = new Set(['dinorun', 'flap', '2048', 'serpent', 'blocs', 'briques', 'blaster', 'meteorites', 'dinoio', 'solitaire', 'reflexes',
  'turbo', 'aventure', 'pendu', 'demineur', 'clicker', 'bouton', 'cercle', 'puissance4', 'morpion', 'navale', 'pong', 'tron', 'course', 'quiz', 'dessin', 'echecs', 'hockey']);

/* ---------- Succès ----------
   test(e) : e = { ev: la partie qui vient de finir (ou null), parties, victoires, jeux, defis, niveau, amis, chat, tournois }
   ev = { jeu, score, gagne, enligne } */
const score = (jeu, min) => e => e.ev && e.ev.jeu === jeu && Number(e.ev.score) >= min;
const gagne = (jeu, enligne) => e => e.ev && e.ev.jeu === jeu && e.ev.gagne && (!enligne || e.ev.enligne);
export const SUCCES = [
  { id: 'premiere', nom: 'C’est parti !', desc: 'Jouer ta première partie.', icone: '🥚', test: e => e.parties >= 1 },
  { id: 'habitue', nom: 'Habitué', desc: 'Jouer 25 parties.', icone: '🦕', test: e => e.parties >= 25 },
  { id: 'accro', nom: 'Accro', desc: 'Jouer 100 parties.', icone: '🔥', test: e => e.parties >= 100 },
  { id: 'legende', nom: 'Légende du site', desc: 'Jouer 500 parties.', icone: '🏛️', test: e => e.parties >= 500 },
  { id: 'touche', nom: 'Touche-à-tout', desc: 'Jouer à 8 jeux différents.', icone: '🎮', test: e => e.jeux >= 8 },
  { id: 'collection', nom: 'Collectionneur', desc: 'Jouer à 18 jeux différents.', icone: '🗂️', test: e => e.jeux >= 18 },
  { id: 'victoire1', nom: 'Premier sang', desc: 'Gagner une partie en ligne.', icone: '⚔️', test: e => e.victoires >= 1 },
  { id: 'victoire10', nom: 'Champion du quartier', desc: 'Gagner 10 parties en ligne.', icone: '🥉', test: e => e.victoires >= 10 },
  { id: 'victoire50', nom: 'Invincible', desc: 'Gagner 50 parties en ligne.', icone: '🥇', test: e => e.victoires >= 50 },
  { id: 'niveau5', nom: 'Ça grandit', desc: 'Atteindre le niveau 5.', icone: '📈', test: e => e.niveau >= 5 },
  { id: 'niveau10', nom: 'T-Rex', desc: 'Atteindre le niveau 10.', icone: '🦖', test: e => e.niveau >= 10 },
  { id: 'defi1', nom: 'Relevé !', desc: 'Réussir un défi du jour.', icone: '🎯', test: e => e.defis >= 1 },
  { id: 'defi7', nom: 'Une semaine de défis', desc: 'Réussir 7 défis du jour.', icone: '📅', test: e => e.defis >= 7 },
  { id: 'ami1', nom: 'Pas tout seul', desc: 'Avoir un ami sur le site.', icone: '🤝', test: e => e.amis >= 1 },
  { id: 'chat1', nom: 'Bavard', desc: 'Envoyer un message dans le chat.', icone: '💬', test: e => e.chat >= 1 },
  { id: 'champion', nom: 'Champion de tournoi', desc: 'Gagner un tournoi.', icone: '🏆', test: e => e.tournois >= 1 },
  { id: 'dinorun1000', nom: 'Coureur de fond', desc: 'Faire 1 000 à Dino Run.', icone: '🏃', test: score('dinorun', 1000) },
  { id: 'flap20', nom: 'Pilote de ptérodactyle', desc: 'Passer 20 tuyaux à Dino Flap.', icone: '🪽', test: score('flap', 20) },
  { id: '2048', nom: 'Mathématicien', desc: 'Faire 5 000 points à 2048.', icone: '🔢', test: score('2048', 5000) },
  { id: 'serpent300', nom: 'Long comme un bras', desc: 'Faire 300 points au Serpent.', icone: '🐍', test: score('serpent', 300) },
  { id: 'blocs10k', nom: 'Empileur', desc: 'Faire 10 000 points à Blocs.', icone: '🧱', test: score('blocs', 10000) },
  { id: 'blaster20k', nom: 'As de l’espace', desc: 'Faire 20 000 points à Dino Blaster.', icone: '🚀', test: score('blaster', 20000) },
  { id: 'dinoio500', nom: 'Gros dino', desc: 'Atteindre une taille de 500 à Dino.io.', icone: '🍖', test: score('dinoio', 500) },
  { id: 'turbo', nom: 'Pilote de course', desc: 'Gagner une course à Turbo Dino.', icone: '🏁', test: gagne('turbo') },
  { id: 'solitaire', nom: 'Patient', desc: 'Gagner une partie de Solitaire.', icone: '🃏', test: gagne('solitaire') },
  { id: 'pendu', nom: 'Sauveur de dino', desc: 'Gagner au Pendu.', icone: '🔤', test: gagne('pendu') },
  { id: 'demineur', nom: 'Démineur pro', desc: 'Gagner au Démineur.', icone: '💣', test: gagne('demineur') },
  { id: 'echecs', nom: 'Grand maître', desc: 'Gagner aux échecs (contre l’ordinateur ou en ligne).', icone: '♟️', test: gagne('echecs') },
  { id: 'hockey', nom: 'Roi de la glisse', desc: 'Gagner à l’Air hockey.', icone: '🏒', test: gagne('hockey') }
];

/* ---------- Défi du jour ----------
   Un défi différent chaque jour (le même pour tout le monde). */
export const DEFIS = [
  { texte: 'Fais au moins 500 à Dino Run.', jeu: 'dinorun', score: 500 },
  { texte: 'Passe 10 tuyaux à Dino Flap.', jeu: 'flap', score: 10 },
  { texte: 'Fais 2 000 points à 2048.', jeu: '2048', score: 2000 },
  { texte: 'Fais 150 points au Serpent.', jeu: 'serpent', score: 150 },
  { texte: 'Fais 3 000 points à Blocs.', jeu: 'blocs', score: 3000 },
  { texte: 'Fais 2 000 points au Casse-briques.', jeu: 'briques', score: 2000 },
  { texte: 'Fais 8 000 points à Dino Blaster.', jeu: 'blaster', score: 8000 },
  { texte: 'Atteins une taille de 200 à Dino.io.', jeu: 'dinoio', score: 200 },
  { texte: 'Gagne une course à Turbo Dino.', jeu: 'turbo', gagne: true },
  { texte: 'Gagne une partie de Solitaire.', jeu: 'solitaire', gagne: true },
  { texte: 'Gagne une partie de Pendu.', jeu: 'pendu', gagne: true },
  { texte: 'Gagne au Démineur.', jeu: 'demineur', gagne: true },
  { texte: 'Bats l’ordinateur aux échecs.', jeu: 'echecs', gagne: true },
  { texte: 'Gagne une partie d’Air hockey.', jeu: 'hockey', gagne: true },
  { texte: 'Gagne une partie de Puissance 4.', jeu: 'puissance4', gagne: true },
  { texte: 'Gagne une partie de Pong.', jeu: 'pong', gagne: true },
  { texte: 'Gagne une partie du Cercle.', jeu: 'cercle', gagne: true },
  { texte: 'Gagne une partie en ligne contre un vrai joueur.', enligne: true, gagne: true },
  { texte: 'Fais 1 500 points à la Pluie de météorites.', jeu: 'meteorites', score: 1500 }
];

// le jour (à Bruxelles) sous la forme 2026-10-21
export function jourDe(t = Date.now()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
}
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
