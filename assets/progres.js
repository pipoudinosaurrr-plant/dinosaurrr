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

  window.DinoProgres = {
    // fin d'une partie : jeu = id du jeu (dinorun, 2048…), score (si le jeu en a un), gagne (true/false)
    async fin(jeu, infos = {}) {
      try {
        const c = await compte();
        if (!c || !c.connecte) return null;
        const r = await c.api('progres', { jeu, score: infos.score, gagne: !!infos.gagne });
        montrer(r);
        return r;
      } catch (e) { return null; }
    },
    ecouter(fn) { ecouteurs.add(fn); return () => ecouteurs.delete(fn); },
    notif
  };
})();
