/* ==========================================================
   Avatars des joueurs : l'initiale du pseudo dans un rond de couleur
   DinoAvatar.svg(id, taille, nom) → code SVG à mettre dans la page
   (la liste et les niveaux pour débloquer les styles sont dans assets/progres-defs.js)
   ========================================================== */
(function () {
  if (window.DinoAvatar) return;
  // id → [couleur, style]
  const LISTE = {
    vert: ['#16a34a', ''], bleu: ['#2563eb', ''], orange: ['#ea580c', ''], rose: ['#db2777', ''], violet: ['#7c3aed', ''], jaune: ['#ca8a04', ''],
    casquette: ['#0891b2', 'argent'], lunettes: ['#e11d48', 'degrade'], fete: ['#65a30d', 'double'], casque: ['#8b5cf6', 'neon'], cornes: ['#0f766e', 'or'], couronne: ['#b45309', 'legende']
  };
  let n = 0;
  const echapper = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function initiale(nom) {
    const t = String(nom || '?').normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');
    return (t[0] || '?').toUpperCase();
  }
  function svg(id, taille = 40, nom = '') {
    const [c, style] = LISTE[id] || LISTE.vert;
    const u = 'av' + (++n);
    const lettre = echapper(initiale(nom));
    let fond = `<circle cx="32" cy="32" r="30" fill="${c}"/>`, defs = '', cadre = '', couleurLettre = '#fff', extra = '';
    if (style === 'argent') cadre = '<circle cx="32" cy="32" r="29" fill="none" stroke="#e5e7eb" stroke-width="4"/>';
    if (style === 'degrade') { defs = `<linearGradient id="${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f43f5e"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>`; fond = `<circle cx="32" cy="32" r="30" fill="url(#${u})"/>`; }
    if (style === 'double') cadre = '<circle cx="32" cy="32" r="29" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="32" cy="32" r="24" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/>';
    if (style === 'neon') { fond = '<circle cx="32" cy="32" r="30" fill="#0b0b14"/>'; cadre = `<circle cx="32" cy="32" r="27.5" fill="none" stroke="${c}" stroke-width="3.5" style="filter:drop-shadow(0 0 3px ${c})"/>`; couleurLettre = '#ddd6fe'; }
    if (style === 'or') cadre = '<circle cx="32" cy="32" r="29" fill="none" stroke="#facc15" stroke-width="4"/>';
    if (style === 'legende') {
      defs = `<linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset="1" stop-color="#b45309"/></linearGradient>`;
      fond = `<circle cx="32" cy="32" r="30" fill="url(#${u})"/>`;
      cadre = '<circle cx="32" cy="32" r="29" fill="none" stroke="#fef3c7" stroke-width="2.5"/>';
      couleurLettre = '#451a03';
      extra = '<path d="M32 4.5l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="#fff7d6"/>';
    }
    return `<svg class="avatar-dino" width="${taille}" height="${taille}" viewBox="0 0 64 64" aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ''}${fond}${cadre}${extra}
      <text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" font-weight="700" font-size="28" fill="${couleurLettre}">${lettre}</text></svg>`;
  }
  window.DinoAvatar = { svg, ids: Object.keys(LISTE) };
})();
