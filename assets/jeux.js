---
layout: null
---
/* ==========================================================
   La liste des jeux — NE PAS MODIFIER ICI
   Elle est fabriquée automatiquement à partir de _data/jeux.json
   → dans Pages CMS : « Jeux » (titre, description, icône, ordre…)
   Pour un tout nouveau jeu : copie games/modele.html, puis ajoute
   une entrée dans « Jeux » avec le chemin du fichier.
   ========================================================== */
window.JEUX = ({{ site.data.jeux | jsonify }} || [])
  .filter(j => j && j.id && j.fichier && !j.cache)
  .map(j => Object.assign({}, j, { taille: [Number(j.largeur) || 720, Number(j.hauteur) || 520] }));
