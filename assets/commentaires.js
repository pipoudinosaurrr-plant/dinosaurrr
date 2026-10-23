/* ==========================================================
   Commentaires sous les articles du blog
   DinoCommentaires.monter(element, urlArticle) : affiche les commentaires et le formulaire
   - lire : tout le monde ; écrire : il faut un compte (le texte passe par le filtre du chat)
   - supprimer : l'auteur du commentaire, ou l'admin
   Utilisé par le bureau, la version téléphone et la page d'article (_layouts/post.html).
   ========================================================== */
(function () {
  if (window.DinoCommentaires) return;
  const base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]*$/, '') : '/assets/';
  const echapper = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const charger = src => new Promise(r => { const s = document.createElement('script'); s.src = src; s.onload = r; s.onerror = r; document.head.append(s); });
  async function compte() {
    if (window.DinoCompte) return window.DinoCompte;
    try { if (window.parent !== window && window.parent.DinoCompte) return window.parent.DinoCompte; } catch (e) { /* rien */ }
    await charger(base + 'compte.js');
    return window.DinoCompte || null;
  }
  async function avatars() {
    if (window.DinoAvatar) return window.DinoAvatar;
    await charger(base + 'avatars.js');
    return window.DinoAvatar || null;
  }
  function ilYa(t) {
    const s = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'à l’instant';
    if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
    if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
    if (s < 86400 * 7) return `il y a ${Math.floor(s / 86400)} j`;
    return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  let style = false;
  function injecterStyle() {
    if (style) return;
    style = true;
    const s = document.createElement('style');
    s.textContent = `
      .dc { margin-top: 34px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.08); font-family: var(--police, Inter, system-ui, sans-serif); }
      .dc h2 { margin: 0 0 14px; font-size: 18px; letter-spacing: -.02em; color: #fafafa; }
      .dc h2 small { color: #71717a; font: 600 13px var(--mono, ui-monospace, monospace); margin-left: 6px; }
      .dc-liste { display: grid; gap: 12px; margin: 0 0 18px; padding: 0; list-style: none; }
      .dc-com { display: grid; grid-template-columns: 34px 1fr; gap: 10px; }
      .dc-com .tete { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; font-size: 13px; }
      .dc-com .nom { color: #fafafa; font-weight: 700; cursor: pointer; }
      .dc-com .nom:hover { text-decoration: underline; }
      .dc-com .quand, .dc-com .niv { color: #71717a; font-size: 12px; }
      .dc-com .admin { color: #fde047; font-size: 12px; }
      .dc-com p { margin: 3px 0 0; color: #d4d4d8; font-size: 14.5px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; -webkit-user-select: text; }
      .dc-com .suppr { border: 0; background: none; color: #71717a; font-size: 12px; cursor: pointer; padding: 0; margin-left: auto; }
      .dc-com .suppr:hover { color: #ef4444; }
      .dc-vide { color: #71717a; font-size: 14px; margin: 0 0 16px; }
      .dc-form textarea { width: 100%; min-height: 76px; resize: vertical; padding: 10px 12px; border: 1px solid #2a2a2a; border-radius: 12px; background: #0b0b0b; color: #ededed; font: 14.5px/1.5 var(--police, Inter, system-ui, sans-serif); user-select: text; -webkit-user-select: text; box-sizing: border-box; }
      .dc-form textarea:focus { outline: none; border-color: #3f3f46; }
      .dc-form .bas { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; }
      .dc-form .reste { color: #71717a; font: 12px var(--mono, ui-monospace, monospace); }
      .dc-form .msg { color: #fca5a5; font-size: 13px; margin: 8px 0 0; }
      .dc-connexion { padding: 14px; border: 1px dashed #2a2a2a; border-radius: 12px; color: #a1a1aa; font-size: 14px; }
      .dc button.dc-btn { height: 36px; padding: 0 16px; border: 0; border-radius: 10px; background: #fafafa; color: #000; font: 600 14px var(--police, Inter, system-ui, sans-serif); cursor: pointer; }
      .dc button.dc-btn:disabled { opacity: .45; cursor: default; }
      /* sur le bureau, la fenêtre du blog est claire puis inversée en sombre : on met donc les couleurs « claires » */
      .mode-bureau .dc { border-top-color: rgba(0,0,0,.12); }
      .mode-bureau .dc h2, .mode-bureau .dc-com .nom { color: #000; }
      .mode-bureau .dc-com p { color: #27272a; }
      .mode-bureau .dc-com .quand, .mode-bureau .dc-com .niv, .mode-bureau .dc-vide, .mode-bureau .dc-form .reste, .mode-bureau .dc h2 small { color: #71717a; }
      .mode-bureau .dc-com .admin { color: #a16207; }
      .mode-bureau .dc-form textarea { background: #fff; color: #000; border-color: #d4d4d8; }
      .mode-bureau .dc-connexion { border-color: #d4d4d8; color: #52525b; }
      .mode-bureau .dc button.dc-btn { background: #000; color: #fff; }
      .mode-bureau .dc-form .msg { color: #b91c1c; }`;
    document.head.append(s);
  }

  async function monter(el, article) {
    if (!el || !article) return;
    injecterStyle();
    el.classList.add('dc');
    el.innerHTML = '<h2>Commentaires</h2><p class="dc-vide">Chargement…</p>';
    const [C, AV] = await Promise.all([compte(), avatars()]);
    if (!C || !C.actif) { el.innerHTML = '<h2>Commentaires</h2><p class="dc-vide">Les commentaires ne sont pas disponibles pour l’instant.</p>'; return; }
    let liste = [];
    async function recharger() {
      const r = await C.api('commentaires', { article });
      if (r && r.erreur) { el.querySelector('.dc-zone').innerHTML = `<p class="dc-vide">${echapper(r.erreur)}</p>`; return; }
      liste = (r && r.commentaires) || [];
      dessinerListe();
    }
    function dessinerListe() {
      const moi = C.connecte && C.compte ? C.compte.nom.toLowerCase() : null;
      const admin = !!(C.compte && C.compte.admin);
      el.querySelector('h2').innerHTML = `Commentaires${liste.length ? `<small>${liste.length}</small>` : ''}`;
      el.querySelector('.dc-zone').innerHTML = liste.length
        ? `<ul class="dc-liste">${liste.map(c => `
          <li class="dc-com">
            <span>${AV ? AV.svg(c.avatar, 34, c.nom) : ''}</span>
            <div>
              <div class="tete"><span class="nom" data-profil="${echapper(c.nom)}">${echapper(c.nom)}</span>${c.admin ? '<span class="admin">⚡ créateur du site</span>' : ''}<span class="niv">niv. ${c.niveau}</span><span class="quand">· ${ilYa(c.t)}</span>
                ${moi === c.nom.toLowerCase() || admin ? `<button class="suppr" data-suppr="${c.id}">Supprimer</button>` : ''}</div>
              <p>${echapper(c.texte)}</p>
            </div>
          </li>`).join('')}</ul>`
        : '<p class="dc-vide">Pas encore de commentaire. Sois le premier !</p>';
    }
    function dessinerFormulaire() {
      const f = el.querySelector('.dc-form-zone');
      if (!C.connecte) {
        f.innerHTML = '<div class="dc-connexion">Connecte-toi à ton compte joueur pour écrire un commentaire (dans <b>Mon compte</b>).</div>';
        return;
      }
      f.innerHTML = `
        <form class="dc-form">
          <textarea maxlength="500" placeholder="Écris un commentaire… (sois sympa : les insultes sont masquées)"></textarea>
          <div class="bas"><span class="reste">500</span><button class="dc-btn" type="submit" disabled>Publier</button></div>
          <p class="msg" hidden></p>
        </form>`;
      const form = f.querySelector('form'), zone = form.querySelector('textarea'), bouton = form.querySelector('button'), msg = form.querySelector('.msg');
      zone.addEventListener('input', () => { form.querySelector('.reste').textContent = 500 - zone.value.length; bouton.disabled = !zone.value.trim(); });
      form.addEventListener('submit', async e => {
        e.preventDefault();
        bouton.disabled = true; msg.hidden = true;
        const r = await C.api('commenter', { article, texte: zone.value });
        if (r && r.erreur) { msg.textContent = r.erreur; msg.hidden = false; bouton.disabled = false; return; }
        zone.value = ''; form.querySelector('.reste').textContent = '500';
        recharger();
      });
    }
    el.innerHTML = '<h2>Commentaires</h2><div class="dc-zone"></div><div class="dc-form-zone"></div>';
    el.addEventListener('click', async e => {
      const s = e.target.closest('[data-suppr]');
      if (s) {
        s.disabled = true;
        const r = await C.api('commentaire-supprimer', { id: Number(s.dataset.suppr) });
        if (r && r.erreur) { s.disabled = false; s.textContent = r.erreur; return; }
        recharger();
        return;
      }
      const p = e.target.closest('[data-profil]');
      if (p) {
        const nom = p.dataset.profil;
        let ouvrir = null;
        try { ouvrir = window.DinoOuvrirProfil || (window.parent !== window && window.parent.DinoOuvrirProfil); } catch (err) { /* rien */ }
        if (ouvrir) ouvrir(nom); else location.href = '/profil.html?nom=' + encodeURIComponent(nom);
      }
    });
    dessinerFormulaire();
    C.ecouter(() => { if (el.isConnected) { dessinerFormulaire(); dessinerListe(); } });
    recharger();
  }

  window.DinoCommentaires = { monter };
})();
