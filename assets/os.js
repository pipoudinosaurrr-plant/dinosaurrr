/* ==========================================================
   Le moteur du site
   - Sur ordinateur : un bureau inspiré de Windows XP (fenêtres,
     barre des tâches, menu Démarrer)
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
        <div class="haut"><span class="tuile">${svg(j.icone, 21)}</span>${j.nouveau ? '<span class="badge-nouveau">Nouveau</span>' : ''}</div>
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
     ORDINATEUR : LE BUREAU
     ========================================================== */

  function bureau() {
    document.body.classList.add('mode-bureau');

    const FONDS = [
      { id: 'halo', nom: 'Halo' },
      { id: 'grille', nom: 'Grille' },
      { id: 'noir', nom: 'Noir' }
    ];

    const APPS = {
      blog: { titre: 'Blog', icone: 'fichier', taille: [1040, 680], adresse: 'blog', ouvrir: contenuBlog },
      jeux: { titre: 'Jeux', icone: 'manette', taille: [820, 560], adresse: 'jeux', ouvrir: contenuJeux },
      apropos: { titre: 'À propos', icone: 'info', taille: [460, 470], adresse: 'apropos', ouvrir: contenuAPropos },
      contact: { titre: 'Contact', icone: 'mail', taille: [440, 330], adresse: 'contact', ouvrir: contenuContact },
      corbeille: { titre: 'Corbeille', icone: 'corbeille', taille: [440, 360], adresse: '', ouvrir: contenuCorbeille }
    };

    JEUX.forEach(jeu => {
      APPS['jeu-' + jeu.id] = {
        titre: jeu.titre,
        icone: jeu.icone,
        taille: jeu.taille || [720, 520],
        adresse: 'jeu/' + jeu.id,
        ouvrir: (corps, etat) => contenuJeu(corps, etat, jeu)
      };
    });

    const ICONES_BUREAU = [
      { app: 'blog', nom: 'Blog', icone: 'fichier' },
      { app: 'jeux', nom: 'Jeux', icone: 'manette' },
      ...JEUX.filter(j => j.bureau).map(j => ({ app: 'jeu-' + j.id, nom: j.titre, icone: j.icone })),
      { app: 'apropos', nom: 'À propos', icone: 'info' },
      { app: 'contact', nom: 'Contact', icone: 'mail' },
      { app: 'corbeille', nom: 'Corbeille', icone: 'corbeille', coin: true }
    ];

    app.innerHTML = `
      <main class="bureau" aria-label="Bureau">
        <div class="fond"></div>
        <div class="filigrane" aria-hidden="true">${echapper(NOM)}</div>
        <div class="icones-bureau" role="list"></div>
        <div class="fenetres"></div>
      </main>
      <div class="menu-demarrer" hidden role="menu" aria-label="Menu Démarrer"></div>
      <div class="menu-contextuel" hidden role="menu"></div>
      <footer class="barre-taches">
        <button class="btn-demarrer" aria-haspopup="menu" aria-expanded="false">${logo(24)}démarrer</button>
        <div class="taches" role="toolbar" aria-label="Fenêtres ouvertes"></div>
        <div class="zone-notif">
          <button class="notif-contact" title="Contact" aria-label="Contact">${svg('mail', 15)}</button>
          ${svg('wifi', 15)}${svg('volume', 15)}
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
      eteindre() { eteindre(); }
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
      const gauche = Math.max(0, ...$$('.icones-bureau .icone-bureau').map(b => b.getBoundingClientRect().right)) + 16;
      const largeurUtile = dispo.width - gauche - 16;
      const w = Math.round(Math.min(a.taille[0], Math.max(320, largeurUtile)));
      const h = Math.round(Math.min(a.taille[1], dispo.height - 32));
      const pas = (decalage++ % 6) * 28;
      const x = Math.round(Math.min(Math.max(gauche, gauche + (largeurUtile - w) / 2 + pas - 40), dispo.width - w - 10));
      const y = Math.round(Math.min(Math.max(16, (dispo.height - h) / 2 + pas - 40), dispo.height - h - 10));

      const el = creer(`
        <section class="fenetre" role="dialog" aria-label="${echapper(a.titre)}">
          <header class="titre">
            <span class="ico">${svg(a.icone, 15)}</span>
            <span class="nom">${echapper(a.titre)}</span>
            <span class="ctrl">
              <button class="min" title="Réduire" aria-label="Réduire">${svg('moins', 13)}</button>
              <button class="max" title="Agrandir" aria-label="Agrandir">${svg('carre', 13)}</button>
              <button class="fermer" title="Fermer" aria-label="Fermer">${svg('fermer', 13)}</button>
            </span>
          </header>
          <div class="corps"></div>
          <div class="poignee" aria-hidden="true"></div>
        </section>`);
      Object.assign(el.style, { left: Math.max(0, x) + 'px', top: Math.max(0, y) + 'px', width: w + 'px', height: h + 'px' });

      const tache = creer(`<button class="tache" title="${echapper(a.titre)}">${svg(a.icone, 15)}<span>${echapper(a.titre)}</span></button>`);
      const etat = { id, el, tache, app: a, adresse: a.adresse || '' };
      fenetres.set(id, etat);
      zoneFenetres.append(el);
      zoneTaches.append(tache);

      $('.min', el).addEventListener('click', e => { e.stopPropagation(); minimiser(id); });
      $('.max', el).addEventListener('click', e => { e.stopPropagation(); basculerMax(id); });
      $('.fermer', el).addEventListener('click', e => { e.stopPropagation(); fermer(id); });
      $('.titre', el).addEventListener('dblclick', e => { if (!e.target.closest('button')) basculerMax(id); });
      el.addEventListener('pointerdown', () => focusFenetre(id), true);
      tache.addEventListener('click', () => {
        if (el.classList.contains('minimisee')) focusFenetre(id);
        else if (!el.classList.contains('inactive') && fenetreDuDessus() === etat) minimiser(id);
        else focusFenetre(id);
      });

      deplacement(etat);
      redimension(etat);
      a.ouvrir($('.corps', el), etat, options);
      focusFenetre(id);
      return etat;
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
      if (!etat) return;
      const max = typeof forcer === 'boolean' ? forcer : !etat.el.classList.contains('maximisee');
      etat.el.classList.toggle('maximisee', max);
      const b = $('.max', etat.el);
      b.innerHTML = svg(max ? 'restaurer' : 'carre', 13);
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
          el.style.top = Math.min(Math.max(ev.clientY - dy, 0), zone.height - 38) + 'px';
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
        if (el.offsetTop > zone.height - 38) el.style.top = Math.max(0, zone.height - el.offsetHeight - 8) + 'px';
      }
    });

    /* ----- Contenus ----- */

    function contenuBlog(corps, etat, options) {
      corps.innerHTML = `
        <div class="blog">
          <aside class="blog-cote">
            <div class="blog-cote-tete">
              <h2>Blog</h2>
              <div class="meta"><span class="nb">Chargement…</span></div>
              <div class="filtres"></div>
            </div>
            <div class="blog-liste">
              <div class="squelette" style="height:96px"></div>
              <div class="squelette" style="height:96px"></div>
              <div class="squelette" style="height:96px"></div>
            </div>
          </aside>
          <div class="blog-lecture"><div class="vide"><div>${svg('fichier', 28)}<br>Chargement…</div></div></div>
        </div>`;
      const liste = $('.blog-liste', corps);
      const lecture = $('.blog-lecture', corps);
      const filtres = $('.filtres', corps);
      let articles = [];
      let filtre = '';
      let actuel = '';

      const dessinerListe = () => {
        const visibles = filtre ? articles.filter(a => a.categorie === filtre) : articles;
        liste.innerHTML = visibles.map(a => htmlCarteArticle(a, a.url === actuel)).join('') || '<div class="vide">Aucun article ici.</div>';
      };

      const afficher = url => {
        const a = articles.find(x => x.url === url) || articles[0];
        if (!a) return;
        actuel = a.url;
        $$('.carte-article', liste).forEach(b => b.classList.toggle('active', b.dataset.url === a.url));
        lecture.innerHTML = `
          <div class="contenu">
            ${htmlArticle(a)}
            <div class="article-actions">
              <button class="btn" data-a="lien">${svg('lien', 16)}Copier le lien</button>
              <a class="btn" href="${echapper(a.url)}" target="_blank" rel="noopener">${svg('externe', 16)}Ouvrir la page</a>
            </div>
          </div>`;
        lecture.scrollTop = 0;
        etat.adresse = 'article/' + encodeURIComponent(a.url);
        if (!etat.el.classList.contains('inactive')) definirAdresse(etat.adresse);
        $('[data-a="lien"]', lecture).addEventListener('click', e => copier(lienArticle(a), e.currentTarget, 'Lien copié'));
      };

      etat.reouvrir = o => { if (o && o.article && articles.length) afficher(o.article); };
      liste.addEventListener('click', e => { const b = e.target.closest('.carte-article'); if (b) afficher(b.dataset.url); });
      filtres.addEventListener('click', e => {
        const b = e.target.closest('.filtre');
        if (!b) return;
        filtre = b.dataset.cat;
        $$('.filtre', filtres).forEach(x => x.classList.toggle('actif', x === b));
        dessinerListe();
      });

      chargerArticles().then(tous => {
        articles = tous;
        $('.nb', corps).textContent = articles.length + (articles.length > 1 ? ' articles' : ' article');
        const cats = categories(articles);
        filtres.innerHTML = cats.length > 1
          ? `<button class="filtre actif" data-cat="">Tous</button>${cats.map(c => `<button class="filtre" data-cat="${echapper(c)}">${echapper(c)}</button>`).join('')}`
          : '';
        if (!articles.length) {
          liste.innerHTML = '';
          lecture.innerHTML = `<div class="vide"><div>${svg('fichier', 28)}<br>Pas encore d'article. Le premier arrive bientôt.</div></div>`;
          return;
        }
        actuel = options && options.article ? options.article : articles[0].url;
        dessinerListe();
        afficher(actuel);
      }).catch(() => {
        $('.nb', corps).textContent = 'Hors ligne';
        liste.innerHTML = '';
        lecture.innerHTML = `<div class="vide"><div>${svg('wifi', 28)}<br>Impossible de charger le blog.<br>Il s'affiche une fois le site en ligne.</div></div>`;
      });
    }

    function contenuJeux(corps) {
      corps.innerHTML = `
        <div class="page-fenetre">
          <div class="page-fenetre-tete">
            <div><h2>Jeux</h2><p>${JEUX.length} mini-jeux codés à la main. Tout se joue dans le navigateur.</p></div>
            <button class="btn" data-action="hasard">${svg('hasard', 16)}Au hasard</button>
          </div>
          <div class="grille-jeux">${JEUX.map(htmlCarteJeu).join('')}</div>
        </div>`;
      corps.addEventListener('click', e => {
        const b = e.target.closest('[data-jeu], [data-action]');
        if (!b) return;
        if (b.dataset.jeu) ouvrirApp('jeu-' + b.dataset.jeu);
        else actions[b.dataset.action]();
      });
    }

    function contenuJeu(corps, etat, jeu) {
      corps.classList.add('sans-defilement');
      corps.innerHTML = `
        <div class="barre-menus">
          <button data-a="recommencer">${svg('recharger', 14)}Recommencer</button>
          <button data-a="plein">${svg('agrandir', 14)}Plein écran</button>
          <button data-a="onglet">${svg('externe', 14)}Nouvel onglet</button>
        </div>
        <iframe src="${echapper(jeu.fichier)}" title="${echapper(jeu.titre)}" allow="fullscreen; clipboard-write"></iframe>`;
      const iframe = $('iframe', corps);
      const focusJeu = () => { try { iframe.contentWindow.focus(); } catch (e) { /* rien */ } };
      etat.surFocus = focusJeu;
      iframe.addEventListener('load', () => { if (!etat.el.classList.contains('inactive')) focusJeu(); });
      $('.barre-menus', corps).addEventListener('click', e => {
        const a = e.target.closest('button')?.dataset.a;
        if (a === 'recommencer') { try { iframe.contentWindow.location.reload(); } catch (err) { iframe.src = jeu.fichier; } }
        if (a === 'plein') { const f = iframe.requestFullscreen || iframe.webkitRequestFullscreen; if (f) f.call(iframe); }
        if (a === 'onglet') window.open(jeu.fichier, '_blank', 'noopener');
      });
    }

    function contenuAPropos(corps, etat) {
      const fond = FONDS.find(f => f.id === document.documentElement.dataset.fond) || FONDS[0];
      corps.innerHTML = `
        <div class="page-fenetre">
          <div class="profil">${logo(56)}<div><h2>${echapper(NOM)}</h2><div class="meta"><span>@${echapper(C.pseudo || '')}</span></div></div></div>
          <p class="bio selectionnable">${echapper(C.bio || '')}</p>
          <dl class="specs">
            <div><dt>Articles</dt><dd data-nb>…</dd></div>
            <div><dt>Jeux</dt><dd>${JEUX.length}</dd></div>
            <div><dt>Fond d'écran</dt><dd data-fond>${echapper(fond.nom)}</dd></div>
            <div><dt>Version</dt><dd>2.0</dd></div>
          </dl>
          <div class="actions">
            <button class="btn btn-primaire" data-a="contact">${svg('mail', 16)}Me contacter</button>
            <button class="btn" data-a="fond">${svg('image', 16)}Changer le fond</button>
          </div>
        </div>`;
      chargerArticles().then(l => { $('[data-nb]', corps).textContent = l.length; }).catch(() => { $('[data-nb]', corps).textContent = '—'; });
      corps.addEventListener('click', e => {
        const a = e.target.closest('button')?.dataset.a;
        if (a === 'contact') ouvrirApp('contact');
        if (a === 'fond') $('[data-fond]', corps).textContent = changerFond().nom;
      });
    }

    function contenuContact(corps) {
      const mail = adresseMail();
      corps.innerHTML = `
        <div class="page-fenetre">
          <div class="page-fenetre-tete"><div><h2>Contact</h2><p>Une question, une idée de jeu ? Écris-moi.</p></div></div>
          <span class="adresse-mail selectionnable">${echapper(mail)}</span>
          <div class="actions">
            <a class="btn btn-primaire" href="mailto:${encodeURI(mail)}">${svg('mail', 16)}Écrire un mail</a>
            <button class="btn" data-a="copier">${svg('copier', 16)}Copier l'adresse</button>
          </div>
        </div>`;
      $('[data-a="copier"]', corps).addEventListener('click', e => copier(mail, e.currentTarget));
    }

    function contenuCorbeille(corps) {
      const dessiner = () => {
        const vide = session.lire('site-corbeille') === 'vide';
        corps.innerHTML = vide
          ? `<div class="vide"><div>${svg('corbeille', 28)}<br>La corbeille est vide.</div></div>`
          : `<div class="page-fenetre">
              <ul class="fichiers">
                <li>${svg('fichier', 16)}brouillon_article.md<span class="taille">3 Ko</span></li>
                <li>${svg('image', 16)}ancien_logo.png<span class="taille">24 Ko</span></li>
                <li>${svg('manette', 16)}test_jeu_v0.html<span class="taille">6 Ko</span></li>
              </ul>
              <div class="actions"><button class="btn" data-a="vider">${svg('corbeille', 16)}Vider la corbeille</button></div>
            </div>`;
        $('[data-a="vider"]', corps)?.addEventListener('click', () => { session.ecrire('site-corbeille', 'vide'); dessiner(); });
      };
      dessiner();
    }

    /* ----- Bureau, menus ----- */

    function dessinerIcones() {
      const zone = $('.icones-bureau');
      const tactile = window.matchMedia('(hover: none)').matches;
      zone.innerHTML = '';
      ICONES_BUREAU.forEach(item => {
        const b = creer(`<button class="icone-bureau${item.coin ? ' coin' : ''}" role="listitem"><span class="tuile">${svg(item.icone, 21)}</span><span>${echapper(item.nom)}</span></button>`);
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

    function construireMenu() {
      const item = (attr, icone, titre, sous) => `<button class="menu-item" role="menuitem" ${attr}><span class="ico">${svg(icone, 15)}</span><span>${echapper(titre)}${sous ? `<small>${echapper(sous)}</small>` : ''}</span></button>`;
      menu.innerHTML = `
        <div class="menu-entete">${logo(40)}<div><strong>${echapper(NOM)}</strong><small>@${echapper(C.pseudo || '')}</small></div></div>
        <div class="menu-colonnes">
          <div class="menu-gauche">
            ${item('data-app="blog"', 'fichier', 'Blog', 'Les derniers articles')}
            ${item('data-app="jeux"', 'manette', 'Tous les jeux', JEUX.length + ' jeux')}
            <div class="menu-titre">Jeux</div>
            ${JEUX.map(j => item(`data-app="jeu-${echapper(j.id)}"`, j.icone, j.titre)).join('')}
          </div>
          <div class="menu-droite">
            <div class="menu-titre">Raccourcis</div>
            ${item('data-app="apropos"', 'info', 'À propos')}
            ${item('data-app="contact"', 'mail', 'Contact')}
            ${item('data-app="corbeille"', 'corbeille', 'Corbeille')}
            <div class="menu-titre">Système</div>
            ${item('data-action="hasard"', 'hasard', 'Jeu au hasard')}
            ${item('data-action="fond"', 'image', "Fond d'écran")}
          </div>
        </div>
        <div class="menu-pied"><span>v2.0</span>${item('data-action="eteindre"', 'eteindre', 'Éteindre')}</div>`;
      menu.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        fermerMenus();
        if (b.dataset.app) ouvrirApp(b.dataset.app);
        else if (actions[b.dataset.action]) actions[b.dataset.action]();
      });
    }

    function basculerMenu(ouvrir) {
      const doit = typeof ouvrir === 'boolean' ? ouvrir : menu.hidden;
      menu.hidden = !doit;
      btnDemarrer.classList.toggle('ouvert', doit);
      btnDemarrer.setAttribute('aria-expanded', String(doit));
      if (doit) menuCtx.hidden = true;
    }

    function fermerMenus() { basculerMenu(false); menuCtx.hidden = true; }

    function ouvrirMenuContextuel(x, y) {
      menuCtx.innerHTML = `
        <button data-action="fond">${svg('image', 15)}Fond d'écran suivant</button>
        <hr>
        <button data-app="blog">${svg('fichier', 15)}Ouvrir le blog</button>
        <button data-app="jeux">${svg('manette', 15)}Ouvrir les jeux</button>
        <button data-action="hasard">${svg('hasard', 15)}Jeu au hasard</button>
        <hr>
        <button data-app="apropos">${svg('info', 15)}À propos</button>`;
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
      document.documentElement.dataset.fond = suivant.id;
      stockage.ecrire('site-fond', suivant.id);
      bulle("Fond d'écran", suivant.nom, 2500);
      return suivant;
    }

    let minuterieBulle = null;
    function bulle(titre, texte, duree = 7000) {
      const b = $('.bulle');
      b.innerHTML = `<button class="fermer-bulle" aria-label="Fermer">${svg('fermer', 14)}</button><strong><span class="pastille" style="height:18px;padding:0 6px"><span class="point"></span></span>${echapper(titre)}</strong><p>${echapper(texte)}</p>`;
      b.hidden = false;
      $('.fermer-bulle', b).addEventListener('click', () => { b.hidden = true; });
      clearTimeout(minuterieBulle);
      minuterieBulle = setTimeout(() => { b.hidden = true; }, duree);
    }

    function horloge() {
      const d = new Date();
      const h = $('.horloge');
      h.textContent = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      h.title = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    function eteindre() {
      fermerMenus();
      const ecran = creer(`<div class="extinction"><div>${logo(56)}<h2>Session fermée</h2><p>Tu peux fermer l'onglet en toute sécurité.</p><button class="btn btn-primaire">${svg('eteindre', 16)}Redémarrer</button></div></div>`);
      document.body.append(ecran);
      $('button', ecran).addEventListener('click', () => { session.ecrire('site-demarre', '0'); location.href = location.pathname; });
    }

    function suivreAdresse() {
      const h = lireHash();
      if (!h) return false;
      if (['blog', 'jeux', 'apropos', 'contact'].includes(h)) ouvrirApp(h);
      else if (h.startsWith('jeu/')) ouvrirApp('jeu-' + h.slice(4));
      else if (h.startsWith('article/')) ouvrirApp('blog', { article: h.slice(8) });
      else return false;
      return true;
    }

    /* ----- C'est parti ----- */

    const fondEnregistre = stockage.lire('site-fond', FONDS[0].id);
    document.documentElement.dataset.fond = FONDS.some(f => f.id === fondEnregistre) ? fondEnregistre : FONDS[0].id;

    dessinerIcones();
    construireMenu();
    horloge();
    setInterval(horloge, 10000);

    btnDemarrer.addEventListener('click', e => { e.stopPropagation(); basculerMenu(); });
    $('.notif-contact').addEventListener('click', () => ouvrirApp('contact'));
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
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerMenus(); });
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
        <div class="m-grille-jeux">${JEUX.map(htmlCarteJeu).join('')}</div>`;
    }

    function vueMoi() {
      const mail = adresseMail();
      vues.moi.innerHTML = `
        <h1 class="m-titre-vue">À propos</h1>
        <p class="m-sous-titre">@${echapper(C.pseudo || '')}</p>
        <div class="m-carte">
          <div class="profil">${logo(52)}<div><h2>${echapper(NOM)}</h2><div class="meta"><span>${articles.length || '–'} articles</span><span>${JEUX.length} jeux</span></div></div></div>
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
        <p class="m-pied">Sur ordinateur, le site s'ouvre en mode bureau.</p>`;
    }

    function dessinerTout() { vueAccueil(); vueBlog(); vueJeux(); vueMoi(); }

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

    function ouvrirJeu(id, pousser) {
      const j = JEUX.find(x => x.id === id);
      if (!j) return;
      ouvrirEcran(j.titre, `<iframe src="${echapper(j.fichier)}" title="${echapper(j.titre)}" allow="fullscreen; clipboard-write"></iframe>`, {
        icone: 'recharger',
        nom: 'Recommencer',
        faire: () => { const f = $('iframe', ecranCorps); if (f) { try { f.contentWindow.location.reload(); } catch (e) { f.src = j.fichier; } } }
      }, 'jeu/' + j.id, true, pousser);
    }

    /* ----- Navigation ----- */

    function suivreAdresse(evenement) {
      const h = lireHash();
      const ecranDemande = h.startsWith('jeu/') || h.startsWith('article/');
      // Lien direct vers un jeu ou un article : on glisse d'abord l'accueil
      // dans l'historique, pour que « retour » ramène bien sur le site
      if (ecranDemande && !evenement && !(history.state && history.state.ecran)) {
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* rien */ }
      }
      if (h.startsWith('jeu/')) { ouvrirJeu(h.slice(4)); return; }
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
