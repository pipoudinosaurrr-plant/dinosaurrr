/* ==========================================================
   Salon commun des jeux à plusieurs
   - accueil : pseudo, créer / rejoindre une partie, jouer contre l'ordinateur
   - salon : code de la partie, lien à partager, joueurs, bots
   - résultats
   Chaque jeu fournit son moteur (règles) et sa fonction d'affichage.
   En solo, le moteur tourne dans le navigateur ; en ligne, sur le serveur.
   ========================================================== */

import { commandesAdmin, appliquerAdmin } from './admin.js';
import { obtenirCompte, suivrePresence, annoncerPartie, texteEnLigne, brancherPartiesOuvertes, brancherPseudo, jetonCompte } from './presence.js';

export const COULEURS = ['#22c55e', '#3b82f6', '#f97316', '#ec4899', '#a855f7', '#eab308', '#06b6d4', '#f43f5e'];
const NOMS_BOTS = ['Atlas', 'Nova', 'Orion', 'Echo', 'Volt', 'Nyx', 'Zéro', 'Pixel'];
const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const TACTILE = matchMedia('(hover: none), (pointer: coarse)').matches;
export const echapper = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const stock = {
  lire(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } }
};

  // fin d'une partie contre l'ordinateur : XP, succès, défi du jour
  function progresFin(jeu, infos) {
    const go = () => { if (window.DinoProgres) window.DinoProgres.fin(jeu, infos); };
    if (window.DinoProgres) return go();
    const s = document.createElement('script');
    s.src = '../assets/progres.js';
    s.onload = go;
    document.head.append(s);
  }

// avatars des joueurs (dans le salon)
if (!window.DinoAvatar) {
  try { if (window.parent !== window && window.parent.DinoAvatar) window.DinoAvatar = window.parent.DinoAvatar; } catch (e) { /* rien */ }
  if (!window.DinoAvatar) { const s = document.createElement('script'); s.src = '../assets/avatars.js'; document.head.append(s); }
}

export function demarrerJeu(cfg) {
  const { id, moteur } = cfg;
  const zone = cfg.zone;
  const conf = window.SITE_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const EN_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const SERVEUR = params.get('serveur') || (EN_LOCAL ? '127.0.0.1:8787' : (conf.serveurJeux || ''));
  const SECURISE = !/^(localhost|127\.)/.test(SERVEUR);
  const urlTable = code => `${SECURISE ? 'wss' : 'ws'}://${SERVEUR}/jeu/${id}/${code}`;
  const urlSante = `${SECURISE ? 'https' : 'http'}://${SERVEUR}/sante`;
  const lien = code => `${location.origin}/#jeu/${cfg.idSite || id}/${code}`;

  /* ---------- Les écrans ---------- */

  const regles = (TACTILE && cfg.reglesTactile) || cfg.regles || [];
  const nbJoueurs = moteur.min === moteur.max ? `${moteur.max} joueurs` : `${moteur.min} à ${moteur.max} joueurs`;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="barre-jeu" hidden><button data-a="quitter">← Quitter</button><button data-a="admin" class="bouton-admin" hidden>⚡ Admin</button></div>
    <div class="panneau-admin" hidden>
      <div class="titre-admin">⚡ Pouvoirs admin</div>
      ${commandesAdmin(moteur).map(c => `<button data-admin="${c.id}"><span>${c.icone || '⚡'}</span>${echapper(c.nom)}</button>`).join('')}
      <p class="note-admin">En ligne, les autres joueurs voient quand tu utilises un pouvoir, et la partie ne compte pas dans les victoires.</p>
    </div>

    <section class="ecran" data-ecran="accueil">
      <div class="carte">
        <span class="pastille"><span class="point-vert"></span>Multijoueur · ${nbJoueurs}</span>
        <h1>${echapper(cfg.titre)}</h1>
        <p class="intro">${echapper(cfg.intro)}</p>
        <label class="etiquette" for="pseudo">Ton pseudo</label>
        <input type="text" id="pseudo" maxlength="14" autocomplete="off" spellcheck="false">
        <div class="pile">
          <button class="btn primaire grand" data-a="creer">Créer une partie</button>
          <div class="separateur">ou rejoindre</div>
          <div class="ligne">
            <input type="text" class="code-saisi" maxlength="4" placeholder="CODE" autocomplete="off" spellcheck="false" aria-label="Code de la partie">
            <button class="btn grand" data-a="rejoindre">Rejoindre</button>
          </div>
          ${moteur.bots ? `<button class="btn grand" data-a="solo">${echapper(cfg.texteSolo || 'Jouer contre l’ordinateur')}</button>` : ''}
          ${cfg.deuxJoueurs ? `<button class="btn grand" data-a="deux">À 2 sur cet écran</button>` : ''}
        </div>
        <p class="message" hidden></p>
        <div class="parties-ouvertes" hidden><span class="etiquette">Parties ouvertes</span><ul></ul></div>
        ${regles.length ? `<div class="regles">${regles.map(([b, s]) => `<div class="regle"><b>${echapper(b)}</b><span>${echapper(s)}</span></div>`).join('')}</div>` : ''}
        <div class="serveur"><i></i><span>Vérification du serveur…</span></div>
        <div class="enligne" hidden><i></i><span></span></div>
      </div>
    </section>

    <section class="ecran" data-ecran="salon" hidden>
      <div class="carte">
        <div class="entete">
          <span class="pastille"><span class="point-vert"></span>Salon · ${echapper(cfg.titre)}</span>
          <button class="btn petit" data-a="quitter">Quitter</button>
        </div>
        <div class="code-zone">
          <span class="etiquette">Code de la partie</span>
          <div class="code">····</div>
          <div class="ligne">
            <button class="btn" data-a="copier">Copier le lien</button>
            <button class="btn" data-a="partager">Partager</button>
          </div>
        </div>
        <div class="compteur">Connexion…</div>
        <div class="enligne" hidden><i></i><span></span></div>
        <ul class="joueurs"></ul>
        <div class="zone-hote" hidden>
          ${moteur.bots ? `<div class="ligne" style="margin-top:12px"><button class="btn" data-a="moins-bot">− Bot</button><button class="btn" data-a="plus-bot">+ Bot</button></div>` : ''}
          <div class="pile"><button class="btn primaire grand" data-a="lancer">Lancer la partie</button></div>
        </div>
        <p class="attente" hidden></p>
      </div>
    </section>

    <section class="ecran" data-ecran="fin" hidden>
      <div class="carte">
        <span class="pastille">Résultats</span>
        <h1 class="fin-titre">Partie terminée</h1>
        <p class="intro fin-sous"></p>
        <ol class="classement"></ol>
        <div class="pile actions-fin">
          <button class="btn primaire grand" data-a="rejouer">Rejouer</button>
          <button class="btn grand" data-a="menu">Menu</button>
        </div>
        <p class="attente fin-attente" hidden></p>
      </div>
    </section>`);

  const $ = s => document.querySelector(s);
  const ecrans = { accueil: $('[data-ecran="accueil"]'), salon: $('[data-ecran="salon"]'), fin: $('[data-ecran="fin"]') };
  const barreJeu = $('.barre-jeu');
  let ecran = 'accueil';

  function montrer(nom) {
    ecran = nom;
    for (const [n, el] of Object.entries(ecrans)) el.hidden = n !== nom;
    const enJeu = nom === 'jeu';
    zone.hidden = !(enJeu || nom === 'fin');
    barreJeu.hidden = !enJeu;
    majAdmin();
  }

  /* ---------- Pouvoirs admin (compte du propriétaire) ---------- */
  // en ligne, c'est le serveur qui dit si on est admin (il a vérifié le compte)
  let adminEnLigne = false, adminCompte = false;
  obtenirCompte().then(c => { if (c) c.ecouter(compte => { adminCompte = !!(compte && compte.admin); majAdmin(); }); });
  function estAdmin() { return local ? adminCompte : adminEnLigne; }
  function majAdmin() {
    const b = $('.bouton-admin');
    if (!b) return;
    b.hidden = !(ecran === 'jeu' && estAdmin() && !spectateur);
    if (b.hidden) $('.panneau-admin').hidden = true;
  }
  function pouvoirAdmin(cmd) {
    if (!estAdmin()) return;
    if (local) {
      const r = appliquerAdmin(moteur, local.e, 'moi', cmd, Date.now());
      if (!r) { toast('Ce pouvoir ne marche pas maintenant.'); return; }
      toast('⚡ ' + r.texte + (r.prive ? ' — ' + r.prive : ''), r.prive ? 6000 : 2400);
      publierLocal(true);
    } else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'admin', cmd }));
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-admin]');
    if (b) { pouvoirAdmin(b.dataset.admin); return; }
    const p = $('.panneau-admin');
    if (p && !p.hidden && !e.target.closest('.panneau-admin, .bouton-admin')) p.hidden = true;
  });

  function message(texte) {
    const m = $('.message');
    m.textContent = texte || '';
    m.hidden = !texte;
  }

  let minuterieToast = null;
  function toast(texte, duree = 2200) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.append(t); }
    t.textContent = texte;
    t.hidden = false;
    clearTimeout(minuterieToast);
    minuterieToast = setTimeout(() => { t.hidden = true; }, duree);
  }

  const champPseudo = $('#pseudo');
  champPseudo.value = stock.lire('cercle-pseudo', 'Joueur' + Math.floor(100 + Math.random() * 900));
  function pseudo() {
    const p = champPseudo.value.trim().slice(0, 14) || 'Joueur';
    if (!champPseudo.readOnly) stock.ecrire('cercle-pseudo', p);
    return p;
  }
  brancherPseudo(champPseudo, () => stock.lire('cercle-pseudo', 'Joueur' + Math.floor(100 + Math.random() * 900)));

  /* ---------- État ---------- */

  let moi = null;
  let equipe = new Map();
  let ws = null, codeSalle = '', salle = null, quitte = false, minuteriePing = null;
  let local = null;
  let enLigne = false;
  let spectateur = false;
  let annonceEnAttente = null;
  let renomme = false;

  const ctx = {
    get moi() { return moi; },
    get equipe() { return equipe; },
    get solo() { return !!local; },
    get deux() { return !!(local && local.deux); },
    // à 2 sur le même écran : le 2e joueur joue avec cette fonction
    envoyerPour(id, d) {
      if (!local) return;
      const change = moteur.action(local.e, id, d, Date.now());
      publierLocal(change && !moteur.tempsReel);
    },
    get spectateur() { return spectateur; },
    nom: i => (equipe.get(i) || {}).nom || '?',
    couleur: i => (equipe.get(i) || {}).couleur || '#fff',
    envoyer(d) {
      if (local) {
        const change = moteur.action(local.e, 'moi', d, Date.now());
        publierLocal(change && !moteur.tempsReel);
      } else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'jeu', d }));
    },
    toast
  };

  function commencer(liste) {
    equipe = new Map(liste.map(j => [j.id, j]));
    spectateur = !equipe.has(moi);
    montrer('jeu');
    if (cfg.debut) cfg.debut(ctx);
  }

  function evenement(ev) { if (cfg.evenement) cfg.evenement(ev, ctx); }

  /* ---------- Solo ---------- */

  let dernierMode = 'solo';
  function lancerSolo(deux = false) {
    message('');
    arreterLocal();
    dernierMode = deux ? 'deux' : 'solo';
    const n = cfg.soloBots ?? (moteur.max === 2 ? 1 : 3);
    const liste = deux
      ? [{ id: 'moi', nom: cfg.nomJoueur1 || 'Joueur 1', couleur: COULEURS[0] }, { id: 'moi2', nom: cfg.nomJoueur2 || 'Joueur 2', couleur: COULEURS[2] }]
      : [{ id: 'moi', nom: pseudo(), couleur: COULEURS[0] }, ...Array.from({ length: n }, (_, i) => ({ id: 'bot' + i, nom: NOMS_BOTS[i], couleur: COULEURS[(i + 1) % COULEURS.length], bot: true }))];
    moi = 'moi';
    enLigne = false;
    local = { e: moteur.creer(liste, Date.now()), dernier: Date.now(), annonce: false, deux };
    commencer(liste);
    publierLocal(true);
    local.boucle = setInterval(ticLocal, moteur.tic || 200);
  }

  function ticLocal() {
    if (!local) return;
    const t = Date.now();
    const dt = Math.min(200, t - local.dernier);
    local.dernier = t;
    const e = local.e;
    let change = false;
    for (const j of e.joueurs) {
      if (!j.bot) continue;
      const d = moteur.bot(e, j.id, t);
      if (d) change = moteur.action(e, j.id, d, t) || change;
    }
    change = moteur.etape(e, t, dt) || change;
    publierLocal(change || moteur.tempsReel);
  }

  function publierLocal(envoyerEtat) {
    if (!local) return;
    const e = local.e;
    if (e.evts && e.evts.length) {
      const evts = e.evts;
      e.evts = [];
      for (const ev of evts) {
        if (Array.isArray(ev)) evenement(ev);
        else if (ev.pour ? ev.pour === 'moi' : ev.sauf !== 'moi') evenement(ev.d);
      }
    }
    if (envoyerEtat) cfg.afficher(moteur.vue(e, 'moi', Date.now()), ctx);
    if (e.fini && !local.annonce) {
      local.annonce = true;
      clearInterval(local.boucle);
      const classement = e.classement;
      if (!local.deux && !e.triche) { const c = classement.find(x => x.id === 'moi'); progresFin(cfg.idSite || id, { gagne: !!(c && c.place === 1 && classement.filter(x => x.place === 1).length === 1) }); }
      setTimeout(() => { if (local && ecran === 'jeu') afficherFin(classement, false); }, 1300);
    }
  }

  function arreterLocal() {
    if (local) clearInterval(local.boucle);
    local = null;
  }

  /* ---------- En ligne ---------- */

  function etatServeur(ok, texte) {
    const el = $('.serveur');
    el.className = 'serveur ' + (ok ? 'ok' : 'ko');
    el.querySelector('span').textContent = texte;
    $('[data-a="creer"]').disabled = !ok;
    $('[data-a="rejoindre"]').disabled = !ok;
  }

  async function verifierServeur() {
    const solo = moteur.bots ? ' Le jeu contre l’ordinateur marche.' : '';
    if (!SERVEUR) return etatServeur(false, 'Mode en ligne pas encore branché.' + solo);
    try {
      const ctrl = new AbortController();
      const m = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(urlSante, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(m);
      etatServeur(r.ok, r.ok ? 'Serveur en ligne' : 'Serveur indisponible.' + solo);
    } catch (e) {
      etatServeur(false, 'Serveur hors ligne pour l’instant.' + solo);
    }
  }

  function connecter(code, nouvelle = false) {
    message('');
    arreterLocal();
    quitte = false;
    codeSalle = code;
    salle = null;
    moi = null;
    $('.code').textContent = code;
    $('.joueurs').innerHTML = '';
    $('.compteur').textContent = 'Connexion…';
    $('.zone-hote').hidden = true;
    $('.attente').hidden = true;
    montrer('salon');
    try { history.replaceState(null, '', '#' + code); } catch (e) { /* rien */ }

    annonceEnAttente = nouvelle ? code : null;
    try { ws = new WebSocket(urlTable(code)); } catch (e) { return retourAccueil('Impossible de joindre le serveur.'); }
    const ceWs = ws;
    ceWs.onopen = async () => {
      const jeton = await jetonCompte();
      if (ceWs.readyState !== 1) return;
      ceWs.send(JSON.stringify({ t: 'salut', nom: pseudo(), jeton }));
      clearInterval(minuteriePing);
      minuteriePing = setInterval(() => { if (ceWs.readyState === 1) ceWs.send('ping'); }, 25000);
    };
    ceWs.onmessage = ev => {
      if (ev.data === 'pong') return;
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      recevoir(m);
    };
    ceWs.onclose = () => {
      if (ceWs !== ws) return;
      clearInterval(minuteriePing);
      if (!quitte) retourAccueil('La connexion avec la partie a été coupée.');
    };
  }

  function recevoir(m) {
    switch (m.t) {
      case 'bienvenue':
        moi = m.id;
        adminEnLigne = !!m.admin;
        if (!champPseudo.readOnly && /^Invité\d+$/.test(m.nom) && !/^Invité/.test(pseudo())) {
          toast('Ce pseudo appartient à un compte : tu joues en « ' + m.nom + ' ». Connecte-toi pour l’utiliser.', 4500);
          renomme = true;
        }
        if (annonceEnAttente === codeSalle) {
          annonceEnAttente = null;
          annoncerPartie(cfg.idSite || id, codeSalle, m.nom).then(n => {
            if (n > 0 && !renomme) toast(n === 1 ? '1 personne en ligne a été prévenue' : `${n} personnes en ligne ont été prévenues`, 3200);
          });
        }
        break;
      case 'salle':
        salle = m;
        if (m.phase === 'salon' && ecran !== 'salon' && (ecran === 'fin' || !enLigne)) { enLigne = false; montrer('salon'); }
        majSalon();
        break;
      case 'debut':
        enLigne = true;
        commencer(m.equipe);
        break;
      case 'etat':
        if (enLigne) cfg.afficher(m.s, ctx);
        break;
      case 'evt':
        if (enLigne) for (const ev of m.e) evenement(ev);
        break;
      case 'fin':
        setTimeout(() => afficherFin(m.classement, true), 1300);
        break;
      case 'erreur-douce':
        toast(m.message);
        break;
      case 'admin':
        toast('⚡ ' + m.nom + ' ' + m.texte, 3000);
        break;
      case 'admin-prive':
        toast(m.texte, 6000);
        break;
      case 'erreur':
        quitte = true;
        retourAccueil(m.message);
        break;
    }
  }

  function majSalon() {
    if (!salle) return;
    const suisHote = salle.hote === moi;
    $('.joueurs').innerHTML = salle.joueurs.map(j => `
      <li>
        ${j.avatar && window.DinoAvatar ? `<span class="avatar-salon">${window.DinoAvatar.svg(j.avatar, 26)}</span>` : `<i style="background:${echapper(j.couleur)}"></i>`}
        <span class="nom">${echapper(j.nom)}${j.compte ? ' <span class="verifie" title="Compte vérifié">✓</span>' : ''}${j.niveau ? ` <span class="niveau-salon">niv. ${j.niveau}</span>` : ''}</span>
        ${j.id === moi ? '<span class="tag vert">TOI</span>' : ''}
        ${j.hote ? '<span class="tag">HÔTE</span>' : ''}
        ${j.bot ? '<span class="tag">BOT</span>' : ''}
        <span class="victoires">${j.victoires || 0} V</span>
      </li>`).join('');
    const nb = Math.min(salle.max, salle.joueurs.length);
    const manque = salle.min - nb;
    $('.compteur').textContent = `${salle.joueurs.length} / ${salle.max} joueurs` + (manque > 0 ? ` · encore ${manque} pour commencer` : '');
    $('.zone-hote').hidden = !suisHote;
    $('.attente').hidden = suisHote;
    $('.attente').textContent = salle.phase === 'salon' ? 'En attente de l’hôte…' : 'Partie en cours. Tu joues à la prochaine.';
    const lancer = $('[data-a="lancer"]');
    lancer.disabled = manque > 0;
    lancer.textContent = manque > 0 ? (salle.bots ? 'Invite un pote ou ajoute un bot' : 'Invite au moins un pote') : 'Lancer la partie';
    const plus = $('[data-a="plus-bot"]'), moins = $('[data-a="moins-bot"]');
    if (plus) plus.disabled = salle.joueurs.length >= salle.max;
    if (moins) moins.disabled = !salle.joueurs.some(j => j.bot);
  }

  function retourAccueil(texte) {
    arreterLocal();
    enLigne = false;
    montrer('accueil');
    message(texte);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* rien */ }
  }

  function quitter() {
    quitte = true;
    try { if (ws) ws.close(); } catch (e) { /* rien */ }
    ws = null;
    retourAccueil('');
  }

  /* ---------- Résultats ---------- */

  function afficherFin(classement, reseau) {
    if (reseau && !enLigne) return;
    const c = classement.find(x => x.id === moi);
    const n = classement.length;
    const premiers = classement.filter(x => x.place === 1);
    $('.fin-titre').textContent = !c ? 'Partie terminée' : c.place === 1 ? (premiers.length > 1 ? 'Égalité.' : 'Victoire.') : `${c.place}e sur ${n}`;
    $('.fin-sous').textContent = c ? c.score : `Gagnant : ${premiers.map(p => p.nom).join(', ')}`;
    $('.classement').innerHTML = classement.map(x => `
      <li class="${x.id === moi ? 'moi' : ''}">
        <span class="place">${x.place === 1 ? '1er' : x.place + 'e'}</span>
        <i style="background:${echapper(x.couleur)}"></i>
        <span>${echapper(x.nom)}${x.bot ? ' <span class="tag">BOT</span>' : ''}</span>
        <span class="score">${echapper(x.score)}</span>
      </li>`).join('');
    $('.actions-fin').hidden = reseau;
    $('.fin-attente').hidden = !reseau;
    if (reseau) {
      let reste = 5;
      $('.fin-attente').textContent = `Retour au salon dans ${reste} s…`;
      const iv = setInterval(() => {
        reste--;
        if (ecran !== 'fin' || reste <= 0) return clearInterval(iv);
        $('.fin-attente').textContent = `Retour au salon dans ${reste} s…`;
      }, 1000);
    }
    montrer('fin');
  }

  /* ---------- Boutons ---------- */

  const nouveauCode = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), x => LETTRES[x % LETTRES.length]).join('');
  const codeSaisi = $('.code-saisi');

  document.body.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    switch (b.dataset.a) {
      case 'creer': connecter(nouveauCode(), true); break;
      case 'rejoindre': {
        const code = codeSaisi.value.trim().toUpperCase();
        if (!/^[A-Z0-9]{4}$/.test(code)) { message('Le code fait 4 caractères (ex : K7QF).'); return; }
        connecter(code);
        break;
      }
      case 'solo': lancerSolo(); break;
      case 'deux': lancerSolo(true); break;
      case 'rejouer': lancerSolo(dernierMode === 'deux'); break;
      case 'menu': retourAccueil(''); break;
      case 'quitter': quitter(); break;
      case 'admin': $('.panneau-admin').hidden = !$('.panneau-admin').hidden; break;
      case 'lancer': if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'lance' })); break;
      case 'plus-bot': if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'bot', ajout: true })); break;
      case 'moins-bot': if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'bot', ajout: false })); break;
      case 'copier':
        try { await navigator.clipboard.writeText(lien(codeSalle)); b.textContent = 'Lien copié'; } catch (err) { b.textContent = codeSalle; }
        setTimeout(() => { b.textContent = 'Copier le lien'; }, 1600);
        break;
      case 'partager': {
        const donnees = { title: cfg.titre, text: `Rejoins ma partie de ${cfg.titre} : code ${codeSalle}`, url: lien(codeSalle) };
        if (navigator.share) { try { await navigator.share(donnees); } catch (err) { /* annulé */ } }
        else $('[data-a="copier"]').click();
        break;
      }
    }
  });
  if (!navigator.share) $('[data-a="partager"]').hidden = true;
  codeSaisi.addEventListener('input', () => { codeSaisi.value = codeSaisi.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  codeSaisi.addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-a="rejoindre"]').click(); });
  champPseudo.addEventListener('change', pseudo);

  function lireInvitation() {
    const brut = location.hash.slice(1).toUpperCase().match(/^([A-Z0-9]{4})(!?)$/);
    const code = brut ? brut[1] : '';
    // « CODE! » : on vient d'une notification, on rejoint tout de suite
    if (brut && brut[2] && ecran === 'accueil' && SERVEUR) { setTimeout(() => { if (ecran === 'accueil') connecter(code); }, 0); return; }
    if (/^[A-Z0-9]{4}$/.test(code) && ecran === 'accueil') {
      codeSaisi.value = code;
      const r = $('[data-a="rejoindre"]');
      r.textContent = 'Rejoindre ' + code;
      r.classList.add('primaire');
      $('[data-a="creer"]').classList.remove('primaire');
    }
  }
  window.addEventListener('hashchange', lireInvitation);
  // retour arrière du navigateur pendant une partie en ligne : on quitte vraiment la partie
  window.addEventListener('hashchange', () => {
    if (ws && ecran !== 'accueil' && location.hash.slice(1).toUpperCase().replace('!', '') !== codeSalle) quitter();
  });
  window.addEventListener('pagehide', () => { try { if (ws) ws.close(); } catch (e) { /* rien */ } });
  lireInvitation();

  montrer('accueil');
  verifierServeur();
  brancherPartiesOuvertes(document.querySelector('.parties-ouvertes'), cfg.idSite || id, code => { if (ecran === 'accueil' && SERVEUR) connecter(code); });
  suivrePresence(n => {
    const texte = texteEnLigne(n);
    for (const el of document.querySelectorAll('.enligne')) {
      el.hidden = !texte;
      el.classList.toggle('vide', n !== null && n <= 1);
      el.querySelector('span').textContent = texte;
    }
  });
  return ctx;
}
