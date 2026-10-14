/* ==========================================================
   Présence : combien de personnes sont sur le site en ce moment,
   et les annonces « Untel a créé une partie de … ».
   - une seule connexion par onglet (les jeux ouverts dans une fenêtre
     du site utilisent celle de la page, via window.parent.DinoPresence)
   - DinoPresence.ecouter(fn) : fn({ t: 'compte', n }) ou fn({ t: 'partie', jeu, code, nom })
   - DinoPresence.annoncer(jeu, code, nom) : prévient tous les autres
   ========================================================== */
(function () {
  if (window.DinoPresence) return;

  const conf = window.SITE_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const EN_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const SERVEUR = params.get('serveur') || (EN_LOCAL ? '127.0.0.1:8787' : (conf.serveurJeux || ''));
  const SECURISE = !/^(localhost|127\.)/.test(SERVEUR);

  const ecouteurs = new Set();
  let ws = null, n = null, attente = 2000, minuteriePing = null, relance = null;

  function prevenir(msg) {
    for (const fn of [...ecouteurs]) {
      try { fn(msg); } catch (e) { ecouteurs.delete(fn); /* fenêtre de jeu fermée */ }
    }
  }

  function connecter() {
    if (!SERVEUR || ws) return;
    try { ws = new WebSocket(`${SECURISE ? 'wss' : 'ws'}://${SERVEUR}/presence`); } catch (e) { ws = null; return; }
    const ceWs = ws;
    ceWs.onopen = () => {
      attente = 2000;
      clearInterval(minuteriePing);
      minuteriePing = setInterval(() => { if (ceWs.readyState === 1) ceWs.send('ping'); }, 25000);
    };
    ceWs.onmessage = ev => {
      if (ev.data === 'pong') return;
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'compte') n = m.n;
      prevenir(m);
    };
    ceWs.onclose = () => {
      if (ws !== ceWs) return;
      ws = null;
      clearInterval(minuteriePing);
      n = null;
      prevenir({ t: 'compte', n: null });
      // on réessaie de plus en plus doucement (2 s, 4 s, 8 s… jusqu'à 1 min)
      clearTimeout(relance);
      relance = setTimeout(connecter, attente);
      attente = Math.min(60000, attente * 2);
    };
  }

  // onglet en arrière-plan longtemps puis revenu : on se reconnecte tout de suite
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !ws) { clearTimeout(relance); attente = 2000; connecter(); }
  });

  window.DinoPresence = {
    get n() { return n; },
    get actif() { return !!SERVEUR; },
    ecouter(fn) {
      ecouteurs.add(fn);
      if (n !== null) { try { fn({ t: 'compte', n }); } catch (e) { /* rien */ } }
      return () => ecouteurs.delete(fn);
    },
    // renvoie (plus tard) le nombre de personnes prévenues, ou null
    annoncer(jeu, code, nom) {
      if (!ws || ws.readyState !== 1) return Promise.resolve(null);
      ws.send(JSON.stringify({ t: 'annonce', jeu, code, nom }));
      return new Promise(resolve => {
        const fin = v => { ecouteurs.delete(fn); clearTimeout(m); resolve(v); };
        const fn = msg => { if (msg.t === 'annonce-ok') fin(msg.n); };
        const m = setTimeout(() => fin(null), 4000);
        ecouteurs.add(fn);
      });
    }
  };

  connecter();
})();
