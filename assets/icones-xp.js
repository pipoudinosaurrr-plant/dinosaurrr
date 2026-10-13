/* ==========================================================
   Icônes en couleur façon Windows XP (bureau, menus, fenêtres)
   Chaque icône est un petit dessin SVG de 32 × 32.
   Pour en ajouter une : nom: `<svg …>…</svg>` (sans xmlns),
   puis utilise ce nom dans assets/jeux.js (champ icone).
   ========================================================== */
(() => {
  const D = {};

  // dégradés réutilisés
  const lin = (id, a, b, x2 = 0, y2 = 1, milieu) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/>${milieu ? `<stop offset=".5" stop-color="${milieu}"/>` : ''}<stop offset="1" stop-color="${b}"/></linearGradient>`;
  const rad = (id, a, m, b, cx = .4, cy = .3) =>
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${m}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
  const carre = (degrade, bord) => `<rect x="3.5" y="3.5" width="25" height="25" rx="5" fill="url(#${degrade})" stroke="${bord}"/><rect x="5" y="4.5" width="22" height="10" rx="4" fill="#fff" opacity=".22"/>`;

  // Blog : un bloc-notes à spirale
  D.fichier = `<svg viewBox="0 0 32 32"><defs>${lin('p', '#ffffff', '#d9d9d9', 1, 1)}${lin('b', '#7ad97a', '#1f7f27')}</defs>
    <rect x="6.5" y="6.5" width="20" height="23" rx="1.5" fill="url(#p)" stroke="#555"/>
    <rect x="6.5" y="4.5" width="20" height="5.5" rx="1.5" fill="url(#b)" stroke="#185c1e"/>
    <g fill="#222"><circle cx="10" cy="7.2" r="1"/><circle cx="14" cy="7.2" r="1"/><circle cx="18" cy="7.2" r="1"/><circle cx="22" cy="7.2" r="1"/></g>
    <g stroke="#8f99a3"><path d="M9.5 14h14M9.5 17.5h14M9.5 21h14M9.5 24.5h9"/></g></svg>`;

  // Une page (articles dans les listes)
  D.page = `<svg viewBox="0 0 32 32"><defs>${lin('p', '#ffffff', '#d6d6d6', 1, 1)}</defs>
    <path d="M7.5 3.5h12l6 6v19h-18z" fill="url(#p)" stroke="#555"/><path d="M19.5 3.5v6h6" fill="#e9e9e9" stroke="#555"/>
    <g stroke="#2f8f3f" stroke-width="1.4"><path d="M10.5 14h11M10.5 18h11M10.5 22h7"/></g></svg>`;

  // Dossier jaune
  const dossier = extra => `<svg viewBox="0 0 32 32"><defs>${lin('f', '#ffeaa8', '#efb23a')}${lin('g', '#f7cb5d', '#cf8c1c')}</defs>
    <path d="M3.5 8a1.5 1.5 0 0 1 1.5-1.5h6.6l2.5 3H27a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 26z" fill="url(#g)" stroke="#9e6815"/>
    <path d="M3.5 13.5h25V26a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 26z" fill="url(#f)" stroke="#9e6815"/>
    <path d="M4.5 14.5h23" stroke="#fff6d6" opacity=".9"/>${extra || ''}</svg>`;
  D.dossier = dossier();

  // Jeux : dossier + manette
  D.manette = dossier(`<rect x="12.5" y="17" width="16" height="9.5" rx="4.75" fill="#3a3a3a" stroke="#0d0d0d"/>
    <path d="M16.5 19.8v3.8M14.6 21.7h3.8" stroke="#fff" stroke-width="1.3"/>
    <circle cx="23.6" cy="20.6" r="1.1" fill="#ef4444"/><circle cx="25.8" cy="22.8" r="1.1" fill="#22c55e"/>`);

  // Le Cercle
  D.cercle = `<svg viewBox="0 0 32 32"><defs>${rad('d', '#4a4a4a', '#1a1a1a', '#030303')}</defs>
    <circle cx="16" cy="16" r="13.5" fill="url(#d)" stroke="#000"/>
    <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" stroke-width="1.6"/>
    <path d="M11.5 8.5v9.5l2.3-2.1 1.6 3.5 1.7-.8-1.6-3.4h3.3z" fill="#22c55e" stroke="#000" stroke-width=".8" stroke-linejoin="round"/>
    <path d="M18.5 15v7.5l1.8-1.6 1.3 2.8 1.3-.6-1.3-2.7h2.6z" fill="#f97316" stroke="#000" stroke-width=".7" stroke-linejoin="round"/></svg>`;

  // Pluie de météorites
  D.meteore = `<svg viewBox="0 0 32 32"><defs>${lin('c', '#1d2a3c', '#04060a', 1, 1)}${rad('m', '#fff1b8', '#ff9a2e', '#b93a0b')}</defs>
    <rect x="3.5" y="3.5" width="25" height="25" rx="4" fill="url(#c)" stroke="#000"/>
    <g stroke="#ffb15a" stroke-width="1.7" stroke-linecap="round" opacity=".85"><path d="M7 8.5l9.5 8.5M9.5 6l9 8M6.5 11.5l8.5 8"/></g>
    <circle cx="20" cy="20" r="5.2" fill="url(#m)" stroke="#7c2d12" stroke-width=".8"/>
    <circle cx="9" cy="24" r=".8" fill="#fff"/><circle cx="25" cy="8" r=".7" fill="#fff"/><circle cx="24" cy="26" r=".5" fill="#fff"/></svg>`;

  // Data Clicker : une puce
  D.processeur = `<svg viewBox="0 0 32 32"><defs>${lin('k', '#555', '#141414')}${lin('v', '#7af08f', '#15803d')}</defs>
    <g stroke="#d4a82a" stroke-width="1.7"><path d="M11 3v5M16 3v5M21 3v5M11 24v5M16 24v5M21 24v5M3 11h5M3 16h5M3 21h5M24 11h5M24 16h5M24 21h5"/></g>
    <rect x="7.5" y="7.5" width="17" height="17" rx="2" fill="url(#k)" stroke="#000"/>
    <rect x="11.5" y="11.5" width="9" height="9" rx="1" fill="url(#v)" stroke="#0f3d1f"/>
    <circle cx="10.2" cy="10.2" r=".9" fill="#a3a3a3"/></svg>`;

  // L'histoire du jeu vidéo : une horloge
  D.histoire = `<svg viewBox="0 0 32 32"><defs>${rad('h', '#ffffff', '#f2f2f2', '#cfcfcf', .45, .4)}${lin('r', '#9a9a9a', '#2a2a2a')}</defs>
    <circle cx="16" cy="16" r="13.5" fill="url(#r)" stroke="#111"/>
    <circle cx="16" cy="16" r="10.5" fill="url(#h)" stroke="#444"/>
    <g stroke="#555" stroke-width="1.3"><path d="M16 7v2.2M16 22.8V25M7 16h2.2M22.8 16H25"/></g>
    <path d="M16 16V10.2M16 16l4.6 2.6" stroke="#111" stroke-width="1.9" stroke-linecap="round"/>
    <circle cx="16" cy="16" r="1.4" fill="#c0392b"/></svg>`;

  // Test de réflexes : un éclair
  D.eclair = `<svg viewBox="0 0 32 32"><defs>${lin('e', '#fff7a8', '#f29d00')}${rad('o', '#3a3a3a', '#1d1d1d', '#080808')}</defs>
    <circle cx="16" cy="16" r="13.5" fill="url(#o)" stroke="#000"/>
    <path d="M18.2 4.5L8.5 18.2h6.6l-2 9.3 10.4-14.6h-6.6z" fill="url(#e)" stroke="#8a5a00" stroke-linejoin="round"/></svg>`;

  // Le bouton qui fuit
  D.bouton = `<svg viewBox="0 0 32 32"><defs>${rad('rb', '#ffa594', '#e5321b', '#8a1205', .4, .25)}${lin('bs', '#707070', '#1c1c1c')}</defs>
    <ellipse cx="16" cy="22" rx="13" ry="6.5" fill="url(#bs)" stroke="#000"/>
    <ellipse cx="16" cy="17" rx="9.5" ry="7.5" fill="url(#rb)" stroke="#5c0d03"/>
    <ellipse cx="13" cy="13.6" rx="4.2" ry="2" fill="#fff" opacity=".55"/></svg>`;

  // Générateur de pseudo : une carte d'identité
  D.carte = `<svg viewBox="0 0 32 32"><defs>${lin('ca', '#fbfbfb', '#d2d2d2')}${lin('cb', '#4fd27a', '#1a7a37')}</defs>
    <rect x="2.5" y="7.5" width="27" height="18" rx="2" fill="url(#ca)" stroke="#555"/>
    <path d="M4.5 7.5h23a2 2 0 0 1 2 2v2h-27v-2a2 2 0 0 1 2-2z" fill="url(#cb)"/>
    <rect x="5.5" y="14" width="7" height="8.5" rx="1" fill="#5b6470"/>
    <circle cx="9" cy="16.8" r="1.8" fill="#e5e7eb"/><path d="M6.4 21.6c.6-2.1 4.6-2.1 5.2 0z" fill="#e5e7eb"/>
    <g stroke="#9ca3af" stroke-width="1.3"><path d="M15 15.5h11M15 18.5h11M15 21.5h7"/></g></svg>`;

  // Paint : une palette
  D.palette = `<svg viewBox="0 0 32 32"><defs>${lin('w', '#f6d9a3', '#c48a39', 1, 1)}</defs>
    <path d="M16 4C8.5 4 3.5 9.3 3.5 15.5c0 6 4.7 10.5 10 10.5 2 0 2.5-1.2 2.5-2.4 0-1.6-1.2-2.3-1.2-3.6 0-1.4 1.2-2.4 2.8-2.4h3.6c3.9 0 7.3-2.4 7.3-6.6C28.5 8.3 22.8 4 16 4z" fill="url(#w)" stroke="#7a5420"/>
    <circle cx="9.5" cy="14" r="2.1" fill="#ef4444" stroke="#7f1d1d" stroke-width=".5"/><circle cx="12.2" cy="8.8" r="2.1" fill="#facc15" stroke="#854d0e" stroke-width=".5"/>
    <circle cx="18" cy="7.8" r="2.1" fill="#22c55e" stroke="#14532d" stroke-width=".5"/><circle cx="23.2" cy="11.4" r="2.1" fill="#3b82f6" stroke="#1e3a8a" stroke-width=".5"/>
    <path d="M30 19.5L21.5 28" stroke="#6b4a1c" stroke-width="2.6" stroke-linecap="round"/><path d="M22 27.5l-3 1.6 1.3-3z" fill="#111"/></svg>`;

  // À propos : le « i » d'information
  D.info = `<svg viewBox="0 0 32 32"><defs>${rad('i', '#a8d6ff', '#2f7fe0', '#103f86')}</defs>
    <circle cx="16" cy="16" r="13" fill="url(#i)" stroke="#0b2f63"/>
    <ellipse cx="13.5" cy="9.5" rx="7.5" ry="3.8" fill="#fff" opacity=".3"/>
    <circle cx="16" cy="9.6" r="2.1" fill="#fff"/><path d="M13.4 13.4h4.3v9.1h2v2.2h-6.6v-2.2h2v-6.9h-1.7z" fill="#fff"/></svg>`;

  // Contact : une enveloppe
  D.mail = `<svg viewBox="0 0 32 32"><defs>${lin('en', '#ffffff', '#dadada')}</defs>
    <rect x="3.5" y="8.5" width="25" height="17" rx="1.5" fill="url(#en)" stroke="#555"/>
    <path d="M4.5 25l9.2-8.2M27.5 25l-9.2-8.2" stroke="#9a9a9a"/>
    <path d="M4 9.5l12 9.3 12-9.3" fill="none" stroke="#6e6e6e" stroke-width="1.3"/>
    <rect x="22" y="11" width="4.5" height="5" fill="#22a046" stroke="#14532d" stroke-width=".6"/></svg>`;

  // Corbeille
  D.corbeille = `<svg viewBox="0 0 32 32"><defs>${lin('bn', '#8d8d8d', '#7a7a7a', 1, 0, '#ececec')}${lin('bt', '#e8e8e8', '#a8a8a8')}</defs>
    <path d="M7.5 9.5l2 18.2a1.5 1.5 0 0 0 1.5 1.3h10a1.5 1.5 0 0 0 1.5-1.3l2-18.2z" fill="url(#bn)" stroke="#444"/>
    <ellipse cx="16" cy="9.5" rx="9" ry="2.6" fill="url(#bt)" stroke="#444"/>
    <g stroke="#666" stroke-width=".9" opacity=".75"><path d="M12 13l1 13.5M16 13v13.5M20 13l-1 13.5"/></g>
    <path d="M13 19.2a3.2 3.2 0 0 1 5.6-1.2M19 21a3.2 3.2 0 0 1-5.4 1.4" fill="none" stroke="#1f9a45" stroke-width="1.6" stroke-linecap="round"/></svg>`;

  // Poste de travail
  D.ordinateur = `<svg viewBox="0 0 32 32"><defs>${lin('mo', '#d9d9d9', '#8a8a8a')}${lin('ec', '#1f6b3a', '#06210f', 1, 1)}</defs>
    <rect x="3.5" y="4.5" width="25" height="18" rx="2" fill="url(#mo)" stroke="#444"/>
    <rect x="6" y="7" width="20" height="13" fill="url(#ec)" stroke="#333"/>
    <path d="M6 16c4-3 9-3 13-1s5 2 7 1v4H6z" fill="#2fa04a" opacity=".8"/>
    <path d="M12 22.5h8l1.5 4h-11z" fill="url(#mo)" stroke="#444"/><rect x="8.5" y="26.5" width="15" height="2" rx="1" fill="#777" stroke="#444"/></svg>`;

  // Fond d'écran : un tableau
  D.image = `<svg viewBox="0 0 32 32"><defs>${lin('ci', '#0c1a2b', '#3b5b70')}${lin('cad', '#c49a4f', '#7a5421', 1, 1)}</defs>
    <rect x="3.5" y="5.5" width="25" height="21" rx="1" fill="url(#cad)" stroke="#4d3412"/>
    <rect x="6.5" y="8.5" width="19" height="15" fill="url(#ci)" stroke="#3a2a10"/>
    <circle cx="21" cy="12" r="1.8" fill="#f8f3c0"/>
    <path d="M6.5 20c4-4 8-4 12-1.5 2.5 1.5 4.5 1 7-.5v5.5h-19z" fill="#2c8a3f"/></svg>`;

  // Jeu au hasard : un dé
  D.hasard = `<svg viewBox="0 0 32 32"><defs>${lin('de', '#ffffff', '#cfcfcf', 1, 1)}</defs>
    <rect x="5.5" y="5.5" width="21" height="21" rx="4" fill="url(#de)" stroke="#444"/>
    <g fill="#c0392b"><circle cx="11" cy="11" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="21" cy="21" r="2"/></g>
    <g fill="#222"><circle cx="21" cy="11" r="2"/><circle cx="11" cy="21" r="2"/></g></svg>`;

  // Boutons ronds/carrés du système
  D.eteindre = `<svg viewBox="0 0 32 32"><defs>${lin('pw', '#ff9a7a', '#a5230b', 0, 1, '#e2401f')}</defs>${carre('pw', '#5e1204')}
    <path d="M11.5 11.2a7 7 0 1 0 9 0" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M16 7.5v8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  D.veille = `<svg viewBox="0 0 32 32"><defs>${lin('pv', '#ffe48a', '#b8860b', 0, 1, '#f0b414')}</defs>${carre('pv', '#6b4c05')}
    <path d="M11.5 11.2a7 7 0 1 0 9 0" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M16 7.5v8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  D.redemarrer = `<svg viewBox="0 0 32 32"><defs>${lin('pr', '#8ff0a0', '#13702d', 0, 1, '#2fae4c')}</defs>${carre('pr', '#0b4019')}
    <path d="M22.2 13.5a6.8 6.8 0 1 0 .3 5" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M23.5 8.5v5.5H18" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  D.session = `<svg viewBox="0 0 32 32"><defs>${lin('ps', '#ffd27a', '#ad5a07', 0, 1, '#ea8f1a')}</defs>${carre('ps', '#5c2f03')}
    <circle cx="12" cy="13.5" r="3.8" fill="none" stroke="#fff" stroke-width="2.3"/><path d="M14.8 16.2l7.2 6.3M19.6 20.4l2.1-2.1M21.8 22.3l1.9-1.9" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/></svg>`;

  // Flèches vertes (navigation, « Tous les programmes »)
  const fleche = d => `<svg viewBox="0 0 32 32"><defs>${rad('fv', '#a6f5b5', '#2fae4c', '#106a27')}</defs>
    <circle cx="16" cy="16" r="13" fill="url(#fv)" stroke="#0b4019"/><ellipse cx="14" cy="10" rx="8" ry="4" fill="#fff" opacity=".3"/>
    <path d="${d}" fill="#fff" stroke="#0b4019" stroke-width=".8" stroke-linejoin="round"/></svg>`;
  D.suivant = fleche('M9 13.5h7.5V9l7.5 7-7.5 7v-4.5H9z');
  D.precedent = fleche('M23 13.5h-7.5V9L8 16l7.5 7v-4.5H23z');
  D.programmes = D.suivant;

  // Barre d'outils des jeux
  D.recharger = `<svg viewBox="0 0 32 32"><defs>${lin('rc', '#7ee08f', '#16803a')}</defs>
    <path d="M24.5 12A10 10 0 1 0 26 18.5" fill="none" stroke="#0b4019" stroke-width="5.4" stroke-linecap="round"/>
    <path d="M24.5 12A10 10 0 1 0 26 18.5" fill="none" stroke="url(#rc)" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M27.5 5.5v8.5H19z" fill="url(#rc)" stroke="#0b4019" stroke-linejoin="round"/></svg>`;
  D.agrandir = `<svg viewBox="0 0 32 32"><defs>${lin('ag', '#e6e6e6', '#8f8f8f')}</defs>
    <rect x="4.5" y="6.5" width="23" height="19" rx="1.5" fill="#1d1d1d" stroke="#555"/><rect x="4.5" y="6.5" width="23" height="3.5" fill="#3a3a3a"/>
    <g fill="url(#ag)" stroke="#333" stroke-width=".6"><path d="M8 13h5l-1.7 1.7 2.5 2.5-1.6 1.6-2.5-2.5L8 18z"/><path d="M24 22.5h-5l1.7-1.7-2.5-2.5 1.6-1.6 2.5 2.5 1.7-1.7z"/></g></svg>`;
  D.externe = `<svg viewBox="0 0 32 32"><defs>${lin('ex', '#ffffff', '#d4d4d4')}${lin('fx', '#7ee08f', '#16803a')}</defs>
    <rect x="3.5" y="8.5" width="19" height="17" rx="1.5" fill="url(#ex)" stroke="#555"/><rect x="3.5" y="8.5" width="19" height="3.5" fill="#3a3a3a"/>
    <path d="M17 4.5h10.5V15l-3.6-3.6-6.3 6.3-3.3-3.3 6.3-6.3z" fill="url(#fx)" stroke="#0b4019" stroke-linejoin="round"/></svg>`;
  D.lien = `<svg viewBox="0 0 32 32"><g fill="none" stroke-linecap="round"><path d="M13.5 18.5l5-5" stroke="#555" stroke-width="4.5"/><path d="M13.5 18.5l5-5" stroke="#d9d9d9" stroke-width="2.4"/>
    <path d="M15 9.5l2.5-2.5a5 5 0 0 1 7 7L22 16.5M17 22.5L14.5 25a5 5 0 0 1-7-7l2.5-2.5" stroke="#333" stroke-width="4.6"/>
    <path d="M15 9.5l2.5-2.5a5 5 0 0 1 7 7L22 16.5M17 22.5L14.5 25a5 5 0 0 1-7-7l2.5-2.5" stroke="#c9c9c9" stroke-width="2.4"/></g></svg>`;
  D.copier = `<svg viewBox="0 0 32 32"><defs>${lin('cp', '#ffffff', '#d6d6d6', 1, 1)}</defs>
    <rect x="5.5" y="4.5" width="15" height="19" rx="1" fill="url(#cp)" stroke="#555"/><rect x="11.5" y="9.5" width="15" height="19" rx="1" fill="url(#cp)" stroke="#555"/>
    <g stroke="#2f8f3f" stroke-width="1.3"><path d="M14.5 15h9M14.5 18.5h9M14.5 22h6"/></g></svg>`;

  // Zone de notification
  D.volume = `<svg viewBox="0 0 32 32"><defs>${lin('hp', '#e6e6e6', '#8a8a8a')}</defs>
    <path d="M5.5 12.5h5l7-6v19l-7-6h-5z" fill="url(#hp)" stroke="#333" stroke-linejoin="round"/>
    <path d="M21 11.5a6 6 0 0 1 0 9M24 8.5a10 10 0 0 1 0 15" fill="none" stroke="#d9d9d9" stroke-width="2" stroke-linecap="round"/></svg>`;
  D.reseau = `<svg viewBox="0 0 32 32"><defs>${lin('re', '#d9d9d9', '#8a8a8a')}${lin('rs', '#38c25d', '#0d5c26', 1, 1)}</defs>
    <rect x="2.5" y="11.5" width="14" height="10" rx="1" fill="url(#re)" stroke="#333"/><rect x="4.5" y="13.5" width="10" height="6" fill="url(#rs)"/>
    <rect x="15.5" y="5.5" width="14" height="10" rx="1" fill="url(#re)" stroke="#333"/><rect x="17.5" y="7.5" width="10" height="6" fill="url(#rs)"/>
    <path d="M7 21.5v4h15v-10" fill="none" stroke="#9a9a9a" stroke-width="1.5"/></svg>`;
  D.internet = `<svg viewBox="0 0 32 32"><defs>${rad('gl', '#b8f5c4', '#2fae4c', '#0d5c26')}</defs>
    <circle cx="16" cy="16" r="12.5" fill="url(#gl)" stroke="#0b4019"/>
    <g fill="none" stroke="#e8ffe9" stroke-width="1.2" opacity=".85"><ellipse cx="16" cy="16" rx="5.5" ry="12.5"/><path d="M3.5 16h25M5.5 10h21M5.5 22h21"/></g></svg>`;

  // Un cache pour ne fabriquer chaque image qu'une fois
  const cache = {};
  window.ICONES_XP = D;
  window.iconeXP = (nom, taille = 32, classe = '') => {
    const source = D[nom];
    if (!source) return '';
    if (!cache[nom]) cache[nom] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/\s*\n\s*/g, ' '));
    return `<img class="ico-xp${classe ? ' ' + classe : ''}" src="${cache[nom]}" width="${taille}" height="${taille}" alt="" draggable="false">`;
  };
})();
