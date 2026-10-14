/* ==========================================================
   Le compte du joueur (pseudo réservé + mot de passe)
   - le jeton de connexion est gardé dans ce navigateur
   - DinoCompte.ecouter(fn) : fn(compte) à chaque changement (null = déconnecté)
   - DinoCompte.api(action, donnees) : appelle le serveur (/compte/…)
   Les jeux ouverts dans une fenêtre du site utilisent celui de la page.
   ========================================================== */
(function () {
  if (window.DinoCompte) return;

  const conf = window.SITE_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const EN_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const SERVEUR = params.get('serveur') || (EN_LOCAL ? '127.0.0.1:8787' : (conf.serveurJeux || ''));
  const SECURISE = !/^(localhost|127\.)/.test(SERVEUR);
  const BASE = `${SECURISE ? 'https' : 'http'}://${SERVEUR}/compte/`;
  const CLE_JETON = 'dino-jeton', CLE_COMPTE = 'dino-compte';

  const stock = {
    lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    ecrire(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* rien */ } }
  };

  let jeton = stock.lire(CLE_JETON) || '';
  let compte = null;
  try { compte = jeton ? JSON.parse(stock.lire(CLE_COMPTE) || 'null') : null; } catch (e) { compte = null; }
  let amis = [];
  const ecouteurs = new Set();

  function prevenir() {
    for (const fn of [...ecouteurs]) { try { fn(compte); } catch (e) { ecouteurs.delete(fn); } }
  }

  function enregistrer(nouveauJeton, nouveauCompte) {
    jeton = nouveauJeton || '';
    compte = nouveauJeton ? nouveauCompte : null;
    if (!jeton) amis = [];
    stock.ecrire(CLE_JETON, jeton || null);
    stock.ecrire(CLE_COMPTE, compte ? JSON.stringify(compte) : null);
    prevenir();
  }

  async function api(action, donnees = {}) {
    if (!SERVEUR) return { erreur: 'Le serveur n’est pas branché.' };
    let r;
    try {
      r = await fetch(BASE + action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(jeton ? { authorization: 'Bearer ' + jeton } : {}) },
        body: JSON.stringify(donnees),
        cache: 'no-store'
      });
    } catch (e) { return { erreur: 'Impossible de joindre le serveur. Vérifie ta connexion.' }; }
    let d = {};
    try { d = await r.json(); } catch (e) { d = { erreur: 'Réponse bizarre du serveur.' }; }
    if (d.deconnecte && jeton) enregistrer('', null);
    if (!r.ok && !d.erreur) d.erreur = 'Erreur ' + r.status;
    return d;
  }

  // un autre onglet s'est connecté ou déconnecté
  window.addEventListener('storage', e => {
    if (e.key !== CLE_JETON && e.key !== CLE_COMPTE) return;
    jeton = stock.lire(CLE_JETON) || '';
    try { compte = jeton ? JSON.parse(stock.lire(CLE_COMPTE) || 'null') : null; } catch (err) { compte = null; }
    prevenir();
  });

  window.DinoCompte = {
    get jeton() { return jeton; },
    get compte() { return compte; },
    get nom() { return compte ? compte.nom : null; },
    get connecte() { return !!(jeton && compte); },
    get amis() { return amis; },
    get actif() { return !!SERVEUR; },
    api,
    ecouter(fn) { ecouteurs.add(fn); try { fn(compte); } catch (e) { /* rien */ } return () => ecouteurs.delete(fn); },

    async inscription(nom, mdp) {
      const d = await api('inscription', { nom, mdp });
      if (d.jeton) enregistrer(d.jeton, d.compte);
      return d;
    },
    // le propriétaire du site crée / reprend son compte avec son code secret
    async reclamer(code, mdp) {
      const d = await api('reclamer', { code, mdp });
      if (d.jeton) enregistrer(d.jeton, d.compte);
      return d;
    },
    async connexion(nom, mdp) {
      const d = await api('connexion', { nom, mdp });
      if (d.jeton) enregistrer(d.jeton, d.compte);
      return d;
    },
    async deconnexion() {
      if (jeton) await api('deconnexion');
      enregistrer('', null);
    },
    async moi() {
      if (!jeton) return null;
      const d = await api('moi');
      if (d.compte) { compte = d.compte; stock.ecrire(CLE_COMPTE, JSON.stringify(compte)); prevenir(); }
      return d;
    },
    async reglages(r) {
      const d = await api('reglages', r);
      if (d.compte) { compte = d.compte; stock.ecrire(CLE_COMPTE, JSON.stringify(compte)); prevenir(); }
      return d;
    },
    async supprimer(mdp) {
      const d = await api('supprimer', { mdp });
      if (d.ok) enregistrer('', null);
      return d;
    },
    async chargerAmis() {
      if (!jeton) { amis = []; return amis; }
      const d = await api('amis');
      if (d.amis) { amis = d.amis; prevenir(); }
      return amis;
    },
    async ami(action, nom) {
      const d = await api(action, { nom });
      if (d.amis) { amis = d.amis; prevenir(); }
      return d;
    }
  };

  // au démarrage : on vérifie que la session est toujours bonne (et on récupère les amis)
  if (jeton) window.DinoCompte.moi().then(() => window.DinoCompte.chargerAmis());
})();
