/* ==========================================================
   Arcade : la boîte à outils commune des jeux d'action du site
   (Turbo Dino, Dino Blaster, Dino Aventure, Serpent, Blocs, Casse-briques)
   - Arcade.toile(canvas, { largeur, hauteur })  → écran qui s'adapte à la fenêtre
   - Arcade.touches.gauche / droite / haut / bas / action / action2 / pause
     (flèches, WASD = ZQSD sur clavier AZERTY, Espace, Maj ou X…)
   - Arcade.vient('action')  → vrai une seule fois par appui
   - Arcade.manette([...])  → boutons à l'écran sur téléphone
   - Arcade.panneau({...})  → menus, pause, fin de partie
   - Arcade.record(cle, score)  → meilleurs scores (dans ce navigateur)
   - Arcade.son('tir')  → petits bruitages, sans fichier
   - Arcade.boucle(fn)  → fn(dt) environ 60 fois par seconde
   ========================================================== */
(function () {
  'use strict';

  const TACTILE = matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------- Stockage ---------- */
  const stock = {
    lire(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    ecrire(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } }
  };

  /* ---------- Clavier ---------- */
  const CODES = {
    ArrowLeft: 'gauche', KeyA: 'gauche', ArrowRight: 'droite', KeyD: 'droite',
    ArrowUp: 'haut', KeyW: 'haut', ArrowDown: 'bas', KeyS: 'bas',
    Space: 'action', Enter: 'entree', NumpadEnter: 'entree',
    ShiftLeft: 'action2', ShiftRight: 'action2', KeyX: 'action2', KeyK: 'action2',
    KeyC: 'action3', KeyJ: 'action', KeyE: 'action3',
    KeyP: 'pause', Escape: 'pause', KeyM: 'muet', KeyR: 'recommencer'
  };
  const touches = { gauche: false, droite: false, haut: false, bas: false, action: false, action2: false, action3: false, entree: false, pause: false };
  const nouveaux = new Set();
  const tactiles = {};   // boutons à l'écran (comptés à part pour ne pas se mélanger au clavier)
  const clavier = {};

  function maj(nom) { touches[nom] = !!(clavier[nom] || tactiles[nom]); }

  addEventListener('keydown', e => {
    const nom = CODES[e.code];
    if (!nom) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    e.preventDefault();
    if (!e.repeat) nouveaux.add(nom);
    clavier[nom] = true;
    maj(nom);
    if (nom === 'muet' && !e.repeat) Arcade.basculerSon();
  }, { passive: false });
  addEventListener('keyup', e => {
    const nom = CODES[e.code];
    if (!nom) return;
    clavier[nom] = false;
    maj(nom);
  });
  addEventListener('blur', () => {
    for (const k of Object.keys(clavier)) { clavier[k] = false; maj(k); }
    for (const k of Object.keys(tactiles)) { tactiles[k] = 0; maj(k); }
    if (Arcade.surPerteFocus) Arcade.surPerteFocus();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Arcade.surPerteFocus) Arcade.surPerteFocus();
  });

  /* ---------- Sons (WebAudio, aucun fichier) ---------- */
  let audio = null;
  let sonActif = stock.lire('site-son', true) !== false;
  function contexte() {
    if (!sonActif) return null;
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  // débloque le son au premier geste (obligatoire sur téléphone)
  addEventListener('pointerdown', () => contexte(), { once: true });
  addEventListener('keydown', () => contexte(), { once: true });

  function bip(f1, f2, duree, type = 'square', vol = 0.12, retard = 0) {
    const a = contexte();
    if (!a) return;
    const t = a.currentTime + retard;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + duree);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + duree);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + duree + 0.02);
  }
  function bruit(duree, vol = 0.25, filtre = 1200, retard = 0) {
    const a = contexte();
    if (!a) return;
    const t = a.currentTime + retard;
    const n = Math.floor(a.sampleRate * duree);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filtre;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duree);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t);
  }
  const SONS = {
    tir: () => bip(880, 440, 0.07, 'square', 0.05),
    laser: () => bip(1400, 300, 0.12, 'sawtooth', 0.06),
    explosion: () => { bruit(0.45, 0.35, 900); bip(140, 40, 0.35, 'triangle', 0.18); },
    petite: () => bruit(0.15, 0.18, 2200),
    touche: () => bip(220, 110, 0.12, 'square', 0.1),
    piece: () => { bip(988, 988, 0.06, 'square', 0.08); bip(1319, 1319, 0.18, 'square', 0.08, 0.06); },
    bonus: () => { bip(523, 523, 0.08, 'square', 0.08); bip(659, 659, 0.08, 'square', 0.08, 0.08); bip(784, 784, 0.08, 'square', 0.08, 0.16); bip(1047, 1047, 0.2, 'square', 0.08, 0.24); },
    saut: () => bip(300, 760, 0.14, 'square', 0.07),
    rebond: () => bip(520, 520, 0.05, 'square', 0.07),
    brique: () => bip(760, 760, 0.05, 'square', 0.06),
    ligne: () => { bip(660, 660, 0.07, 'square', 0.08); bip(880, 880, 0.12, 'square', 0.08, 0.07); },
    pose: () => bip(180, 120, 0.06, 'triangle', 0.12),
    tourne: () => bip(500, 500, 0.03, 'square', 0.04),
    mange: () => bip(600, 900, 0.07, 'square', 0.07),
    perdu: () => { bip(392, 392, 0.16, 'square', 0.09); bip(330, 330, 0.16, 'square', 0.09, 0.16); bip(262, 262, 0.4, 'square', 0.09, 0.32); },
    gagne: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => bip(f, f, 0.12, 'square', 0.08, i * 0.1)); },
    decompte: () => bip(440, 440, 0.15, 'square', 0.09),
    depart: () => bip(880, 880, 0.4, 'square', 0.1),
    clic: () => bip(1200, 1200, 0.03, 'square', 0.04),
    boss: () => { bip(110, 55, 0.8, 'sawtooth', 0.12); bruit(0.8, 0.15, 400); }
  };

  /* ---------- Toile qui s'adapte ---------- */
  function toile(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const t = { canvas, ctx, W: 0, H: 0, echelle: 1, x0: 0, y0: 0, fixe: !!opts.largeur, surTaille: null };
    function redim() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const lw = innerWidth, lh = innerHeight;
      canvas.width = Math.round(lw * dpr);
      canvas.height = Math.round(lh * dpr);
      canvas.style.width = lw + 'px';
      canvas.style.height = lh + 'px';
      if (t.fixe) {
        // taille logique fixe, agrandie pour remplir la fenêtre (bandes noires si besoin)
        const e = Math.min(lw / opts.largeur, lh / opts.hauteur);
        t.echelle = opts.entier && e >= 1 ? Math.max(1, Math.floor(e * 2) / 2) : e;
        t.W = opts.largeur; t.H = opts.hauteur;
        t.x0 = Math.round((lw - opts.largeur * t.echelle) / 2);
        t.y0 = Math.round((lh - opts.hauteur * t.echelle) / 2);
        // sur téléphone, on peut coller le jeu en haut pour laisser la place aux boutons en bas
        if (opts.hautSurTelephone && TACTILE) {
          const place = opts.hautSurTelephone;
          const e2 = Math.min(lw / opts.largeur, (lh - place) / opts.hauteur);
          if (e2 > 0.5) {
            t.echelle = e2;
            t.x0 = Math.round((lw - opts.largeur * e2) / 2);
            t.y0 = Math.max(4, Math.round((lh - place - opts.hauteur * e2) / 2));
          }
        }
        ctx.setTransform(dpr * t.echelle, 0, 0, dpr * t.echelle, dpr * t.x0, dpr * t.y0);
      } else {
        t.W = lw; t.H = lh; t.echelle = 1; t.x0 = 0; t.y0 = 0;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.imageSmoothingEnabled = !opts.pixel;
      if (t.surTaille) t.surTaille();
    }
    // position d'un pointeur dans les coordonnées du jeu
    t.point = e => ({ x: (e.clientX - t.x0) / t.echelle, y: (e.clientY - t.y0) / t.echelle });
    // remet la transformation de base (utile après des save/restore compliqués)
    t.reset = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr * t.echelle, 0, 0, dpr * t.echelle, dpr * t.x0, dpr * t.y0);
      ctx.imageSmoothingEnabled = !opts.pixel;
    };
    // fond hors de la zone de jeu (bandes)
    t.effacer = (couleur = '#000') => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = couleur;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      t.reset();
      return dpr;
    };
    addEventListener('resize', redim);
    redim();
    return t;
  }

  /* ---------- Boutons à l'écran (téléphone) ---------- */
  let styleInjecte = false;
  function injecterStyle() {
    if (styleInjecte) return;
    styleInjecte = true;
    const s = document.createElement('style');
    s.textContent = `
      .arcade-manette { position: fixed; inset: auto 0 0 0; z-index: 30; pointer-events: none; height: 0; }
      .arcade-bouton { position: fixed; display: grid; place-items: center; width: 64px; height: 64px; border: 1px solid rgba(255,255,255,.22); border-radius: 50%;
        background: rgba(255,255,255,.08); color: rgba(255,255,255,.85); font: 700 20px var(--police, system-ui); pointer-events: auto; touch-action: none;
        -webkit-user-select: none; user-select: none; -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
      .arcade-bouton.appuye { background: rgba(255,255,255,.28); transform: scale(.94); }
      .arcade-bouton.large { width: 84px; height: 84px; font-size: 15px; }
      .arcade-bouton.petit { width: 50px; height: 50px; font-size: 13px; }
      .arcade-bouton small { font-size: 10px; letter-spacing: .06em; }
      .arcade-voile { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,.55); }
      .arcade-voile[hidden] { display: none; }
      .arcade-carte { width: min(400px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; padding: 22px; border: 1px solid #2a2a2a; border-radius: 18px;
        background: rgba(10,10,10,.94); box-shadow: 0 30px 80px -20px #000; text-align: center; animation: arcade-entree .25s cubic-bezier(.2,.8,.2,1); }
      @keyframes arcade-entree { from { opacity: 0; transform: translateY(10px) scale(.98); } }
      .arcade-carte .pastille { margin-bottom: 10px; }
      .arcade-carte h1 { margin: 6px 0 6px; font-size: 30px; font-weight: 800; letter-spacing: -.05em; }
      .arcade-carte p { margin: 0 0 14px; color: #a1a1a1; font-size: 14px; line-height: 1.5; }
      .arcade-lignes { display: grid; gap: 6px; margin: 0 0 16px; padding: 0; list-style: none; text-align: left; }
      .arcade-lignes li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 12px; border: 1px solid #1f1f1f; border-radius: 10px; background: rgba(255,255,255,.02); font-size: 13.5px; }
      .arcade-lignes b { font-family: var(--mono, monospace); }
      .arcade-boutons { display: grid; gap: 8px; }
      .arcade-boutons .btn { width: 100%; height: 44px; border-radius: 11px; font-size: 14.5px; }
      .arcade-choix { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin: 0 0 14px; }
      .arcade-choix button { padding: 10px 8px; border: 1px solid #2a2a2a; border-radius: 12px; background: rgba(255,255,255,.03); color: #ededed; font: 600 13px var(--police, system-ui); cursor: pointer; }
      .arcade-choix button small { display: block; margin-top: 3px; color: #8a8a8a; font-weight: 500; font-size: 11px; }
      .arcade-choix button.actif { border-color: #22c55e; background: rgba(34,197,94,.12); }
      .arcade-choix button:disabled { opacity: .35; cursor: not-allowed; }
      .arcade-aide { margin-top: 12px; color: #6b6b6b; font-size: 12px; line-height: 1.5; }
      .arcade-son { position: fixed; top: 10px; right: 10px; z-index: 35; display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid #2a2a2a; border-radius: 10px;
        background: rgba(0,0,0,.5); color: #d4d4d4; cursor: pointer; font-size: 15px; }
      .arcade-pause { position: fixed; top: 10px; right: 50px; z-index: 35; display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid #2a2a2a; border-radius: 10px;
        background: rgba(0,0,0,.5); color: #d4d4d4; cursor: pointer; font: 700 13px var(--police, system-ui); }
    `;
    document.head.append(s);
  }

  // liste = [{ nom: 'gauche', texte: '◀', style: 'left:16px;bottom:24px', classe: 'large' }]
  function manette(liste) {
    injecterStyle();
    const zone = document.createElement('div');
    zone.className = 'arcade-manette';
    zone.hidden = !TACTILE;
    for (const b of liste) {
      const el = document.createElement('div');
      el.className = 'arcade-bouton ' + (b.classe || '');
      el.innerHTML = b.texte;
      el.style.cssText = b.style || '';
      el.setAttribute('aria-hidden', 'true');
      const noms = Array.isArray(b.nom) ? b.nom : [b.nom];
      const appui = on => {
        el.classList.toggle('appuye', on);
        for (const n of noms) {
          tactiles[n] = on ? (tactiles[n] || 0) + 1 : Math.max(0, (tactiles[n] || 0) - 1);
          if (on) nouveaux.add(n);
          maj(n);
        }
      };
      let actif = false;
      el.addEventListener('pointerdown', e => { e.preventDefault(); if (actif) return; actif = true; try { el.setPointerCapture(e.pointerId); } catch (err) { /* rien */ } appui(true); });
      const fin = () => { if (!actif) return; actif = false; appui(false); };
      el.addEventListener('pointerup', fin);
      el.addEventListener('pointercancel', fin);
      el.addEventListener('lostpointercapture', fin);
      zone.append(el);
    }
    document.body.append(zone);
    return {
      element: zone,
      montrer(oui) { zone.hidden = !TACTILE || !oui; }
    };
  }

  /* ---------- Panneaux (menus, pause, fin) ---------- */
  let voile = null;
  let actionPrincipale = null;
  function panneau(o) {
    injecterStyle();
    if (!voile) {
      voile = document.createElement('div');
      voile.className = 'arcade-voile';
      document.body.append(voile);
      voile.addEventListener('click', e => {
        const b = e.target.closest('[data-i]');
        if (!b || b.disabled) return;
        const x = (voile._courant.boutons || [])[Number(b.dataset.i)];
        if (x && x.action) { Arcade.son('clic'); x.action(); }
      });
    }
    const courant = o;
    voile._courant = courant;
    const choix = o.choix ? `<div class="arcade-choix">${o.choix.map((c, i) => `<button data-c="${i}" class="${c.actif ? 'actif' : ''}" ${c.bloque ? 'disabled' : ''}>${c.texte}${c.sous ? `<small>${c.sous}</small>` : ''}</button>`).join('')}</div>` : '';
    voile.innerHTML = `
      <div class="arcade-carte" role="dialog">
        ${o.pastille ? `<span class="pastille">${o.pastille}</span>` : ''}
        ${o.titre ? `<h1>${o.titre}</h1>` : ''}
        ${o.texte ? `<p>${o.texte}</p>` : ''}
        ${choix}
        ${o.lignes && o.lignes.length ? `<ul class="arcade-lignes">${o.lignes.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join('')}</ul>` : ''}
        <div class="arcade-boutons">${(o.boutons || []).map((b, i) => `<button class="btn ${b.primaire ? 'primaire' : ''}" data-i="${i}">${b.texte}</button>`).join('')}</div>
        ${o.aide ? `<div class="arcade-aide">${o.aide}</div>` : ''}
      </div>`;
    voile.hidden = false;
    if (o.choix) {
      voile.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
        const c = o.choix[Number(b.dataset.c)];
        if (!c || c.bloque) return;
        voile.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('actif', x === b));
        Arcade.son('clic');
        if (c.action) c.action();
      }));
    }
    const p = (o.boutons || []).find(b => b.primaire) || (o.boutons || [])[0];
    actionPrincipale = p ? p.action : null;
    nouveaux.clear();
    return voile;
  }
  function fermerPanneau() {
    if (voile) voile.hidden = true;
    actionPrincipale = null;
    nouveaux.clear();
  }
  // Entrée / Espace = bouton principal du panneau
  addEventListener('keydown', e => {
    if (!voile || voile.hidden || !actionPrincipale) return;
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
      e.preventDefault();
      const f = actionPrincipale;
      setTimeout(() => { if (f) { Arcade.son('clic'); f(); } }, 0);
    }
  });

  /* ---------- Records ---------- */
  // plusGrand = true : un score plus haut est meilleur ; false : un temps plus court est meilleur
  function record(cle, valeur, plusGrand = true) {
    const ancien = stock.lire('arcade-' + cle, null);
    if (valeur === undefined) return ancien;
    const mieux = ancien === null || (plusGrand ? valeur > ancien : valeur < ancien);
    if (mieux) stock.ecrire('arcade-' + cle, valeur);
    return { record: mieux ? valeur : ancien, nouveau: mieux, ancien };
  }

  /* ---------- Boucle ---------- */
  function boucle(fn) {
    let avant = performance.now();
    let id = 0;
    function tic(t) {
      const dt = Math.min(0.05, Math.max(0, (t - avant) / 1000));
      avant = t;
      fn(dt, t / 1000);
      nouveaux.clear();
      id = requestAnimationFrame(tic);
    }
    id = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(id);
  }

  /* ---------- Petits outils ---------- */
  // dessine un sprite défini en texte : ['..XX..', '.XXXX.'] + { X: '#fff' }
  function sprite(lignes, couleurs, taille = 1) {
    const c = document.createElement('canvas');
    c.width = lignes[0].length * taille;
    c.height = lignes.length * taille;
    const g = c.getContext('2d');
    lignes.forEach((l, y) => [...l].forEach((ch, x) => {
      const col = couleurs[ch];
      if (!col) return;
      g.fillStyle = col;
      g.fillRect(x * taille, y * taille, taille, taille);
    }));
    return c;
  }
  // version miroir d'un sprite
  function miroir(img) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
    return c;
  }

  // bouton son + bouton pause en haut à droite
  function boutonsCoin(surPause) {
    injecterStyle();
    const b = document.createElement('button');
    b.className = 'arcade-son';
    b.title = 'Son (M)';
    const majB = () => { b.textContent = sonActif ? '🔊' : '🔇'; b.setAttribute('aria-label', sonActif ? 'Couper le son' : 'Remettre le son'); };
    majB();
    b.addEventListener('click', e => { e.stopPropagation(); Arcade.basculerSon(); majB(); });
    Arcade._majSon = majB;
    document.body.append(b);
    if (surPause) {
      const p = document.createElement('button');
      p.className = 'arcade-pause';
      p.title = 'Pause (P ou Échap)';
      p.textContent = 'II';
      p.addEventListener('click', e => { e.stopPropagation(); surPause(); });
      document.body.append(p);
      return { pause: p, son: b };
    }
    return { son: b };
  }

  // petit bandeau « tourne ton téléphone » pour les jeux en largeur
  function conseillerPaysage() {
    if (!TACTILE) return;
    injecterStyle();
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;left:12px;right:12px;top:54px;z-index:45;display:none;align-items:center;gap:10px;padding:10px 12px;border:1px solid #2a2a2a;border-radius:12px;background:rgba(10,10,10,.92);color:#e5e5e5;font:600 13px var(--police,system-ui)';
    b.innerHTML = '<span style="font-size:20px">📱↻</span><span style="flex:1">Tourne ton téléphone pour jouer en grand</span><button style="border:0;background:none;color:#a1a1a1;font-size:18px">✕</button>';
    document.body.append(b);
    let ferme = false;
    b.querySelector('button').addEventListener('click', () => { ferme = true; b.style.display = 'none'; });
    const maj = () => { b.style.display = !ferme && innerHeight > innerWidth ? 'flex' : 'none'; };
    addEventListener('resize', maj);
    maj();
  }

  const Arcade = {
    conseillerPaysage,
    TACTILE,
    touches,
    vient(nom) { return nouveaux.has(nom); },
    oublier() { nouveaux.clear(); },
    toile, manette, panneau, fermerPanneau, record, boucle, sprite, miroir, boutonsCoin,
    get panneauOuvert() { return !!(voile && !voile.hidden); },
    stock,
    son(nom) { if (sonActif && SONS[nom]) { try { SONS[nom](); } catch (e) { /* rien */ } } },
    bip, bruit,
    get audio() { return contexte(); },
    get sonActif() { return sonActif; },
    basculerSon() {
      sonActif = !sonActif;
      stock.ecrire('site-son', sonActif);
      if (!sonActif && audio) audio.suspend();
      if (Arcade._majSon) Arcade._majSon();
      if (Arcade.surSon) Arcade.surSon(sonActif);
    },
    surPerteFocus: null,
    hasard: (a, b) => a + Math.random() * (b - a),
    entier: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    borne: (v, a, b) => Math.max(a, Math.min(b, v)),
    format: n => Math.floor(n).toLocaleString('fr-FR'),
    chrono(s) {
      const m = Math.floor(s / 60), r = s - m * 60;
      return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`;
    }
  };
  window.Arcade = Arcade;
})();
