/* ==========================================================
   Installer le site comme une appli (téléphone, tablette, ordinateur)
   DinoAppli.installee   → vrai si le site est ouvert depuis l'appli
   DinoAppli.peutInstaller() → vrai si le navigateur propose le bouton « Installer »
   DinoAppli.installer()  → ouvre la fenêtre d'installation du navigateur
   DinoAppli.systeme      → 'ios', 'android' ou 'autre' (pour les explications)
   DinoAppli.ecouter(f)   → f() quand ça change
   ========================================================== */
(function () {
  if (window.DinoAppli) return;
  let invite = null;
  const ecouteurs = new Set();
  const prevenir = () => ecouteurs.forEach(f => { try { f(); } catch (e) { /* rien */ } });
  const ua = navigator.userAgent || '';
  const systeme = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : /Android/.test(ua) ? 'android' : 'autre';
  const installee = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;

  addEventListener('beforeinstallprompt', e => { e.preventDefault(); invite = e; prevenir(); });
  addEventListener('appinstalled', () => { invite = null; prevenir(); });

  window.DinoAppli = {
    systeme,
    get installee() { return installee(); },
    peutInstaller: () => !!invite,
    async installer() {
      if (!invite) return false;
      invite.prompt();
      const r = await invite.userChoice.catch(() => null);
      invite = null; prevenir();
      return !!(r && r.outcome === 'accepted');
    },
    ecouter(f) { ecouteurs.add(f); return () => ecouteurs.delete(f); }
  };

  // le service worker (sw.js) : installation + hors ligne
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
})();
