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
   multi       : true = jeu à plusieurs (en ligne)
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
    nouveau: true,
    multi: true
  },
  {
    id: "puissance4",
    titre: "Puissance 4",
    fichier: "games/puissance4.html",
    icone: "puissance4",
    description: "Le classique à 2 : aligne 4 jetons avant l'autre. En ligne avec un pote ou contre l'ordinateur.",
    taille: [720, 680],
    nouveau: true,
    multi: true
  },
  {
    id: "morpion",
    titre: "Morpion géant",
    fichier: "games/morpion.html",
    icone: "morpion",
    description: "Une grille de 15 × 15 : le premier qui aligne 5 symboles gagne. À 2, en ligne ou contre l'ordinateur.",
    taille: [760, 760],
    multi: true
  },
  {
    id: "navale",
    titre: "Bataille navale",
    fichier: "games/navale.html",
    icone: "navale",
    description: "Place ta flotte et coule les 5 bateaux de l'autre, un tir à la fois.",
    taille: [860, 700],
    multi: true
  },
  {
    id: "pong",
    titre: "Pong",
    fichier: "games/pong.html",
    icone: "pong",
    description: "1 contre 1 en temps réel. La balle accélère à chaque coup, premier à 7 points.",
    taille: [900, 620],
    bureau: true,
    nouveau: true,
    multi: true
  },
  {
    id: "tron",
    titre: "Tron",
    fichier: "games/tron.html",
    icone: "tron",
    description: "Jusqu'à 8 motos de lumière. Ne touche aucun mur, enferme les autres, sois le dernier en piste.",
    taille: [760, 760],
    nouveau: true,
    multi: true
  },
  {
    id: "course",
    titre: "Course de réflexes",
    fichier: "games/course.html",
    icone: "chrono",
    description: "Jusqu'à 8 joueurs, 5 manches : le premier à cliquer quand ça passe au vert marque le plus.",
    taille: [760, 600],
    multi: true
  },
  {
    id: "quiz",
    titre: "Quiz battle",
    fichier: "games/quiz.html",
    icone: "quiz",
    description: "10 questions, jusqu'à 8 joueurs. Jeux vidéo, tech, sciences : plus tu réponds vite, plus tu marques.",
    taille: [820, 680],
    nouveau: true,
    multi: true
  },
  {
    id: "dessin",
    titre: "Dessine et devine",
    fichier: "games/dessin.html",
    icone: "crayon",
    description: "Un joueur dessine, les autres devinent le mot. De 2 à 8 joueurs, en ligne.",
    taille: [1000, 720],
    nouveau: true,
    multi: true
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
