/* ==========================================================
   Les petits plus du bureau XP
   - Invite de commandes (avec des commandes secrètes)
   - Bloc-notes (enregistré dans le navigateur)
   - Exécuter…, boîtes de message, Date et heure
   - Écrans de veille, sons, sélection au lasso
   - Surprises : écran bleu, code Konami
   Le bureau (assets/os.js) appelle window.XP_EXTRAS(api).
   ========================================================== */
window.XP_EXTRAS = function (api) {
  'use strict';

  const { $, $$, echapper, creer, stockage, NOM, C, JEUX } = api;
  const xp = (nom, t) => api.xp(nom, t);
  const pseudo = C.pseudo || NOM;
  const normaliser = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const deuxChiffres = n => String(n).padStart(2, '0');

  /* ================= Sons (fabriqués à la volée, aucun fichier) ================= */

  let audio = null;
  let sonActif = stockage.lire('site-son', true);
  function contexte() {
    if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    return audio;
  }
  function note(a, freq, debut, duree, { type = 'sine', volume = .18, attaque = .01, glisse } = {}) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime + debut);
    if (glisse) o.frequency.exponentialRampToValueAtTime(glisse, a.currentTime + debut + duree);
    g.gain.setValueAtTime(0.0001, a.currentTime + debut);
    g.gain.exponentialRampToValueAtTime(volume, a.currentTime + debut + attaque);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + debut + duree);
    o.connect(g).connect(a.destination);
    o.start(a.currentTime + debut);
    o.stop(a.currentTime + debut + duree + .05);
  }
  function son(nom) {
    if (!sonActif) return;
    const a = contexte();
    if (!a || a.state !== 'running') return;
    if (nom === 'ding') { note(a, 1318.5, 0, .35, { volume: .12 }); note(a, 987.8, .09, .5, { volume: .1 }); }
    if (nom === 'erreur') { note(a, 220, 0, .45, { type: 'triangle', volume: .2 }); note(a, 329.6, 0, .45, { type: 'triangle', volume: .12 }); }
    if (nom === 'demarrage') [523.3, 392, 659.3, 784].forEach((f, i) => note(a, f, i * .16, 1.3 - i * .1, { type: 'triangle', volume: .1, attaque: .06 }));
    if (nom === 'arret') [784, 659.3, 523.3, 392].forEach((f, i) => note(a, f, i * .18, .9, { type: 'triangle', volume: .1, attaque: .04 }));
    if (nom === 'clic') note(a, 1800, 0, .04, { type: 'square', volume: .03 });
    if (nom === 'corbeille') {
      const n = a.sampleRate * .35, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2) * (Math.random() < .3 ? 1 : .3);
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      f.type = 'bandpass'; f.frequency.value = 1400; g.gain.value = .5;
      s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start();
    }
  }

  /* ================= Boîtes de message ================= */

  let nBoite = 0;
  function boite({ titre = NOM, texte = '', icone = 'info', boutons = ['OK'] }) {
    return new Promise(resoudre => {
      const id = 'boite-' + (++nBoite);
      api.APPS[id] = {
        titre, icone, taille: [400, 150], dialogue: true,
        ouvrir(corps, etat) {
          corps.innerHTML = `
            <div class="dialogue-xp boite-xp">
              <div class="boite-message">${xp(icone, 32)}<p>${texte}</p></div>
              <div class="boutons-dialogue centre">${boutons.map((b, i) => `<button class="btn${i === 0 ? ' btn-primaire' : ''}" data-b="${echapper(b)}">${echapper(b)}</button>`).join('')}</div>
            </div>`;
          requestAnimationFrame(() => {
            const manque = corps.scrollHeight - corps.clientHeight;
            if (manque > 0) etat.el.style.height = etat.el.offsetHeight + manque + 'px';
            const b = $('.btn', corps); if (b) b.focus();
          });
          corps.addEventListener('click', e => {
            const b = e.target.closest('[data-b]');
            if (!b) return;
            api.fermer(id);
            delete api.APPS[id];
            resoudre(b.dataset.b);
          });
        }
      };
      api.ouvrirApp(id);
      son(icone === 'erreur' || icone === 'attention' ? 'erreur' : 'ding');
    });
  }

  /* ================= Retrouver un programme à partir d'un nom ================= */

  const ALIAS = {
    notepad: 'notepad', 'notepad.exe': 'notepad', 'bloc-notes': 'notepad', blocnotes: 'notepad', notes: 'notepad', 'notes.txt': 'notepad',
    cmd: 'cmd', 'cmd.exe': 'cmd', command: 'cmd', console: 'cmd', terminal: 'cmd',
    winmine: 'jeu-demineur', 'winmine.exe': 'jeu-demineur', mspaint: 'jeu-paint', 'mspaint.exe': 'jeu-paint',
    blog: 'blog', jeux: 'jeux', explorer: 'jeux', 'explorer.exe': 'jeux', iexplore: 'blog', contact: 'contact', mail: 'contact',
    apropos: 'apropos', 'a propos': 'apropos', winver: 'apropos', corbeille: 'corbeille',
    date: 'dateheure', heure: 'dateheure', 'timedate.cpl': 'dateheure', calendrier: 'dateheure',
    'desk.cpl': 'affichage', affichage: 'affichage', fond: 'affichage', 'fond d\'ecran': 'affichage',
    executer: 'executer', run: 'executer'
  };
  JEUX.forEach(j => { ALIAS[normaliser(j.id)] = 'jeu-' + j.id; ALIAS[normaliser(j.titre)] = 'jeu-' + j.id; });

  // renvoie true si quelque chose s'est ouvert
  function lancer(texte) {
    const brut = String(texte || '').trim();
    const t = normaliser(brut).replace(/\.exe$/, '');
    if (!t) return false;
    if (/^(https?:\/\/|www\.)/i.test(brut)) { window.open(brut.startsWith('www.') ? 'https://' + brut : brut, '_blank', 'noopener'); return true; }
    if (t === 'crash' || t === 'bsod') { ecranBleu(); return true; }
    if (t === 'veille' || t === 'ecran de veille' || t === 'scrnsave') { lancerVeille(); return true; }
    if (t === 'shutdown' || t === 'arreter') { api.arreter(); return true; }
    if (t === 'logoff' || t === 'fermer la session') { api.fermerSession(); return true; }
    if (t === 'konami' || t === 'dinos') { pluieDeDinos(); return true; }
    const app = ALIAS[t] || ALIAS[t + '.exe'];
    if (app && api.APPS[app]) { api.ouvrirApp(app); return true; }
    return false;
  }

  /* ================= Exécuter… ================= */

  function contenuExecuter(corps, etat) {
    const historique = stockage.lire('site-executer', ['cmd', 'notepad', 'winmine']);
    corps.innerHTML = `
      <div class="dialogue-xp executer">
        <div class="boite-message">${xp('executer', 32)}<p>Entrez le nom d'un programme, d'un dossier ou d'une adresse Internet, et ${echapper(NOM)} l'ouvrira pour vous.</p></div>
        <label class="ligne-champ">Ouvrir : <input class="champ-xp selectionnable" list="executer-liste" spellcheck="false" autocomplete="off" value="${echapper(historique[0] || '')}"></label>
        <datalist id="executer-liste">${historique.map(h => `<option value="${echapper(h)}">`).join('')}</datalist>
        <div class="boutons-dialogue">
          <button class="btn btn-primaire" data-a="ok">OK</button>
          <button class="btn" data-a="annuler">Annuler</button>
          <button class="btn" disabled>Parcourir…</button>
        </div>
      </div>`;
    const champ = $('input', corps);
    setTimeout(() => { champ.focus(); champ.select(); }, 30);
    const valider = () => {
      const v = champ.value.trim();
      if (!v) return;
      api.fermer(etat.id);
      if (lancer(v)) stockage.ecrire('site-executer', [v, ...historique.filter(h => h !== v)].slice(0, 8));
      else boite({ titre: v, icone: 'erreur', texte: `${echapper(NOM)} ne trouve pas « ${echapper(v)} ». Vérifiez que le nom est correct, puis réessayez.<br><br>Astuce : tape <b>aide</b> dans l'Invite de commandes pour voir tout ce qui existe.` });
    };
    champ.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); valider(); } });
    corps.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'ok') valider();
      if (a === 'annuler') api.fermer(etat.id);
    });
  }

  /* ================= Bloc-notes ================= */

  function contenuBlocNotes(corps, etat) {
    corps.classList.add('sans-defilement');
    let retour = stockage.lire('site-blocnotes-retour', true);
    corps.innerHTML = `
      <textarea class="bloc-notes selectionnable" spellcheck="false" aria-label="Texte"></textarea>
      <div class="barre-etat"><span class="etat-texte">Enregistré automatiquement dans ce navigateur</span><span class="position">Ln 1, Col 1</span></div>`;
    const zone = $('textarea', corps);
    zone.value = stockage.lire('site-blocnotes', '');
    zone.wrap = retour ? 'soft' : 'off';
    const nomFenetre = () => (zone.value ? 'notes.txt' : 'Sans titre') + ' - Bloc-notes';
    const titre = () => {
      const t = nomFenetre();
      const n = $('.titre .nom', etat.el); if (n) n.textContent = t;
      const s = $('span', etat.tache); if (s) s.textContent = t;
    };
    let minuterie = null;
    const enregistrer = () => { stockage.ecrire('site-blocnotes', zone.value); titre(); };
    const position = () => {
      const avant = zone.value.slice(0, zone.selectionStart).split('\n');
      $('.position', corps).textContent = `Ln ${avant.length}, Col ${avant[avant.length - 1].length + 1}`;
    };
    zone.addEventListener('input', () => { clearTimeout(minuterie); minuterie = setTimeout(enregistrer, 400); position(); });
    ['keyup', 'click'].forEach(ev => zone.addEventListener(ev, position));
    const heureDate = () => {
      const d = new Date();
      const t = `${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())} ${deuxChiffres(d.getDate())}/${deuxChiffres(d.getMonth() + 1)}/${d.getFullYear()}`;
      zone.setRangeText(t, zone.selectionStart, zone.selectionEnd, 'end');
      zone.dispatchEvent(new Event('input'));
    };
    zone.addEventListener('keydown', e => {
      if (e.key === 'F5') { e.preventDefault(); heureDate(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); enregistrer(); api.bulle('Bloc-notes', 'notes.txt est enregistré.', 2000); }
      if (e.key === 'Tab') { e.preventDefault(); zone.setRangeText('\t', zone.selectionStart, zone.selectionEnd, 'end'); }
    });
    etat.commande = cmd => {
      if (cmd === 'nouveau') {
        if (!zone.value) return true;
        boite({ titre: 'Bloc-notes', icone: 'attention', texte: 'Le texte du fichier notes.txt va être effacé. Continuer ?', boutons: ['Oui', 'Non'] })
          .then(r => { if (r === 'Oui') { zone.value = ''; enregistrer(); position(); zone.focus(); } });
        return true;
      }
      if (cmd === 'enregistrer') { enregistrer(); api.bulle('Bloc-notes', 'notes.txt est enregistré.', 2000); return true; }
      if (cmd === 'telecharger') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([zone.value], { type: 'text/plain;charset=utf-8' }));
        a.download = 'notes.txt'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return true;
      }
      if (cmd === 'annuler') { zone.focus(); document.execCommand('undo'); return true; }
      if (cmd === 'tout') { zone.focus(); zone.select(); return true; }
      if (cmd === 'heure') { zone.focus(); heureDate(); return true; }
      if (cmd === 'retour') {
        retour = !retour; zone.wrap = retour ? 'soft' : 'off';
        stockage.ecrire('site-blocnotes-retour', retour);
        api.bulle('Bloc-notes', 'Retour automatique à la ligne : ' + (retour ? 'activé' : 'désactivé'), 1800);
        return true;
      }
      if (cmd === 'apropos-notes') { boite({ titre: 'À propos du Bloc-notes', icone: 'blocnotes', texte: `<b>Bloc-notes</b> pour ${echapper(NOM)}<br>Tes notes restent dans ce navigateur, sur cet ordinateur. Personne d'autre ne les voit.` }); return true; }
      return false;
    };
    etat.surFocus = () => zone.focus();
    setTimeout(() => { titre(); zone.focus(); }, 0);
  }

  /* ================= Invite de commandes ================= */

  const PALETTE = ['#000000', '#000080', '#008000', '#008080', '#800000', '#800080', '#808000', '#c0c0c0', '#808080', '#0000ff', '#00ff00', '#00ffff', '#ff0000', '#ff00ff', '#ffff00', '#ffffff'];
  const DINO_ASCII = [
    '                 __',
    '                / _)   Rrrrr !',
    '       _.----._/ /',
    '      /         /',
    '   __/ (  | (  |',
    '  /__.-\'|_|--|_|'
  ];

  function contenuCmd(corps, etat) {
    corps.classList.add('sans-defilement');
    const couleur = stockage.lire('site-cmd-couleur', '07');
    corps.innerHTML = `
      <div class="console selectionnable" tabindex="-1">
        <pre class="console-sortie"></pre>
        <div class="console-ligne"><span class="console-invite"></span><input class="console-saisie" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Commande"></div>
      </div>`;
    const ecran = $('.console', corps), sortie = $('.console-sortie', corps), saisie = $('.console-saisie', corps), invite = $('.console-invite', corps);
    let dossier = '';
    const historique = [];
    let iHisto = 0;
    let animation = null;
    const chemin = () => 'C:\\Documents and Settings\\' + pseudo.split('_')[0] + (dossier ? '\\' + dossier : '');
    const majInvite = () => { invite.textContent = chemin() + '>'; };
    const ecrire = (texte = '', classe) => {
      const s = document.createElement('span');
      if (classe) s.className = classe;
      s.textContent = texte + '\n';
      sortie.append(s);
      ecran.scrollTop = ecran.scrollHeight;
    };
    const appliquerCouleur = code => {
      const [f, t] = [...code.toLowerCase()].map(c => parseInt(c, 16));
      ecran.style.background = PALETTE[f];
      ecran.style.color = PALETTE[t];
      saisie.style.caretColor = PALETTE[t];
    };
    appliquerCouleur(couleur);
    majInvite();
    ecrire(`${NOM} XP [version 2.0.2600]`);
    ecrire(`(C) Copyright 2026 ${pseudo}.`);
    ecrire('');
    ecrire('Tape « aide » pour voir les commandes.');
    ecrire('');

    const articles = () => api.chargerArticles().catch(() => []);
    const texteArticle = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.replace(/\n{3,}/g, '\n\n').trim(); };
    const dateDos = d => `${deuxChiffres(d.getDate())}/${deuxChiffres(d.getMonth() + 1)}/${d.getFullYear()}  ${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}`;

    const AIDE = [
      ['AIDE', 'Affiche cette liste.'],
      ['DIR', 'Liste les fichiers du dossier.'],
      ['CD', 'Change de dossier (CD JEUX, CD BLOG, CD ..).'],
      ['TYPE', 'Affiche un fichier (TYPE 1 dans le dossier Blog).'],
      ['START', 'Ouvre un programme ou un jeu (START PONG).'],
      ['JEUX', 'Liste tous les jeux.'],
      ['CLS', "Efface l'écran."],
      ['COLOR', 'Change les couleurs (COLOR 0A = vert sur noir).'],
      ['ECHO', 'Affiche un message.'],
      ['DATE', "Affiche la date et l'heure."],
      ['PING', 'Teste le serveur des jeux en ligne.'],
      ['FOND', "Change le fond d'écran (FOND PLAGE)."],
      ['CALC', 'Fait un calcul (CALC 12*7).'],
      ['VER', 'Affiche la version.'],
      ['WHOAMI', "Qui est l'utilisateur ?"],
      ['TREE', 'Dessine l\'arbre du site.'],
      ['VEILLE', "Lance l'écran de veille."],
      ['EXIT', 'Ferme la fenêtre.']
    ];

    const commandes = {
      async aide() { AIDE.forEach(([c, d]) => ecrire(c.padEnd(9) + d)); ecrire(''); ecrire('Il y a aussi des commandes cachées… essaie DINO, MATRIX ou HACK.'); },
      async help() { return commandes.aide(); },
      async cls() { sortie.textContent = ''; },
      async echo(arg) { ecrire(arg || 'ECHO est activé.'); },
      async ver() { ecrire(''); ecrire(`${NOM} XP [version 2.0.2600]`); },
      async whoami() { ecrire(`${normaliser(NOM)}\\${pseudo}`); },
      async date() {
        const d = new Date();
        ecrire('Date du jour : ' + d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        ecrire('Heure        : ' + d.toLocaleTimeString('fr-FR'));
      },
      async heure() { return commandes.date(); },
      async time() { return commandes.date(); },
      async title(arg) { const n = $('.titre .nom', etat.el); if (n && arg) n.textContent = arg; },
      async color(arg) {
        const c = (arg || '07').trim();
        if (!/^[0-9a-f]{2}$/i.test(c) || c[0].toLowerCase() === c[1].toLowerCase()) { ecrire('Utilisation : COLOR fond+texte, par ex. COLOR 0A, COLOR 1F, COLOR 07'); return; }
        appliquerCouleur(c); stockage.ecrire('site-cmd-couleur', c);
      },
      async cd(arg) {
        const a = normaliser(arg);
        if (!a) { ecrire(chemin()); return; }
        if (a === '..' || a === '\\' || a === '/') { dossier = ''; majInvite(); return; }
        if (!dossier && (a === 'jeux' || a === 'blog')) { dossier = a === 'jeux' ? 'Jeux' : 'Blog'; majInvite(); return; }
        ecrire('Le chemin d\'accès spécifié est introuvable.');
      },
      async dir() {
        const d = new Date();
        ecrire(` Répertoire de ${chemin()}`);
        ecrire('');
        let n = 0;
        if (!dossier) {
          ecrire(`${dateDos(d)}    <REP>          Blog`);
          ecrire(`${dateDos(d)}    <REP>          Jeux`);
          if (stockage.lire('site-blocnotes', '')) { ecrire(`${dateDos(d)}    ${String(stockage.lire('site-blocnotes', '').length).padStart(14)} notes.txt`); n++; }
          ecrire(`${dateDos(d)}             2 600 dino.exe`); n++;
        } else if (dossier === 'Jeux') {
          JEUX.forEach(j => { ecrire(`${dateDos(d)}    ${String(2000 + j.id.length * 731).padStart(14)} ${j.id}.exe`); n++; });
        } else {
          const liste = await articles();
          liste.forEach((a, i) => { ecrire(`${String(a.date).slice(8, 10)}/${String(a.date).slice(5, 7)}/${String(a.date).slice(0, 4)}  12:00    ${String((a.content || '').length).padStart(14)} ${i + 1}_${normaliser(a.title).replace(/[^a-z0-9]+/g, '_').slice(0, 30)}.txt`); n++; });
          ecrire(''); ecrire('Tape TYPE 1 pour lire le premier article.');
        }
        ecrire(`              ${n} fichier(s)`);
      },
      async type(arg) {
        if (dossier === 'Blog') {
          const liste = await articles();
          const k = parseInt(arg, 10);
          const a = liste[k - 1] || liste.find(x => normaliser(x.title).includes(normaliser(arg)));
          if (!a) { ecrire('Le fichier spécifié est introuvable.'); return; }
          ecrire(a.title.toUpperCase()); ecrire('='.repeat(Math.min(60, a.title.length)));
          texteArticle(a.content).split('\n').forEach(l => ecrire(l));
          return;
        }
        if (normaliser(arg).startsWith('notes')) { (stockage.lire('site-blocnotes', '') || '(fichier vide)').split('\n').forEach(l => ecrire(l)); return; }
        if (normaliser(arg).startsWith('dino')) { ecrire('Ce fichier ne peut pas être lu : c\'est un dino. Tape DINO pour le voir.'); return; }
        ecrire('Le fichier spécifié est introuvable.');
      },
      async jeux() {
        ecrire('Jeux installés :');
        JEUX.forEach(j => ecrire('  ' + j.id.padEnd(12) + j.titre + (j.multi ? '  (en ligne)' : '')));
        ecrire(''); ecrire('Tape START suivi du nom, ou juste le nom. Ex : PONG');
      },
      async blog() {
        const liste = await articles();
        if (!liste.length) { ecrire('Aucun article.'); return; }
        liste.forEach((a, i) => ecrire(`  ${i + 1}. ${a.title}`));
        ecrire(''); ecrire('Tape CD BLOG puis TYPE 1 pour lire un article ici.');
      },
      async start(arg) { if (!lancer(arg)) ecrire(`${NOM} ne trouve pas « ${arg} ».`); },
      async fond(arg) {
        const liste = api.FONDS;
        const f = liste.find(x => normaliser(x.id) === normaliser(arg) || normaliser(x.nom).includes(normaliser(arg)));
        if (!arg || !f) { ecrire("Fonds d'écran : " + liste.map(x => x.id).join(', ')); return; }
        api.appliquerFond(f.id); ecrire("Fond d'écran : " + f.nom);
      },
      async calc(arg) {
        const e = String(arg || '').replace(/,/g, '.').replace(/x/gi, '*');
        if (!/^[\d+\-*/().\s%]+$/.test(e)) { ecrire('Utilisation : CALC 12*7  (chiffres et + - * / ( ) seulement)'); return; }
        try { const r = Function('"use strict";return (' + e + ')')(); ecrire(Number.isFinite(r) ? String(Math.round(r * 1e10) / 1e10).replace('.', ',') : 'Division par zéro ? Le dino refuse.'); }
        catch (err) { ecrire('Calcul impossible.'); }
      },
      async ping(arg) {
        const serveur = (C.serveurJeux || 'multi.dinosaurrr.com').replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
        const cible = normaliser(arg) && !['serveur', 'multi', serveur].includes(normaliser(arg)) ? null : serveur;
        if (!cible) { ecrire(`Envoi d'une requête 'ping' sur ${arg}…`); await pause(600); ecrire("Délai d'attente de la demande dépassé. (Seul le serveur des jeux répond au ping ici.)"); return; }
        ecrire(''); ecrire(`Envoi d'une requête 'ping' sur ${cible} :`);
        const temps = [];
        for (let k = 0; k < 4; k++) {
          const t0 = performance.now();
          try {
            const r = await fetch(`https://${cible}/sante?t=${Date.now()}`, { cache: 'no-store' });
            const ms = Math.round(performance.now() - t0);
            temps.push(ms);
            ecrire(`Réponse de ${cible} : statut=${r.status} temps=${ms} ms`);
          } catch (err) { ecrire("Délai d'attente de la demande dépassé."); }
          await pause(450);
        }
        ecrire('');
        if (temps.length) ecrire(`Minimum = ${Math.min(...temps)} ms, Maximum = ${Math.max(...temps)} ms, Moyenne = ${Math.round(temps.reduce((a, b) => a + b, 0) / temps.length)} ms`);
        ecrire(temps.length ? 'Le serveur des jeux en ligne est en forme.' : 'Le serveur des jeux ne répond pas pour le moment.');
      },
      async tree() {
        ecrire(chemin()); ecrire('├───Blog'); ecrire('│   └───(les articles)'); ecrire('├───Jeux');
        JEUX.forEach((j, i) => ecrire('│   ' + (i === JEUX.length - 1 ? '└───' : '├───') + j.titre));
        ecrire('└───notes.txt');
      },
      async dino() { ecrire(''); DINO_ASCII.forEach(l => ecrire(l, 'console-vert')); ecrire(''); },
      async veille() { lancerVeille(); },
      async crash() { ecranBleu(); },
      async shutdown() { api.arreter(); },
      async exit() { api.fermer(etat.id); },
      async secret() { ecrire('Psst… sur le bureau, essaie : ↑ ↑ ↓ ↓ ← → ← → B A'); },
      async matrix() {
        ecrire('Appuie sur une touche pour sortir de la Matrice…', 'console-vert');
        await pluieMatrice();
      },
      async hack() {
        const lignes = ['Connexion au mainframe du dino…', 'Contournement du pare-feu préhistorique…', 'Téléchargement de 65 millions d\'années de données…', 'Décryptage des œufs…', 'Injection de pizza dans le noyau…'];
        for (const l of lignes) {
          ecrire(l, 'console-vert');
          for (let k = 0; k < 3; k++) { ecrire('  ' + Array.from({ length: 6 }, () => Math.random().toString(16).slice(2, 10)).join(' '), 'console-vert'); await pause(70); }
          await pause(250);
        }
        ecrire('');
        ecrire('ACCÈS REFUSÉ. Le dino a tout vu. Bien essayé.', 'console-rouge');
      }
    };
    commandes.ls = commandes.dir;
    commandes.clear = commandes.cls;
    commandes.cat = commandes.type;

    const pause = ms => new Promise(r => setTimeout(r, ms));

    function pluieMatrice() {
      return new Promise(fin => {
        const toile = document.createElement('canvas');
        toile.className = 'console-matrice';
        ecran.append(toile);
        const r = ecran.getBoundingClientRect();
        toile.width = Math.floor(r.width / 2); toile.height = Math.floor(r.height / 2);
        const g = toile.getContext('2d');
        const colonnes = Math.floor(toile.width / 6), y = Array.from({ length: colonnes }, () => Math.random() * -40);
        const tic = setInterval(() => {
          g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, toile.width, toile.height);
          g.font = '7px monospace';
          y.forEach((v, i) => {
            g.fillStyle = Math.random() < .1 ? '#cfffcf' : '#00ff41';
            g.fillText(String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96)), i * 6, v * 7);
            y[i] = v * 7 > toile.height && Math.random() > .95 ? 0 : v + 1;
          });
        }, 50);
        const stop = () => { clearInterval(tic); toile.remove(); saisie.removeEventListener('keydown', stop); ecran.removeEventListener('pointerdown', stop); clearTimeout(t); saisie.focus(); fin(); };
        const t = setTimeout(stop, 12000);
        animation = stop;
        setTimeout(() => { saisie.addEventListener('keydown', stop, { once: true }); ecran.addEventListener('pointerdown', stop, { once: true }); }, 200);
      });
    }

    /* ----- le coffre secret : la commande et le contenu sont chiffrés (assets/coffre.json) ----- */
    let coffre = null;
    let attenteCode = null;
    const COFFRE_ART = [
      '     .---------------------.',
      '    /  ___    _____    ___  \\',
      '   |==[___]==[__@__]==[___]==|',
      '   |      COFFRE SECRET      |',
      '   |_________________________|'
    ];
    const chargerCoffre = () => coffre || (coffre = fetch('assets/coffre.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null));
    const hexa = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    const deB64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
    async function estCoffre(texte) {
      if (!window.crypto || !crypto.subtle) return false;
      const c = await chargerCoffre();
      if (!c) return false;
      return hexa(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dino:' + normaliser(texte)))) === c.commande;
    }
    async function dechiffrer(code) {
      const c = await chargerCoffre();
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normaliser(code)), 'PBKDF2', false, ['deriveKey']);
      const cle = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: deB64(c.sel), iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(c.iv) }, cle, deB64(c.donnees));
      return JSON.parse(new TextDecoder().decode(clair));
    }
    const demanderCode = () => new Promise(r => {
      invite.textContent = 'Code : ';
      saisie.type = 'password';
      saisie.disabled = false;
      saisie.focus();
      attenteCode = v => { attenteCode = null; saisie.type = 'text'; majInvite(); r(v); };
    });
    const lireBlocage = () => { try { return Number(sessionStorage.getItem('site-coffre-bloque')) || 0; } catch (e) { return 0; } };
    const ecrireBlocage = t => { try { sessionStorage.setItem('site-coffre-bloque', String(t)); } catch (e) { /* rien */ } };

    async function ouvrirCoffre() {
      ecrire('');
      COFFRE_ART.forEach(l => ecrire(l, 'console-jaune'));
      ecrire('');
      const reste = Math.ceil((lireBlocage() - Date.now()) / 1000);
      if (reste > 0) { ecrire(`Le coffre est verrouillé. Réessaie dans ${reste} s.`, 'console-rouge'); return; }
      for (let essai = 1; essai <= 3; essai++) {
        ecrire(`Entre le code secret (essai ${essai}/3, Échap pour annuler) :`);
        const code = await demanderCode();
        if (code === null) { ecrire('Annulé. Le coffre reste fermé.'); return; }
        ecrire('Code : ' + '*'.repeat(code.length));
        saisie.disabled = true;
        let tresor = null;
        try { tresor = await dechiffrer(code); } catch (e) { tresor = null; }
        if (tresor) {
          for (let k = 1; k <= 10; k++) {
            sortie.lastChild && sortie.lastChild.dataset && sortie.lastChild.dataset.barre && sortie.lastChild.remove();
            const s = document.createElement('span');
            s.dataset.barre = '1'; s.className = 'console-vert';
            s.textContent = `Ouverture [${'#'.repeat(k)}${'.'.repeat(10 - k)}] ${k * 10} %\n`;
            sortie.append(s); ecran.scrollTop = ecran.scrollHeight;
            await pause(90);
          }
          ecrire('ACCÈS AUTORISÉ. Le coffre est ouvert !', 'console-vert');
          son('demarrage');
          afficherTresor(tresor);
          return;
        }
        son('erreur');
        ecrire('CODE INCORRECT.', 'console-rouge');
        await pause(500);
      }
      ecrireBlocage(Date.now() + 30000);
      ecrire("Trop d'essais : le coffre se verrouille pendant 30 secondes.", 'console-rouge');
    }

    function afficherTresor(t) {
      if (api.APPS.coffre) api.fermer('coffre');
      api.APPS.coffre = {
        titre: t.titre || 'Coffre secret', icone: 'coffre', taille: t.taille || [460, 340], dialogue: true, adresse: '',
        ouvrir(corps, etatCoffre) {
          corps.innerHTML = `
            <div class="dialogue-xp coffre-xp">
              <div class="coffre-tete">${xp('coffre', 48)}<div><b>${echapper(t.titre || 'Coffre secret')}</b><br><span>Ouvert avec le bon code</span></div></div>
              <hr class="grave">
              <div class="coffre-contenu selectionnable">${t.html || ''}</div>
              <div class="boutons-dialogue"><button class="btn btn-primaire" data-a="ok">Refermer le coffre</button></div>
            </div>`;
          requestAnimationFrame(() => {
            const manque = corps.scrollHeight - corps.clientHeight;
            if (manque > 0) etatCoffre.el.style.height = Math.min(innerHeight - 80, etatCoffre.el.offsetHeight + manque) + 'px';
          });
          corps.addEventListener('click', e => { if (e.target.closest('[data-a="ok"]')) api.fermer('coffre'); });
        }
      };
      api.ouvrirApp('coffre');
    }

    // commandes ajoutées par toi dans Pages CMS (« Commandes secrètes » → _data/commandes.json)
    function commandePerso(texte) {
      const liste = Array.isArray(window.SITE_COMMANDES) ? window.SITE_COMMANDES : [];
      const c = liste.find(x => x && x.commande && normaliser(x.commande) === normaliser(texte));
      if (!c) return false;
      String(c.reponse || '').split('\n').forEach(l => ecrire(l, c.couleur === 'vert' ? 'console-vert' : c.couleur === 'jaune' ? 'console-jaune' : c.couleur === 'rouge' ? 'console-rouge' : ''));
      if (c.ouvrir) lancer(c.ouvrir);
      return true;
    }

    async function executer(ligne) {
      ecrire(chemin() + '>' + ligne);
      const texte = ligne.trim();
      if (!texte) return;
      historique.unshift(texte); iHisto = -1;
      const espace = texte.search(/\s/);
      const nom = normaliser(espace < 0 ? texte : texte.slice(0, espace));
      const arg = espace < 0 ? '' : texte.slice(espace + 1).trim();
      const nomSansExe = nom.replace(/\.exe$/, '');
      if (commandes[nomSansExe]) { saisie.disabled = true; try { await commandes[nomSansExe](arg); } finally { saisie.disabled = false; saisie.focus(); } }
      else if (commandePerso(texte)) { /* commande ajoutée dans Pages CMS */ }
      else if (lancer(texte)) ecrire(`Ouverture de ${texte}…`);
      else if (await estCoffre(texte)) { historique.shift(); saisie.disabled = true; try { await ouvrirCoffre(); } finally { saisie.disabled = false; saisie.focus(); } }
      else { ecrire(`'${texte.split(/\s/)[0]}' n'est pas reconnu en tant que commande interne`); ecrire('ou externe, un programme exécutable ou un fichier de commandes.'); }
      ecrire('');
    }

    saisie.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const v = saisie.value; saisie.value = ''; if (attenteCode) attenteCode(v); else executer(v); return; }
      if (attenteCode) { if (e.key === 'Escape') { e.preventDefault(); saisie.value = ''; attenteCode(null); } return; }
      if (e.key === 'ArrowUp' && historique.length) { e.preventDefault(); iHisto = Math.min(historique.length - 1, iHisto + 1); saisie.value = historique[iHisto]; }
      if (e.key === 'ArrowDown') { e.preventDefault(); iHisto = Math.max(-1, iHisto - 1); saisie.value = iHisto < 0 ? '' : historique[iHisto]; }
      if (e.key === 'Tab') {
        e.preventDefault();
        const mots = [...Object.keys(commandes), ...JEUX.map(j => j.id), 'notepad', 'winmine'];
        const debut = normaliser(saisie.value);
        const trouve = mots.filter(m => m.startsWith(debut));
        if (trouve.length === 1) saisie.value = trouve[0] + ' ';
        else if (trouve.length > 1) { ecrire(chemin() + '>' + saisie.value); ecrire(trouve.join('   ')); }
      }
      if (e.key.toLowerCase() === 'l' && e.ctrlKey) { e.preventDefault(); sortie.textContent = ''; }
    });
    ecran.addEventListener('click', () => { if (!window.getSelection().toString()) saisie.focus(); });
    etat.surFocus = () => saisie.focus();
    setTimeout(() => saisie.focus(), 0);
  }

  /* ================= Date et heure ================= */

  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  function contenuDateHeure(corps, etat) {
    const auj = new Date();
    let vue = new Date(auj.getFullYear(), auj.getMonth(), 1);
    let articles = [];
    corps.innerHTML = `
      <div class="dialogue-xp date-heure">
        <div class="onglets-xp"><button class="actif">Date et heure</button></div>
        <div class="onglet-corps">
          <div class="dh-colonnes">
            <fieldset class="groupe"><legend>Date</legend>
              <div class="dh-mois"><button class="btn-mini" data-a="prec" aria-label="Mois précédent">◄</button><b class="dh-titre"></b><button class="btn-mini" data-a="suiv" aria-label="Mois suivant">►</button></div>
              <div class="dh-calendrier"></div>
              <p class="dh-legende">Les jours <b>en gras</b> ont un article : clique pour le lire.</p>
            </fieldset>
            <fieldset class="groupe"><legend>Heure</legend>
              <canvas class="dh-horloge" width="96" height="96"></canvas>
              <div class="dh-numerique champ-xp"></div>
            </fieldset>
          </div>
          <p class="dh-fuseau"></p>
        </div>
        <div class="boutons-dialogue"><button class="btn btn-primaire" data-a="ok">OK</button><button class="btn" data-a="ok">Annuler</button></div>
      </div>`;
    const cal = $('.dh-calendrier', corps);
    const fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    $('.dh-fuseau', corps).textContent = 'Fuseau horaire actuel : ' + fuseau.replace(/_/g, ' ').replace('Europe/', '') + ' (' + (auj.toLocaleTimeString('fr-FR', { timeZoneName: 'short' }).split(' ').pop()) + ')';

    function dessinerCalendrier() {
      $('.dh-titre', corps).textContent = MOIS[vue.getMonth()] + ' ' + vue.getFullYear();
      const premier = (vue.getDay() + 6) % 7;
      const jours = new Date(vue.getFullYear(), vue.getMonth() + 1, 0).getDate();
      const prefixe = `${vue.getFullYear()}-${deuxChiffres(vue.getMonth() + 1)}-`;
      let h = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(j => `<span class="dh-entete">${j}</span>`).join('');
      for (let i = 0; i < premier; i++) h += '<span></span>';
      for (let j = 1; j <= jours; j++) {
        const art = articles.filter(a => String(a.date).startsWith(prefixe + deuxChiffres(j)));
        const estAuj = j === auj.getDate() && vue.getMonth() === auj.getMonth() && vue.getFullYear() === auj.getFullYear();
        h += `<button class="dh-jour${estAuj ? ' auj' : ''}${art.length ? ' article' : ''}" ${art.length ? `data-url="${echapper(art[0].url)}" title="${echapper(art.map(a => a.title).join(' · '))}"` : 'tabindex="-1"'}>${j}</button>`;
      }
      cal.innerHTML = h;
    }
    dessinerCalendrier();
    api.chargerArticles().then(l => { articles = l; dessinerCalendrier(); }).catch(() => {});

    const toile = $('.dh-horloge', corps), g = toile.getContext('2d');
    function horloge() {
      if (!toile.isConnected) { clearInterval(tic); return; }
      const d = new Date();
      $('.dh-numerique', corps).textContent = d.toLocaleTimeString('fr-FR');
      g.clearRect(0, 0, 96, 96);
      // cadran en pixels
      for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
        const r = Math.hypot(x - 47.5, y - 47.5);
        if (r < 46) { g.fillStyle = r > 43 ? '#1d4fc0' : r > 41 ? '#6aa0f5' : '#ffffff'; g.fillRect(x, y, 1, 1); }
      }
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * Math.PI * 2;
        g.fillStyle = k % 3 ? '#7a7a7a' : '#1d4fc0';
        const s = k % 3 ? 2 : 3;
        g.fillRect(Math.round(47.5 + Math.sin(a) * 35 - s / 2), Math.round(47.5 - Math.cos(a) * 35 - s / 2), s, s);
      }
      const aiguille = (angle, long, epais, coul) => {
        g.fillStyle = coul;
        for (let t = 0; t <= long; t += .5) g.fillRect(Math.round(47.5 + Math.sin(angle) * t - epais / 2), Math.round(47.5 - Math.cos(angle) * t - epais / 2), epais, epais);
      };
      const h = d.getHours() % 12, m = d.getMinutes(), s = d.getSeconds();
      aiguille((h + m / 60) / 12 * Math.PI * 2, 20, 3, '#000');
      aiguille((m + s / 60) / 60 * Math.PI * 2, 30, 2, '#000');
      aiguille(s / 60 * Math.PI * 2, 34, 1, '#d22');
      g.fillStyle = '#d22'; g.fillRect(46, 46, 3, 3);
    }
    horloge();
    const tic = setInterval(horloge, 1000);

    corps.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'prec') { vue = new Date(vue.getFullYear(), vue.getMonth() - 1, 1); dessinerCalendrier(); }
      if (a === 'suiv') { vue = new Date(vue.getFullYear(), vue.getMonth() + 1, 1); dessinerCalendrier(); }
      if (a === 'ok') { clearInterval(tic); api.fermer(etat.id); }
      const j = e.target.closest('.dh-jour.article');
      if (j) api.ouvrirApp('blog', { article: j.dataset.url });
    });
  }

  /* ================= Écrans de veille ================= */

  const VEILLES = [
    { id: 'dino', nom: 'Dino rebondissant' },
    { id: 'etoiles', nom: 'Voyage dans les étoiles' },
    { id: 'tuyaux', nom: 'Tuyaux en pixels' },
    { id: 'aucun', nom: '(Aucun)' }
  ];
  const reglagesVeille = () => Object.assign({ type: 'dino', minutes: 3 }, stockage.lire('site-veille', {}));

  const DINO = [
    '..........kkkk..',
    '.........kwwwwk.',
    '.........kwowwk.',
    '.........kwwwk..',
    '..........kwwk..',
    '..........kwwk..',
    '.....kkkkkkwwk..',
    '...kkwwwwwwwwk..',
    '..kwwwwwwwwwwk..',
    '.kwwwwwwwwwwwk..',
    'kwwkwwwwwwwwk...',
    'kwk.kwwkkwwk....',
    '.k..kwwk.kwwk...',
    '....kkkk.kkkk...'
  ];
  function dessinerDino(g, x, y, couleur, echelle = 1) {
    DINO.forEach((ligne, j) => [...ligne].forEach((ch, i) => {
      if (ch === '.') return;
      g.fillStyle = ch === 'k' ? '#000' : ch === 'o' ? '#000' : couleur;
      g.fillRect(x + i * echelle, y + j * echelle, echelle, echelle);
    }));
  }

  // fait tourner un écran de veille dans une toile ; renvoie une fonction pour l'arrêter
  function animerVeille(type, toile) {
    const g = toile.getContext('2d');
    const W = toile.width, H = toile.height;
    let fini = false, raf = 0;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (type === 'dino') {
      const couleurs = ['#3fae4f', '#f2b81e', '#ff4fa8', '#3fb7f2', '#ff7a2e', '#b06aff', '#ffffff'];
      const e = Math.max(1, Math.round(W / 220));
      let x = W * .3, y = H * .4, vx = W / 520, vy = H / 420, c = 0;
      const etoiles = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * H, Math.random()]);
      const tour = () => {
        if (fini) return;
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        etoiles.forEach(s => { g.fillStyle = s[2] > .8 ? '#fff' : '#555'; g.fillRect(Math.round(s[0]), Math.round(s[1]), 1, 1); });
        x += vx; y += vy;
        const w = 16 * e, h = 14 * e;
        if (x < 0 || x + w > W) { vx = -vx; x = Math.max(0, Math.min(W - w, x)); c = (c + 1) % couleurs.length; }
        if (y < 0 || y + h > H) { vy = -vy; y = Math.max(0, Math.min(H - h, y)); c = (c + 1) % couleurs.length; }
        dessinerDino(g, Math.round(x), Math.round(y), couleurs[c], e);
        raf = requestAnimationFrame(tour);
      };
      tour();
    }
    if (type === 'etoiles') {
      const n = Math.round(W * H / 900) + 60;
      const s = Array.from({ length: n }, () => ({ x: (Math.random() - .5) * W, y: (Math.random() - .5) * H, z: Math.random() * W }));
      const tour = () => {
        if (fini) return;
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H);
        for (const p of s) {
          p.z -= W / 260;
          if (p.z <= 1) { p.x = (Math.random() - .5) * W; p.y = (Math.random() - .5) * H; p.z = W; }
          const k = (W / 2) / p.z;
          const x = Math.round(W / 2 + p.x * k), y = Math.round(H / 2 + p.y * k);
          const t = p.z < W / 4 ? 2 : 1;
          g.fillStyle = p.z < W / 3 ? '#ffffff' : '#9aa6c8';
          g.fillRect(x, y, t, t);
        }
        raf = requestAnimationFrame(tour);
      };
      tour();
    }
    if (type === 'tuyaux') {
      const T = Math.max(4, Math.round(W / 48));
      const cols = Math.floor(W / T), lignes = Math.floor(H / T);
      const teintes = [['#7fd0ff', '#2a8ad8', '#0d4a8a'], ['#9bf07a', '#3fae2f', '#1a6a10'], ['#ffd27a', '#e09a1e', '#8a5a00'], ['#ff9a9a', '#d83a3a', '#7a1010'], ['#e0b0ff', '#9a4ad8', '#4a1a7a'], ['#e8e8e8', '#9a9a9a', '#4a4a4a']];
      let occupe, tuyau, pas = 0;
      const nouveauTuyau = () => { tuyau = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * lignes), d: Math.floor(Math.random() * 4), t: teintes[Math.floor(Math.random() * teintes.length)], l: 0 }; };
      const vider = () => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); occupe = new Uint8Array(cols * lignes); pas = 0; nouveauTuyau(); };
      vider();
      const segment = (x, y, d, t) => {
        const cx = x * T, cy = y * T;
        const [clair, moyen, sombre] = t;
        if (d % 2 === 0) { g.fillStyle = sombre; g.fillRect(cx + 1, cy, T - 2, T); g.fillStyle = moyen; g.fillRect(cx + 2, cy, T - 4, T); g.fillStyle = clair; g.fillRect(cx + 2, cy, Math.max(1, T / 4), T); }
        else { g.fillStyle = sombre; g.fillRect(cx, cy + 1, T, T - 2); g.fillStyle = moyen; g.fillRect(cx, cy + 2, T, T - 4); g.fillStyle = clair; g.fillRect(cx, cy + 2, T, Math.max(1, T / 4)); }
      };
      const boule = (x, y, t) => {
        const cx = x * T + T / 2, cy = y * T + T / 2, r = T * .62;
        for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
          const d = Math.hypot(i, j);
          if (d <= r) { g.fillStyle = d < r * .45 && i < 0 && j < 0 ? t[0] : d < r * .8 ? t[1] : t[2]; g.fillRect(Math.round(cx + i), Math.round(cy + j), 1, 1); }
        }
      };
      const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
      const tic = setInterval(() => {
        if (fini) return;
        for (let k = 0; k < 2; k++) {
          const p = tuyau;
          let d = p.d;
          if (Math.random() < .22) d = (d + (Math.random() < .5 ? 1 : 3)) % 4;
          let nx = p.x + DX[d], ny = p.y + DY[d], essais = 0;
          while ((nx < 0 || ny < 0 || nx >= cols || ny >= lignes || occupe[ny * cols + nx]) && essais < 4) { d = (d + 1) % 4; nx = p.x + DX[d]; ny = p.y + DY[d]; essais++; }
          if (essais >= 4 || p.l > 120) { nouveauTuyau(); continue; }
          if (d !== p.d) boule(p.x, p.y, p.t); else segment(p.x, p.y, d, p.t);
          occupe[p.y * cols + p.x] = 1;
          p.x = nx; p.y = ny; p.d = d; p.l++;
          segment(p.x, p.y, d, p.t);
          if (++pas > cols * lignes * .55) vider();
        }
      }, 40);
      const arret = () => { fini = true; clearInterval(tic); };
      return arret;
    }
    return () => { fini = true; cancelAnimationFrame(raf); };
  }

  let veilleEnCours = null;
  function lancerVeille(type) {
    if (veilleEnCours) return;
    const t = type || reglagesVeille().type;
    if (t === 'aucun') return;
    const toile = document.createElement('canvas');
    toile.className = 'veille-xp';
    const echelle = 3;
    toile.width = Math.ceil(innerWidth / echelle); toile.height = Math.ceil(innerHeight / echelle);
    document.body.append(toile);
    const arret = animerVeille(t, toile);
    let x0 = null, y0 = null;
    const sortir = () => {
      arret(); toile.remove(); veilleEnCours = null;
      ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => window.removeEventListener(ev, surEvenement, true));
      derniereActivite = Date.now();
    };
    const surEvenement = e => {
      if (e.type === 'pointermove') {
        if (x0 === null) { x0 = e.clientX; y0 = e.clientY; return; }
        if (Math.hypot(e.clientX - x0, e.clientY - y0) < 8) return;
      }
      e.preventDefault(); e.stopPropagation();
      sortir();
    };
    veilleEnCours = sortir;
    setTimeout(() => ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => window.addEventListener(ev, surEvenement, true)), 500);
  }

  let derniereActivite = Date.now();
  function surveillerInactivite() {
    const bouger = () => { derniereActivite = Date.now(); };
    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => window.addEventListener(ev, bouger, { capture: true, passive: true }));
    setInterval(() => {
      const r = reglagesVeille();
      if (r.type === 'aucun' || veilleEnCours || document.hidden) return;
      const actif = document.activeElement;
      if (actif && actif.tagName === 'IFRAME') { derniereActivite = Date.now(); return; }   // on joue à un jeu
      if (Date.now() - derniereActivite > r.minutes * 60000) lancerVeille();
    }, 4000);
  }

  // onglet « Écran de veille » dans les Propriétés d'affichage
  function ongletVeille(conteneur) {
    const r = reglagesVeille();
    conteneur.innerHTML = `
      <div class="moniteur" aria-hidden="true"><canvas class="ecran-apercu" width="164" height="103"></canvas></div>
      <fieldset class="groupe"><legend>Écran de veille</legend>
        <div class="veille-reglages">
          <select class="champ-xp liste-veille">${VEILLES.map(v => `<option value="${v.id}"${v.id === r.type ? ' selected' : ''}>${echapper(v.nom)}</option>`).join('')}</select>
          <button class="btn" data-a="apercu-veille">Aperçu</button>
        </div>
        <label class="veille-attente">Attente : <input class="champ-xp" type="number" min="1" max="60" value="${r.minutes}"> minutes</label>
      </fieldset>
      <p class="astuce-xp">L'écran de veille démarre quand personne ne touche la souris ni le clavier (sauf pendant un jeu).</p>`;
    const toile = $('canvas', conteneur);
    const liste = $('select', conteneur);
    let arret = null;
    const apercu = () => {
      if (arret) arret();
      const g = toile.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, toile.width, toile.height);
      arret = liste.value === 'aucun' ? null : animerVeille(liste.value, toile);
    };
    apercu();
    liste.addEventListener('change', apercu);
    conteneur.addEventListener('click', e => { if (e.target.closest('[data-a="apercu-veille"]')) lancerVeille(liste.value); });
    const obs = new MutationObserver(() => { if (!conteneur.isConnected) { if (arret) arret(); obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });
    return {
      valider() {
        const minutes = Math.max(1, Math.min(60, parseInt($('input', conteneur).value, 10) || 3));
        stockage.ecrire('site-veille', { type: liste.value, minutes });
      }
    };
  }

  /* ================= Écran bleu (pour rire) ================= */

  function ecranBleu() {
    if ($('.ecran-bleu')) return;
    son('erreur');
    const e = creer(`<div class="ecran-bleu" role="alertdialog" aria-label="Écran bleu"><pre>Un problème a été détecté et ${echapper(NOM)} a été arrêté pour éviter
d'endommager votre ordinateur.

DINO_TROP_MIGNON_EXCEPTION

Si c'est la première fois que vous voyez cet écran d'arrêt,
redémarrez votre ordinateur. Si cet écran apparaît encore,
donnez une part de pizza au dino et réessayez.

Vérifiez aussi que vous n'avez pas tapé « crash » dans
l'Invite de commandes. (C'est peut-être ça.)

Informations techniques :

*** STOP: 0x0000D1N0 (0xC0FFEE00, 0x00000042, 0xBADC0DE5, 0x00000000)

***  DINO.SYS - Adresse F00DCAFE base à F0000000, date 2026

Appuyez sur une touche ou cliquez pour redémarrer…</pre></div>`);
    document.body.append(e);
    const fin = () => {
      e.remove();
      window.removeEventListener('keydown', fin, true);
      api.bulle(NOM, 'Le dino a redémarré. Tout va bien.', 3000);
    };
    setTimeout(() => { window.addEventListener('keydown', fin, true); e.addEventListener('pointerdown', fin); }, 600);
  }

  /* ================= Code Konami : pluie de dinos ================= */

  function pluieDeDinos() {
    const toile = document.createElement('canvas');
    toile.className = 'pluie-dinos';
    const e = 3;
    toile.width = Math.ceil(innerWidth / e); toile.height = Math.ceil(innerHeight / e);
    document.body.append(toile);
    const g = toile.getContext('2d');
    const couleurs = ['#3fae4f', '#f2b81e', '#ff4fa8', '#3fb7f2', '#ff7a2e', '#b06aff'];
    const dinos = Array.from({ length: 46 }, () => ({ x: Math.random() * toile.width, y: -20 - Math.random() * toile.height, v: .4 + Math.random() * 1.2, c: couleurs[Math.floor(Math.random() * couleurs.length)], m: Math.random() < .5 }));
    const debut = performance.now();
    const tour = t => {
      g.clearRect(0, 0, toile.width, toile.height);
      dinos.forEach(d => {
        d.y += d.v;
        g.save();
        if (d.m) { g.translate(Math.round(d.x) + 16, 0); g.scale(-1, 1); dessinerDino(g, 0, Math.round(d.y), d.c); }
        else dessinerDino(g, Math.round(d.x), Math.round(d.y), d.c);
        g.restore();
      });
      if (t - debut < 7000) requestAnimationFrame(tour); else toile.remove();
    };
    requestAnimationFrame(tour);
    son('demarrage');
  }

  function surveillerKonami() {
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let i = 0;
    window.addEventListener('keydown', e => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = k === code[i] ? i + 1 : (k === code[0] ? 1 : 0);
      if (i === code.length) { i = 0; pluieDeDinos(); api.bulle('Code secret', 'Tu as trouvé le code Konami. Pluie de dinos !', 4000); }
    });
  }

  /* ================= Sélection au lasso sur le bureau ================= */

  function lasso() {
    const bureau = $('.bureau');
    bureau.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.icone-bureau, .fenetre')) return;
      const x0 = e.clientX, y0 = e.clientY;
      let cadre = null;
      const icones = $$('.icone-bureau');
      const bouger = ev => {
        const x1 = ev.clientX, y1 = ev.clientY;
        if (!cadre) {
          if (Math.hypot(x1 - x0, y1 - y0) < 4) return;
          cadre = creer('<div class="lasso"></div>');
          document.body.append(cadre);
        }
        const l = Math.min(x0, x1), t = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
        Object.assign(cadre.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px' });
        icones.forEach(ic => {
          const r = ic.getBoundingClientRect();
          ic.classList.toggle('selection', r.right > l && r.left < l + w && r.bottom > t && r.top < t + h);
        });
      };
      const fin = () => {
        window.removeEventListener('pointermove', bouger);
        window.removeEventListener('pointerup', fin);
        if (cadre) cadre.remove();
      };
      window.addEventListener('pointermove', bouger);
      window.addEventListener('pointerup', fin);
    });
    // touche Suppr sur des icônes sélectionnées
    window.addEventListener('keydown', e => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return;
      const sel = $$('.icone-bureau.selection');
      if (!sel.length) return;
      e.preventDefault();
      boite({ titre: 'Confirmer la suppression', icone: 'attention', boutons: ['Oui', 'Non'], texte: sel.length > 1 ? `Voulez-vous vraiment envoyer ces ${sel.length} éléments dans la Corbeille ?` : `Voulez-vous vraiment envoyer « ${echapper($('span', sel[0]).textContent)} » dans la Corbeille ?` })
        .then(r => { if (r === 'Oui') boite({ titre: 'Erreur', icone: 'erreur', texte: 'Impossible de supprimer : le dino s\'est assis dessus et refuse de bouger.' }); });
    });
  }

  /* ================= Branchements ================= */

  function demarrer() {
    surveillerInactivite();
    surveillerKonami();
    lasso();
    const h = $('.horloge');
    if (h) { h.style.cursor = 'default'; h.addEventListener('click', () => api.ouvrirApp('dateheure')); }
    const vol = $('.zone-notif .icone-notif[title="Volume"]');
    if (vol) {
      const maj = () => { vol.classList.toggle('muet', !sonActif); vol.title = 'Volume'; vol.setAttribute('aria-label', sonActif ? 'Son activé' : 'Son coupé'); };
      maj();
      vol.addEventListener('click', () => {
        sonActif = !sonActif; stockage.ecrire('site-son', sonActif); maj();
        if (sonActif) contexte();
        api.bulle('Volume', sonActif ? 'Le son est activé.' : 'Le son est coupé.', 1800);
      });
    }
    // le premier clic débloque le son (les navigateurs l'exigent)
    window.addEventListener('pointerdown', () => { if (sonActif) contexte(); }, { once: true, capture: true });
  }

  return {
    apps: {
      cmd: { titre: 'C:\\DINOSAURRR\\system32\\cmd.exe', icone: 'console', taille: [680, 420], adresse: '', ouvrir: contenuCmd, sansMenus: true },
      notepad: {
        titre: 'Sans titre - Bloc-notes', icone: 'blocnotes', taille: [560, 400], adresse: '', ouvrir: contenuBlocNotes,
        menus: [
          ['Fichier', [['nouveau', 'Nouveau'], ['enregistrer', 'Enregistrer    Ctrl+S'], ['telecharger', 'Télécharger notes.txt…', 'fichier'], null, ['fermer', 'Quitter']]],
          ['Édition', [['annuler', 'Annuler'], null, ['tout', 'Sélectionner tout'], ['heure', 'Heure/Date    F5', 'horloge']]],
          ['Format', [['retour', 'Retour automatique à la ligne']]],
          ['?', [['apropos-notes', 'À propos du Bloc-notes', 'info']]]
        ]
      },
      executer: { titre: 'Exécuter', icone: 'executer', taille: [370, 196], adresse: '', ouvrir: contenuExecuter, dialogue: true },
      dateheure: { titre: 'Propriétés de Date et heure', icone: 'horloge', taille: [460, 346], adresse: '', ouvrir: contenuDateHeure, dialogue: true }
    },
    programmes: [
      { app: 'notepad', nom: 'Bloc-notes', icone: 'blocnotes' },
      { app: 'cmd', nom: 'Invite de commandes', icone: 'console' },
      { app: 'dateheure', nom: 'Date et heure', icone: 'horloge' },
      { app: 'executer', nom: 'Exécuter…', icone: 'executer' }
    ],
    demarrer, son, boite, lancer, ongletVeille, lancerVeille
  };
};
