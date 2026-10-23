/* ==========================================================
   Turbo — l'éditeur de circuits
   Un circuit = une suite de morceaux de route (lignes droites, virages, collines, bosses…),
   avec un aperçu vu du dessus et le profil des montées. On teste contre les pilotes de l'ordinateur
   et on partage avec un code (lien #jeu/turbo/TB1…).
   ========================================================== */

export const TYPES = {
  droite: { nom: 'Ligne droite', n: true },
  courbe: { nom: 'Virage', n: true, c: true, h: true },
  colline: { nom: 'Colline', n: true, h: true },
  esses: { nom: 'Esses (gauche-droite)' },
  bosses: { nom: 'Bosses' },
  ondulations: { nom: 'Ondulations' }
};
const LONGUEUR_FIXE = { esses: 375, bosses: 240, ondulations: 375 };
const CLE_MES = 'turbo-mes-circuits', CLE_BROUILLON = 'turbo-brouillon';

export function circuitVide() {
  return { nom: 'Mon circuit', decor: 'plage', pieces: [
    { type: 'droite', n: 50 }, { type: 'courbe', n: 80, c: 3, h: 0 }, { type: 'colline', n: 60, h: 30 }, { type: 'courbe', n: 70, c: -4, h: -20 },
    { type: 'esses' }, { type: 'droite', n: 60 }, { type: 'courbe', n: 90, c: 2, h: 0 }, { type: 'bosses' }
  ] };
}
// la fonction « plan » utilisée par le jeu (même vocabulaire que games/turbo/pistes.js)
export function planDepuis(pieces) {
  return R => {
    for (const p of pieces) {
      if (p.type === 'droite') R.droite(p.n);
      else if (p.type === 'courbe') R.courbe(p.n, p.c, p.h);
      else if (p.type === 'colline') R.colline(p.n, p.h);
      else if (R[p.type]) R[p.type]();
    }
    R.descenteFin();
  };
}
export const longueur = pieces => pieces.reduce((s, p) => s + (p.n || LONGUEUR_FIXE[p.type] || 0), 0) + 300;

/* ---------- Partager ---------- */
const b64 = t => btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deb64 = t => decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))));
const LETTRES = { droite: 'd', courbe: 'v', colline: 'c', esses: 'e', bosses: 'b', ondulations: 'o' };
export function encoder(c) {
  const p = c.pieces.map(x => [LETTRES[x.type], x.n || 0, x.c || 0, x.h || 0].join(',')).join(';');
  return 'TB1' + b64(JSON.stringify({ n: c.nom.slice(0, 30), d: c.decor, p }));
}
export function decoder(code) {
  try {
    const m = /TB1([A-Za-z0-9_-]+)/.exec(String(code || ''));
    if (!m) return null;
    const d = JSON.parse(deb64(m[1]));
    const inverse = Object.fromEntries(Object.entries(LETTRES).map(([k, v]) => [v, k]));
    const borne = (v, a, b) => Math.max(a, Math.min(b, Math.round(Number(v) || 0)));
    const pieces = String(d.p || '').split(';').slice(0, 60).map(s => {
      const [l, n, c, h] = s.split(',');
      const type = inverse[l];
      if (!type) return null;
      const x = { type };
      if (TYPES[type].n) x.n = borne(n, 10, 200);
      if (TYPES[type].c) x.c = borne(c, -7, 7);
      if (TYPES[type].h) x.h = borne(h, -80, 80);
      return x;
    }).filter(Boolean);
    if (!pieces.length) return null;
    return { nom: String(d.n || 'Circuit partagé').slice(0, 30), decor: ['plage', 'foret', 'neon'].includes(d.d) ? d.d : 'plage', pieces };
  } catch (e) { return null; }
}
export const mesCircuits = stock => { try { return JSON.parse(stock.lire(CLE_MES) || '[]'); } catch (e) { return []; } };

/* ---------- L'éditeur (une page par-dessus le jeu) ---------- */
export function creerEditeur({ stock, tester, quitter, toast }) {
  let c = (() => { try { const b = JSON.parse(stock.lire(CLE_BROUILLON) || 'null'); return b && b.pieces ? b : circuitVide(); } catch (e) { return circuitVide(); } })();
  const sauver = () => stock.ecrire(CLE_BROUILLON, JSON.stringify(c));
  const style = document.createElement('style');
  style.textContent = `
    .ted { position: fixed; inset: 0; z-index: 60; display: grid; grid-template-columns: minmax(300px, 420px) 1fr; grid-template-rows: auto 1fr; background: #070707; color: #eee; font: 14px/1.4 var(--police, system-ui); }
    .ted-haut { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 12px; border-bottom: 1px solid #222; }
    .ted-haut input, .ted-haut select { height: 34px; padding: 0 10px; border: 1px solid #2a2a2a; border-radius: 9px; background: #111; color: #eee; font: inherit; }
    .ted button { height: 34px; padding: 0 12px; border: 1px solid #2a2a2a; border-radius: 9px; background: #151515; color: #eee; font: 600 13px var(--police, system-ui); cursor: pointer; }
    .ted button.primaire { background: #fafafa; color: #000; border-color: #fafafa; }
    .ted-liste { overflow-y: auto; padding: 10px; display: grid; gap: 8px; align-content: start; border-right: 1px solid #1a1a1a; }
    .ted-piece { display: grid; gap: 6px; padding: 10px; border: 1px solid #222; border-radius: 12px; background: #0e0e0e; }
    .ted-piece .tete { display: flex; align-items: center; gap: 6px; } .ted-piece .tete b { flex: 1; }
    .ted-piece button { height: 28px; padding: 0 8px; }
    .ted-piece label { display: grid; grid-template-columns: 74px 1fr 42px; align-items: center; gap: 8px; color: #aaa; font-size: 12.5px; }
    .ted-piece input[type=range] { width: 100%; accent-color: #22c55e; }
    .ted-ajout { display: flex; flex-wrap: wrap; gap: 6px; }
    .ted-apercu { position: relative; min-height: 0; display: grid; grid-template-rows: 1fr 120px auto; gap: 8px; padding: 12px; }
    .ted-apercu canvas { width: 100%; height: 100%; min-height: 0; border: 1px solid #1a1a1a; border-radius: 12px; background: #0b0f0b; }
    .ted-infos { color: #aaa; font-size: 13px; }
    .ted[hidden] { display: none; }
    @media (max-width: 760px) { .ted { grid-template-columns: 1fr; grid-template-rows: auto 220px 1fr; } .ted-apercu { grid-row: 2; grid-template-rows: 1fr 50px auto; padding: 6px 10px; } .ted-liste { grid-row: 3; border-right: 0; } }`;
  document.head.append(style);
  const el = document.createElement('div');
  el.className = 'ted';
  el.innerHTML = `
    <div class="ted-haut">
      <button data-a="fermer">← Menu</button>
      <input data-a="nom" maxlength="30" aria-label="Nom du circuit">
      <select data-a="decor" aria-label="Décor"><option value="plage">Côte d’Azur</option><option value="foret">Forêt noire</option><option value="neon">Néon City</option></select>
      <span style="flex:1"></span>
      <button data-a="mes">Mes circuits</button><button data-a="partager">Partager</button><button data-a="nouveau">Nouveau</button>
      <button data-a="tester" class="primaire">▶ Tester</button>
    </div>
    <div class="ted-liste" id="tedListe"></div>
    <div class="ted-apercu"><canvas id="tedCarte"></canvas><canvas id="tedProfil"></canvas><div class="ted-infos" id="tedInfos"></div></div>`;
  document.body.append(el);
  const $ = s => el.querySelector(s);
  $('[data-a="nom"]').value = c.nom;
  $('[data-a="decor"]').value = c.decor;

  function liste() {
    const zone = $('#tedListe');
    zone.innerHTML = c.pieces.map((p, i) => {
      const T = TYPES[p.type];
      const curseur = (cle, nom, min, max, pas, v, unite = '') => `<label>${nom}<input type="range" data-i="${i}" data-k="${cle}" min="${min}" max="${max}" step="${pas}" value="${v}"><span>${v}${unite}</span></label>`;
      return `<div class="ted-piece">
        <div class="tete"><b>${i + 1}. ${p.type === 'courbe' ? (p.c < 0 ? 'Virage à gauche' : p.c > 0 ? 'Virage à droite' : 'Virage') : T.nom}</b>
          <button data-m="haut" data-i="${i}" title="Monter">↑</button><button data-m="bas" data-i="${i}" title="Descendre">↓</button><button data-m="copie" data-i="${i}" title="Dupliquer">⧉</button><button data-m="suppr" data-i="${i}" title="Supprimer">✕</button></div>
        ${T.n ? curseur('n', 'Longueur', 10, 200, 10, p.n) : ''}
        ${T.c ? curseur('c', 'Virage', -7, 7, 1, p.c) : ''}
        ${T.h ? curseur('h', 'Montée', -80, 80, 10, p.h) : ''}
      </div>`;
    }).join('') + `<div class="ted-ajout">
        <button data-plus="droite">+ Ligne droite</button><button data-plus="gauche">+ Virage gauche</button><button data-plus="droite2">+ Virage droite</button>
        <button data-plus="colline">+ Colline</button><button data-plus="esses">+ Esses</button><button data-plus="bosses">+ Bosses</button><button data-plus="ondulations">+ Ondulations</button>
      </div>`;
    apercu();
  }
  el.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.a === 'nom') { c.nom = t.value || 'Mon circuit'; sauver(); return; }
    if (t.dataset.k) {
      const p = c.pieces[Number(t.dataset.i)];
      p[t.dataset.k] = Number(t.value);
      t.nextElementSibling.textContent = t.value;
      if (t.dataset.k === 'c') t.closest('.ted-piece').querySelector('b').textContent = `${Number(t.dataset.i) + 1}. ${p.c < 0 ? 'Virage à gauche' : p.c > 0 ? 'Virage à droite' : 'Virage'}`;
      sauver(); apercu();
    }
  });
  el.addEventListener('change', e => { if (e.target.dataset.a === 'decor') { c.decor = e.target.value; sauver(); } });
  el.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.plus) {
      const k = b.dataset.plus;
      c.pieces.push(k === 'droite' ? { type: 'droite', n: 50 } : k === 'gauche' ? { type: 'courbe', n: 70, c: -3, h: 0 } : k === 'droite2' ? { type: 'courbe', n: 70, c: 3, h: 0 } : k === 'colline' ? { type: 'colline', n: 60, h: 30 } : { type: k });
      sauver(); liste(); $('#tedListe').scrollTop = 1e6; return;
    }
    if (b.dataset.m) {
      const i = Number(b.dataset.i), P = c.pieces;
      if (b.dataset.m === 'haut' && i > 0) [P[i - 1], P[i]] = [P[i], P[i - 1]];
      if (b.dataset.m === 'bas' && i < P.length - 1) [P[i + 1], P[i]] = [P[i], P[i + 1]];
      if (b.dataset.m === 'copie' && P.length < 60) P.splice(i + 1, 0, { ...P[i] });
      if (b.dataset.m === 'suppr' && P.length > 1) P.splice(i, 1);
      sauver(); liste(); return;
    }
    const a = b.dataset.a;
    if (a === 'fermer') { fermer(); quitter(); }
    if (a === 'nouveau') { c = circuitVide(); $('[data-a="nom"]').value = c.nom; $('[data-a="decor"]').value = c.decor; sauver(); liste(); }
    if (a === 'tester') {
      if (longueur(c.pieces) < 700) { toast('Ton circuit est trop court : ajoute des morceaux de route.'); return; }
      el.hidden = true; tester(c);
    }
    if (a === 'partager') {
      const code = encoder(c);
      const lien = location.origin + '/#jeu/turbo/' + code;
      const mes = mesCircuits(stock).filter(x => x.code !== code); mes.unshift({ code, nom: c.nom, t: Date.now() });
      stock.ecrire(CLE_MES, JSON.stringify(mes.slice(0, 20)));
      try {
        if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: 'Mon circuit Turbo', text: `Fais la course sur mon circuit « ${c.nom} » !`, url: lien });
        else { await navigator.clipboard.writeText(lien); toast('Lien copié ! Envoie-le à tes amis.'); }
      } catch (err) { toast('Impossible de copier le lien.'); }
    }
    if (a === 'mes') {
      const mes = mesCircuits(stock);
      const zone = $('#tedListe');
      if (!mes.length) { toast('Pas encore de circuit enregistré : clique « Partager » pour en garder un.'); return; }
      zone.innerHTML = '<b>Mes circuits</b>' + mes.map((m, i) => `<button data-ouvrir="${i}" style="height:auto;padding:10px;text-align:left">${m.nom.replace(/</g, '&lt;')}</button>`).join('') + '<button data-retour="1">Retour</button>';
    }
  });
  el.addEventListener('click', e => {
    const o = e.target.closest('[data-ouvrir]');
    if (o) { const m = mesCircuits(stock)[Number(o.dataset.ouvrir)]; const d = m && decoder(m.code); if (d) { c = d; $('[data-a="nom"]').value = c.nom; $('[data-a="decor"]').value = c.decor; sauver(); } liste(); }
    if (e.target.closest('[data-retour]')) liste();
  });

  // aperçu : la route vue du dessus (en suivant les virages) et le profil des montées
  function apercu() {
    const carte = $('#tedCarte'), profil = $('#tedProfil');
    const pts = [], hauteurs = [];
    let x = 0, y = 0, a = -Math.PI / 2, h = 0;
    const seg = (n, courbe, dh) => { for (let k = 0; k < n; k++) { a += courbe * 0.0065; x += Math.cos(a); y += Math.sin(a); h += dh / n; pts.push([x, y]); hauteurs.push(h); } };
    const route = (e, t, s, courbe, dh) => { const n = Math.ceil(e) + Math.ceil(t) + Math.ceil(s); const tot = n; let i = 0; for (const [m, f] of [[Math.ceil(e), k => courbe * (k / e) ** 2], [Math.ceil(t), () => courbe], [Math.ceil(s), k => courbe * (1 - k / s)]]) for (let k = 0; k < m; k++) { a += f(k) * 0.0065; x += Math.cos(a); y += Math.sin(a); h += dh / tot; pts.push([x, y]); hauteurs.push(h); i++; } };
    const R = {
      droite: n => route(n / 4, n / 2, n / 4, 0, 0), courbe: (n, cc, hh) => route(n / 4, n / 2, n / 4, cc, hh || 0), colline: (n, hh) => route(n / 4, n / 2, n / 4, 0, hh),
      esses: () => [[-2], [4], [2], [-4], [-2]].forEach(([cc]) => route(25, 25, 25, cc, 0)), bosses: () => [5, -2, -5, 8, 5, -7, 5, -2].forEach(hh => route(10, 10, 10, 0, hh)),
      ondulations: () => [[0, 20], [0, -20], [2, 20], [0, 0], [-2, -20]].forEach(([cc, hh]) => route(25, 25, 25, cc, hh)), descenteFin: () => route(100, 100, 100, -1, -h)
    };
    planDepuis(c.pieces)(R);
    void seg;
    const dessinerLigne = (cv, liste, couleur, epaisseur, fermer) => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const xs = liste.map(p => p[0]), ys = liste.map(p => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const e = Math.min((r.width - 30) / Math.max(1, maxX - minX), (r.height - 30) / Math.max(1, maxY - minY));
      const tx = v => 15 + (v - minX) * e + ((r.width - 30) - (maxX - minX) * e) / 2, ty = v => 15 + (v - minY) * e + ((r.height - 30) - (maxY - minY) * e) / 2;
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (fermer) { g.strokeStyle = '#3f3f46'; g.lineWidth = epaisseur + 6; g.beginPath(); liste.forEach((p, i) => (i ? g.lineTo(tx(p[0]), ty(p[1])) : g.moveTo(tx(p[0]), ty(p[1])))); g.stroke(); }
      g.strokeStyle = couleur; g.lineWidth = epaisseur; g.beginPath(); liste.forEach((p, i) => (i ? g.lineTo(tx(p[0]), ty(p[1])) : g.moveTo(tx(p[0]), ty(p[1])))); g.stroke();
      if (fermer) { g.fillStyle = '#22c55e'; g.beginPath(); g.arc(tx(liste[0][0]), ty(liste[0][1]), 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ef4444'; g.beginPath(); g.arc(tx(liste[liste.length - 1][0]), ty(liste[liste.length - 1][1]), 4, 0, Math.PI * 2); g.fill(); }
    };
    dessinerLigne(carte, pts, '#e5e5e5', 3, true);
    dessinerLigne(profil, hauteurs.map((v, i) => [i, -v]), '#a3e635', 2, false);
    const n = pts.length;
    $('#tedInfos').textContent = `${c.pieces.length} morceaux · ${n} segments · un tour en ≈ ${Math.round(n * 200 / 12000 * 1.25)} s · point vert = départ (la fin de la route rejoint le départ, même si l’aperçu ne se referme pas)`;
  }
  addEventListener('resize', () => { if (!el.hidden) apercu(); });

  function fermer() { el.remove(); style.remove(); }
  liste();
  return { get circuit() { return c; }, montrer() { el.hidden = false; apercu(); }, charger(d) { c = d; $('[data-a="nom"]').value = c.nom; $('[data-a="decor"]').value = c.decor; sauver(); liste(); }, fermer };
}
