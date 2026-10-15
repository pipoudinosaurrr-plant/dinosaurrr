/* ==========================================================
   Le moteur du site
   - Sur ordinateur : un bureau façon Windows XP, en noir (fenêtres,
     barre des tâches, menu démarrer, explorateur)
   - Sur téléphone : une interface façon appli (onglets en bas,
     écrans plein écran pour les articles et les jeux)
   Les deux affichent les mêmes contenus : blog, jeux, à propos.
   ========================================================== */
(() => {
  'use strict';

  const C = window.SITE_CONFIG || {};
  const JEUX = window.JEUX || [];
  const ICONES = window.ICONES || {};
  const NOM = C.nomSite || 'dinosaurrr';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const app = document.getElementById('app');

  const REQUETE_MOBILE = '(max-width: 820px), (pointer: coarse) and (max-width: 1023px)';
  const estMobile = window.matchMedia(REQUETE_MOBILE).matches;

  /* ---------- Petits outils ---------- */

  const stockage = {
    lire(cle, defaut) {
      try { const v = localStorage.getItem(cle); return v === null ? defaut : JSON.parse(v); }
      catch (e) { return defaut; }
    },
    ecrire(cle, valeur) { try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) { /* rien */ } }
  };

  const session = {
    lire(cle) { try { return sessionStorage.getItem(cle); } catch (e) { return null; } },
    ecrire(cle, valeur) { try { sessionStorage.setItem(cle, valeur); } catch (e) { /* rien */ } }
  };

  function svg(nom, taille = 20) {
    return `<svg viewBox="0 0 24 24" width="${taille}" height="${taille}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nom] || ICONES.fichier || ''}</svg>`;
  }

  const logo = (taille = 28) => `<img src="assets/favicon.svg" width="${taille}" height="${taille}" alt="">`;

  /* ---------- Apparence et textes (Pages CMS → « Apparence », « Textes du site ») ---------- */
  const A = window.SITE_APPARENCE || {};
  const TEXTES = window.SITE_TEXTES || {};
  // un texte modifiable : {nom}, {pseudo} et les autres {mots} sont remplacés
  function txt(cle, defaut, vars = {}) {
    const brut = (typeof TEXTES[cle] === 'string' && TEXTES[cle].trim()) ? TEXTES[cle] : defaut;
    const v = Object.assign({ nom: NOM, pseudo: C.pseudo || NOM }, vars);
    return String(brut).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  }
  // code de partie (4 caractères, comme dans les jeux)
  const nouveauCodePartie = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
  const photoProfil = (taille = 46) => A.photo ? `<img src="${echapper(A.photo)}" width="${taille}" height="${taille}" alt="" style="object-fit:cover">` : logo(taille);
  const ACCENTS_BUREAU = { bleu: '#316ac5', vert: '#2e8b3e', orange: '#d9731e', rose: '#c2408a', violet: '#6a3fb5', rouge: '#c0392b', gris: '#5a5a6e' };
  const ACCENTS_MOBILE = { vert: ['#22c55e', '#4ade80'], bleu: ['#3b82f6', '#60a5fa'], orange: ['#f97316', '#fb923c'], rose: ['#ec4899', '#f472b6'], violet: ['#8b5cf6', '#a78bfa'], rouge: ['#ef4444', '#f87171'], jaune: ['#eab308', '#facc15'] };

  function echapper(texte) {
    return String(texte ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function creer(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  const adresseMail = () => `${C.mailNom || 'pipou'}@${C.mailDomaine || 'dinosaurrr.com'}`;

  function copier(texte, bouton, messageOk = 'Copié') {
    const reussi = () => {
      if (bouton) {
        const avant = bouton.innerHTML;
        bouton.innerHTML = `${svg('check', 16)}${messageOk}`;
        setTimeout(() => { bouton.innerHTML = avant; }, 1500);
      }
    };
    const secours = () => {
      const zone = document.createElement('textarea');
      zone.value = texte;
      zone.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.append(zone);
      zone.select();
      try { document.execCommand('copy'); reussi(); } catch (e) { /* rien */ }
      zone.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(reussi, secours);
    else secours();
  }

  function dateFr(valeur, court) {
    if (!valeur) return '';
    const d = new Date(String(valeur).slice(0, 10) + 'T12:00:00');
    if (isNaN(d)) return String(valeur);
    return d.toLocaleDateString('fr-FR', court ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function definirAdresse(h, pousser) {
    try {
      const url = h ? '#' + h : location.pathname + location.search;
      if (pousser) history.pushState({ ecran: true }, '', url);
      else history.replaceState(history.state, '', url);
    } catch (e) { /* pas grave */ }
  }

  function lireHash() {
    let h = location.hash.slice(1);
    try { h = decodeURIComponent(h); } catch (e) { h = ''; }
    return h;
  }

  /* ---------- Les articles du blog ---------- */

  let promesseArticles = null;

  function chargerArticles() {
    if (!promesseArticles) {
      promesseArticles = fetch('posts.json', { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(liste => (Array.isArray(liste) ? liste : [])
          .filter(a => a && a.title)
          .sort((a, b) => String(b.date).localeCompare(String(a.date))))
        .catch(err => { promesseArticles = null; throw err; });
    }
    return promesseArticles;
  }

  const lienArticle = a => location.origin + location.pathname + '#article/' + encodeURIComponent(a.url);

  function htmlCarteArticle(a, actif) {
    return `
      <button class="carte-article${actif ? ' active' : ''}" data-url="${echapper(a.url)}">
        <div class="meta"><span>${echapper(dateFr(a.date, true))}</span>${a.categorie ? `<span>${echapper(a.categorie)}</span>` : ''}${a.minutes ? `<span>${a.minutes} min</span>` : ''}</div>
        <h3>${echapper(a.title)}</h3>
        ${a.resume ? `<p>${echapper(a.resume)}</p>` : ''}
      </button>`;
  }

  function htmlArticle(a) {
    return `
      <header class="article-tete">
        ${a.categorie ? `<span class="pastille">${echapper(a.categorie)}</span>` : ''}
        <h1>${echapper(a.title)}</h1>
        <div class="meta"><span>${echapper(dateFr(a.date))}</span>${a.minutes ? `<span>${a.minutes} min de lecture</span>` : ''}</div>
      </header>
      ${a.cover ? `<img class="couverture" src="${echapper(a.cover)}" alt="">` : ''}
      <div class="prose selectionnable">${a.content || ''}</div>`;
  }

  function categories(articles) {
    return [...new Set(articles.map(a => a.categorie).filter(Boolean))];
  }

  /* ---------- Les jeux ---------- */

  function htmlCarteJeu(j) {
    return `
      <button class="carte-jeu" data-jeu="${echapper(j.id)}">
        <div class="haut"><span class="tuile">${svg(j.icone, 21)}</span><span class="badges">${j.nouveau ? '<span class="badge-nouveau">Nouveau</span>' : j.multi ? '<span class="badge-multi">En ligne</span>' : ''}</span></div>
        <div><h3>${echapper(j.titre)}</h3><p>${echapper(j.description)}</p></div>
      </button>`;
  }

  /* ---------- Démarrage commun ---------- */

  function demarrer(suite) {
    $$('[data-nom-site]').forEach(el => { el.textContent = NOM; });
    document.title = NOM;
    const boot = document.getElementById('boot');
    const deja = session.lire('site-demarre') === '1';
    let fini = false;
    const terminer = () => {
      if (fini) return;
      fini = true;
      session.ecrire('site-demarre', '1');
      boot.classList.add('fini');
      setTimeout(() => boot.remove(), 600);
      suite(!deja);
    };
    if (deja) { boot.remove(); fini = true; suite(false); return; }
    const t = setTimeout(terminer, estMobile ? 900 : 1500);
    boot.addEventListener('click', () => { clearTimeout(t); terminer(); });
  }

  // Si on passe de l'ordinateur au téléphone (fenêtre redimensionnée), on recharge
  window.matchMedia(REQUETE_MOBILE).addEventListener('change', () => location.reload());

  /* ==========================================================
     ORDINATEUR : LE BUREAU (façon Windows XP, en noir)
     ========================================================== */

  function bureau() {
    document.body.classList.add('mode-bureau');
    document.body.dataset.theme = ['bleu', 'olive', 'argent', 'noir'].includes(A.theme) ? A.theme : 'bleu';
    document.body.dataset.pixel = ['normal', 'lisse', 'fort'].includes(A.pixelisation) ? A.pixelisation : 'normal';
    document.body.style.setProperty('--xp-sel', ACCENTS_BUREAU[A.accent] || ACCENTS_BUREAU.bleu);
    document.body.style.setProperty('--t', { grand: 1.15, 'tres-grand': 1.3 }[A.tailleTexte] || 1);

    // icône en couleur façon XP (sinon l'icône au trait)
    const xp = (nom, taille = 32) => (window.iconeXP && window.iconeXP(nom, taille)) || svg(nom, taille);

    // dessins des boutons de la barre de titre
    const GLYPHE = {
      min: '<svg viewBox="0 0 21 21" aria-hidden="true"><rect x="5" y="13" width="7" height="3" fill="#fff"/></svg>',
      max: '<svg viewBox="0 0 21 21" aria-hidden="true"><rect x="5.5" y="5.5" width="10" height="10" fill="none" stroke="#fff"/><rect x="5" y="5" width="11" height="3" fill="#fff"/></svg>',
      restaurer: '<svg viewBox="0 0 21 21" aria-hidden="true"><rect x="8.5" y="4.5" width="8" height="7" fill="none" stroke="#fff"/><rect x="8" y="4" width="9" height="2.5" fill="#fff"/><rect x="4.5" y="9.5" width="8" height="7" fill="#333" stroke="#fff"/><rect x="4" y="9" width="9" height="2.5" fill="#fff"/></svg>',
      fermer: '<svg viewBox="0 0 21 21" aria-hidden="true"><path d="M6.5 6.5l8 8M14.5 6.5l-8 8" stroke="#fff" stroke-width="2.3"/></svg>',
      petit: '<svg viewBox="0 0 15 15" width="11" height="11" aria-hidden="true"><path d="M4 4l7 7M11 4l-7 7" stroke="#fff" stroke-width="1.8"/></svg>'
    };

    // fonds d'écran en pixel art (dessinés pour le site, dans assets/fonds/)
    const FONDS = [
      { id: 'pixel', nom: 'Colline en pixels', image: 'colline', couleur: '#3d7de6' },
      { id: 'coucher', nom: 'Coucher de soleil', image: 'coucher', couleur: '#2a1458' },
      { id: 'nuit', nom: 'Nuit et aurore', image: 'nuit', couleur: '#071433' },
      { id: 'plage', nom: 'Plage', image: 'plage', couleur: '#4d97ea' },
      { id: 'volcan', nom: 'Volcan', image: 'volcan', couleur: '#5a1612' },
      { id: 'hiver', nom: 'Hiver', image: 'hiver', couleur: '#8fb6e2' },
      { id: 'espace', nom: "Dino dans l'espace", image: 'espace', couleur: '#0d0727' },
      { id: 'retro', nom: 'Rétro 80', image: 'retro', couleur: '#1d0a45' },
      { id: 'bleu', nom: '(Aucun) Bleu', couleur: '#3a6ea5' },
      { id: 'noir', nom: '(Aucun) Noir', couleur: '#000000' }
    ];
    // tes propres fonds (Pages CMS → Apparence → Mes fonds d'écran)
    (Array.isArray(A.fondsPerso) ? A.fondsPerso : []).forEach((f, i) => {
      if (f && f.image) FONDS.splice(i, 0, { id: 'perso-' + i, nom: f.nom || 'Mon fond ' + (i + 1), url: f.image, couleur: '#000000', lisse: !f.pixelise, parDefaut: !!f.parDefaut });
    });
    const imageFond = f => f.url ? f.url : f.image ? `assets/fonds/${f.image}.png` : '';
    const styleFond = f => (f.url || f.image) ? `${f.couleur} url("${imageFond(f)}") center ${f.url ? 'center' : 'bottom'} / cover no-repeat` : f.couleur;
    const fondDefaut = (FONDS.find(f => f.parDefaut) || {}).id || C.fondParDefaut || FONDS[0].id;

    const APPS = {
      blog: { titre: 'Blog', icone: 'fichier', taille: [1060, 690], adresse: 'blog', ouvrir: contenuBlog },
      jeux: { titre: 'Jeux', icone: 'manette', taille: [840, 560], adresse: 'jeux', ouvrir: contenuJeux },
      apropos: { titre: 'À propos de ' + NOM, icone: 'info', taille: [410, 430], adresse: 'apropos', ouvrir: contenuAPropos, dialogue: true },
      affichage: { titre: "Propriétés d'affichage", icone: 'image', taille: [404, 486], adresse: '', ouvrir: contenuAffichage, dialogue: true },
      contact: { titre: 'Contact', icone: 'mail', taille: [410, 196], adresse: 'contact', ouvrir: contenuContact, dialogue: true },
      corbeille: { titre: 'Corbeille', icone: 'corbeille', taille: [720, 400], adresse: '', ouvrir: contenuCorbeille },
      contacts: { titre: 'Contacts en ligne', icone: 'joueurs', taille: [320, 520], adresse: 'contacts', ouvrir: contenuContacts },
      compte: { titre: 'Mon compte', icone: 'session', taille: [470, 640], adresse: 'compte', ouvrir: contenuCompte }
    };

    JEUX.forEach(jeu => {
      APPS['jeu-' + jeu.id] = {
        titre: jeu.titre,
        icone: jeu.icone,
        taille: jeu.taille || [720, 520],
        adresse: 'jeu/' + jeu.id,
        ouvrir: (corps, etat, options) => contenuJeu(corps, etat, jeu, options)
      };
    });

    // les petits plus (Invite de commandes, Bloc-notes, écran de veille…) : assets/xp-extras.js
    const extras = typeof window.XP_EXTRAS === 'function' ? window.XP_EXTRAS({
      APPS, $, $$, echapper, creer, stockage, NOM, C, JEUX, FONDS,
      xp: (n, t) => xp(n, t),
      ouvrirApp: (id, o) => ouvrirApp(id, o),
      fermer: id => fermer(id),
      bulle: (a, b, c) => bulle(a, b, c),
      chargerArticles: () => chargerArticles(),
      appliquerFond: id => appliquerFond(id),
      arreter: () => arreter(),
      fermerSession: () => fermerSession(),
      txt, A
    }) : null;
    if (extras) Object.assign(APPS, extras.apps);
    const son = nom => { if (extras) extras.son(nom); };

    const ICONES_BASE = {
      blog: { nom: 'Blog', icone: 'fichier' }, jeux: { nom: 'Jeux', icone: 'manette' },
      apropos: { nom: 'À propos', icone: 'info' }, contact: { nom: 'Contact', icone: 'mail' },
      cmd: { nom: 'Invite de commandes', icone: 'console' }, notepad: { nom: 'Bloc-notes', icone: 'blocnotes' },
      executer: { nom: 'Exécuter', icone: 'executer' }, dateheure: { nom: 'Date et heure', icone: 'horloge' },
      affichage: { nom: 'Affichage', icone: 'image' },
      contacts: { nom: 'Contacts en ligne', icone: 'joueurs' }, compte: { nom: 'Mon compte', icone: 'session' }
    };
    JEUX.forEach(j => { ICONES_BASE['jeu-' + j.id] = { nom: j.titre, icone: j.icone }; });
    const choixIcones = (Array.isArray(A.iconesBureau) ? A.iconesBureau : []).filter(x => x && ICONES_BASE[x.element] && APPS[x.element]);
    const ICONES_BUREAU = [
      ...(choixIcones.length
        ? choixIcones.map(x => ({ app: x.element, nom: x.nom || ICONES_BASE[x.element].nom, icone: ICONES_BASE[x.element].icone }))
        : [
          { app: 'blog', nom: 'Blog', icone: 'fichier' },
          { app: 'jeux', nom: 'Jeux', icone: 'manette' },
          { app: 'contacts', nom: 'Contacts en ligne', icone: 'joueurs' },
          ...JEUX.filter(j => j.bureau).map(j => ({ app: 'jeu-' + j.id, nom: j.titre, icone: j.icone })),
          { app: 'apropos', nom: 'À propos', icone: 'info' },
          { app: 'contact', nom: 'Contact', icone: 'mail' }
        ]),
      { app: 'corbeille', nom: 'Corbeille', icone: 'corbeille', coin: true }
    ];

    const LANCEMENT = [
      { app: 'blog', nom: 'Blog', icone: 'fichier' },
      { app: 'jeux', nom: 'Jeux', icone: 'manette' },
      ...(APPS['jeu-cercle'] ? [{ app: 'jeu-cercle', nom: 'Le Cercle', icone: 'cercle' }] : [])
    ];

    app.innerHTML = `
      <main class="bureau" aria-label="Bureau">
        <div class="fond"></div>
        <div class="version-bureau" aria-hidden="true">${echapper(txt('versionLigne1', '{nom} xp · Édition familiale'))}<br>${echapper(txt('versionLigne2', 'Version 2.0 (build 2600)'))}</div>
        <div class="icones-bureau" role="list"></div>
        <div class="fenetres"></div>
      </main>
      <div class="menu-demarrer" hidden role="menu" aria-label="Menu démarrer"></div>
      <div class="menu-contextuel" hidden role="menu"></div>
      <footer class="barre-taches">
        <button class="btn-demarrer" aria-haspopup="menu" aria-expanded="false">${A.demarrerImage ? `<img src="${echapper(A.demarrerImage)}" width="22" height="22" alt="" style="object-fit:contain">` : xp('dino', 22)}<span>${echapper(A.demarrerTexte || 'démarrer')}</span></button>
        <div class="lancement" aria-label="Lancement rapide">
          ${LANCEMENT.map(l => `<button data-app="${l.app}" title="${echapper(l.nom)}" aria-label="${echapper(l.nom)}">${xp(l.icone, 16)}</button>`).join('')}
        </div>
        <div class="taches" role="toolbar" aria-label="Fenêtres ouvertes"></div>
        <div class="zone-notif">
          <button class="notif-contact" title="Contact : ${echapper(adresseMail())}" aria-label="Contact">${xp('mail', 16)}</button>
          <button class="notif-enligne" hidden title="Personnes en ligne" aria-label="Personnes en ligne">${xp('joueurs', 16)}<span></span></button>
          <span class="icone-notif" title="Connecté à Internet">${xp('reseau', 16)}</span>
          <span class="icone-notif" title="Volume">${xp('volume', 16)}</span>
          <span class="horloge">--:--</span>
        </div>
      </footer>
      <div class="bulle" hidden role="status"></div>`;

    const zoneFenetres = $('.fenetres');
    const zoneTaches = $('.taches');
    const menu = $('.menu-demarrer');
    const menuCtx = $('.menu-contextuel');
    const btnDemarrer = $('.btn-demarrer');

    const actions = {
      hasard() { if (JEUX.length) ouvrirApp('jeu-' + JEUX[Math.floor(Math.random() * JEUX.length)].id); },
      fond() { changerFond(); },
      affichage() { ouvrirApp('affichage'); },
      eteindre() { arreter(); },
      arreter() { arreter(); },
      session() { fermerSession(); },
      pageBlog() { window.open('blog/', '_blank', 'noopener'); },
      actualiser() {
        const zone = $('.icones-bureau');
        zone.style.visibility = 'hidden';
        setTimeout(() => { zone.style.visibility = ''; }, 160);
      }
    };

    function ouvrirApp(id, options = {}) {
      const a = APPS[id];
      return a ? ouvrirFenetre(id, a, options) : null;
    }

    /* ----- Fenêtres ----- */

    const fenetres = new Map();
    let zMax = 100;
    let decalage = 0;

    function ouvrirFenetre(id, a, options) {
      const existante = fenetres.get(id);
      if (existante) {
        focusFenetre(id);
        if (existante.reouvrir) existante.reouvrir(options);
        return existante;
      }

      const dispo = zoneFenetres.getBoundingClientRect();
      // les fenêtres s'ouvrent à droite de la colonne d'icônes
      const gauche = Math.max(0, ...$$('.icones-bureau .icone-bureau').map(b => b.getBoundingClientRect().right)) + 12;
      const largeurUtile = dispo.width - gauche - 12;
      const w = Math.round(Math.min(a.taille[0], Math.max(300, largeurUtile)));
      const h = Math.round(Math.min(a.taille[1], dispo.height - 24));
      let x, y;
      if (a.dialogue) {
        x = Math.round((dispo.width - w) / 2 + (decalage % 3) * 24);
        y = Math.round(Math.max(20, (dispo.height - h) / 2 - 40 + (decalage++ % 3) * 24));
      } else {
        const pas = (decalage++ % 6) * 26;
        x = Math.round(Math.min(Math.max(gauche, gauche + (largeurUtile - w) / 2 + pas - 40), dispo.width - w - 8));
        y = Math.round(Math.min(Math.max(12, (dispo.height - h) / 2 + pas - 40), dispo.height - h - 8));
      }

      const el = creer(`
        <section class="fenetre${a.dialogue ? ' est-dialogue' : ''}" role="dialog" aria-label="${echapper(a.titre)}">
          <header class="titre">
            <span class="ico">${xp(a.icone, 16)}</span>
            <span class="nom">${echapper(a.titre)}</span>
            <span class="ctrl">
              ${a.dialogue ? '' : `<button class="min" title="Réduire" aria-label="Réduire">${GLYPHE.min}</button><button class="max" title="Agrandir" aria-label="Agrandir">${GLYPHE.max}</button>`}
              <button class="fermer" title="Fermer" aria-label="Fermer">${GLYPHE.fermer}</button>
            </span>
          </header>
          ${a.dialogue || a.sansMenus ? '' : `<nav class="barre-menus" aria-label="Menus">${menusFenetre(id).map(([nom], i) => `<button data-menu="${i}">${echapper(nom)}</button>`).join('')}</nav>`}
          <div class="corps${a.dialogue ? ' dialogue' : ''}"></div>
          ${a.dialogue ? '' : '<div class="poignee" aria-hidden="true"></div>'}
        </section>`);
      Object.assign(el.style, { left: Math.max(0, x) + 'px', top: Math.max(0, y) + 'px', width: w + 'px', height: h + 'px' });

      const tache = creer(`<button class="tache" title="${echapper(a.titre)}">${xp(a.icone, 16)}<span>${echapper(a.titre)}</span></button>`);
      const etat = { id, el, tache, app: a, adresse: a.adresse || '' };
      fenetres.set(id, etat);
      zoneFenetres.append(el);
      zoneTaches.append(tache);

      $('.min', el)?.addEventListener('click', e => { e.stopPropagation(); minimiser(id); });
      $('.max', el)?.addEventListener('click', e => { e.stopPropagation(); basculerMax(id); });
      $('.fermer', el).addEventListener('click', e => { e.stopPropagation(); fermer(id); });
      if (!a.dialogue) $('.titre', el).addEventListener('dblclick', e => { if (!e.target.closest('button')) basculerMax(id); });
      el.addEventListener('pointerdown', () => focusFenetre(id), true);
      tache.addEventListener('click', () => {
        if (el.classList.contains('minimisee')) focusFenetre(id);
        else if (!el.classList.contains('inactive') && fenetreDuDessus() === etat) minimiser(id);
        else focusFenetre(id);
      });

      deplacement(etat);
      if (!a.dialogue) { redimension(etat); brancherMenus(etat); }
      a.ouvrir($('.corps', el), etat, options);
      focusFenetre(id);
      return etat;
    }

    /* ----- Barre de menus des fenêtres (Fichier, Édition…) ----- */

    function menusFenetre(id) {
      const aPropos = ['?', [['apropos', 'À propos de ' + NOM, 'info']]];
      if (APPS[id] && APPS[id].menus) return APPS[id].menus;
      if (id.startsWith('jeu-')) {
        return [
          ['Partie', [['recommencer', 'Recommencer', 'recharger'], ['plein', 'Plein écran', 'agrandir'], ['onglet', 'Ouvrir dans un nouvel onglet', 'externe'], null, ['fermer', 'Quitter']]],
          aPropos
        ];
      }
      return [
        ['Fichier', [['app:blog', 'Ouvrir le blog', 'fichier'], ['app:jeux', 'Ouvrir les jeux', 'manette'], null, ['fermer', 'Fermer']]],
        ['Édition', [['copier', "Copier l'adresse", 'copier']]],
        ['Affichage', [['max', 'Agrandir / Restaurer', 'agrandir'], ['fond', "Fond d'écran suivant", 'image'], null, ['affichage', "Propriétés d'affichage…", 'image']]],
        ['Favoris', [['app:blog', 'Blog', 'fichier'], ['app:jeux', 'Jeux', 'manette'], ...(APPS['jeu-cercle'] ? [['app:jeu-cercle', 'Le Cercle', 'cercle']] : [])]],
        ['Outils', [['hasard', 'Jeu au hasard', 'hasard'], ['pageBlog', 'Blog en pleine page', 'internet']]],
        aPropos
      ];
    }

    let deroulant = null;
    let menuOuvert = null;   // { etat, bouton }

    function fermerDeroulant() {
      if (deroulant) deroulant.hidden = true;
      if (menuOuvert) menuOuvert.bouton.classList.remove('ouvert');
      menuOuvert = null;
    }

    function ouvrirDeroulant(etat, bouton) {
      if (!deroulant) {
        deroulant = creer('<div class="menu-contextuel menu-deroulant" role="menu" hidden></div>');
        document.body.append(deroulant);
        deroulant.addEventListener('click', e => {
          const b = e.target.closest('[data-cmd]');
          if (!b || !menuOuvert) return;
          const cible = menuOuvert.etat;
          fermerDeroulant();
          commandeMenu(cible, b.dataset.cmd);
        });
        document.addEventListener('pointerdown', e => {
          if (menuOuvert && !e.target.closest('.menu-deroulant, .barre-menus')) fermerDeroulant();
        }, true);
      }
      fermerDeroulant();
      const [, items] = menusFenetre(etat.id)[Number(bouton.dataset.menu)];
      deroulant.innerHTML = items.map(it => it
        ? `<button role="menuitem" data-cmd="${it[0]}">${it[2] ? xp(it[2], 16) : '<span class="vide-ico"></span>'}${echapper(it[1])}</button>`
        : '<hr>').join('');
      const r = bouton.getBoundingClientRect();
      deroulant.style.left = Math.min(r.left, window.innerWidth - 200) + 'px';
      deroulant.style.top = r.bottom + 'px';
      deroulant.style.zIndex = 9600;
      deroulant.hidden = false;
      bouton.classList.add('ouvert');
      menuOuvert = { etat, bouton };
    }

    function commandeMenu(etat, cmd) {
      if (etat.commande && etat.commande(cmd)) return;
      if (cmd.startsWith('app:')) return ouvrirApp(cmd.slice(4));
      if (cmd === 'fermer') return fermer(etat.id);
      if (cmd === 'max') return basculerMax(etat.id);
      if (cmd === 'apropos') return ouvrirApp('apropos');
      if (cmd === 'copier') {
        const lien = location.origin + location.pathname + (etat.adresse ? '#' + etat.adresse : '');
        if (navigator.clipboard) navigator.clipboard.writeText(lien).then(() => bulle('Adresse copiée', lien, 3000), () => {});
        return;
      }
      if (['recommencer', 'plein', 'onglet'].includes(cmd)) { $(`[data-a="${cmd}"]`, etat.el)?.click(); return; }
      if (actions[cmd]) actions[cmd]();
    }

    function brancherMenus(etat) {
      const barre = $('.barre-menus', etat.el);
      if (!barre) return;
      barre.addEventListener('click', e => {
        const b = e.target.closest('[data-menu]');
        if (!b) return;
        if (menuOuvert && menuOuvert.bouton === b) fermerDeroulant();
        else ouvrirDeroulant(etat, b);
      });
      // comme sur XP : une fois un menu ouvert, survoler les autres les ouvre
      barre.addEventListener('mouseover', e => {
        const b = e.target.closest('[data-menu]');
        if (b && menuOuvert && menuOuvert.bouton !== b && menuOuvert.etat === etat) ouvrirDeroulant(etat, b);
      });
    }

    function fenetreDuDessus() {
      let dessus = null;
      for (const e of fenetres.values()) {
        if (e.el.classList.contains('minimisee')) continue;
        if (!dessus || Number(e.el.style.zIndex) > Number(dessus.el.style.zIndex)) dessus = e;
      }
      return dessus;
    }

    function focusFenetre(id, sansIframe) {
      const etat = fenetres.get(id);
      if (!etat) return;
      etat.el.classList.remove('minimisee');
      if (fenetreDuDessus() !== etat || etat.el.classList.contains('inactive')) etat.el.style.zIndex = ++zMax;
      for (const autre of fenetres.values()) {
        const actif = autre === etat;
        autre.el.classList.toggle('inactive', !actif);
        autre.tache.classList.toggle('active', actif);
      }
      definirAdresse(etat.adresse);
      if (!sansIframe && etat.surFocus) etat.surFocus();
    }

    function apresDisparition() {
      const dessus = fenetreDuDessus();
      if (dessus) focusFenetre(dessus.id, true);
      else definirAdresse('');
    }

    function minimiser(id) {
      const etat = fenetres.get(id);
      if (!etat) return;
      etat.el.classList.add('minimisee', 'inactive');
      etat.tache.classList.remove('active');
      apresDisparition();
    }

    function fermer(id) {
      const etat = fenetres.get(id);
      if (!etat) return;
      etat.el.remove();
      etat.tache.remove();
      fenetres.delete(id);
      apresDisparition();
    }

    function basculerMax(id, forcer) {
      const etat = fenetres.get(id);
      if (!etat || etat.app.dialogue) return;
      const max = typeof forcer === 'boolean' ? forcer : !etat.el.classList.contains('maximisee');
      etat.el.classList.toggle('maximisee', max);
      const b = $('.max', etat.el);
      b.innerHTML = max ? GLYPHE.restaurer : GLYPHE.max;
      b.title = max ? 'Restaurer' : 'Agrandir';
      b.setAttribute('aria-label', b.title);
    }

    function deplacement(etat) {
      const el = etat.el;
      const barre = $('.titre', el);
      barre.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.target.closest('button') || el.classList.contains('maximisee')) return;
        e.preventDefault();
        const dx = e.clientX - el.offsetLeft;
        const dy = e.clientY - el.offsetTop;
        barre.setPointerCapture(e.pointerId);
        document.body.classList.add('glisse');
        const bouger = ev => {
          const zone = zoneFenetres.getBoundingClientRect();
          el.style.left = Math.min(Math.max(ev.clientX - dx, 100 - el.offsetWidth), zone.width - 100) + 'px';
          el.style.top = Math.min(Math.max(ev.clientY - dy, 0), zone.height - 30) + 'px';
        };
        const fin = () => {
          barre.removeEventListener('pointermove', bouger);
          barre.removeEventListener('pointerup', fin);
          barre.removeEventListener('pointercancel', fin);
          document.body.classList.remove('glisse');
        };
        barre.addEventListener('pointermove', bouger);
        barre.addEventListener('pointerup', fin);
        barre.addEventListener('pointercancel', fin);
      });
    }

    function redimension(etat) {
      const el = etat.el;
      const poignee = $('.poignee', el);
      poignee.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        focusFenetre(etat.id, true);
        const x0 = e.clientX, y0 = e.clientY, w0 = el.offsetWidth, h0 = el.offsetHeight;
        poignee.setPointerCapture(e.pointerId);
        document.body.classList.add('redim');
        const bouger = ev => {
          el.style.width = Math.max(300, w0 + ev.clientX - x0) + 'px';
          el.style.height = Math.max(180, h0 + ev.clientY - y0) + 'px';
        };
        const fin = () => {
          poignee.removeEventListener('pointermove', bouger);
          poignee.removeEventListener('pointerup', fin);
          poignee.removeEventListener('pointercancel', fin);
          document.body.classList.remove('redim');
        };
        poignee.addEventListener('pointermove', bouger);
        poignee.addEventListener('pointerup', fin);
        poignee.addEventListener('pointercancel', fin);
      });
    }

    // Un clic dans un jeu (iframe) met sa fenêtre au premier plan
    window.addEventListener('blur', () => {
      setTimeout(() => {
        const actif = document.activeElement;
        if (actif && actif.tagName === 'IFRAME') {
          const el = actif.closest('.fenetre');
          for (const etat of fenetres.values()) if (etat.el === el) focusFenetre(etat.id, true);
        }
        fermerMenus();
      }, 0);
    });

    window.addEventListener('resize', () => {
      const zone = zoneFenetres.getBoundingClientRect();
      for (const { el } of fenetres.values()) {
        if (el.offsetLeft > zone.width - 100) el.style.left = Math.max(0, zone.width - el.offsetWidth - 8) + 'px';
        if (el.offsetTop > zone.height - 30) el.style.top = Math.max(0, zone.height - el.offsetHeight - 8) + 'px';
      }
    });

    /* ----- Morceaux de fenêtres façon Explorateur ----- */

    const boiteVolet = (titre, contenu, principale) => `
      <section class="volet-boite${principale ? ' principale' : ''}">
        <h3>${titre}<span class="chevron" aria-hidden="true"></span></h3>
        <div class="volet-corps">${contenu}</div>
      </section>`;
    const lienVolet = (attr, icone, texte) => `<button class="lien-volet" ${attr}>${xp(icone, 16)}${texte}</button>`;
    const hote = () => echapper(location.host || NOM);

    /* ----- Contenus ----- */

    // Le blog, présenté comme Outlook Express : la liste en haut, l'article en dessous
    function contenuBlog(corps, etat, options) {
      corps.classList.add('explorateur-corps');
      corps.innerHTML = `
        <div class="barre-outils">
          <button data-a="prec" disabled>${xp('precedent', 24)}Précédent</button>
          <button data-a="suiv" disabled>${xp('suivant', 24)}Suivant</button>
          <span class="sep"></span>
          <button data-a="lien" disabled>${xp('lien', 24)}Copier le lien</button>
          <button data-a="page" disabled>${xp('externe', 24)}Ouvrir la page</button>
        </div>
        <div class="barre-adresse">Adresse<div class="champ">${xp('internet', 16)}<span class="url">${hote()}/blog/</span></div><button class="ok" data-a="page">${xp('suivant', 16)}OK</button></div>
        <div class="explorateur">
          <aside class="volet">
            ${boiteVolet('Catégories', '<span>Chargement…</span>', true)}
            ${boiteVolet('Autres emplacements', lienVolet('data-app="jeux"', 'manette', 'Jeux') + lienVolet('data-app="apropos"', 'info', 'À propos') + lienVolet('data-app="contact"', 'mail', 'Contact'))}
            ${boiteVolet('Détails', '<strong>Blog</strong><span class="nb">…</span>')}
          </aside>
          <div class="principal partage">
            <div class="liste-details">
              <div class="entetes"><span>Titre</span><span>Catégorie</span><span>Date</span></div>
              <div class="lignes" tabindex="0"></div>
            </div>
            <div class="separateur-h"></div>
            <div class="apercu">
              <div class="apercu-tete">Chargement…</div>
              <div class="apercu-corps"></div>
            </div>
          </div>
        </div>
        <div class="barre-etat"><span class="etat-texte">Chargement…</span><span>${xp('internet', 16)}Internet</span></div>`;

      const lignes = $('.lignes', corps);
      const tete = $('.apercu-tete', corps);
      const lecture = $('.apercu-corps', corps);
      const filtres = $('.volet-boite.principale .volet-corps', corps);
      const bouton = a => $(`.barre-outils [data-a="${a}"]`, corps);
      let articles = [];
      let filtre = '';
      let actuel = null;

      const visibles = () => (filtre ? articles.filter(a => a.categorie === filtre) : articles);

      const dessinerListe = () => {
        const liste = visibles();
        lignes.innerHTML = liste.map(a => `
          <button class="ligne${actuel && a.url === actuel.url ? ' active' : ''}" data-url="${echapper(a.url)}">
            <span>${xp('page', 16)}<span class="titre-ligne">${echapper(a.title)}</span></span>
            <span>${echapper(a.categorie || '')}</span>
            <span>${echapper(dateFr(a.date, true))}</span>
          </button>`).join('');
        $('.etat-texte', corps).textContent = liste.length + (liste.length > 1 ? ' articles' : ' article');
      };

      const afficher = url => {
        const a = articles.find(x => x.url === url) || visibles()[0] || articles[0];
        if (!a) return;
        actuel = a;
        $$('.ligne', lignes).forEach(b => b.classList.toggle('active', b.dataset.url === a.url));
        tete.innerHTML = `
          <div><b>Titre :</b> ${echapper(a.title)}</div>
          <div><b>Date :</b> ${echapper(dateFr(a.date))}${a.categorie ? ` &nbsp; <b>Catégorie :</b> ${echapper(a.categorie)}` : ''}${a.minutes ? ` &nbsp; <b>Lecture :</b> ${a.minutes} min` : ''}</div>`;
        lecture.innerHTML = `<div class="contenu">${htmlArticle(a)}</div>`;
        lecture.scrollTop = 0;
        $('.url', corps).textContent = (location.host || NOM) + a.url;
        const liste = visibles();
        const i = liste.indexOf(a);
        bouton('prec').disabled = i <= 0;
        bouton('suiv').disabled = i < 0 || i >= liste.length - 1;
        bouton('lien').disabled = false;
        bouton('page').disabled = false;
        etat.adresse = 'article/' + encodeURIComponent(a.url);
        if (!etat.el.classList.contains('inactive')) definirAdresse(etat.adresse);
      };

      const voisin = sens => {
        const liste = visibles();
        const i = liste.indexOf(actuel);
        const b = liste[i + sens];
        if (b) afficher(b.url);
      };

      etat.reouvrir = o => { if (o && o.article && articles.length) afficher(o.article); };

      corps.addEventListener('click', e => {
        const ligne = e.target.closest('.ligne');
        if (ligne) return afficher(ligne.dataset.url);
        const cat = e.target.closest('[data-cat]');
        if (cat) {
          filtre = cat.dataset.cat;
          $$('[data-cat]', filtres).forEach(x => x.classList.toggle('actif', x === cat));
          dessinerListe();
          if (!visibles().includes(actuel)) afficher(visibles()[0] && visibles()[0].url);
          return;
        }
        const appli = e.target.closest('[data-app]');
        if (appli) return ouvrirApp(appli.dataset.app);
        const a = e.target.closest('[data-a]');
        if (!a || a.disabled || !actuel) return;
        if (a.dataset.a === 'prec') voisin(-1);
        if (a.dataset.a === 'suiv') voisin(1);
        if (a.dataset.a === 'lien') copier(lienArticle(actuel), a, 'Lien copié');
        if (a.dataset.a === 'page') window.open(actuel.url, '_blank', 'noopener');
      });

      lignes.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); voisin(1); }
        if (e.key === 'ArrowUp') { e.preventDefault(); voisin(-1); }
      });

      chargerArticles().then(tous => {
        articles = tous;
        $('.nb', corps).textContent = articles.length + (articles.length > 1 ? ' articles publiés' : ' article publié');
        const cats = categories(articles);
        filtres.innerHTML = `<button class="lien-volet actif" data-cat="">${xp('dossier', 16)}Tous les articles</button>`
          + cats.map(c => `<button class="lien-volet" data-cat="${echapper(c)}">${xp('dossier', 16)}${echapper(c)}</button>`).join('');
        if (!articles.length) {
          dessinerListe();
          tete.textContent = 'Aucun article';
          lecture.innerHTML = `<div class="vide"><div>${xp('page', 32)}Pas encore d'article. Le premier arrive bientôt.</div></div>`;
          return;
        }
        const demande = options && options.article ? options.article : articles[0].url;
        actuel = articles.find(a => a.url === demande) || articles[0];
        dessinerListe();
        afficher(actuel.url);
      }).catch(() => {
        $('.nb', corps).textContent = 'Hors ligne';
        $('.etat-texte', corps).textContent = 'Impossible de charger le blog';
        filtres.innerHTML = '<span>Indisponible</span>';
        tete.textContent = 'Hors ligne';
        lecture.innerHTML = `<div class="vide"><div>${xp('reseau', 32)}Impossible de charger le blog.<br>Il s'affiche une fois le site en ligne.</div></div>`;
      });
    }

    // Les jeux, présentés comme un dossier en vue « Mosaïques »
    function contenuJeux(corps) {
      corps.classList.add('explorateur-corps');
      const taches = lienVolet('data-action="hasard"', 'hasard', 'Jouer à un jeu au hasard')
        + (APPS['jeu-cercle'] ? lienVolet('data-app="jeu-cercle"', 'cercle', 'Partie multijoueur') : '');
      corps.innerHTML = `
        <div class="barre-adresse">Adresse<div class="champ">${xp('manette', 16)}<span>${hote()}/jeux/</span></div></div>
        <div class="explorateur">
          <aside class="volet">
            ${boiteVolet('Tâches des jeux', taches, true)}
            ${boiteVolet('Autres emplacements', lienVolet('data-app="blog"', 'fichier', 'Blog') + lienVolet('data-app="apropos"', 'info', 'À propos') + lienVolet('data-app="corbeille"', 'corbeille', 'Corbeille'))}
            ${boiteVolet('Détails', `<strong>Jeux</strong><span>Dossier de jeux</span><span>${JEUX.length} jeux, dont ${JEUX.filter(j => j.multi).length} à plusieurs en ligne.</span>`)}
          </aside>
          <div class="principal">
            <div class="mosaique">
              <div class="parties-xp" hidden><h4 class="groupe-xp">Parties ouvertes en ce moment</h4><div class="liste-parties-xp"></div></div>
              ${[['Jeux à plusieurs (en ligne)', JEUX.filter(j => j.multi)], ['Jeux en solo', JEUX.filter(j => !j.multi)]].map(([titre, liste]) => `
                <h4 class="groupe-xp">${titre}</h4>
                ${liste.map(j => `
                  <button class="tuile-xp" data-jeu="${echapper(j.id)}" title="${echapper(j.description)}">
                    ${xp(j.icone, 48)}
                    <span><b>${echapper(j.titre)}</b><small>${echapper(j.description)}</small>${j.nouveau ? '<em>Nouveau</em>' : ''}</span>
                  </button>`).join('')}`).join('')}
            </div>
          </div>
        </div>
        <div class="barre-etat"><span>${JEUX.length} objets</span><span>${xp('ordinateur', 16)}Poste de travail</span></div>`;
      if (window.DinoPresence && window.DinoPresence.actif) {
        const arreter = window.DinoPresence.ecouter(m => {
          if (!corps.isConnected) { arreter(); return; }
          if (m.t !== 'parties') return;
          const liste = (m.liste || []).filter(p => JEUX.some(j => j.id === p.jeu));
          $('.parties-xp', corps).hidden = !liste.length;
          $('.liste-parties-xp', corps).innerHTML = liste.map(p => {
            const j = JEUX.find(x => x.id === p.jeu);
            const attend = p.phase === 'salon' && p.n < p.max;
            return `<div class="partie-xp">
              ${xp(j.icone, 32)}
              <span><b>${echapper(j.titre)}</b><small>Partie de ${echapper(p.hote)} · ${p.phase === 'jeu' ? 'en cours' : `${p.n}/${p.max} joueurs`}</small></span>
              <button class="btn" data-rejoindre="${echapper(p.jeu)}/${echapper(p.code)}">${attend ? 'Rejoindre' : 'Regarder'}</button>
            </div>`;
          }).join('');
        });
      }
      corps.addEventListener('click', e => {
        const r = e.target.closest('[data-rejoindre]');
        if (r) { const [jeu, code] = r.dataset.rejoindre.split('/'); ouvrirApp('jeu-' + jeu, { param: code + '!' }); return; }
        const b = e.target.closest('[data-jeu], [data-action], [data-app]');
        if (!b) return;
        if (b.dataset.jeu) ouvrirApp('jeu-' + b.dataset.jeu);
        else if (b.dataset.app) ouvrirApp(b.dataset.app);
        else if (actions[b.dataset.action]) actions[b.dataset.action]();
      });
    }

    function contenuJeu(corps, etat, jeu, options = {}) {
      const source = () => jeu.fichier + (options && options.param ? '#' + encodeURIComponent(options.param) : '');
      corps.classList.add('sans-defilement');
      corps.innerHTML = `
        <div class="barre-outils">
          <button data-a="recommencer">${xp('recharger', 24)}Recommencer</button>
          <button data-a="plein">${xp('agrandir', 24)}Plein écran</button>
          <span class="sep"></span>
          <button data-a="onglet">${xp('externe', 24)}Nouvel onglet</button>
        </div>
        <iframe src="${echapper(source())}" title="${echapper(jeu.titre)}" allow="fullscreen; clipboard-write"></iframe>`;
      const iframe = $('iframe', corps);
      etat.reouvrir = nouvelles => { if (nouvelles && nouvelles.param) { options = nouvelles; iframe.src = source(); } };
      const focusJeu = () => { try { iframe.contentWindow.focus(); } catch (e) { /* rien */ } };
      etat.surFocus = focusJeu;
      iframe.addEventListener('load', () => { if (!etat.el.classList.contains('inactive')) focusJeu(); });
      // un jeu peut demander une taille de fenêtre (ex. le Démineur selon le niveau)
      const surMessage = e => {
        if (!iframe.isConnected) { window.removeEventListener('message', surMessage); return; }
        if (e.source !== iframe.contentWindow || !e.data || e.data.type !== 'dino-taille') return;
        if (etat.el.classList.contains('maximisee')) return;
        const zone = zoneFenetres.getBoundingClientRect();
        const dW = etat.el.offsetWidth - iframe.clientWidth, dH = etat.el.offsetHeight - iframe.clientHeight;
        const w = Math.min(zone.width - 8, Math.max(300, Number(e.data.w) + dW));
        const h = Math.min(zone.height - 8, Math.max(200, Number(e.data.h) + dH));
        Object.assign(etat.el.style, { width: w + 'px', height: h + 'px' });
        etat.el.style.left = Math.max(0, Math.min(etat.el.offsetLeft, zone.width - w - 4)) + 'px';
        etat.el.style.top = Math.max(0, Math.min(etat.el.offsetTop, zone.height - h - 4)) + 'px';
      };
      window.addEventListener('message', surMessage);
      $('.barre-outils', corps).addEventListener('click', e => {
        const a = e.target.closest('button')?.dataset.a;
        if (a === 'recommencer') { try { iframe.contentWindow.location.reload(); } catch (err) { iframe.src = source(); } }
        if (a === 'plein') { const f = iframe.requestFullscreen || iframe.webkitRequestFullscreen; if (f) f.call(iframe); }
        if (a === 'onglet') window.open(source(), '_blank', 'noopener');
      });
    }

    // « Mon compte » : la page compte.html dans une fenêtre
    function contenuCompte(corps, etat, options = {}) {
      corps.classList.add('sans-defilement');
      const src = () => 'compte.html' + (options && options.param ? '#' + options.param : '');
      corps.innerHTML = `<iframe src="${echapper(src())}" title="Mon compte"></iframe>`;
      const iframe = $('iframe', corps);
      etat.reouvrir = o => { if (o && o.param) { options = o; iframe.src = src(); } };
    }

    // « Contacts en ligne » : comme MSN Messenger
    function contenuContacts(corps) {
      const P = window.DinoPresence, CO = window.DinoCompte;
      corps.classList.add('msn-corps');
      if (!P || !P.actif || !CO) { corps.innerHTML = '<p style="padding:12px">Le serveur des jeux n’est pas branché.</p>'; return; }
      let contacts = P.contacts || { liste: [], visiteurs: 0 };

      function ligne(x, ami, horsLigne) {
        const jeu = x.jeu && JEUX.find(j => j.id === x.jeu);
        const sous = horsLigne ? (x.vu ? 'vu ' + ilYa(x.vu) : 'hors ligne') : jeu ? 'joue à ' + jeu.titre : 'sur le site';
        return `<div class="msn-contact${horsLigne ? ' hors-ligne' : ''}" data-cle="${echapper(x.cle)}" data-nom="${echapper(x.nom)}">
          <span class="msn-bonhomme">${xp('joueurs', 16)}</span>
          <span class="msn-nom"><b>${echapper(x.nom)}${ami ? ' <i title="Ami">★</i>' : ''}</b><small>${echapper(sous)}</small></span>
          ${!horsLigne && CO.connecte ? '<button class="btn msn-inviter" title="Inviter à jouer">Inviter</button>' : ''}
        </div>`;
      }

      function groupe(titre, contenu, n) {
        return `<div class="msn-groupe"><div class="msn-groupe-titre">${xp('suivant', 16)}${echapper(titre)} (${n})</div>${contenu}</div>`;
      }

      function dessiner() {
        if (!corps.isConnected) return false;
        const moi = CO.compte;
        const cleMoi = moi ? cleNom(moi.nom) : '';
        const amis = CO.amis || [];
        const clesAmis = new Set(amis.filter(a => a.statut === 'ami').map(a => a.cle));
        const enLigne = contacts.liste.filter(x => x.cle !== cleMoi);
        const amisEnLigne = enLigne.filter(x => clesAmis.has(x.cle));
        const autres = enLigne.filter(x => !clesAmis.has(x.cle));
        const amisHors = amis.filter(a => a.statut === 'ami' && !enLigne.some(x => x.cle === a.cle));
        const demandes = amis.filter(a => a.statut === 'recue').length;
        corps.innerHTML = `
          <div class="msn-tete">
            <span class="msn-avatar">${xp('joueurs', 32)}</span>
            ${moi ? `<div class="msn-moi"><b>${echapper(moi.nom)}</b>
                <select class="msn-statut" aria-label="Statut"><option value="en-ligne">(En ligne)</option><option value="invisible" ${moi.invisible ? 'selected' : ''}>(Apparaître hors ligne)</option></select></div>`
              : `<div class="msn-moi"><b>Tu n’es pas connecté</b><small>Crée un compte pour apparaître ici et inviter tes potes.</small></div>`}
          </div>
          ${moi ? '' : '<div class="msn-boutons"><button class="btn" data-compte="connexion">Se connecter</button><button class="btn" data-compte="creer">Créer un compte</button></div>'}
          ${demandes ? `<button class="msn-alerte" data-compte="amis">${xp('info', 16)}${demandes === 1 ? '1 demande d’ami' : demandes + ' demandes d’ami'} en attente</button>` : ''}
          <div class="msn-liste">
            ${moi ? groupe('Amis en ligne', amisEnLigne.map(x => ligne(x, true)).join('') || '<p class="msn-vide">Aucun ami en ligne</p>', amisEnLigne.length) : ''}
            ${groupe(moi ? 'Autres joueurs en ligne' : 'Joueurs en ligne', autres.map(x => ligne(x, false)).join('') || '<p class="msn-vide">Personne pour l’instant</p>', autres.length)}
            ${moi && amisHors.length ? groupe('Amis hors ligne', amisHors.map(a => ligne(a, true, true)).join(''), amisHors.length) : ''}
            ${contacts.visiteurs ? `<p class="msn-visiteurs">+ ${contacts.visiteurs} visiteur${contacts.visiteurs > 1 ? 's' : ''} sans compte</p>` : ''}
          </div>
          <div class="msn-pied">
            <button class="bulle-lien" data-compte="${moi ? 'amis' : 'creer'}">${moi ? 'Ajouter un ami' : 'Créer un compte'}</button>
            <button class="bulle-lien" data-compte="">Mon compte</button>
            <label><input type="checkbox" class="msn-notifs" ${notifsParties() ? 'checked' : ''}> Me prévenir des nouvelles parties</label>
          </div>`;
        return true;
      }

      corps.addEventListener('click', e => {
        const c = e.target.closest('[data-compte]');
        if (c) { ouvrirApp('compte', { param: c.dataset.compte || 'x' }); return; }
        const inv = e.target.closest('.msn-inviter');
        if (inv) { const l = inv.closest('.msn-contact'); choisirJeuInvitation(inv, l.dataset.cle, l.dataset.nom); return; }
        const contact = e.target.closest('.msn-contact');
        if (contact && !e.target.closest('button')) ouvrirApp('compte', { param: 'profil/' + encodeURIComponent(contact.dataset.nom) });
      });
      corps.addEventListener('change', async e => {
        if (e.target.matches('.msn-notifs')) stockage.ecrire('site-notifs-parties', e.target.checked ? 'oui' : 'non');
        if (e.target.matches('.msn-statut')) {
          await CO.reglages({ invisible: e.target.value === 'invisible' });
          P.rafraichir();
        }
      });
      const arreterP = P.ecouter(m => { if (m.t === 'contacts') { contacts = m; if (!dessiner()) arreterP(); } });
      const arreterC = CO.ecouter(() => { if (!dessiner()) arreterC(); });
      if (CO.connecte) CO.chargerAmis();
      dessiner();
    }

    const cleNom = nom => String(nom || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
    function ilYa(t) {
      const m = Math.round((Date.now() - t) / 60000);
      if (m < 2) return 'à l’instant';
      if (m < 60) return `il y a ${m} min`;
      const h = Math.round(m / 60);
      if (h < 24) return `il y a ${h} h`;
      const j = Math.round(h / 24);
      return j === 1 ? 'hier' : j < 30 ? `il y a ${j} jours` : 'il y a longtemps';
    }

    // petit menu pour choisir à quel jeu inviter
    function choisirJeuInvitation(bouton, cle, nom) {
      $$('.menu-invitation').forEach(x => x.remove());
      const r = bouton.getBoundingClientRect();
      const m = creer(`<div class="menu-contextuel menu-invitation" role="menu"><div class="menu-invitation-titre">Inviter ${echapper(nom)} à…</div>${JEUX.filter(j => j.multi).map(j => `<button data-jeu="${echapper(j.id)}">${xp(j.icone, 16)}${echapper(j.titre)}</button>`).join('')}</div>`);
      document.body.append(m);
      const h = m.offsetHeight, w = m.offsetWidth;
      m.style.left = Math.max(4, Math.min(innerWidth - w - 4, r.right - w)) + 'px';
      m.style.top = (r.bottom + h + 4 < innerHeight - 30 ? r.bottom + 2 : Math.max(4, r.top - h - 2)) + 'px';
      const fermerMenu = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', fermerMenu, true); } };
      setTimeout(() => document.addEventListener('pointerdown', fermerMenu, true), 0);
      m.addEventListener('click', e => {
        const b = e.target.closest('[data-jeu]');
        if (!b) return;
        m.remove();
        document.removeEventListener('pointerdown', fermerMenu, true);
        inviter(cle, nom, b.dataset.jeu);
      });
    }

    async function inviter(cle, nom, jeuId) {
      const jeu = JEUX.find(j => j.id === jeuId);
      const code = nouveauCodePartie();
      ouvrirApp('jeu-' + jeuId, { param: code + '!' });
      await new Promise(res => setTimeout(res, 1200));   // le temps de créer le salon
      const r = await window.DinoPresence.inviter(cle, jeuId, code);
      bulle(r.ok ? 'Invitation envoyée' : 'Invitation impossible', r.ok ? `${nom} est invité à jouer à ${jeu.titre} (code ${code}).` : r.raison, 6000, { icone: 'joueurs' });
    }

    // « À propos » : une vraie boîte de dialogue XP
    function contenuAPropos(corps, etat) {
      const fond = FONDS.find(f => f.id === document.documentElement.dataset.fond) || FONDS[0];
      corps.innerHTML = `
        <div class="dialogue-xp">
          <div class="dialogue-tete">
            <span class="photo">${photoProfil(46)}</span>
            <div><b>${echapper(NOM)}</b><br>${echapper(txt('aproposEdition', 'Édition familiale · Version 2.0'))}<br>© ${new Date().getFullYear()} ${echapper(C.pseudo || NOM)}</div>
          </div>
          <hr class="grave">
          <p class="bio selectionnable">${echapper(C.bio || '')}</p>
          <fieldset class="groupe">
            <legend>Ce site</legend>
            <dl class="specs-xp">
              <dt>Articles :</dt><dd data-nb>…</dd>
              <dt>Jeux :</dt><dd>${JEUX.length}</dd>
              <dt>Fond d'écran :</dt><dd data-nom-fond>${echapper(fond.nom)}</dd>
              <dt>Adresse :</dt><dd>${hote()}</dd>
            </dl>
          </fieldset>
          <div class="boutons-dialogue">
            <button class="btn" data-a="fond">Fond d'écran…</button>
            <button class="btn" data-a="contact">Contact…</button>
            <button class="btn btn-primaire" data-a="ok">OK</button>
          </div>
        </div>`;
      chargerArticles().then(l => { $('[data-nb]', corps).textContent = l.length; }).catch(() => { $('[data-nb]', corps).textContent = '—'; });
      corps.addEventListener('click', e => {
        const a = e.target.closest('button')?.dataset.a;
        if (a === 'contact') ouvrirApp('contact');
        if (a === 'fond') ouvrirApp('affichage');
        if (a === 'ok') fermer(etat.id);
      });
    }

    function contenuContact(corps) {
      const mail = adresseMail();
      corps.innerHTML = `
        <div class="dialogue-xp">
          <div class="dialogue-tete">${xp('mail', 32)}<div><b>Écrire à ${echapper(C.pseudo || NOM)}</b><br>Une question, une idée de jeu ? Voici mon adresse :</div></div>
          <input class="champ-xp selectionnable" type="text" readonly value="${echapper(mail)}" aria-label="Adresse mail">
          <div class="boutons-dialogue">
            <button class="btn" data-a="copier">${xp('copier', 16)}Copier l'adresse</button>
            <a class="btn btn-primaire" href="mailto:${encodeURI(mail)}">${xp('mail', 16)}Écrire un mail</a>
          </div>
        </div>`;
      $('[data-a="copier"]', corps).addEventListener('click', e => copier(mail, e.currentTarget));
      $('.champ-xp', corps).addEventListener('focus', e => e.target.select());
    }

    function contenuCorbeille(corps) {
      corps.classList.add('explorateur-corps');
      const FICHIERS = [
        { nom: 'brouillon_article.md', icone: 'page', taille: '3 Ko', date: '02/10/2026 21:14' },
        { nom: 'ancien_logo.png', icone: 'image', taille: '24 Ko', date: '28/09/2026 18:02' },
        { nom: 'test_jeu_v0.html', icone: 'manette', taille: '6 Ko', date: '25/09/2026 16:47' }
      ];
      const dessiner = () => {
        const vide = session.lire('site-corbeille') === 'vide';
        corps.innerHTML = `
          <div class="explorateur">
            <aside class="volet">
              ${boiteVolet('Tâches de la Corbeille', vide ? '<span>La Corbeille est vide.</span>' : lienVolet('data-a="vider"', 'corbeille', 'Vider la Corbeille'), true)}
              ${boiteVolet('Autres emplacements', lienVolet('data-app="blog"', 'fichier', 'Blog') + lienVolet('data-app="jeux"', 'manette', 'Jeux'))}
            </aside>
            <div class="principal">
              <div class="liste-details fichiers-liste">
                <div class="entetes"><span>Nom</span><span>Taille</span><span>Date de suppression</span></div>
                <div class="lignes">${vide ? '' : FICHIERS.map(f => `
                  <div class="ligne"><span>${xp(f.icone, 16)}<span class="titre-ligne">${f.nom}</span></span><span>${f.taille}</span><span>${f.date}</span></div>`).join('')}</div>
              </div>
            </div>
          </div>
          <div class="barre-etat"><span>${vide ? '0 objet' : FICHIERS.length + ' objets'}</span></div>`;
      };
      corps.addEventListener('click', e => {
        if (e.target.closest('[data-a="vider"]')) {
          const vider = () => { session.ecrire('site-corbeille', 'vide'); son('corbeille'); dessiner(); };
          if (extras) extras.boite({ titre: 'Confirmer la suppression de plusieurs fichiers', icone: 'attention', boutons: ['Oui', 'Non'], texte: echapper(txt('corbeilleVider', 'Voulez-vous vraiment supprimer ces {nombre} éléments ?', { nombre: FICHIERS.length })) }).then(r => { if (r === 'Oui') vider(); });
          else vider();
          return;
        }
        const appli = e.target.closest('[data-app]');
        if (appli) ouvrirApp(appli.dataset.app);
      });
      dessiner();
    }

    /* ----- Bureau, menus ----- */

    function dessinerIcones() {
      const zone = $('.icones-bureau');
      const tactile = window.matchMedia('(hover: none)').matches;
      zone.innerHTML = '';
      ICONES_BUREAU.forEach(item => {
        const b = creer(`<button class="icone-bureau${item.coin ? ' coin' : ''}" role="listitem">${xp(item.icone, 32)}<span>${echapper(item.nom)}</span></button>`);
        b.addEventListener('click', e => { e.stopPropagation(); selectionner(b); if (tactile) ouvrirApp(item.app); });
        b.addEventListener('dblclick', () => ouvrirApp(item.app));
        b.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ouvrirApp(item.app); } });
        (item.coin ? $('.bureau') : zone).append(b);
      });
    }

    function selectionner(b) {
      $$('.icone-bureau.selection').forEach(x => x.classList.remove('selection'));
      if (b) b.classList.add('selection');
    }

    let sousMenu = null;
    let tousProgrammes = null;
    let minuterieSousMenu = null;

    function construireMenu() {
      const grand = (attr, icone, titre, sous) => `<button class="menu-item grand" role="menuitem" ${attr}>${xp(icone, 32)}<span><b>${echapper(titre)}</b>${sous ? `<small>${echapper(sous)}</small>` : ''}</span></button>`;
      const item = (attr, icone, titre, taille = 32) => `<button class="menu-item" role="menuitem" ${attr}>${xp(icone, taille)}<span>${echapper(titre)}</span></button>`;
      const petit = (attr, icone, titre) => `<button role="menuitem" ${attr}>${xp(icone, 16)}${echapper(titre)}</button>`;
      menu.innerHTML = `
        <div class="menu-entete"><span class="photo">${photoProfil(46)}</span><span>${echapper(C.pseudo || NOM)}</span></div>
        <div class="menu-colonnes">
          <div class="menu-gauche">
            ${grand('data-app="blog"', 'fichier', 'Blog', 'Lire les articles')}
            ${grand('data-app="jeux"', 'manette', 'Jeux', JEUX.length + ' mini-jeux')}
            <hr>
            ${JEUX.slice(0, 5).map(j => item(`data-app="jeu-${echapper(j.id)}"`, j.icone, j.titre)).join('')}
            <hr>
            <button class="tous-programmes" aria-haspopup="menu">Tous les programmes ${xp('programmes', 18)}</button>
          </div>
          <div class="menu-droite">
            ${item('data-app="compte" data-menu-compte', 'session', 'Mon compte', 24)}
            ${item('data-app="contacts"', 'joueurs', 'Contacts en ligne', 24)}
            <hr>
            ${item('data-app="apropos"', 'info', 'À propos', 24)}
            ${item('data-app="contact"', 'mail', 'Contact', 24)}
            ${item('data-app="corbeille"', 'corbeille', 'Corbeille', 24)}
            <hr>
            ${item('data-action="affichage"', 'image', "Fond d'écran", 24)}
            ${item('data-action="hasard"', 'hasard', 'Jeu au hasard', 24)}
            <hr>
            ${item('data-action="pageBlog"', 'internet', 'Blog en pleine page', 24)}
            ${extras ? item('data-app="executer"', 'executer', 'Exécuter…', 24) : ''}
          </div>
        </div>
        <div class="menu-pied">
          <button data-action="session">${xp('session', 22)}Fermer la session</button>
          <button data-action="arreter">${xp('eteindre', 22)}Arrêter</button>
        </div>
        <div class="sous-menu" hidden role="menu">
          ${JEUX.filter(j => j.multi).map(j => petit(`data-app="jeu-${echapper(j.id)}"`, j.icone, j.titre)).join('')}
          <hr>
          ${JEUX.filter(j => !j.multi).map(j => petit(`data-app="jeu-${echapper(j.id)}"`, j.icone, j.titre)).join('')}
          <hr>
          ${extras ? extras.programmes.map(p => petit(`data-app="${p.app}"`, p.icone, p.nom)).join('') + '<hr>' : ''}
          ${petit('data-app="blog"', 'fichier', 'Blog')}
          ${petit('data-app="jeux"', 'manette', 'Dossier Jeux')}
        </div>`;
      sousMenu = $('.sous-menu', menu);
      tousProgrammes = $('.tous-programmes', menu);

      menu.addEventListener('click', e => {
        if (e.target.closest('.tous-programmes')) { basculerSousMenu(sousMenu.hidden); return; }
        const b = e.target.closest('button');
        if (!b) return;
        fermerMenus();
        if (b.dataset.app) ouvrirApp(b.dataset.app);
        else if (actions[b.dataset.action]) actions[b.dataset.action]();
      });
      tousProgrammes.addEventListener('mouseenter', () => {
        clearTimeout(minuterieSousMenu);
        minuterieSousMenu = setTimeout(() => basculerSousMenu(true), 280);
      });
      tousProgrammes.addEventListener('mouseleave', () => clearTimeout(minuterieSousMenu));
      $$('.menu-item', menu).forEach(b => b.addEventListener('mouseenter', () => {
        clearTimeout(minuterieSousMenu);
        minuterieSousMenu = setTimeout(() => basculerSousMenu(false), 200);
      }));
    }

    function basculerSousMenu(ouvrir) {
      if (!sousMenu) return;
      sousMenu.hidden = !ouvrir;
      tousProgrammes.classList.toggle('ouvert', ouvrir);
    }

    function basculerMenu(ouvrir) {
      const doit = typeof ouvrir === 'boolean' ? ouvrir : menu.hidden;
      menu.hidden = !doit;
      btnDemarrer.classList.toggle('ouvert', doit);
      btnDemarrer.setAttribute('aria-expanded', String(doit));
      if (doit) menuCtx.hidden = true;
      else basculerSousMenu(false);
    }

    function fermerMenus() { basculerMenu(false); menuCtx.hidden = true; }

    function ouvrirMenuContextuel(x, y) {
      menuCtx.innerHTML = `
        <button data-action="fond">${xp('image', 16)}Fond d'écran suivant</button>
        <button data-action="actualiser"><span class="vide-ico"></span>Actualiser</button>
        <hr>
        ${extras ? `<button data-app="notepad">${xp('blocnotes', 16)}Nouveau document texte</button><button data-app="cmd">${xp('console', 16)}Ouvrir l'invite de commandes</button><hr>` : ''}
        <button data-app="blog">${xp('fichier', 16)}Ouvrir le blog</button>
        <button data-app="jeux">${xp('manette', 16)}Ouvrir les jeux</button>
        <button data-action="hasard">${xp('hasard', 16)}Jeu au hasard</button>
        <hr>
        <button data-app="affichage" class="gras">${xp('image', 16)}Propriétés</button>`;
      basculerMenu(false);
      menuCtx.hidden = false;
      const r = menuCtx.getBoundingClientRect();
      menuCtx.style.left = Math.max(0, Math.min(x, window.innerWidth - r.width - 4)) + 'px';
      menuCtx.style.top = Math.max(0, Math.min(y, window.innerHeight - r.height - 4)) + 'px';
    }

    function changerFond() {
      const actuel = document.documentElement.dataset.fond || FONDS[0].id;
      const i = FONDS.findIndex(f => f.id === actuel);
      const suivant = FONDS[(i + 1) % FONDS.length];
      appliquerFond(suivant.id);
      bulle("Fond d'écran", suivant.nom, 2500);
      return suivant;
    }

    function appliquerFond(id, enregistrer = true) {
      const f = FONDS.find(x => x.id === id) || FONDS[0];
      document.documentElement.dataset.fond = f.id;
      $('.fond').style.background = styleFond(f);
      $('.fond').style.imageRendering = f.lisse ? 'auto' : '';
      if (enregistrer) stockage.ecrire('site-fond-xp2', f.id);
      $$('[data-nom-fond]').forEach(el => { el.textContent = f.nom; });
      return f;
    }

    /* ----- Propriétés d'affichage (choisir le fond d'écran) ----- */

    function contenuAffichage(corps, etat) {
      const actuel = () => document.documentElement.dataset.fond || FONDS[0].id;
      let choix = actuel();
      corps.innerHTML = `
        <div class="dialogue-xp affichage">
          <div class="onglets-xp" role="tablist"><button class="actif" role="tab" aria-selected="true" data-onglet="bureau">Bureau</button>${extras ? '<button role="tab" aria-selected="false" data-onglet="veille">Écran de veille</button>' : ''}</div>
          <div class="onglet-corps onglet-veille" data-panneau="veille" hidden></div>
          <div class="onglet-corps" data-panneau="bureau">
            <div class="moniteur" aria-hidden="true"><div class="ecran-apercu"></div></div>
            <label class="etiquette-xp" id="lbl-fonds">Arrière-plan :</label>
            <div class="liste-fonds" role="listbox" aria-labelledby="lbl-fonds" tabindex="0">
              ${FONDS.map(f => `<button role="option" data-id="${f.id}">${f.image
                ? `<img src="${imageFond(f)}" width="24" height="15" alt="">`
                : `<i style="background:${f.couleur}"></i>`}<span>${echapper(f.nom)}</span></button>`).join('')}
            </div>
            <p class="astuce-xp">Tous les fonds sont dessinés en pixels pour ${echapper(NOM)}. Double-clique pour appliquer.</p>
          </div>
          <div class="boutons-dialogue">
            <button class="btn btn-primaire" data-a="ok">OK</button>
            <button class="btn" data-a="annuler">Annuler</button>
            <button class="btn" data-a="appliquer" disabled>Appliquer</button>
          </div>
        </div>`;
      const apercu = $('.ecran-apercu', corps);
      const liste = $('.liste-fonds', corps);
      const btnAppliquer = $('[data-a="appliquer"]', corps);
      const panneauVeille = $('[data-panneau="veille"]', corps);
      const veille = extras ? extras.ongletVeille(panneauVeille) : null;
      panneauVeille.addEventListener('change', () => { btnAppliquer.disabled = false; });
      panneauVeille.addEventListener('input', () => { btnAppliquer.disabled = false; });
      $('.onglets-xp', corps).addEventListener('click', e => {
        const o = e.target.closest('[data-onglet]');
        if (!o) return;
        $$('[data-onglet]', corps).forEach(b => { b.classList.toggle('actif', b === o); b.setAttribute('aria-selected', String(b === o)); });
        $$('[data-panneau]', corps).forEach(p => { p.hidden = p.dataset.panneau !== o.dataset.onglet; });
      });
      function montrer(id) {
        choix = id;
        const f = FONDS.find(x => x.id === id) || FONDS[0];
        apercu.style.background = styleFond(f);
        $$('[role="option"]', liste).forEach(b => b.setAttribute('aria-selected', String(b.dataset.id === id)));
        btnAppliquer.disabled = id === actuel();
      }
      montrer(choix);
      const sel = $(`[data-id="${choix}"]`, liste);
      if (sel) setTimeout(() => sel.scrollIntoView({ block: 'nearest' }), 0);
      liste.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) montrer(b.dataset.id); });
      liste.addEventListener('dblclick', e => { const b = e.target.closest('[data-id]'); if (b) { appliquerFond(b.dataset.id); fermer(etat.id); } });
      liste.addEventListener('keydown', e => {
        if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
        e.preventDefault();
        if (e.key === 'Enter') { appliquerFond(choix); fermer(etat.id); return; }
        const i = FONDS.findIndex(f => f.id === choix);
        const j = Math.max(0, Math.min(FONDS.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
        montrer(FONDS[j].id);
        $(`[data-id="${FONDS[j].id}"]`, liste).scrollIntoView({ block: 'nearest' });
      });
      corps.addEventListener('click', e => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'appliquer') { appliquerFond(choix); if (veille) veille.valider(); btnAppliquer.disabled = true; }
        if (a === 'ok') { appliquerFond(choix); if (veille) veille.valider(); fermer(etat.id); }
        if (a === 'annuler') fermer(etat.id);
      });
    }

    let minuterieBulle = null;
    // options : { icone, boutons: [{ texte, faire, lien }] }
    function bulle(titre, texte, duree = 8000, options = {}) {
      const b = $('.bulle');
      const boutons = options.boutons || [];
      b.innerHTML = `<button class="fermer-bulle" aria-label="Fermer">${GLYPHE.petit}</button><strong>${xp(options.icone || 'info', 16)}${echapper(titre)}</strong><p>${echapper(texte)}</p>`
        + (boutons.length ? `<div class="bulle-actions">${boutons.map((x, i) => `<button data-i="${i}" class="${x.lien ? 'bulle-lien' : 'btn'}">${echapper(x.texte)}</button>`).join('')}</div>` : '');
      b.hidden = false;
      son('ding');
      $('.fermer-bulle', b).addEventListener('click', () => { b.hidden = true; });
      $$('.bulle-actions button', b).forEach(btn => btn.addEventListener('click', () => {
        b.hidden = true;
        clearTimeout(minuterieBulle);
        const x = boutons[Number(btn.dataset.i)];
        if (x && x.faire) x.faire();
      }));
      clearTimeout(minuterieBulle);
      minuterieBulle = setTimeout(() => { b.hidden = true; }, duree);
    }

    /* ----- Qui est en ligne + « Untel a créé une partie » (assets/presence.js) ----- */

    const notifsParties = () => stockage.lire('site-notifs-parties', 'oui') !== 'non';
    let enLigne = null;

    function brancherPresence() {
      const P = window.DinoPresence;
      const icone = $('.notif-enligne');
      if (!P || !P.actif) return;
      // ce que je fais : le jeu de la fenêtre du dessus (vu par mes contacts)
      setInterval(() => {
        let jeu = null, z = -1;
        for (const [id, e] of fenetres) {
          if (!id.startsWith('jeu-') || e.el.classList.contains('minimisee')) continue;
          const zi = Number(e.el.style.zIndex) || 0;
          if (zi > z) { z = zi; jeu = id.slice(4); }
        }
        P.activite(jeu);
      }, 2000);
      // le nom du compte dans le menu démarrer
      if (window.DinoCompte) window.DinoCompte.ecouter(c => {
        const el = $('[data-menu-compte] span', menu);
        if (el) el.textContent = c ? c.nom + ' (mon compte)' : 'Mon compte';
      });
      const texteCompte = () => {
        const autres = Math.max(0, (enLigne || 1) - 1);
        return autres === 0 ? 'Personne d’autre sur le site' : autres === 1 ? '1 autre personne sur le site' : `${autres} autres personnes sur le site`;
      };
      P.ecouter(m => {
        if (m.t === 'compte') {
          enLigne = m.n;
          icone.hidden = m.n === null;
          const autres = Math.max(0, (m.n || 1) - 1);
          $('span', icone).textContent = autres > 0 ? autres : '';
          icone.classList.toggle('seul', autres === 0);
          icone.title = texteCompte() + (notifsParties() ? '' : ' · notifications coupées');
        }
        if (m.t === 'annonce-admin') bulle(`📢 Message de ${m.nom}`, m.texte, 20000, { icone: 'info' });
        if (m.t === 'invitation') {
          const jeu = JEUX.find(j => j.id === m.jeu);
          if (!jeu) return;
          bulle(`${m.de} t’invite à jouer`, `${jeu.titre} · code ${m.code}`, 30000, {
            icone: jeu.icone,
            boutons: [
              { texte: 'Rejoindre', faire: () => ouvrirApp('jeu-' + jeu.id, { param: m.code + '!' }) },
              { texte: 'Non merci', lien: true }
            ]
          });
        }
        if (m.t === 'partie' && notifsParties()) {
          const jeu = JEUX.find(j => j.id === m.jeu);
          if (!jeu) return;
          bulle(
            txt('partieTitre', '{joueur} lance une partie', { joueur: m.nom, jeu: jeu.titre }),
            txt('partieTexte', '{jeu} · code {code}. Viens jouer avec {joueur} !', { joueur: m.nom, jeu: jeu.titre, code: m.code }),
            20000,
            {
              icone: jeu.icone,
              boutons: [
                { texte: 'Rejoindre', faire: () => ouvrirApp('jeu-' + jeu.id, { param: m.code + '!' }) },
                { texte: 'Ne plus me prévenir', lien: true, faire: () => { stockage.ecrire('site-notifs-parties', 'non'); bulle('Notifications coupées', 'Clique sur les deux bonshommes en bas à droite pour les remettre.', 5000, { icone: 'joueurs' }); } }
              ]
            });
        }
      });
      icone.addEventListener('click', () => ouvrirApp('contacts'));
      icone.addEventListener('contextmenu', e => {
        e.preventDefault();
        const actives = notifsParties();
        const ouvertes = (P.parties || []).filter(p => p.phase === 'salon' && p.n < p.max).length;
        const texteParties = ouvertes === 0 ? 'Aucune partie en attente.' : ouvertes === 1 ? '1 partie attend des joueurs.' : `${ouvertes} parties attendent des joueurs.`;
        bulle(texteCompte(), texteParties + ' ' + (actives ? 'Tu es prévenu quand quelqu’un crée une partie.' : 'Les notifications de nouvelles parties sont coupées.'), 8000, {
          icone: 'joueurs',
          boutons: [
            actives
              ? { texte: 'Couper les notifications', lien: true, faire: () => { stockage.ecrire('site-notifs-parties', 'non'); icone.title = texteCompte() + ' · notifications coupées'; } }
              : { texte: 'Me prévenir', faire: () => { stockage.ecrire('site-notifs-parties', 'oui'); icone.title = texteCompte(); } },
            { texte: ouvertes ? 'Voir les parties' : 'Jouer', lien: !actives, faire: () => ouvrirApp('jeux') }
          ]
        });
      });
    }

    function horloge() {
      const d = new Date();
      const h = $('.horloge');
      h.textContent = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      h.title = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    /* ----- Arrêter, veille, fermer la session ----- */

    function arreter() {
      fermerMenus();
      if ($('.arret')) return;
      document.body.classList.add('gris');
      const boite = creer(`
        <div class="arret" role="dialog" aria-label="Arrêter l'ordinateur">
          <div class="arret-boite">
            <div class="arret-tete"><span>Arrêter l'ordinateur</span>${logo(26)}</div>
            <div class="arret-choix">
              <button data-c="veille">${xp('veille', 36)}<span>Mettre en veille</span></button>
              <button data-c="arreter">${xp('eteindre', 36)}<span>Arrêter</span></button>
              <button data-c="redemarrer">${xp('redemarrer', 36)}<span>Redémarrer</span></button>
            </div>
            <div class="arret-pied"><button class="btn" data-c="annuler">Annuler</button></div>
          </div>
        </div>`);
      document.body.append(boite);
      boite.addEventListener('click', e => {
        const c = e.target.closest('[data-c]')?.dataset.c;
        if (!c) return;
        fermerArret();
        if (c === 'veille') veille();
        if (c === 'arreter') eteindre();
        if (c === 'redemarrer') { session.ecrire('site-demarre', '0'); location.href = location.pathname; }
      });
    }

    function fermerArret() {
      const boite = $('.arret');
      if (boite) boite.remove();
      document.body.classList.remove('gris');
    }

    function veille() {
      const ecran = creer(`<div class="veille"><small>${echapper(txt('veille', 'Bouge la souris ou appuie sur une touche pour sortir de veille.'))}</small></div>`);
      document.body.append(ecran);
      setTimeout(() => {
        const sortir = () => { ecran.remove(); window.removeEventListener('keydown', sortir); };
        ecran.addEventListener('pointerdown', sortir);
        ecran.addEventListener('pointermove', sortir, { once: true });
        window.addEventListener('keydown', sortir);
      }, 800);
    }

    function eteindre() {
      fermerMenus();
      son('arret');
      const ecran = creer(`<div class="extinction"><div><p>${echapper(txt('extinction', 'Tu peux maintenant fermer cet onglet en toute sécurité.'))}</p><button class="btn">Redémarrer</button></div></div>`);
      document.body.append(ecran);
      $('button', ecran).addEventListener('click', () => { session.ecrire('site-demarre', '0'); location.href = location.pathname; });
    }

    function fermerSession() {
      fermerMenus();
      const ecran = creer(`
        <div class="accueil-xp">
          <div class="bande haut"></div>
          <div class="milieu">
            <div class="gauche">${logo(76)}<h2>${echapper(NOM)}</h2><p>${echapper(txt('accueilInvite', "Pour commencer, cliquez sur votre nom d'utilisateur"))}</p></div>
            <div class="trait"></div>
            <div><button class="utilisateur"><span class="photo">${photoProfil(58)}</span><span>${echapper(C.pseudo || NOM)}</span></button></div>
          </div>
          <div class="bande bas">
            <button data-c="arreter">${xp('eteindre', 30)}<span>Arrêter l'ordinateur</span></button>
            <small>${echapper(txt('accueilPied', 'Une seule session sur ce site : la tienne.'))}</small>
          </div>
        </div>`);
      document.body.append(ecran);
      $('.utilisateur', ecran).addEventListener('click', () => { ecran.remove(); son('demarrage'); bulle(txt('retourTitre', 'Bon retour'), txt('retourTexte', 'Session ouverte : {pseudo}'), 3500); });
      $('[data-c="arreter"]', ecran).addEventListener('click', () => { ecran.remove(); eteindre(); });
    }

    function suivreAdresse() {
      const h = lireHash();
      if (!h) return false;
      if (['blog', 'jeux', 'apropos', 'contact', 'contacts', 'compte'].includes(h)) ouvrirApp(h);
      else if (h.startsWith('jeu/')) {
        const [id, param] = h.slice(4).split('/');
        ouvrirApp('jeu-' + id, param ? { param } : {});
      }
      else if (h.startsWith('article/')) ouvrirApp('blog', { article: h.slice(8) });
      else return false;
      return true;
    }

    /* ----- C'est parti ----- */

    appliquerFond(stockage.lire('site-fond-xp2', fondDefaut), false);

    dessinerIcones();
    construireMenu();
    horloge();
    setInterval(horloge, 10000);
    if (extras) extras.demarrer();
    brancherPresence();

    btnDemarrer.addEventListener('click', e => { e.stopPropagation(); basculerMenu(); });
    $('.notif-contact').addEventListener('click', () => ouvrirApp('contact'));
    $('.lancement').addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (b) ouvrirApp(b.dataset.app); });
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest('.menu-demarrer, .btn-demarrer')) basculerMenu(false);
      if (!e.target.closest('.menu-contextuel')) menuCtx.hidden = true;
      if (!e.target.closest('.icone-bureau')) selectionner(null);
    });
    $('.bureau').addEventListener('contextmenu', e => {
      if (e.target.closest('.fenetre')) return;
      e.preventDefault();
      ouvrirMenuContextuel(e.clientX, e.clientY);
    });
    menuCtx.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      fermerMenus();
      if (b.dataset.app) ouvrirApp(b.dataset.app);
      else if (actions[b.dataset.action]) actions[b.dataset.action]();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { fermerMenus(); fermerArret(); } });
    window.addEventListener('hashchange', suivreAdresse);

    demarrer(premiereFois => {
      // Le blog s'ouvre directement : on arrive sur du contenu
      if (!suivreAdresse()) ouvrirApp('blog');
      if (premiereFois) setTimeout(() => bulle('Bienvenue sur ' + NOM, C.bienvenue || ''), 900);
    });
  }

  /* ==========================================================
     TÉLÉPHONE : L'APPLI
     ========================================================== */

  function mobile() {
    document.body.classList.add('mode-mobile');
    document.body.dataset.mtheme = ['noir', 'bleu-nuit', 'violet-nuit', 'anthracite'].includes(A.mobileTheme) ? A.mobileTheme : 'noir';
    const accentM = ACCENTS_MOBILE[A.mobileAccent] || ACCENTS_MOBILE.vert;
    document.body.style.setProperty('--accent', accentM[0]);
    document.body.style.setProperty('--accent-clair', accentM[1]);

    app.innerHTML = `
      <div class="m-fond" aria-hidden="true"></div>
      <header class="m-entete">
        <div class="m-marque">${logo(28)}<span>${echapper(NOM)}</span></div>
        <button class="btn btn-icone btn-fantome" data-onglet="moi" aria-label="Contact">${svg('mail', 20)}</button>
      </header>
      <main class="m-vues">
        <section class="m-vue" data-vue="accueil"></section>
        <section class="m-vue" data-vue="blog"></section>
        <section class="m-vue" data-vue="jeux"></section>
        <section class="m-vue" data-vue="moi"></section>
      </main>
      <nav class="m-nav" aria-label="Navigation">
        <button data-onglet="accueil">${svg('accueil', 22)}<span>Accueil</span></button>
        <button data-onglet="blog">${svg('fichier', 22)}<span>Blog</span></button>
        <button data-onglet="jeux">${svg('manette', 22)}<span>Jeux</span></button>
        <button data-onglet="moi">${svg('utilisateur', 22)}<span>Moi</span></button>
      </nav>
      <div class="m-ecran" aria-hidden="true">
        <div class="m-ecran-barre">
          <button class="btn btn-icone btn-fantome" data-a="retour" aria-label="Retour">${svg('retour', 21)}</button>
          <div class="m-ecran-titre"></div>
          <button class="btn btn-icone btn-fantome" data-a="action" aria-label="Action"></button>
        </div>
        <div class="m-ecran-corps"></div>
      </div>`;

    const vues = Object.fromEntries($$('.m-vue').map(v => [v.dataset.vue, v]));
    const ecran = $('.m-ecran');
    const ecranCorps = $('.m-ecran-corps');
    const ecranTitre = $('.m-ecran-titre');
    const ecranAction = $('[data-a="action"]', ecran);
    let articles = [];
    let ongletActuel = 'accueil';
    let filtre = '';
    let actionEcran = null;
    let articleOuvert = null;

    const htmlChargement = '<div class="m-liste"><div class="squelette" style="height:112px"></div><div class="squelette" style="height:112px"></div></div>';

    function toast(texte) {
      const t = creer(`<div class="m-toast">${echapper(texte)}</div>`);
      document.body.append(t);
      setTimeout(() => t.remove(), 1800);
    }

    /* ----- Les vues ----- */

    function vueAccueil() {
      const derniers = articles.slice(0, 3);
      vues.accueil.innerHTML = `
        <section class="m-hero">
          <span class="pastille"><span class="point"></span>En ligne · ${JEUX.length} jeux</span>
          <h1>${echapper(C.slogan || 'Blog & jeux faits maison.')}</h1>
          <p>${echapper(C.accroche || '')}</p>
          <div class="m-ctas">
            <button class="btn btn-primaire" data-onglet="blog">Lire le blog</button>
            <button class="btn btn-secondaire" data-onglet="jeux">${svg('manette', 18)}Jouer</button>
          </div>
          <div class="m-stats">
            <div class="m-stat"><b data-nb-articles>${articles.length || '–'}</b><span>Articles</span></div>
            <div class="m-stat"><b>${JEUX.length}</b><span>Jeux</span></div>
            <div class="m-stat"><b>0</b><span>Pub</span></div>
          </div>
        </section>

        <section class="m-section">
          <div class="m-section-tete"><h2>Derniers articles</h2><button class="m-lien" data-onglet="blog">Tout voir${svg('droite', 16)}</button></div>
          <div class="m-liste" data-derniers>${articles.length ? derniers.map(a => htmlCarteArticle(a)).join('') : htmlChargement}</div>
        </section>

        <section class="m-section">
          <div class="m-section-tete"><h2>Jeux</h2><button class="m-lien" data-onglet="jeux">Tout voir${svg('droite', 16)}</button></div>
          <div class="m-carrousel">${JEUX.map(htmlCarteJeu).join('')}</div>
        </section>

        <p class="m-pied">© ${new Date().getFullYear()} ${echapper(NOM)} · fait à la main</p>`;
    }

    function vueBlog() {
      const cats = categories(articles);
      const visibles = filtre ? articles.filter(a => a.categorie === filtre) : articles;
      vues.blog.innerHTML = `
        <h1 class="m-titre-vue">Blog</h1>
        <p class="m-sous-titre">${articles.length ? `${articles.length} article${articles.length > 1 ? 's' : ''}` : 'Mes projets, la tech et les coulisses des jeux.'}</p>
        ${cats.length > 1 ? `<div class="m-filtres"><button class="filtre${filtre ? '' : ' actif'}" data-cat="">Tous</button>${cats.map(c => `<button class="filtre${filtre === c ? ' actif' : ''}" data-cat="${echapper(c)}">${echapper(c)}</button>`).join('')}</div>` : ''}
        <div class="m-liste">${articles.length ? visibles.map(a => htmlCarteArticle(a)).join('') : htmlChargement}</div>`;
    }

    function vueJeux() {
      vues.jeux.innerHTML = `
        <h1 class="m-titre-vue">Jeux</h1>
        <p class="m-sous-titre">${JEUX.length} mini-jeux codés à la main.</p>
        <p class="m-sous-titre" style="margin-top:-6px"><span class="m-enligne" hidden><i></i><span></span></span></p>
        <div class="m-joueurs" hidden>
          <div class="m-section-tete"><h2>Joueurs en ligne</h2><span class="m-compte"></span></div>
          <div class="m-liste-joueurs"></div>
        </div>
        <div class="m-parties" hidden>
          <div class="m-section-tete"><h2>Parties ouvertes</h2><span class="m-compte"></span></div>
          <div class="m-liste-parties"></div>
        </div>
        <div class="m-section-tete"><h2>À plusieurs</h2><span class="m-compte">${JEUX.filter(j => j.multi).length} jeux · en ligne</span></div>
        <div class="m-grille-jeux">${JEUX.filter(j => j.multi).map(htmlCarteJeu).join('')}</div>
        <div class="m-section-tete" style="margin-top:28px"><h2>En solo</h2><span class="m-compte">${JEUX.filter(j => !j.multi).length} jeux</span></div>
        <div class="m-grille-jeux">${JEUX.filter(j => !j.multi).map(htmlCarteJeu).join('')}</div>`;
    }

    function vueMoi() {
      const mail = adresseMail();
      vues.moi.innerHTML = `
        <h1 class="m-titre-vue">À propos</h1>
        <p class="m-sous-titre">@${echapper(C.pseudo || '')}</p>
        <div class="m-carte">
          <div class="profil">${photoProfil(52)}<div><h2>${echapper(NOM)}</h2><div class="meta"><span>${articles.length || '–'} articles</span><span>${JEUX.length} jeux</span></div></div></div>
          <p class="bio" style="margin:0">${echapper(C.bio || '')}</p>
        </div>
        <div class="m-carte">
          <h3>Contact</h3>
          <span class="adresse-mail selectionnable">${echapper(mail)}</span>
          <div class="actions">
            <a class="btn btn-primaire" href="mailto:${encodeURI(mail)}">${svg('mail', 16)}Écrire</a>
            <button class="btn" data-a="copier-mail">${svg('copier', 16)}Copier</button>
          </div>
        </div>
        <div class="m-carte m-carte-compte"></div>
        <div class="m-carte">
          <h3>Jeux en ligne</h3>
          <p class="bio" style="margin:0 0 12px"><span class="m-enligne" hidden><i></i><span></span></span></p>
          <div class="actions">
            <button class="btn m-bascule-notifs">${stockage.lire('site-notifs-parties', 'oui') === 'non' ? 'Me prévenir des nouvelles parties' : 'Couper les notifications de parties'}</button>
          </div>
        </div>
        <p class="m-pied">Sur ordinateur, le site s'ouvre en mode bureau.</p>`;
      majCarteCompte();
      $('.m-bascule-notifs', vues.moi).addEventListener('click', () => {
        const coupees = stockage.lire('site-notifs-parties', 'oui') === 'non';
        stockage.ecrire('site-notifs-parties', coupees ? 'oui' : 'non');
        toast(coupees ? 'Notifications activées' : 'Notifications coupées');
        vueMoi();
        majEnLigne();
      });
    }

    function dessinerTout() { vueAccueil(); vueBlog(); vueJeux(); vueMoi(); majEnLigne(); majParties(); majJoueurs(); }

    /* ----- Compte, joueurs en ligne, invitations ----- */

    const CO = window.DinoCompte;
    let contactsM = { liste: [], visiteurs: 0 };

    function ouvrirCompte(param, pousser) {
      ouvrirEcran('Mon compte', `<iframe src="compte.html${param ? '#' + echapper(param) : ''}" title="Mon compte"></iframe>`, null, 'compte', true, pousser);
    }

    function majCarteCompte() {
      const zone = $('.m-carte-compte', vues.moi);
      if (!zone || !CO || !CO.actif) { if (zone) zone.hidden = true; return; }
      const c = CO.compte;
      zone.innerHTML = c ? `
          <h3>Mon compte</h3>
          <p class="bio" style="margin:0 0 12px">Connecté en tant que <b>${echapper(c.nom)}</b>${c.invisible ? ' · invisible' : ''}</p>
          <div class="actions"><button class="btn btn-primaire" data-ouvrir-compte="">Voir mon compte</button><button class="btn" data-ouvrir-compte="amis">Mes amis</button></div>`
        : `
          <h3>Compte joueur</h3>
          <p class="bio" style="margin:0 0 12px">Réserve ton pseudo, garde tes victoires et ajoute tes potes en amis.</p>
          <div class="actions"><button class="btn btn-primaire" data-ouvrir-compte="creer">Créer un compte</button><button class="btn" data-ouvrir-compte="connexion">Se connecter</button></div>`;
    }

    function majJoueurs() {
      const boite = $('.m-joueurs', vues.jeux);
      if (!boite) return;
      const moi = CO && CO.compte ? cleNomM(CO.compte.nom) : '';
      const clesAmis = new Set(((CO && CO.amis) || []).filter(a => a.statut === 'ami').map(a => a.cle));
      const liste = contactsM.liste.filter(x => x.cle !== moi).sort((a, b) => clesAmis.has(b.cle) - clesAmis.has(a.cle));
      boite.hidden = !liste.length && !contactsM.visiteurs;
      $('.m-compte', boite).textContent = contactsM.visiteurs ? `+ ${contactsM.visiteurs} sans compte` : '';
      $('.m-liste-joueurs', boite).innerHTML = liste.length ? liste.map(x => {
        const jeu = x.jeu && JEUX.find(j => j.id === x.jeu);
        return `<div class="m-partie m-joueur">
          <div class="icone">${svg('utilisateur', 20)}</div>
          <div class="texte"><b>${echapper(x.nom)}${clesAmis.has(x.cle) ? ' <span class="m-etoile">★</span>' : ''}</b><span>${jeu ? 'joue à ' + echapper(jeu.titre) : 'sur le site'}</span></div>
          ${CO && CO.connecte ? `<button class="btn petit" data-inviter="${echapper(x.cle)}" data-nom="${echapper(x.nom)}">Inviter</button>` : ''}
        </div>`;
      }).join('') : `<p class="m-vide-joueurs">Personne avec un compte en ligne pour l’instant.</p>`;
    }

    const cleNomM = nom => String(nom || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

    function choisirJeuMobile(cle, nom) {
      $$('.m-feuille').forEach(x => x.remove());
      const f = creer(`
        <div class="m-feuille" role="dialog" aria-label="Inviter">
          <div class="m-feuille-boite">
            <h3>Inviter ${echapper(nom)} à…</h3>
            <div class="m-feuille-liste">${JEUX.filter(j => j.multi).map(j => `<button data-jeu-invite="${echapper(j.id)}">${svg(j.icone, 20)}<span>${echapper(j.titre)}</span></button>`).join('')}</div>
            <button class="btn" data-fermer-feuille>Annuler</button>
          </div>
        </div>`);
      document.body.append(f);
      f.addEventListener('click', async e => {
        if (e.target === f || e.target.closest('[data-fermer-feuille]')) { f.remove(); return; }
        const b = e.target.closest('[data-jeu-invite]');
        if (!b) return;
        e.stopPropagation();
        f.remove();
        const jeuId = b.dataset.jeuInvite;
        const code = nouveauCodePartie();
        ouvrirJeu(jeuId + '/' + code + '!', true);
        await new Promise(res => setTimeout(res, 1200));
        const r = await window.DinoPresence.inviter(cle, jeuId, code);
        toast(r.ok ? `Invitation envoyée à ${nom}` : r.raison);
      });
    }

    // message de l'admin à tout le site
    function notifAnnonce(m) {
      $$('.m-notif-partie').forEach(x => x.remove());
      const n = creer(`
        <div class="m-notif-partie" role="status">
          <div class="texte"><b>📢 Message de ${echapper(m.nom)}</b><span>${echapper(m.texte)}</span></div>
          <button class="fermer" aria-label="Fermer">✕</button>
        </div>`);
      document.body.append(n);
      const fin = setTimeout(() => n.remove(), 20000);
      $('.fermer', n).addEventListener('click', () => { clearTimeout(fin); n.remove(); });
    }

    function notifInvitation(m) {
      const jeu = JEUX.find(j => j.id === m.jeu);
      if (!jeu) return;
      $$('.m-notif-partie').forEach(x => x.remove());
      const n = creer(`
        <div class="m-notif-partie" role="status">
          <div class="texte"><b>${echapper(m.de)} t’invite à jouer</b><span>${echapper(jeu.titre)} · code ${echapper(m.code)}</span></div>
          <button class="btn btn-primaire petit">Rejoindre</button>
          <button class="fermer" aria-label="Refuser">✕</button>
        </div>`);
      document.body.append(n);
      const fin = setTimeout(() => n.remove(), 30000);
      $('.btn', n).addEventListener('click', () => { clearTimeout(fin); n.remove(); ouvrirJeu(jeu.id + '/' + m.code + '!', true); });
      $('.fermer', n).addEventListener('click', () => { clearTimeout(fin); n.remove(); });
    }

    document.addEventListener('click', e => {
      const oc = e.target.closest('[data-ouvrir-compte]');
      if (oc) { e.stopPropagation(); ouvrirCompte(oc.dataset.ouvrirCompte, true); return; }
      const inv = e.target.closest('[data-inviter]');
      if (inv) { e.stopPropagation(); choisirJeuMobile(inv.dataset.inviter, inv.dataset.nom); }
    }, true);

    if (CO) CO.ecouter(() => { majCarteCompte(); majJoueurs(); });

    // ce que je fais (vu par les autres) : le jeu ouvert à l'écran
    setInterval(() => {
      if (!window.DinoPresence) return;
      const f = ecran.classList.contains('ouvert') && $('iframe', ecranCorps);
      const src = f ? f.getAttribute('src') || '' : '';
      const jeu = JEUX.find(j => src.split('#')[0] === j.fichier);
      window.DinoPresence.activite(jeu ? jeu.id : null);
    }, 2000);

    /* ----- Qui est en ligne + « Untel a créé une partie » (assets/presence.js) ----- */

    let enLigneM = null;
    let partiesM = [];
    function majParties() {
      const boite = $('.m-parties', vues.jeux);
      if (!boite) return;
      const liste = partiesM.filter(p => JEUX.some(j => j.id === p.jeu));
      boite.hidden = !liste.length;
      const enAttente = liste.filter(p => p.phase === 'salon' && p.n < p.max).length;
      $('.m-compte', boite).textContent = enAttente ? `${enAttente} en attente` : 'en cours';
      $('.m-liste-parties', boite).innerHTML = liste.map(p => {
        const j = JEUX.find(x => x.id === p.jeu);
        const attend = p.phase === 'salon' && p.n < p.max;
        return `<div class="m-partie">
          <div class="icone">${svg(j.icone, 22)}</div>
          <div class="texte"><b>${echapper(j.titre)}</b><span>Partie de ${echapper(p.hote)} · ${p.phase === 'jeu' ? 'en cours' : `${p.n}/${p.max} joueurs`}</span></div>
          <button class="btn ${attend ? 'btn-primaire' : ''} petit" data-rejoindre="${echapper(p.jeu)}/${echapper(p.code)}">${attend ? 'Rejoindre' : 'Regarder'}</button>
        </div>`;
      }).join('');
    }
    vues.jeux.addEventListener('click', e => {
      const b = e.target.closest('[data-rejoindre]');
      if (b) { e.stopPropagation(); ouvrirJeu(b.dataset.rejoindre + '!', true); }
    });
    function majEnLigne() {
      const autres = enLigneM === null ? null : Math.max(0, enLigneM - 1);
      const texte = autres === null ? '' : autres === 0 ? 'Personne d’autre en ligne pour l’instant' : autres === 1 ? '1 autre personne en ligne sur le site' : `${autres} autres personnes en ligne sur le site`;
      $$('.m-enligne').forEach(el => {
        el.hidden = !texte;
        el.classList.toggle('vide', autres === 0);
        $('span', el).textContent = texte;
      });
    }

    function notifPartie(m) {
      const jeu = JEUX.find(j => j.id === m.jeu);
      if (!jeu || stockage.lire('site-notifs-parties', 'oui') === 'non') return;
      $$('.m-notif-partie').forEach(x => x.remove());
      const n = creer(`
        <div class="m-notif-partie" role="status">
          <div class="texte"><b>${echapper(txt('partieTitre', '{joueur} lance une partie', { joueur: m.nom, jeu: jeu.titre }))}</b><span>${echapper(txt('partieTexte', '{jeu} · code {code}. Viens jouer avec {joueur} !', { joueur: m.nom, jeu: jeu.titre, code: m.code }))}</span></div>
          <button class="btn btn-primaire petit">Rejoindre</button>
          <button class="fermer" aria-label="Fermer">✕</button>
        </div>`);
      document.body.append(n);
      const fin = setTimeout(() => n.remove(), 20000);
      $('.btn', n).addEventListener('click', () => { clearTimeout(fin); n.remove(); ouvrirJeu(jeu.id + '/' + m.code + '!', true); });
      $('.fermer', n).addEventListener('click', () => { clearTimeout(fin); n.remove(); });
    }

    if (window.DinoPresence && window.DinoPresence.actif) {
      window.DinoPresence.ecouter(m => {
        if (m.t === 'compte') { enLigneM = m.n; majEnLigne(); }
        if (m.t === 'partie') notifPartie(m);
        if (m.t === 'parties') { partiesM = m.liste || []; majParties(); }
        if (m.t === 'contacts') { contactsM = m; majJoueurs(); }
        if (m.t === 'invitation') notifInvitation(m);
        if (m.t === 'annonce-admin') notifAnnonce(m);
      });
    }

    function changerOnglet(nom, sansHash) {
      if (!vues[nom]) nom = 'accueil';
      ongletActuel = nom;
      Object.entries(vues).forEach(([k, v]) => v.classList.toggle('active', k === nom));
      $$('.m-nav button').forEach(b => b.classList.toggle('actif', b.dataset.onglet === nom));
      window.scrollTo(0, 0);
      if (!sansHash) definirAdresse(nom === 'accueil' ? '' : nom);
    }

    /* ----- Écrans plein écran ----- */

    function ouvrirEcran(titre, contenu, action, adresse, estJeu, pousser) {
      ecranTitre.textContent = titre;
      ecranCorps.className = 'm-ecran-corps' + (estJeu ? ' jeu' : '');
      ecranCorps.innerHTML = contenu;
      ecranCorps.scrollTop = 0;
      actionEcran = action ? action.faire : null;
      ecranAction.innerHTML = action ? svg(action.icone, 21) : '';
      ecranAction.style.visibility = action ? 'visible' : 'hidden';
      ecranAction.setAttribute('aria-label', action ? action.nom : '');
      ecran.classList.add('ouvert');
      ecran.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (pousser || !(history.state && history.state.ecran)) definirAdresse(adresse, true);
      else definirAdresse(adresse);
    }

    function fermerEcran() {
      ecran.classList.remove('ouvert');
      ecran.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => { if (!ecran.classList.contains('ouvert')) ecranCorps.innerHTML = ''; }, 350);
    }

    function retour() {
      if (history.state && history.state.ecran) history.back();
      else { fermerEcran(); definirAdresse(ongletActuel === 'accueil' ? '' : ongletActuel); }
    }

    function ouvrirArticle(url, pousser) {
      const a = articles.find(x => x.url === url);
      if (!a) return;
      articleOuvert = a;
      ouvrirEcran(a.categorie || 'Article', `
        <div class="m-article">
          ${htmlArticle(a)}
          <div class="article-actions">
            <button class="btn btn-primaire" data-a="partager">${svg('partager', 16)}Partager</button>
            <button class="btn" data-a="lien">${svg('lien', 16)}Copier le lien</button>
          </div>
        </div>`, { icone: 'partager', nom: 'Partager', faire: () => partager(a) }, 'article/' + encodeURIComponent(a.url), false, pousser);
    }

    function partager(a) {
      const url = lienArticle(a);
      if (navigator.share) {
        navigator.share({ title: a.title, url }).catch(() => {});
      } else {
        copier(url, null);
        toast('Lien copié');
      }
    }

    function ouvrirJeu(chemin, pousser) {
      const [id, param] = String(chemin).split('/');
      const j = JEUX.find(x => x.id === id);
      if (!j) return;
      const src = j.fichier + (param ? '#' + encodeURIComponent(param) : '');
      ouvrirEcran(j.titre, `<iframe src="${echapper(src)}" title="${echapper(j.titre)}" allow="fullscreen; clipboard-write"></iframe>`, {
        icone: 'recharger',
        nom: 'Recommencer',
        faire: () => { const f = $('iframe', ecranCorps); if (f) { try { f.contentWindow.location.reload(); } catch (e) { f.src = src; } } }
      }, 'jeu/' + j.id + (param ? '/' + param : ''), true, pousser);
    }

    /* ----- Navigation ----- */

    function suivreAdresse(evenement) {
      const h = lireHash();
      const ecranDemande = h.startsWith('jeu/') || h.startsWith('article/') || h === 'compte';
      // Lien direct vers un jeu ou un article : on glisse d'abord l'accueil
      // dans l'historique, pour que « retour » ramène bien sur le site
      if (ecranDemande && !evenement && !(history.state && history.state.ecran)) {
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* rien */ }
      }
      if (h.startsWith('jeu/')) { ouvrirJeu(h.slice(4)); return; }
      if (h === 'compte') { ouvrirCompte(''); return; }
      if (h.startsWith('article/')) {
        const url = h.slice(8);
        if (articles.length) ouvrirArticle(url);
        else chargerArticles().then(() => ouvrirArticle(url)).catch(() => {});
        return;
      }
      if (ecran.classList.contains('ouvert')) fermerEcran();
      const correspondance = { blog: 'blog', jeux: 'jeux', apropos: 'moi', contact: 'moi', moi: 'moi' };
      const cible = correspondance[h] || 'accueil';
      if (cible !== ongletActuel || !vues[cible].classList.contains('active')) changerOnglet(cible, true);
    }

    // Liens internes dans les articles (ex. /#jeu/meteorites)
    function routeInterne(h) {
      if (h.startsWith('jeu/')) ouvrirJeu(h.slice(4), true);
      else if (h.startsWith('article/')) ouvrirArticle(h.slice(8), true);
      else {
        if (ecran.classList.contains('ouvert')) retour();
        const correspondance = { blog: 'blog', jeux: 'jeux', apropos: 'moi', contact: 'moi' };
        changerOnglet(correspondance[h] || 'accueil');
      }
    }

    document.addEventListener('click', e => {
      const lien = e.target.closest('a[href]');
      if (lien) {
        const m = lien.getAttribute('href').match(/^\/?#(.+)$/);
        if (m) { e.preventDefault(); routeInterne(decodeURIComponent(m[1])); }
        return;
      }
      const onglet = e.target.closest('[data-onglet]');
      if (onglet) { changerOnglet(onglet.dataset.onglet); return; }
      const carteArticle = e.target.closest('.carte-article');
      if (carteArticle) { ouvrirArticle(carteArticle.dataset.url); return; }
      const carteJeu = e.target.closest('[data-jeu]');
      if (carteJeu) { ouvrirJeu(carteJeu.dataset.jeu); return; }
      const f = e.target.closest('.m-filtres .filtre');
      if (f) { filtre = f.dataset.cat; vueBlog(); return; }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'retour') retour();
      if (a === 'action' && actionEcran) actionEcran();
      if (a === 'copier-mail') { copier(adresseMail(), null); toast('Adresse copiée'); }
      if ((a === 'lien' || a === 'partager') && articleOuvert) {
        if (a === 'partager') partager(articleOuvert);
        else { copier(lienArticle(articleOuvert), null); toast('Lien copié'); }
      }
    });

    window.addEventListener('popstate', suivreAdresse);

    // En-tête qui devient opaque quand on scrolle
    const entete = $('.m-entete');
    window.addEventListener('scroll', () => entete.classList.toggle('colle', window.scrollY > 8), { passive: true });

    // Glisser depuis le bord gauche pour revenir en arrière
    let departX = null;
    ecran.addEventListener('touchstart', e => { const x = e.touches[0].clientX; departX = x < 24 ? x : null; }, { passive: true });
    ecran.addEventListener('touchend', e => {
      if (departX === null) return;
      if (e.changedTouches[0].clientX - departX > 80) retour();
      departX = null;
    }, { passive: true });

    dessinerTout();
    chargerArticles().then(liste => { articles = liste; dessinerTout(); changerOnglet(ongletActuel, true); })
      .catch(() => {
        const msg = `<div class="vide"><div>${svg('wifi', 28)}<br>Le blog s'affiche une fois le site en ligne.</div></div>`;
        $$('[data-derniers]').forEach(el => { el.innerHTML = msg; });
        const l = $('.m-liste', vues.blog);
        if (l) l.innerHTML = msg;
      });

    demarrer(() => suivreAdresse(null));
  }

  if (estMobile) mobile();
  else bureau();
})();
