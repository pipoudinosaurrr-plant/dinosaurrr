/* ==========================================================
   Avatars des joueurs : une tête de dino de couleur + un accessoire
   DinoAvatar.svg(id, taille) → code SVG à mettre dans la page
   (la liste et les niveaux pour les débloquer sont dans assets/progres-defs.js)
   ========================================================== */
(function () {
  if (window.DinoAvatar) return;
  const LISTE = {
    vert: ['#22c55e', ''], bleu: ['#3b82f6', ''], orange: ['#f97316', ''], rose: ['#ec4899', ''], violet: ['#a855f7', ''], jaune: ['#eab308', ''],
    casquette: ['#06b6d4', 'casquette'], lunettes: ['#f43f5e', 'lunettes'], fete: ['#84cc16', 'fete'], casque: ['#8b5cf6', 'casque'], cornes: ['#14b8a6', 'cornes'], couronne: ['#f59e0b', 'couronne']
  };
  function sombre(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }
  const ACCESSOIRES = {
    casquette: '<path d="M14 25c2-9 10-14 19-13 7 1 11 5 12 10z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2"/><path d="M42 21c6 0 11 2 13 4-5 1-10 1-15 0z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.2"/><circle cx="30" cy="12.5" r="1.6" fill="#7f1d1d"/>',
    lunettes: '<rect x="34" y="23.5" width="10" height="7" rx="2.5" fill="#111"/><rect x="45.5" y="23.5" width="8" height="7" rx="2.5" fill="#111"/><path d="M44 26h1.5M26 25l8 1" stroke="#111" stroke-width="1.6"/><path d="M36 25.5l3 0" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/>',
    fete: '<path d="M24 20 33 2 40 19z" fill="#facc15" stroke="#a16207" stroke-width="1.2"/><path d="M27.5 13l9 1M30 8l5 .5" stroke="#ef4444" stroke-width="2"/><circle cx="33" cy="2.5" r="2.6" fill="#ec4899"/>',
    casque: '<path d="M16 30c0-14 9-22 20-22s19 8 19 20" fill="none" stroke="#111" stroke-width="4"/><rect x="11" y="27" width="9" height="13" rx="4" fill="#111"/><rect x="13" y="29.5" width="4.5" height="8" rx="2" fill="#a855f7"/>',
    cornes: '<path d="M40 16c2-7 6-11 11-12-3 4-4 8-4 13z" fill="#fef3c7" stroke="#92400e" stroke-width="1.2"/><path d="M31 15c0-6 2-10 6-12-1 4-1 8 0 12z" fill="#fef3c7" stroke="#92400e" stroke-width="1.2"/><path d="M53 33c4-1 7 0 9 2-3 1-6 1-9 0z" fill="#fef3c7" stroke="#92400e" stroke-width="1"/>',
    couronne: '<path d="M22 19 24 6l6 7 4-9 4 9 6-7 1 13z" fill="#facc15" stroke="#a16207" stroke-width="1.3" stroke-linejoin="round"/><circle cx="34" cy="14.5" r="1.8" fill="#ef4444"/><circle cx="27.5" cy="16" r="1.4" fill="#3b82f6"/><circle cx="40.5" cy="16" r="1.4" fill="#22c55e"/>'
  };
  function svg(id, taille = 40) {
    const [c, acc] = LISTE[id] || LISTE.vert;
    const fonce = sombre(c, 0.62), clair = sombre(c, 1.25);
    return `<svg class="avatar-dino" width="${taille}" height="${taille}" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#141414" stroke="${fonce}" stroke-width="2"/>
      <path d="M12 30l-4-5 6-1-2-6 6 2 1-6 5 4 3-5 3 5" fill="${fonce}"/>
      <path d="M13 50c-3-10-2-20 4-26 6-7 15-9 24-8 9 1 16 5 18 12 2 6 0 12-6 14-4 1-9 1-13 1l-2 8z" fill="${c}" stroke="${fonce}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M38 46c4 0 9 0 13-1" stroke="${fonce}" stroke-width="1.6" fill="none"/>
      <path d="M41 45.5l1.6 2.6 1.6-2.7 1.6 2.6 1.6-2.8" fill="#fff" stroke="#fff" stroke-width=".8" stroke-linejoin="round"/>
      <path d="M17 44c3 2 7 3 12 2" stroke="${clair}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".55"/>
      <circle cx="40" cy="27" r="5.2" fill="#fff"/><circle cx="41.6" cy="27.4" r="2.6" fill="#111"/><circle cx="42.4" cy="26.4" r=".9" fill="#fff"/>
      <circle cx="54" cy="33" r="1.1" fill="${fonce}"/>
      ${ACCESSOIRES[acc] || ''}
    </svg>`;
  }
  window.DinoAvatar = { svg, ids: Object.keys(LISTE) };
})();
