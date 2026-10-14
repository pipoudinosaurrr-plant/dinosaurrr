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

  // Turbo Dino : voiture de course vue de face sur la route
  D.turbo = `<svg viewBox="0 0 32 32"><defs>${lin('tbc', '#38bdf8', '#e0f2fe')}${lin('tbv', '#4ade80', '#15803d')}</defs>
    <rect x="2.5" y="3.5" width="27" height="25" rx="4" fill="url(#tbc)" stroke="#0c4a6e"/>
    <path d="M3 28.5 13 13h6l10 15.5z" fill="#525252"/><path d="M15.4 15h1.2l.6 4h-2.4zM15 21h2l.6 5h-3.2z" fill="#fafafa"/>
    <path d="M3 28.5 13 13h1.2L5.5 28.5z" fill="#ef4444"/><path d="M29 28.5 19 13h-1.2l8.7 15.5z" fill="#ef4444"/>
    <rect x="8.5" y="17.5" width="15" height="8" rx="2" fill="url(#tbv)" stroke="#14532d"/>
    <rect x="11" y="14.5" width="10" height="4" rx="1" fill="#166534"/><rect x="12" y="15.3" width="8" height="2.4" fill="#1e293b"/>
    <rect x="9.5" y="19.5" width="3" height="1.6" fill="#fde047"/><rect x="19.5" y="19.5" width="3" height="1.6" fill="#fde047"/>
    <rect x="7.5" y="23.5" width="3" height="3" fill="#111"/><rect x="21.5" y="23.5" width="3" height="3" fill="#111"/></svg>`;
  // Dino Blaster : vaisseau qui tire
  D.blaster = `<svg viewBox="0 0 32 32"><defs>${lin('blc', '#1e1b4b', '#020617', 1, 1)}${lin('blv', '#86efac', '#15803d')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#blc)" stroke="#000"/>
    <circle cx="8" cy="8" r=".8" fill="#fff"/><circle cx="24" cy="11" r=".6" fill="#fff"/><circle cx="6" cy="20" r=".6" fill="#fff"/>
    <path d="M16 3.5v7" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/>
    <path d="M16 11l3 6 6 5v3l-6-2-3 2-3-2-6 2v-3l6-5z" fill="url(#blv)" stroke="#052e16" stroke-linejoin="round"/>
    <path d="M16 14.5l1.4 3h-2.8z" fill="#e0f2fe"/><path d="M14 25.5h4l-2 3z" fill="#f97316"/>
    <rect x="22" y="5" width="4" height="3" rx="1" fill="#ef4444"/><rect x="23" y="4" width="2" height="1" fill="#fde047"/></svg>`;
  // Dino Aventure : collines, plateforme, pièce et drapeau
  D.aventure = `<svg viewBox="0 0 32 32"><defs>${lin('avc', '#7dd3fc', '#e0f2fe')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#avc)" stroke="#0c4a6e"/>
    <path d="M3 22c4-5 7-5 11 0s7-3 15 0v7H3z" fill="#4ade80"/>
    <rect x="3" y="23" width="26" height="6" fill="#a16207"/><rect x="3" y="22" width="26" height="2" fill="#22c55e"/>
    <rect x="12" y="13" width="9" height="3" fill="#c2410c" stroke="#7c2d12" stroke-width=".6"/>
    <rect x="15" y="8" width="3" height="4" rx="1.2" fill="#facc15" stroke="#a16207" stroke-width=".6"/>
    <path d="M25 9v13" stroke="#e5e5e5" stroke-width="1.3"/><path d="M25.5 9.5h4l-1 1.6 1 1.6h-4z" fill="#22c55e"/>
    <path d="M6 21v-4h2v-2h3v2h-1v4z" fill="#16a34a"/><rect x="9" y="15.6" width=".9" height=".9" fill="#fff"/></svg>`;
  // Serpent
  D.serpent = `<svg viewBox="0 0 32 32"><defs>${lin('sec', '#1a1a1a', '#050505')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#sec)" stroke="#000"/>
    <path d="M7 24h10a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h9" fill="none" stroke="#16a34a" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M7 24h10a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h9" fill="none" stroke="#4ade80" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1 3"/>
    <circle cx="23" cy="8" r="2.6" fill="#22c55e"/><rect x="22.6" y="6.4" width="1.3" height="1.3" fill="#fff"/>
    <circle cx="24" cy="20" r="2.4" fill="#ef4444"/><path d="M24 17.4v-1.4" stroke="#16a34a" stroke-width="1.2"/></svg>`;
  // Blocs : pièces qui tombent
  D.blocs = `<svg viewBox="0 0 32 32"><defs>${lin('boc', '#18181b', '#050505')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="3" fill="url(#boc)" stroke="#000"/>
    <g stroke="#000" stroke-width=".7">
      <rect x="11" y="4" width="5" height="5" fill="#a855f7"/><rect x="16" y="4" width="5" height="5" fill="#a855f7"/><rect x="21" y="4" width="5" height="5" fill="#a855f7"/><rect x="16" y="9" width="5" height="5" fill="#a855f7"/>
      <rect x="4" y="19" width="5" height="5" fill="#22d3ee"/><rect x="4" y="24" width="5" height="5" fill="#22d3ee"/><rect x="9" y="24" width="5" height="5" fill="#3b82f6"/><rect x="14" y="24" width="5" height="5" fill="#3b82f6"/>
      <rect x="19" y="24" width="5" height="5" fill="#facc15"/><rect x="24" y="24" width="4" height="5" fill="#facc15"/><rect x="19" y="19" width="5" height="5" fill="#facc15"/><rect x="24" y="19" width="4" height="5" fill="#ef4444"/>
    </g></svg>`;
  // Casse-briques
  D.briques = `<svg viewBox="0 0 32 32"><defs>${lin('brc', '#111827', '#030712')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#brc)" stroke="#000"/>
    <g stroke="#000" stroke-width=".6"><rect x="4" y="5" width="7" height="3.5" fill="#22c55e"/><rect x="12.5" y="5" width="7" height="3.5" fill="#22c55e"/><rect x="21" y="5" width="7" height="3.5" fill="#3b82f6"/>
      <rect x="4" y="9.5" width="7" height="3.5" fill="#a855f7"/><rect x="21" y="9.5" width="7" height="3.5" fill="#facc15"/></g>
    <circle cx="16" cy="18" r="2" fill="#fff"/><path d="M14 17l-5-4" stroke="#fff" stroke-width=".8" opacity=".4"/>
    <rect x="9" y="24" width="14" height="3" rx="1.5" fill="#e5e5e5"/><rect x="11" y="25" width="10" height="1" fill="#22c55e"/></svg>`;

  // Dino Run : le T-Rex qui saute un cactus
  D.dinorun = `<svg viewBox="0 0 32 32"><defs>${lin('drc', '#ffffff', '#e5e5e5')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#drc)" stroke="#525252"/>
    <path d="M3 24.5h26" stroke="#737373" stroke-width="1"/><path d="M6 26.5h3M14 27h2M22 26.5h4" stroke="#a3a3a3" stroke-width=".8"/>
    <g fill="#535353"><rect x="9" y="7" width="8" height="5"/><rect x="10" y="12" width="4" height="1"/><rect x="5" y="12" width="7" height="5"/><rect x="3.5" y="11" width="1.5" height="3"/>
      <rect x="12" y="13.5" width="2" height="1"/><rect x="6" y="17" width="2" height="3"/><rect x="9" y="17" width="2" height="2"/></g>
    <rect x="11" y="8" width="1.2" height="1.2" fill="#fff"/>
    <g fill="#16a34a" stroke="#14532d" stroke-width=".5"><rect x="21.5" y="13" width="3" height="11.5" rx="1"/><path d="M19 16.5h2.5v2h-1.5a1.5 1.5 0 0 1-1.5-1.5v-3h.5z"/><path d="M27 15h-2.5v2h1a1.5 1.5 0 0 0 1.5-1.5V13h0z"/></g></svg>`;
  // Dino Flap : ptérodactyle entre deux tuyaux
  D.flap = `<svg viewBox="0 0 32 32"><defs>${lin('flc', '#38bdf8', '#bae6fd')}${lin('flt', '#86efac', '#15803d', 1, 0)}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#flc)" stroke="#0c4a6e"/>
    <g fill="url(#flt)" stroke="#14532d" stroke-width=".7"><rect x="19" y="3" width="7" height="8"/><rect x="18" y="10" width="9" height="3"/><rect x="19" y="22" width="7" height="7"/><rect x="18" y="19.5" width="9" height="3"/></g>
    <path d="M3 27h26v2H3z" fill="#facc15"/>
    <path d="M5 16.5l4-1.5 3 1 2.5-.5-1.5 2-4 1z" fill="#f97316" stroke="#7c2d12" stroke-width=".6" stroke-linejoin="round"/>
    <path d="M8 15.5l1-4.5 3.5 4.5z" fill="#fb923c" stroke="#7c2d12" stroke-width=".6" stroke-linejoin="round"/>
    <circle cx="12.6" cy="16" r=".6" fill="#000"/><path d="M14.5 16l2.2.4-2 .8" fill="#fde047"/></svg>`;
  // 2048 : quatre tuiles
  D.tuiles = `<svg viewBox="0 0 32 32"><rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="#bbada0" stroke="#776e65"/>
    <rect x="4.5" y="4.5" width="11" height="11" rx="1.6" fill="#eee4da"/><rect x="16.5" y="4.5" width="11" height="11" rx="1.6" fill="#f2b179"/>
    <rect x="4.5" y="16.5" width="11" height="11" rx="1.6" fill="#f67c5f"/><rect x="16.5" y="16.5" width="11" height="11" rx="1.6" fill="#edc22e"/>
    <g font-family="Arial, sans-serif" font-weight="700" font-size="8" text-anchor="middle"><text x="10" y="13" fill="#776e65">2</text><text x="22" y="13" fill="#fff">8</text><text x="10" y="25" fill="#fff">4</text></g>
    <text x="22" y="24.3" font-family="Arial, sans-serif" font-weight="700" font-size="5" text-anchor="middle" fill="#fff">2048</text></svg>`;
  // Pendu : potence en bois et lettres à trouver
  D.pendu = `<svg viewBox="0 0 32 32"><defs>${lin('pec', '#fefce8', '#fde68a')}${lin('peb', '#b45309', '#78350f', 1, 0)}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#pec)" stroke="#92400e"/>
    <path d="M5 24.5h12" stroke="#78350f" stroke-width="2" stroke-linecap="round"/>
    <rect x="7.5" y="5" width="2.4" height="19.5" fill="url(#peb)"/><rect x="7.5" y="5" width="13" height="2.4" fill="url(#peb)"/>
    <path d="M9.9 10.5l3.5-3.1" stroke="#78350f" stroke-width="1.4"/><path d="M19 7.4v3.6" stroke="#a16207" stroke-width="1"/>
    <circle cx="19" cy="13" r="2.2" fill="#22c55e" stroke="#14532d" stroke-width=".7"/><path d="M19 15.2v4.5M17 17h4M19 19.7l-1.6 2.6M19 19.7l1.6 2.6" stroke="#14532d" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M20 27.5h2.5M23.5 27.5H26M17 27.5h2" stroke="#1e3a8a" stroke-width="1.2"/><text x="24.7" y="26.3" font-family="Arial, sans-serif" font-weight="700" font-size="5" text-anchor="middle" fill="#1e3a8a">A</text></svg>`;
  // Solitaire : deux cartes sur le tapis vert
  D.cartes = `<svg viewBox="0 0 32 32"><defs>${lin('cac', '#16a34a', '#14532d')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#cac)" stroke="#052e16"/>
    <g transform="rotate(-14 12 17)"><rect x="5" y="8" width="12" height="17" rx="1.6" fill="#1d4ed8" stroke="#1e3a8a"/><rect x="6.5" y="9.5" width="9" height="14" rx="1" fill="none" stroke="#93c5fd" stroke-width=".7" stroke-dasharray="1 1"/></g>
    <rect x="13" y="6.5" width="13" height="18" rx="1.6" fill="#fff" stroke="#525252"/>
    <path d="M19.5 11.5c-2.6 2.4-3.6 3.4-3.6 4.6a1.7 1.7 0 0 0 3 1.1l-.8 2.3h2.8l-.8-2.3a1.7 1.7 0 0 0 3-1.1c0-1.2-1-2.2-3.6-4.6z" fill="#111"/>
    <text x="15.5" y="10.8" font-family="Arial, sans-serif" font-weight="700" font-size="4.2" fill="#111">A</text><text x="23.5" y="23" font-family="Arial, sans-serif" font-weight="700" font-size="4.2" fill="#111" text-anchor="middle" transform="rotate(180 23.5 21.6)">A</text></svg>`;
  // Échecs : une tour sur l'échiquier
  D.echecs = `<svg viewBox="0 0 32 32"><defs>${lin('ecp', '#ffffff', '#cbd5e1')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="3" fill="#f0d9b5" stroke="#5b3a1c"/>
    <g fill="#b58863"><rect x="9.25" y="3" width="6.75" height="6.6"/><rect x="22.75" y="3" width="6.25" height="6.6"/><rect x="3" y="9.6" width="6.25" height="6.6"/><rect x="16" y="9.6" width="6.75" height="6.6"/><rect x="9.25" y="16.2" width="6.75" height="6.6"/><rect x="22.75" y="16.2" width="6.25" height="6.6"/><rect x="3" y="22.8" width="6.25" height="6.2"/><rect x="16" y="22.8" width="6.75" height="6.2"/></g>
    <path d="M10 27h12v-2.5l-1.5-1.5-.8-8 1.8-1.5V9.5h-2.6v2h-2.1v-2h-1.6v2h-2.1v-2H10.5v4l1.8 1.5-.8 8L10 24.5z" fill="url(#ecp)" stroke="#111" stroke-width="1" stroke-linejoin="round"/>
    <path d="M12.8 15h6.4" stroke="#111" stroke-width=".8"/></svg>`;
  // Air hockey : maillet, palet et ligne du milieu
  D.hockey = `<svg viewBox="0 0 32 32"><defs>${lin('hoc', '#1e3a8a', '#0b1730')}${rad('hom', '#fecdd3', '#f43f5e', '#9f1239')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="5" fill="url(#hoc)" stroke="#0f172a"/>
    <path d="M12 2.5h8v1.5h-8zM12 28h8v1.5h-8z" fill="#000"/>
    <path d="M3 16h26" stroke="#f43f5e" stroke-width="1" opacity=".8"/><circle cx="16" cy="16" r="4.5" fill="none" stroke="#38bdf8" stroke-width=".8" opacity=".7"/>
    <circle cx="20" cy="9.5" r="3" fill="#facc15" stroke="#a16207" stroke-width=".7"/><circle cx="20" cy="9.5" r="1.4" fill="#ca8a04"/>
    <circle cx="13" cy="22" r="5" fill="url(#hom)" stroke="#881337" stroke-width=".8"/><circle cx="13" cy="22" r="2.2" fill="#fb7185" stroke="#881337" stroke-width=".6"/>
    <path d="M17.5 12.5l-2.5 3" stroke="#fff" stroke-width=".7" opacity=".5"/></svg>`;

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
  // deux bonshommes (comme les contacts en ligne de MSN Messenger)
  D.joueurs = `<svg viewBox="0 0 32 32"><defs>${rad('jv', '#c9f7b8', '#3fbf3a', '#13660f')}${rad('jb', '#c6e4ff', '#3b8fe6', '#0f4a99')}</defs>
    <circle cx="21" cy="9.5" r="4.5" fill="url(#jb)" stroke="#0b3570"/><path d="M13.5 24.5c0-6 3.4-9.5 7.5-9.5s7.5 3.5 7.5 9.5z" fill="url(#jb)" stroke="#0b3570" stroke-linejoin="round"/>
    <circle cx="11" cy="12" r="5" fill="url(#jv)" stroke="#0c4a09"/><path d="M2.5 28.5c0-6.5 3.8-10.5 8.5-10.5s8.5 4 8.5 10.5z" fill="url(#jv)" stroke="#0c4a09" stroke-linejoin="round"/></svg>`;
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


  // Jeux à plusieurs
  D.puissance4 = `<svg viewBox="0 0 32 32"><defs>${lin('p4', '#4a4a4a', '#151515')}${rad('pr', '#ff9c9c', '#ef4444', '#8f1b1b')}${rad('pj', '#fff4a8', '#facc15', '#9a6a05')}</defs>
    <rect x="3.5" y="5.5" width="25" height="21" rx="3" fill="url(#p4)" stroke="#000"/>
    <g fill="#050505"><circle cx="9" cy="11" r="2.6"/><circle cx="16" cy="11" r="2.6"/><circle cx="23" cy="11" r="2.6"/></g>
    <circle cx="9" cy="18" r="2.6" fill="url(#pr)"/><circle cx="16" cy="18" r="2.6" fill="url(#pj)"/><circle cx="23" cy="18" r="2.6" fill="url(#pr)"/>
    <circle cx="16" cy="11" r="2.6" fill="url(#pj)"/><rect x="6" y="27" width="20" height="2" rx="1" fill="#333"/></svg>`;
  D.morpion = `<svg viewBox="0 0 32 32"><defs>${lin('mp', '#ffffff', '#d9d9d9', 1, 1)}</defs>
    <rect x="3.5" y="3.5" width="25" height="25" rx="3" fill="url(#mp)" stroke="#555"/>
    <g stroke="#9a9a9a" stroke-width="1.2"><path d="M12 6v20M20 6v20M6 12h20M6 20h20"/></g>
    <path d="M7 7l3 3M10 7l-3 3M15 15l3 3M18 15l-3 3M23 23l2.5 2.5M25.5 23l-2.5 2.5" stroke="#16a34a" stroke-width="2" stroke-linecap="round"/>
    <circle cx="16" cy="8.5" r="1.9" fill="none" stroke="#f97316" stroke-width="1.8"/><circle cx="8.5" cy="16" r="1.9" fill="none" stroke="#f97316" stroke-width="1.8"/></svg>`;
  D.navale = `<svg viewBox="0 0 32 32"><defs>${lin('mer', '#2a6fa8', '#0b2740')}${lin('coque', '#9aa3ad', '#3f4750')}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#mer)" stroke="#06192a"/>
    <path d="M5 19h22l-3 5H8z" fill="url(#coque)" stroke="#1f252b"/>
    <path d="M9 19v-4h12v4M12 15v-3h5v3M14.5 12V8" fill="#6b7580" stroke="#1f252b"/>
    <path d="M3 26c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1 2 1 4 1" fill="none" stroke="#9fd0ff" stroke-width="1.2"/>
    <circle cx="23" cy="9" r="2.6" fill="#f97316" opacity=".9"/><path d="M20.5 9h5M23 6.5v5" stroke="#fff" stroke-width="1"/></svg>`;
  D.pong = `<svg viewBox="0 0 32 32"><defs>${lin('pg', '#1b1b1b', '#050505')}</defs>
    <rect x="2.5" y="4.5" width="27" height="23" rx="3" fill="url(#pg)" stroke="#000"/>
    <path d="M16 6.5v19" stroke="#3a3a3a" stroke-dasharray="2 2"/>
    <rect x="5" y="9" width="2.6" height="8" rx="1" fill="#fafafa"/><rect x="24.4" y="14" width="2.6" height="8" rx="1" fill="#4ade80"/>
    <circle cx="13" cy="12" r="1.8" fill="#fff"/><circle cx="13" cy="12" r="3.2" fill="#fff" opacity=".18"/></svg>`;
  D.tron = `<svg viewBox="0 0 32 32"><defs>${lin('tr', '#14141e', '#030305', 1, 1)}</defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="url(#tr)" stroke="#000"/>
    <path d="M6 26V12h8v8h7V6h5" fill="none" stroke="#22d3ee" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M26 26H18v-4" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="24.6" y="4.6" width="3" height="3" fill="#fff"/><rect x="16.6" y="20.6" width="3" height="3" fill="#fff"/></svg>`;
  D.chrono = `<svg viewBox="0 0 32 32"><defs>${rad('ch', '#ffffff', '#f0f0f0', '#c9c9c9', .45, .4)}${lin('cb', '#5ee07a', '#13702d')}</defs>
    <rect x="13" y="2.5" width="6" height="3.5" rx="1" fill="#777" stroke="#333"/>
    <circle cx="16" cy="18" r="11.5" fill="url(#cb)" stroke="#0b4019"/>
    <circle cx="16" cy="18" r="8.8" fill="url(#ch)" stroke="#333"/>
    <path d="M16 18v-6M16 18l4 2" stroke="#111" stroke-width="1.9" stroke-linecap="round"/><circle cx="16" cy="18" r="1.3" fill="#c0392b"/></svg>`;
  D.quiz = `<svg viewBox="0 0 32 32"><defs>${rad('qz', '#c4b5fd', '#7c3aed', '#3b0f8a')}</defs>
    <path d="M16 3.5c7 0 12.5 4.9 12.5 11s-5.5 11-12.5 11c-1.4 0-2.8-.2-4-.6L6 28l1.2-5.2C4.9 20.8 3.5 17.8 3.5 14.5c0-6.1 5.5-11 12.5-11z" fill="url(#qz)" stroke="#2e0b6b"/>
    <ellipse cx="13" cy="9" rx="7" ry="3" fill="#fff" opacity=".25"/>
    <path d="M12.6 11.6a3.5 3.5 0 1 1 4.8 3.2c-.9.4-1.4 1.1-1.4 2v.6" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/><circle cx="16" cy="20.8" r="1.5" fill="#fff"/></svg>`;
  D.crayon = `<svg viewBox="0 0 32 32"><defs>${lin('fe', '#ffffff', '#dcdcdc', 1, 1)}${lin('cr', '#ffd56b', '#e0901a', 1, 0)}</defs>
    <rect x="3.5" y="5.5" width="22" height="20" rx="1.5" fill="url(#fe)" stroke="#555"/>
    <path d="M7 20c2-4 4-6 6-3s4 1 6-4" fill="none" stroke="#3b82f6" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M26.5 6.5l3 3L16 23l-4.2 1.2L13 20z" fill="url(#cr)" stroke="#7a4a05" stroke-linejoin="round"/>
    <path d="M13 20l3 3" stroke="#7a4a05"/><path d="M11.8 24.2l1.2-4.2 3 3z" fill="#f2d7a8" stroke="#7a4a05" stroke-linejoin="round"/></svg>`;

  // Démineur : une mine noire avec reflet
  D.mine = `<svg viewBox="0 0 32 32"><defs>${rad('mn', '#9a9a9a', '#2a2a2a', '#000', .35, .3)}</defs>
    <g stroke="#111" stroke-width="2.4" stroke-linecap="round"><path d="M16 3v26M3 16h26M6.8 6.8l18.4 18.4M25.2 6.8L6.8 25.2"/></g>
    <circle cx="16" cy="16" r="9" fill="url(#mn)" stroke="#000"/><rect x="11" y="11" width="4" height="4" fill="#fff"/></svg>`;

  // Invite de commandes : fenêtre noire avec C:\>
  D.console = `<svg viewBox="0 0 32 32"><defs>${lin('cb', '#3d8bf0', '#0b47c9')}</defs>
    <rect x="2.5" y="4.5" width="27" height="23" rx="1.5" fill="#000" stroke="#4a4a4a"/><rect x="2.5" y="4.5" width="27" height="5" rx="1.5" fill="url(#cb)" stroke="#0a3a9e"/>
    <path d="M6 15l4 3-4 3" fill="none" stroke="#d8d8d8" stroke-width="2" stroke-linecap="square"/><path d="M12 22h7" stroke="#d8d8d8" stroke-width="2"/></svg>`;

  // Bloc-notes : bloc à spirale bleu
  D.blocnotes = `<svg viewBox="0 0 32 32"><defs>${lin('bp', '#ffffff', '#dfe7f5', 1, 1)}${lin('bh', '#7fb2ff', '#2a62d6')}</defs>
    <rect x="6.5" y="5.5" width="20" height="24" rx="1" fill="url(#bp)" stroke="#5a6b8a"/>
    <rect x="6.5" y="3.5" width="20" height="5" rx="1" fill="url(#bh)" stroke="#1c4aa8"/>
    <g fill="#fff" stroke="#333" stroke-width=".8"><circle cx="10" cy="6" r="1.2"/><circle cx="14" cy="6" r="1.2"/><circle cx="18" cy="6" r="1.2"/><circle cx="22" cy="6" r="1.2"/></g>
    <g stroke="#7fa0d8"><path d="M9.5 13h14M9.5 16.5h14M9.5 20h14M9.5 23.5h10"/></g><path d="M9.5 13h9" stroke="#222"/><path d="M9.5 16.5h12" stroke="#222"/></svg>`;

  // Exécuter : une fenêtre avec une flèche qui part
  D.executer = `<svg viewBox="0 0 32 32"><defs>${lin('eb', '#ffffff', '#d6dceb', 1, 1)}${lin('eh', '#3d8bf0', '#0b47c9')}${lin('ef', '#9be36a', '#2f9a2a')}</defs>
    <rect x="3.5" y="8.5" width="20" height="18" rx="1" fill="url(#eb)" stroke="#5a6b8a"/><rect x="3.5" y="8.5" width="20" height="4" fill="url(#eh)" stroke="#0a3a9e"/>
    <path d="M14 22l9-9v4l5-5-5-5v4l-11 9z" fill="url(#ef)" stroke="#1e6a1a" stroke-linejoin="round"/></svg>`;

  // Erreur : rond rouge avec croix blanche
  D.erreur = `<svg viewBox="0 0 32 32"><defs>${rad('er', '#ff8a7a', '#e2311d', '#a3140a')}</defs>
    <circle cx="16" cy="16" r="13" fill="url(#er)" stroke="#7a0e06"/><path d="M11 11l10 10M21 11L11 21" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>`;

  // Attention : triangle jaune
  D.attention = `<svg viewBox="0 0 32 32"><defs>${lin('at', '#fff2a0', '#f2b81e')}</defs>
    <path d="M16 3.5L29.5 27.5h-27z" fill="url(#at)" stroke="#8a5a00" stroke-linejoin="round"/><path d="M16 11v9" stroke="#222" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="24" r="1.7" fill="#222"/></svg>`;

  // Date et heure : petite horloge
  D.horloge = `<svg viewBox="0 0 32 32"><defs>${rad('hc', '#ffffff', '#eef2fb', '#c3cde6')}${lin('hb', '#6aa0f5', '#1d4fc0')}</defs>
    <circle cx="16" cy="16" r="13" fill="url(#hb)" stroke="#0d3590"/><circle cx="16" cy="16" r="10" fill="url(#hc)" stroke="#5a6b8a"/>
    <g stroke="#333" stroke-width="1.2"><path d="M16 7.5v2M16 22.5v2M7.5 16h2M22.5 16h2"/></g><path d="M16 16V10M16 16l4.5 2.5" stroke="#111" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="1.3" fill="#d22"/></svg>`;

  // Écran de veille : un écran avec des étoiles
  D.veilleuse = `<svg viewBox="0 0 32 32"><defs>${lin('vb', '#eeeeee', '#a9a9a9')}</defs>
    <rect x="3.5" y="4.5" width="25" height="18" rx="2" fill="url(#vb)" stroke="#555"/><rect x="6" y="7" width="20" height="13" fill="#0a0f3a"/>
    <g fill="#fff"><rect x="9" y="9" width="1" height="1"/><rect x="20" y="10" width="1" height="1"/><rect x="14" y="15" width="1" height="1"/><rect x="23" y="17" width="1" height="1"/></g>
    <path d="M10 18c2-4 4-4 6-2s3-2 6-4" stroke="#3fae4f" stroke-width="1.6" fill="none"/><path d="M12 22.5h8l2 4H10z" fill="#bdbdbd" stroke="#555"/></svg>`;

  // Coffre secret : un coffre en bois cerclé d'or
  D.coffre = `<svg viewBox="0 0 32 32"><defs>${lin('cf', '#c98a4a', '#7a4a1e')}${lin('cc', '#e0a35e', '#9a5f28')}${lin('co', '#ffe680', '#d39a12')}</defs>
    <path d="M4.5 14.5h23v13h-23z" fill="url(#cf)" stroke="#4a2a0c"/>
    <path d="M4.5 14.5c0-6 3-9 11.5-9s11.5 3 11.5 9z" fill="url(#cc)" stroke="#4a2a0c"/>
    <path d="M4.5 14.5h23" stroke="#4a2a0c" stroke-width="1.5"/>
    <g fill="url(#co)" stroke="#8a5a00"><path d="M8.5 6.8v20.7h2.5V6.2zM21 6.2v21.3h2.5V6.8z"/><rect x="13.5" y="12.5" width="5" height="6" rx="1"/></g>
    <rect x="15.4" y="14.6" width="1.2" height="2.4" fill="#4a2a0c"/><path d="M6 9.5l1-1M26 9.5l-1-1" stroke="#fff6c2"/></svg>`;

  // Petit dino en pixels (bouton « démarrer ») : un caractère = un pixel
  const pixels = (lignes, couleurs) => {
    const n = lignes.length;
    let r = '';
    lignes.forEach((ligne, y) => [...ligne].forEach((c, x) => { if (couleurs[c]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${couleurs[c]}"/>`; }));
    return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${r}</svg>`;
  };
  D.dino = pixels([
    '.......kkk.',
    '......kwowk',
    '......kwwk.',
    '.......kwk.',
    '.......kwk.',
    '..kkkkkkwk.',
    '.kwwwwwwwk.',
    'kwwwwwwwwk.',
    'kwkwwwwwk..',
    '.k.kwk.kwk.',
    '...kk...kk.'
  ], { k: '#1d4d1d', w: '#ffffff', o: '#1d4d1d' });

  // Un cache pour ne fabriquer chaque image qu'une fois
  const cache = {};
  const png = {};
  const enCours = {};
  const svgURL = nom => cache[nom] || (cache[nom] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(D[nom].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/\s*\n\s*/g, ' ')));

  // On redessine chaque icône à sa vraie taille en pixels (16, 32…), bords nets,
  // puis on l'agrandit sans lissage : sur un écran Retina on voit les pixels, comme sur XP.
  // niveau de pixelisation choisi dans Pages CMS → Apparence (normal, lisse, fort)
  const NIVEAU = ((window.SITE_APPARENCE || {}).pixelisation) || 'normal';
  function pixeliser(nom, taille) {
    if (NIVEAU === 'lisse') return;
    const cle = nom + '@' + taille;
    if (png[cle] || enCours[cle]) return;
    enCours[cle] = true;
    const image = new Image();
    image.onload = () => {
      try {
        const toile = document.createElement('canvas');
        const t = NIVEAU === 'fort' ? Math.max(8, Math.round(taille / 2)) : taille;
        toile.width = toile.height = t;
        const g = toile.getContext('2d');
        g.drawImage(image, 0, 0, t, t);
        const donnees = g.getImageData(0, 0, t, t);
        const p = donnees.data;
        for (let i = 3; i < p.length; i += 4) p[i] = p[i] < 90 ? 0 : 255;
        g.putImageData(donnees, 0, 0);
        png[cle] = toile.toDataURL('image/png');
        document.querySelectorAll(`img[data-ico="${cle}"]`).forEach(el => { el.src = png[cle]; });
      } catch (e) { /* on garde le dessin d'origine */ }
    };
    image.src = svgURL(nom);
  }

  window.ICONES_XP = D;
  window.iconeXP = (nom, taille = 32, classe = '') => {
    if (!D[nom]) return '';
    const cle = nom + '@' + taille;
    if (!png[cle]) pixeliser(nom, taille);
    return `<img class="ico-xp${classe ? ' ' + classe : ''}" data-ico="${cle}" src="${png[cle] || svgURL(nom)}" width="${taille}" height="${taille}" alt="" draggable="false">`;
  };

  // on prépare tout de suite les tailles les plus utilisées
  if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    Object.keys(D).forEach(nom => { pixeliser(nom, 16); pixeliser(nom, 32); });
  }
})();
