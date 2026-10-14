---
layout: null
---
/* ==========================================================
   Réglages du site — NE PAS MODIFIER ICI
   Ce fichier est fabriqué automatiquement par GitHub Pages à partir de :
     _data/site.json       → Pages CMS « Réglages du site »
     _data/commandes.json  → Pages CMS « Commandes secrètes »
     _data/apparence.json  → Pages CMS « Apparence »
     _data/textes.json     → Pages CMS « Textes du site »
   ========================================================== */
window.SITE_CONFIG = {{ site.data.site | jsonify }};
window.SITE_COMMANDES = {{ site.data.commandes | jsonify }};
window.SITE_APPARENCE = {{ site.data.apparence | jsonify }};
window.SITE_TEXTES = {{ site.data.textes | jsonify }};
