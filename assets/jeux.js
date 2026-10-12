/* ==========================================================
   La liste des jeux
   Pour ajouter un jeu :
     1. copie games/modele.html et renomme-le (ex : games/mon-jeu.html)
     2. ajoute un bloc { ... } dans la liste ci-dessous
   ----------------------------------------------------------
   id          : petit nom unique, sans espace ni accent
   titre       : le nom affiché
   fichier     : le chemin du fichier du jeu
   icone       : une icône de assets/icones.js (meteore, processeur, histoire, eclair, bouton, carte, palette…)
   description : une phrase qui donne envie
   taille      : [largeur, hauteur] de la fenêtre au départ
   bureau      : true = une icône apparaît aussi sur le bureau
   nouveau     : true = petit badge « nouveau »
   ========================================================== */
window.JEUX = [
  {
    id: "cercle",
    titre: "Le Cercle",
    fichier: "games/cercle.html",
    icone: "cercle",
    description: "Multijoueur jusqu'à 8. Le cercle rétrécit : pousse les autres dehors, évite les bombes et le vent. Le dernier dedans gagne.",
    taille: [960, 680],
    bureau: true,
    nouveau: true
  },
  {
    id: "meteorites",
    titre: "Pluie de météorites",
    fichier: "games/meteorites.html",
    icone: "meteore",
    description: "Pilote ton vaisseau et esquive les météorites le plus longtemps possible. Les cristaux rapportent des points bonus.",
    taille: [760, 540],
    bureau: true
  },
  {
    id: "clicker",
    titre: "Data Clicker",
    fichier: "games/clicker.html",
    icone: "processeur",
    description: "Clique pour produire des données, achète du matériel de plus en plus puissant et débloque des succès.",
    taille: [780, 560],
    bureau: true
  },
  {
    id: "histoire",
    titre: "L'histoire du jeu vidéo",
    fichier: "games/histoire.html",
    icone: "histoire",
    description: "Remonte 80 ans d'informatique et de jeu vidéo, de la Switch 2 à l'ENIAC. 1 pixel = 1 jour.",
    taille: [640, 600],
    bureau: true,
    nouveau: true
  },
  {
    id: "reflexes",
    titre: "Test de réflexes",
    fichier: "games/reflexes.html",
    icone: "eclair",
    description: "Clique dès que l'écran devient vert. Moyenne sur 5 essais, à toi de battre ton record.",
    taille: [620, 480]
  },
  {
    id: "bouton",
    titre: "Le bouton qui fuit",
    fichier: "games/bouton.html",
    icone: "bouton",
    description: "Un bouton. Un seul objectif : cliquer dessus. Facile… non ?",
    taille: [640, 480]
  },
  {
    id: "pseudo",
    titre: "Générateur de pseudo",
    fichier: "games/pseudo.html",
    icone: "carte",
    description: "Écris ton prénom et obtiens un pseudo de joueur avec son avatar et sa carte de joueur.",
    taille: [640, 600]
  },
  {
    id: "paint",
    titre: "Paint",
    fichier: "games/paint.html",
    icone: "palette",
    description: "Pinceau, formes, pot de peinture et pipette. Enregistre ton dessin en PNG.",
    taille: [860, 600]
  }
];
