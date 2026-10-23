/* ==========================================================
   DinoProgres : envoie la fin d'une partie au serveur (XP, succès, défi du jour,
   records) et affiche les petites notifications « +15 XP », « Succès débloqué »…
   - DinoProgres.fin(jeu, { score, gagne }) : à appeler à la fin d'une partie
   - il faut être connecté à son compte (sinon rien n'est envoyé)
   - dans une fenêtre du site, c'est la page principale qui s'en occupe
   ========================================================== */
(function () {
  if (window.DinoProgres) return;
  try {
    if (window.parent !== window && window.parent.DinoProgres) { window.DinoProgres = window.parent.DinoProgres; return; }
  } catch (e) { /* autre site */ }

  const base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]*$/, '') : '../assets/';
  let defs = null;
  const chargerDefs = () => defs || (defs = import(base + 'progres-defs.js').catch(() => null));
  function chargerScript(src) {
    return new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.append(s); });
  }
  async function compte() {
    // jeu ouvert tout seul (pas dans le site) : il faut l'adresse du serveur avant le compte
    if (!window.DinoCompte && !window.SITE_CONFIG) await chargerScript(base + 'config.js');
    if (!window.DinoCompte) await chargerScript(base + 'compte.js');
    return window.DinoCompte || null;
  }

  /* ---------- notifications ---------- */
  let pile = null;
  function zone() {
    if (pile && document.body.contains(pile)) return pile;
    const style = document.createElement('style');
    style.textContent = `
      .progres-pile { position: fixed; left: 50%; top: 14px; transform: translateX(-50%); z-index: 2147483000; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; }
      .progres-notif { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-radius: 12px; background: rgba(12, 12, 12, .94); border: 1px solid rgba(255, 255, 255, .16);
        color: #fff; font: 600 13px system-ui, -apple-system, Segoe UI, sans-serif; box-shadow: 0 10px 30px rgba(0, 0, 0, .45); animation: progres-in .35s ease-out; max-width: min(92vw, 380px); }
      .progres-notif .ico { font-size: 20px; }
      .progres-notif small { display: block; color: #a3a3a3; font-weight: 500; font-size: 11.5px; }
      .progres-notif.or { border-color: rgba(250, 204, 21, .6); }
      .progres-notif.vert { border-color: rgba(34, 197, 94, .6); }
      .progres-notif.sort { opacity: 0; transform: translateY(-8px); transition: .4s; }
      @keyframes progres-in { from { opacity: 0; transform: translateY(-10px) scale(.96); } to { opacity: 1; transform: none; } }`;
    document.head.append(style);
    pile = document.createElement('div');
    pile.className = 'progres-pile';
    document.body.append(pile);
    return pile;
  }
  function notif(icone, titre, sous, classe, duree = 3600) {
    const n = document.createElement('div');
    n.className = 'progres-notif ' + (classe || '');
    n.innerHTML = `<span class="ico"></span><span><b></b><small></small></span>`;
    n.querySelector('.ico').textContent = icone;
    n.querySelector('b').textContent = titre;
    n.querySelector('small').textContent = sous || '';
    if (!sous) n.querySelector('small').remove();
    zone().append(n);
    setTimeout(() => { n.classList.add('sort'); setTimeout(() => n.remove(), 450); }, duree);
  }

  const ecouteurs = new Set();
  async function montrer(r) {
    if (!r || r.erreur || r.ignore) return;
    const d = await chargerDefs();
    let delai = 0;
    const plus = (fn) => { setTimeout(fn, delai); delai += 700; };
    if (r.defi) plus(() => notif('🎯', 'Défi du jour réussi !', r.defi, 'vert', 5000));
    for (const id of r.succes || []) {
      const s = d && d.SUCCES.find(x => x.id === id);
      plus(() => notif(s ? s.icone : '🏆', 'Succès débloqué : ' + (s ? s.nom : id), s ? s.desc : '', 'or', 5000));
    }
    if (r.niveauGagne) plus(() => notif('⬆️', `Niveau ${r.niveauGagne} !`, d ? d.titreDe(r.niveauGagne) : '', 'or', 5000));
    if (r.xp > 0 && !r.defi && !(r.succes || []).length && !r.niveauGagne) plus(() => notif('✨', `+${r.xp} XP`, r.record ? 'Nouveau record personnel !' : '', '', 2200));
    else if (r.record && !(r.succes || []).length) plus(() => notif('📈', 'Nouveau record personnel !', 'Tu es peut-être dans le Hall of Fame', '', 3000));
    for (const fn of ecouteurs) { try { fn(r); } catch (e) { ecouteurs.delete(fn); } }
  }

  /* ---------- parties jouées sans internet ----------
     gardées dans ce navigateur, puis envoyées dès que la connexion revient */
  const CLE_ATTENTE = 'progres-attente';
  const PAS_DE_RESEAU = /joindre le serveur/;
  const lireAttente = () => { try { return JSON.parse(localStorage.getItem(CLE_ATTENTE) || '[]'); } catch (e) { return []; } };
  const ecrireAttente = l => { try { if (l.length) localStorage.setItem(CLE_ATTENTE, JSON.stringify(l.slice(-40))); else localStorage.removeItem(CLE_ATTENTE); } catch (e) { /* rien */ } };
  let envoiEnCours = false;
  async function envoyerAttente() {
    if (envoiEnCours || navigator.onLine === false) return;
    const liste = lireAttente();
    if (!liste.length) return;
    envoiEnCours = true;
    try {
      const c = await compte();
      if (!c || !c.connecte) return;
      let xp = 0, n = 0;
      while (liste.length) {
        const p = liste[0];
        const r = await c.api('progres', { jeu: p.jeu, score: p.score, gagne: !!p.gagne });
        if (r && r.erreur && PAS_DE_RESEAU.test(r.erreur)) break;     // toujours pas de réseau : on réessaiera
        liste.shift(); ecrireAttente(liste); n++;
        if (r && !r.erreur) { xp += r.xp || 0; if (r.defi || (r.succes || []).length || r.niveauGagne) montrer({ ...r, xp: 0 }); }
      }
      if (n) notif('📶', `De retour en ligne : ${n} partie${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''}`, xp ? `+${xp} XP` : '', 'vert', 4000);
    } finally { envoiEnCours = false; }
  }
  addEventListener('online', () => setTimeout(envoyerAttente, 1500));
  setTimeout(envoyerAttente, 4000);

  window.DinoProgres = {
    // fin d'une partie : jeu = id du jeu (dinorun, 2048…), score (si le jeu en a un), gagne (true/false)
    async fin(jeu, infos = {}) {
      try {
        const c = await compte();
        if (!c) return null;
        // sans compte : on compte juste la partie (statistiques du site)
        if (!c.connecte) { if (navigator.onLine !== false) c.api('compter', { jeu }).catch(() => {}); return null; }
        const garder = () => {
          const l = lireAttente(); l.push({ jeu, score: infos.score, gagne: !!infos.gagne, t: Date.now() }); ecrireAttente(l);
          notif('📴', 'Pas d’internet : partie gardée', 'Tes XP arriveront quand tu seras en ligne', '', 3200);
          return null;
        };
        if (navigator.onLine === false) return garder();
        const r = await c.api('progres', { jeu, score: infos.score, gagne: !!infos.gagne });
        if (r && r.erreur && PAS_DE_RESEAU.test(r.erreur)) return garder();
        montrer(r);
        envoyerAttente();
        return r;
      } catch (e) { return null; }
    },
    get enAttente() { return lireAttente().length; },
    ecouter(fn) { ecouteurs.add(fn); return () => ecouteurs.delete(fn); },
    notif
  };
})();
