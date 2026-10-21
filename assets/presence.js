/* ==========================================================
   Présence : combien de personnes sont sur le site en ce moment,
   et les annonces « Untel a créé une partie de … ».
   - une seule connexion par onglet (les jeux ouverts dans une fenêtre
     du site utilisent celle de la page, via window.parent.DinoPresence)
   - DinoPresence.ecouter(fn) : fn({ t: 'compte', n }), fn({ t: 'partie', jeu, code, nom })
     ou fn({ t: 'parties', liste: [{ jeu, code, hote, n, max, phase }] })
   - DinoPresence.annoncer(jeu, code, nom) : prévient tous les autres
   - fn({ t: 'contacts', liste: [{ cle, nom, jeu }], visiteurs }) : joueurs connectés à leur compte
   - fn({ t: 'invitation', de, deCle, jeu, code }) : quelqu'un t'invite
   - DinoPresence.activite(jeu) / DinoPresence.inviter(cle, jeu, code)
   ========================================================== */
(function () {
  if (window.DinoPresence) return;

  const conf = window.SITE_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const EN_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const SERVEUR = params.get('serveur') || (EN_LOCAL ? '127.0.0.1:8787' : (conf.serveurJeux || ''));
  const SECURISE = !/^(localhost|127\.)/.test(SERVEUR);

  const ecouteurs = new Set();
  let ws = null, n = null, parties = [], contacts = { t: 'contacts', liste: [], visiteurs: 0 }, activite = null, jetonEnvoye = null, attente = 2000, minuteriePing = null, relance = null;

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
      jetonEnvoye = null;
      direQuiJeSuis();
      if (activite) ceWs.send(JSON.stringify({ t: 'activite', jeu: activite }));
      clearInterval(minuteriePing);
      minuteriePing = setInterval(() => { if (ceWs.readyState === 1) ceWs.send('ping'); }, 25000);
    };
    ceWs.onmessage = ev => {
      if (ev.data === 'pong') return;
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'compte') n = m.n;
      if (m.t === 'parties') parties = Array.isArray(m.liste) ? m.liste : [];
      if (m.t === 'contacts') contacts = m;
      prevenir(m);
    };
    ceWs.onclose = () => {
      if (ws !== ceWs) return;
      ws = null;
      clearInterval(minuteriePing);
      n = null;
      parties = [];
      contacts = { t: 'contacts', liste: [], visiteurs: 0 };
      prevenir(contacts);
      prevenir({ t: 'compte', n: null });
      prevenir({ t: 'parties', liste: [] });
      // on réessaie de plus en plus doucement (2 s, 4 s, 8 s… jusqu'à 1 min)
      clearTimeout(relance);
      relance = setTimeout(connecter, attente);
      attente = Math.min(60000, attente * 2);
    };
  }

  // dire au serveur qui on est (compte connecté ou visiteur)
  function direQuiJeSuis() {
    const jeton = (window.DinoCompte && window.DinoCompte.jeton) || '';
    if (!ws || ws.readyState !== 1 || jeton === jetonEnvoye) return;
    jetonEnvoye = jeton;
    ws.send(JSON.stringify({ t: 'moi', jeton }));
  }
  if (window.DinoCompte) window.DinoCompte.ecouter(() => { jetonEnvoye = null; direQuiJeSuis(); });

  // onglet en arrière-plan longtemps puis revenu : on se reconnecte tout de suite
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !ws) { clearTimeout(relance); attente = 2000; connecter(); }
  });

  window.DinoPresence = {
    get n() { return n; },
    get parties() { return parties; },
    get contacts() { return contacts; },
    // réglages du compte changés (invisible…) : on se re-présente au serveur
    rafraichir() { jetonEnvoye = null; direQuiJeSuis(); },
    activite(jeu) {
      jeu = jeu || null;
      if (jeu === activite) return;
      activite = jeu;
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'activite', jeu }));
    },
    // renvoie { ok, raison }
    inviter(cible, jeu, code) {
      if (!ws || ws.readyState !== 1) return Promise.resolve({ ok: false, raison: 'Pas connecté au serveur.' });
      ws.send(JSON.stringify({ t: 'inviter', cible, jeu, code }));
      return new Promise(resolve => {
        const fin = v => { ecouteurs.delete(fn); clearTimeout(m); resolve(v); };
        const fn = msg => { if (msg.t === 'invite-ok' && msg.cible === cible) fin({ ok: msg.ok, raison: msg.raison }); };
        const m = setTimeout(() => fin({ ok: false, raison: 'Pas de réponse du serveur.' }), 5000);
        ecouteurs.add(fn);
      });
    },
    // chat (il faut un compte) : envoyer un message brut au serveur de présence
    envoyer(msg) {
      if (!ws || ws.readyState !== 1) return false;
      ws.send(JSON.stringify(msg));
      return true;
    },
    get connecte() { return !!(ws && ws.readyState === 1); },
    get actif() { return !!SERVEUR; },
    ecouter(fn) {
      ecouteurs.add(fn);
      if (n !== null) { try { fn({ t: 'compte', n }); fn({ t: 'parties', liste: parties }); fn(contacts); } catch (e) { /* rien */ } }
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
