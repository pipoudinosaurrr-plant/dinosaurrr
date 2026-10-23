/* ==========================================================
   Mini-golf — l'éditeur de trous
   On peint le terrain case par case (gazon, sable, glace, eau, lave, pentes, tapis),
   on pose le départ, le trou et les obstacles, puis on teste et on partage avec un code.
   Format d'un trou : voir « Les trous dessinés dans l'éditeur » dans golf/moteur.js.
   ========================================================== */
import { CASE, COLS, LIGS } from './moteur.js';

const CLE_MES_TROUS = 'golf-mes-trous', CLE_BROUILLON = 'golf-brouillon';
const DIRS = ['a', 'd', 'b', 'c'];                      // haut, droite, bas, gauche
const FLECHES = { a: '↑', b: '↓', c: '←', d: '→' };

export function trouVide() {
  const g = Array(COLS * LIGS).fill('.');
  for (let l = 2; l < 28; l++) for (let c = 5; c < 15; c++) g[l * COLS + c] = 'g';
  return { nom: 'Mon trou', par: 2, theme: 'jardin', grille: g.join(''), depart: [200, 520], trou: [200, 80], ronds: [], bumpers: [], moulins: [], zones: [] };
}

/* ---------- Partager : un code qui contient tout le trou ---------- */
const rle = g => g.replace(/(.)\1*/g, m => m[0] + (m.length > 1 ? m.length : ''));
const derle = s => s.replace(/([^0-9])(\d*)/g, (_, c, n) => c.repeat(n ? Number(n) : 1));
const b64 = t => btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deb64 = t => decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))));
const rond = v => Math.round(Number(v) || 0);
export function encoder(def) {
  const d = { n: def.nom.slice(0, 30), p: def.par, th: def.theme, g: rle(def.grille), d: def.depart.map(rond), t: def.trou.map(rond),
    r: def.ronds.map(x => x.map(rond)), b: def.bumpers.map(x => x.map(rond)), m: def.moulins.map(m => [rond(m.x), rond(m.y)]), z: def.zones.map(z => [...z.bosse.slice(0, 3).map(rond), rond(z.bosse[3])]) };
  return 'GF1' + b64(JSON.stringify(d));
}
export function decoder(code) {
  try {
    const m = /GF1([A-Za-z0-9_-]+)/.exec(String(code || ''));
    if (!m) return null;
    const d = JSON.parse(deb64(m[1]));
    const grille = derle(String(d.g || ''));
    if (grille.length !== COLS * LIGS || /[^.gSIELabcdABCD]/.test(grille)) return null;
    const pt = a => [Math.max(0, Math.min(400, rond(a && a[0]))), Math.max(0, Math.min(600, rond(a && a[1])))];
    const liste = (l, n) => (Array.isArray(l) ? l.slice(0, n) : []);
    return {
      nom: String(d.n || 'Trou partagé').slice(0, 30), par: Math.max(2, Math.min(6, rond(d.p) || 3)), theme: ['jardin', 'glacier', 'volcan', 'espace'].includes(d.th) ? d.th : 'jardin',
      grille, depart: pt(d.d), trou: pt(d.t),
      ronds: liste(d.r, 30).map(x => [...pt(x), Math.max(6, Math.min(30, rond(x[2]) || 9))]),
      bumpers: liste(d.b, 20).map(x => [...pt(x), Math.max(8, Math.min(30, rond(x[2]) || 14))]),
      moulins: liste(d.m, 6).map(x => { const [a, b] = pt(x); return { x: a, y: b, l: 40, n: 4, w: 0.22 }; }),
      zones: liste(d.z, 10).map(x => { const [a, b] = pt(x); return { bosse: [a, b, Math.max(30, Math.min(150, rond(x[2]) || 60)), Math.max(-400, Math.min(400, rond(x[3]) || 280))] }; })
    };
  } catch (e) { return null; }
}
export const mesTrous = stock => { try { return JSON.parse(stock.lire(CLE_MES_TROUS, '[]') || '[]'); } catch (e) { return []; } };

/* ---------- L'éditeur ---------- */
const OUTILS = [
  ['g', '🟩', 'Gazon'], ['.', '⬛', 'Effacer'], ['S', '🟨', 'Sable'], ['I', '🧊', 'Glace'], ['E', '🟦', 'Eau'], ['L', '🟥', 'Lave'],
  ['pente', '⛰️', 'Pente'], ['tapis', '⏩', 'Tapis'],
  ['depart', '⚪', 'Départ'], ['trou', '⛳', 'Trou'], ['poteau', '🪵', 'Poteau'], ['bumper', '🍄', 'Champignon'], ['moulin', '🌀', 'Moulin'], ['bosse', '⛰', 'Bosse'], ['cuvette', '🥣', 'Cuvette'], ['gomme', '🧽', 'Gomme']
];

export function creerEditeur({ stock, point, rafraichir, tester, quitter, toast, choisir }) {
  let def = (() => { try { const b = JSON.parse(stock.lire(CLE_BROUILLON, 'null') || 'null'); return b && b.grille ? b : trouVide(); } catch (e) { return trouVide(); } })();
  let outil = 'g', dir = 0, pinceau = 1, survol = null, peint = false, histo = [];
  const sauver = () => { try { stock.ecrire(CLE_BROUILLON, JSON.stringify(def)); } catch (e) { /* rien */ } };
  const memo = () => { histo.push(JSON.stringify(def)); if (histo.length > 40) histo.shift(); };

  const style = document.createElement('style');
  style.textContent = `
    .ged-haut, .ged-bas { position: fixed; left: 0; right: 0; z-index: 30; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 10px; background: rgba(8,8,8,.92); border-color: #222; border-style: solid; border-width: 0; font: 600 13px var(--police, system-ui); color: #eee; }
    .ged-haut { top: 0; border-bottom-width: 1px; } .ged-bas { bottom: 0; border-top-width: 1px; padding-bottom: max(8px, env(safe-area-inset-bottom)); justify-content: center; }
    .ged-haut input, .ged-haut select { height: 32px; padding: 0 8px; border: 1px solid #2a2a2a; border-radius: 8px; background: #111; color: #eee; font: inherit; }
    .ged-haut input { width: 130px; }
    .ged-haut button, .ged-bas button { height: 34px; padding: 0 10px; border: 1px solid #2a2a2a; border-radius: 9px; background: #151515; color: #eee; font: inherit; cursor: pointer; }
    .ged-haut button.primaire { background: #fafafa; color: #000; border-color: #fafafa; }
    .ged-bas button { display: grid; place-items: center; min-width: 46px; height: 46px; padding: 2px 4px; font-size: 18px; line-height: 1; }
    .ged-bas button small { font-size: 9.5px; color: #aaa; margin-top: 2px; }
    .ged-bas button.actif { border-color: #facc15; background: #2a2412; }
    .ged-espace { flex: 1; }
    .ged-haut[hidden], .ged-bas[hidden] { display: none; }
    /* téléphone : une seule rangée d'outils qu'on fait défiler */
    .ged-bas { flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; }
    .ged-bas button { flex: none; }
    /* écran large : les outils en colonne à gauche, le terrain reste entièrement visible */
    @media (min-width: 760px) and (orientation: landscape) {
      .ged-bas { top: 52px; bottom: 0; right: auto; width: 76px; flex-direction: column; overflow-y: auto; overflow-x: hidden; border-top-width: 0; border-right-width: 1px; padding: 8px; }
      .ged-bas button { width: 58px; }
    }`;
  document.head.append(style);
  const haut = document.createElement('div'); haut.className = 'ged-haut';
  const bas = document.createElement('div'); bas.className = 'ged-bas';
  document.body.append(haut, bas);

  function dessinerBarres() {
    haut.innerHTML = `
      <button data-a="menu">← Menu</button>
      <input data-a="nom" maxlength="30" value="${def.nom.replace(/"/g, '&quot;')}" aria-label="Nom du trou">
      <select data-a="par" aria-label="Par">${[2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === def.par ? 'selected' : ''}>Par ${n}</option>`).join('')}</select>
      <select data-a="theme" aria-label="Décor">${[['jardin', 'Jardin'], ['glacier', 'Glacier'], ['volcan', 'Volcan'], ['espace', 'Espace']].map(([v, t]) => `<option value="${v}" ${v === def.theme ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <button data-a="annuler" title="Annuler (Ctrl+Z)">↶</button>
      <button data-a="pinceau" title="Taille du pinceau">✏️ ${pinceau}×${pinceau}</button>
      <span class="ged-espace"></span>
      <button data-a="mes">Mes trous</button>
      <button data-a="partager">Partager</button>
      <button data-a="nouveau">Nouveau</button>
      <button data-a="tester" class="primaire">▶ Tester</button>`;
    bas.innerHTML = OUTILS.map(([id, ic, nom]) => `<button data-o="${id}" class="${id === outil ? 'actif' : ''}" title="${nom}">${id === 'pente' || id === 'tapis' ? (id === 'pente' ? '⛰️' : '⏩') + FLECHES[DIRS[dir]] : ic}<small>${nom}</small></button>`).join('');
  }
  dessinerBarres();

  haut.addEventListener('input', e => {
    const a = e.target.dataset.a;
    if (a === 'nom') { def.nom = e.target.value || 'Mon trou'; sauver(); }
  });
  haut.addEventListener('change', e => {
    const a = e.target.dataset.a;
    if (a === 'par') { def.par = Number(e.target.value); sauver(); }
    if (a === 'theme') { def.theme = e.target.value; sauver(); rafraichir(def); }
  });
  haut.addEventListener('click', e => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'menu') { fermer(); quitter(); }
    if (a === 'annuler') annuler();
    if (a === 'pinceau') { pinceau = pinceau >= 3 ? 1 : pinceau + 1; dessinerBarres(); }
    if (a === 'nouveau') { memo(); def = trouVide(); sauver(); dessinerBarres(); rafraichir(def); }
    if (a === 'tester') { const pb = verifier(); if (pb) { toast(pb); return; } sauver(); tester(def); }
    if (a === 'partager') partager();
    if (a === 'mes') listeMesTrous();
  });
  bas.addEventListener('click', e => {
    const b = e.target.closest('button[data-o]');
    if (!b) return;
    const o = b.dataset.o;
    if ((o === 'pente' || o === 'tapis') && outil === o) dir = (dir + 1) % 4;   // 2e clic : on tourne la flèche
    outil = o;
    dessinerBarres();
  });

  function verifier() {
    const dedans = ([x, y]) => def.grille[Math.floor(y / CASE) * COLS + Math.floor(x / CASE)] !== '.';
    if (!dedans(def.depart)) return 'Le départ doit être sur le terrain.';
    if (!dedans(def.trou)) return 'Le trou doit être sur le terrain.';
    if (Math.hypot(def.depart[0] - def.trou[0], def.depart[1] - def.trou[1]) < 60) return 'Le départ est trop près du trou.';
    return null;
  }
  function annuler() { const h = histo.pop(); if (h) { def = JSON.parse(h); sauver(); dessinerBarres(); rafraichir(def); } }
  async function partager() {
    const pb = verifier(); if (pb) { toast(pb); return; }
    const code = encoder(def);
    const lien = location.origin + '/#jeu/golf/' + code;
    const liste = mesTrous(stock).filter(t => t.code !== code);
    liste.unshift({ code, nom: def.nom, t: Date.now() });
    stock.ecrire(CLE_MES_TROUS, JSON.stringify(liste.slice(0, 20)));
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: 'Mon trou de mini-golf', text: `Essaie mon trou de mini-golf « ${def.nom} » !`, url: lien });
      else { await navigator.clipboard.writeText(lien); toast('Lien copié ! Envoie-le à tes amis.'); }
    } catch (e) { toast('Code du trou : ' + code.slice(0, 24) + '…'); }
  }
  function listeMesTrous() {
    const liste = mesTrous(stock);
    if (!liste.length) { toast('Pas encore de trou enregistré : clique « Partager » pour en garder un.'); return; }
    choisir('Mes trous', liste.map(t => ({ texte: t.nom, action: () => { const d = decoder(t.code); if (d) { memo(); def = d; sauver(); dessinerBarres(); rafraichir(def); } } })));
  }

  /* ---------- Peindre ---------- */
  const caseDe = (x, y) => [Math.floor(x / CASE), Math.floor(y / CASE)];
  function peindre(x, y) {
    const [c0, l0] = caseDe(x, y);
    const code = outil === 'pente' ? DIRS[dir] : outil === 'tapis' ? DIRS[dir].toUpperCase() : outil;
    const g = def.grille.split('');
    const r = pinceau - 1;
    for (let l = l0 - Math.floor(r / 2); l <= l0 + Math.ceil(r / 2); l++) for (let c = c0 - Math.floor(r / 2); c <= c0 + Math.ceil(r / 2); c++) {
      if (c >= 0 && l >= 0 && c < COLS && l < LIGS) g[l * COLS + c] = code;
    }
    const n = g.join('');
    if (n !== def.grille) { def.grille = n; rafraichir(def); }
  }
  function poser(x, y) {
    const pt = [Math.round(x / 10) * 10, Math.round(y / 10) * 10];
    if (outil === 'depart') def.depart = pt;
    else if (outil === 'trou') def.trou = pt;
    else if (outil === 'poteau' && def.ronds.length < 30) def.ronds.push([...pt, 9]);
    else if (outil === 'bumper' && def.bumpers.length < 20) def.bumpers.push([...pt, 14]);
    else if (outil === 'moulin' && def.moulins.length < 6) def.moulins.push({ x: pt[0], y: pt[1], l: 40, n: 4, w: 0.22 });
    else if ((outil === 'bosse' || outil === 'cuvette') && def.zones.length < 10) def.zones.push({ bosse: [pt[0], pt[1], 60, outil === 'bosse' ? 280 : -240] });
    else if (outil === 'gomme') {
      const d = (a, b) => Math.hypot(a - x, b - y);
      const avant = JSON.stringify(def);
      def.ronds = def.ronds.filter(([a, b]) => d(a, b) > 18);
      def.bumpers = def.bumpers.filter(([a, b]) => d(a, b) > 22);
      def.moulins = def.moulins.filter(m => d(m.x, m.y) > 30);
      def.zones = def.zones.filter(z => d(z.bosse[0], z.bosse[1]) > 30);
      if (avant === JSON.stringify(def)) return;
    }
    rafraichir(def); sauver();
  }
  const estCase = () => ['g', '.', 'S', 'I', 'E', 'L', 'pente', 'tapis'].includes(outil);
  function bas_(e) {
    const p = point(e);
    if (!p || p.x < 0 || p.y < 0 || p.x >= 400 || p.y >= 600) return;
    memo();
    if (estCase()) { peint = true; peindre(p.x, p.y); } else poser(p.x, p.y);
  }
  function bouge(e) {
    const p = point(e);
    survol = p && p.x >= 0 && p.y >= 0 && p.x < 400 && p.y < 600 ? p : null;
    if (peint && survol) peindre(survol.x, survol.y);
  }
  function haut_() { if (peint) { peint = false; sauver(); } }
  const clavier = e => { if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); annuler(); } };
  addEventListener('keydown', clavier);

  function fermer() { haut.remove(); bas.remove(); style.remove(); removeEventListener('keydown', clavier); }

  // la grille et la case visée, dessinées par-dessus le terrain
  function surcouche(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CASE + 0.5, 0); ctx.lineTo(c * CASE + 0.5, LIGS * CASE); ctx.stroke(); }
    for (let l = 0; l <= LIGS; l++) { ctx.beginPath(); ctx.moveTo(0, l * CASE + 0.5); ctx.lineTo(COLS * CASE, l * CASE + 0.5); ctx.stroke(); }
    if (survol) {
      if (estCase()) { const [c, l] = caseDe(survol.x, survol.y); const r = pinceau - 1; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.strokeRect((c - Math.floor(r / 2)) * CASE, (l - Math.floor(r / 2)) * CASE, pinceau * CASE, pinceau * CASE); }
      else { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.round(survol.x / 10) * 10, Math.round(survol.y / 10) * 10, outil === 'gomme' ? 18 : 8, 0, Math.PI * 2); ctx.stroke(); }
    }
    // les flèches des pentes et des tapis
    ctx.font = '700 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let k = 0; k < COLS * LIGS; k++) {
      const ch = def.grille[k];
      const f = FLECHES[ch.toLowerCase()];
      if (!f || !'abcdABCD'.includes(ch)) continue;
      ctx.fillStyle = ch === ch.toUpperCase() ? 'rgba(250,204,21,.9)' : 'rgba(255,255,255,.45)';
      ctx.fillText(f, (k % COLS) * CASE + CASE / 2, Math.floor(k / COLS) * CASE + CASE / 2 + 1);
    }
  }

  rafraichir(def);
  return { get def() { return def; }, charger(d) { memo(); def = d; sauver(); dessinerBarres(); rafraichir(def); }, bas: bas_, bouge, haut: haut_, surcouche, fermer, afficher(oui) { haut.hidden = bas.hidden = !oui; } };
}
