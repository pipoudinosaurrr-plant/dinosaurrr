/* ==========================================================
   Lecteur de musique façon années 2000
   1) Les musiques envoyées dans Pages CMS (« Musiques du lecteur »,
      fichiers dans media/musiques, liste dans _data/musiques.json)
   2) Puis 6 morceaux chiptune originaux, joués en direct par le
      navigateur (WebAudio) : aucun fichier, aucun droit d'auteur.
   DinoMusique.lecteur(conteneur) : affiche le lecteur dans une fenêtre
   ========================================================== */
(function () {
  if (window.DinoMusique) return;

  // fréquence d'une note : 'C4', 'F#3', 'Bb5'…
  const NOTES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const freq = n => { const m = /^([A-G][#b]?)(\d)$/.exec(n); return m ? 440 * Math.pow(2, (NOTES[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12) : 0; };
  const midi = n => { const m = /^([A-G][#b]?)(\d)$/.exec(n); return m ? NOTES[m[1]] + (Number(m[2]) + 1) * 12 : 60; };
  const versNom = k => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][k % 12] + (Math.floor(k / 12) - 1);
  // hasard reproductible : chaque morceau a sa graine, il est donc toujours le même
  function alea(graine) { let s = graine >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // accords : notes de base (en demi-tons au-dessus de la tonique) pour majeur / mineur
  const ACCORDS = { I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16], bVII: [10, 14, 17], i: [0, 3, 7], iv: [5, 8, 12], v: [7, 10, 14], bVI: [8, 12, 15], bIII: [3, 7, 10] };

  const MORCEAUX = [
    { titre: 'Neon Groove', auteur: 'XP Music', tonique: 'C3', tempo: 124, graine: 7, accords: ['I', 'V', 'vi', 'IV'], gamme: [0, 2, 4, 7, 9], style: 'pop' },
    { titre: 'Volcan en pixels', auteur: 'XP Music', tonique: 'A2', tempo: 140, graine: 21, accords: ['i', 'bVI', 'bIII', 'bVII'], gamme: [0, 3, 5, 7, 10], style: 'action' },
    { titre: 'Coucher de soleil', auteur: 'XP Music', tonique: 'F3', tempo: 92, graine: 5, accords: ['I', 'iii', 'IV', 'V'], gamme: [0, 2, 4, 7, 9], style: 'calme' },
    { titre: 'Course de nuit', auteur: 'XP Music', tonique: 'E3', tempo: 156, graine: 42, accords: ['i', 'iv', 'v', 'i'], gamme: [0, 3, 5, 7, 10], style: 'action' },
    { titre: 'Funk 2000', auteur: 'XP Music', tonique: 'D3', tempo: 108, graine: 13, accords: ['i', 'iv', 'bVII', 'bIII'], gamme: [0, 3, 5, 7, 10], style: 'funk' },
    { titre: 'Lever du jour', auteur: 'XP Music', tonique: 'G3', tempo: 116, graine: 88, accords: ['I', 'vi', 'ii', 'V'], gamme: [0, 2, 4, 7, 9], style: 'pop' }
  ];

  // fabrique la partition d'un morceau : 4 mesures × 16 doubles-croches, jouées 4 fois (A A' B A'')
  function composer(m) {
    const r = alea(m.graine);
    const base = midi(m.tonique);
    const motif = [];   // rythme et notes de la mélodie sur 2 mesures, repris avec des variations
    for (let i = 0; i < 32; i++) motif.push(r() < (m.style === 'calme' ? 0.32 : 0.5) ? Math.floor(r() * 7) : -1);
    const sections = [0, 1, 2, 1];
    const pas = [];
    sections.forEach((sec, s) => {
      m.accords.forEach((nomAccord, mesure) => {
        const acc = ACCORDS[nomAccord].map(x => base + x);
        for (let i = 0; i < 16; i++) {
          const p = { basse: null, arpege: null, melodie: null, kick: false, caisse: false, charley: false };
          // basse : tonique de l'accord, sur les temps (plus de notes en funk)
          if (i % 4 === 0 || (m.style === 'funk' && (i === 6 || i === 11)) || (m.style === 'action' && i % 2 === 0)) p.basse = versNom(acc[0] - 12 + (m.style === 'funk' && i === 11 ? 12 : 0));
          // arpège : les notes de l'accord qui montent
          if (m.style !== 'calme' || i % 2 === 0) p.arpege = versNom(acc[i % 3] + 12 + (i % 6 >= 3 ? 12 : 0));
          // mélodie : le motif, adapté à l'accord du moment (sauf pendant la section B, plus aérée)
          const k = motif[(mesure % 2) * 16 + i];
          if (k >= 0 && !(sec === 2 && i % 4 !== 0)) {
            const degre = m.gamme[k % m.gamme.length] + (k >= m.gamme.length ? 12 : 0) + (sec === 2 ? 5 : 0);
            p.melodie = versNom(base + 24 + degre);
          }
          // batterie
          p.kick = i % 8 === 0 || (m.style !== 'calme' && i === 10);
          p.caisse = i % 8 === 4 && m.style !== 'calme';
          p.charley = m.style === 'calme' ? i % 4 === 2 : i % 2 === 0;
          if (s === 0 && mesure === 0 && i < 8) p.melodie = null;   // une petite intro
          pas.push(p);
        }
      });
    });
    return pas;
  }

  /* ---------- Le moteur audio ---------- */
  let audio = null, sortie = null, analyse = null, volume = 0.6;
  try { volume = Number(localStorage.getItem('dinoamp-volume') ?? 0.6); } catch (e) { /* rien */ }
  function contexte() {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      sortie = audio.createGain();
      sortie.gain.value = volume * 0.5;
      analyse = audio.createAnalyser();
      analyse.fftSize = 64;
      sortie.connect(analyse).connect(audio.destination);
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  let bruit = null;
  function tamponBruit(a) {
    if (bruit) return bruit;
    bruit = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate);
    const d = bruit.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return bruit;
  }
  function note(a, t, f, duree, type, vol, vers = sortie) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g).connect(vers);
    o.start(t); o.stop(t + duree + 0.02);
  }
  function percu(a, t, type, vers = sortie) {
    if (type === 'kick') {
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(vers); o.start(t); o.stop(t + 0.2);
      return;
    }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = tamponBruit(a);
    f.type = type === 'caisse' ? 'bandpass' : 'highpass';
    f.frequency.value = type === 'caisse' ? 1800 : 7000;
    const d = type === 'caisse' ? 0.14 : 0.04;
    g.gain.setValueAtTime(type === 'caisse' ? 0.35 : 0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(vers); s.start(t); s.stop(t + d + 0.02);
  }

  // pour le jeu de rythme : la partition d'un morceau (avec le temps de chaque pas) et le morceau « enregistré » d'un coup
  function partition(index) {
    const m = MORCEAUX[index];
    const duree = 60 / m.tempo / 4;
    return { tempo: m.tempo, pas: composer(m).map((p, i) => ({ ...p, t: i * duree })), duree };
  }
  async function rendre(index) {
    const m = MORCEAUX[index];
    const pas = composer(m);
    const d = 60 / m.tempo / 4;
    const total = pas.length * d + 1.5;
    const Hors = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const a = new Hors(1, Math.ceil(44100 * total), 44100);
    const vers = a.createGain(); vers.gain.value = 0.3; vers.connect(a.destination);
    pas.forEach((p, i) => {
      const t = i * d + 0.05;
      if (p.basse) note(a, t, freq(p.basse), d * 1.8, 'triangle', 0.32, vers);
      if (p.arpege) note(a, t, freq(p.arpege), d * 0.9, 'square', 0.035, vers);
      if (p.melodie) note(a, t, freq(p.melodie), d * (m.style === 'calme' ? 3.2 : 1.7), m.style === 'calme' ? 'triangle' : 'square', m.style === 'calme' ? 0.16 : 0.07, vers);
      if (p.kick) percu(a, t, 'kick', vers);
      if (p.caisse) percu(a, t, 'caisse', vers);
      if (p.charley) percu(a, t, 'charley', vers);
    });
    return a.startRendering();
  }

  // lecture : on programme les notes un peu à l'avance (lecture fluide même si la page est occupée)
  let enCours = null;   // { m, pas, i, prochain, minuterie, debut }
  function jouer(index, depuis = 0) {
    arreter();
    const a = contexte();
    const m = MORCEAUX[index];
    const pas = composer(m);
    const duree = 60 / m.tempo / 4;
    enCours = { index, m, pas, i: Math.floor(depuis / duree) % pas.length, prochain: a.currentTime + 0.08, duree, debut: a.currentTime + 0.08 - depuis };
    const programmer = () => {
      if (!enCours) return;
      while (enCours.prochain < a.currentTime + 0.25) {
        const p = enCours.pas[enCours.i], t = enCours.prochain, d = enCours.duree;
        if (p.basse) note(a, t, freq(p.basse), d * 1.8, 'triangle', 0.32);
        if (p.arpege) note(a, t, freq(p.arpege), d * 0.9, 'square', 0.035);
        if (p.melodie) note(a, t, freq(p.melodie), d * (enCours.m.style === 'calme' ? 3.2 : 1.7), enCours.m.style === 'calme' ? 'triangle' : 'square', enCours.m.style === 'calme' ? 0.16 : 0.07);
        if (p.kick) percu(a, t, 'kick');
        if (p.caisse) percu(a, t, 'caisse');
        if (p.charley) percu(a, t, 'charley');
        enCours.prochain += d;
        enCours.i++;
        if (enCours.i >= enCours.pas.length) { enCours.fin = enCours.prochain; break; }
      }
      if (enCours.fin) {
        if (a.currentTime >= enCours.fin) { const suivant = ecouteurs.fin; enCours = null; if (suivant) suivant(); return; }
      }
      enCours.minuterie = setTimeout(programmer, 50);
    };
    programmer();
  }
  function arreterChip() { if (enCours) { clearTimeout(enCours.minuterie); enCours = null; } }
  function arreter() { arreterChip(); if (typeof arreterFichier === 'function') arreterFichier(); }
  const ecouteurs = { fin: null };
  const dureeMorceau = m => composer(m).length * 60 / m.tempo / 4;

  /* ---------- Les musiques envoyées dans Pages CMS ---------- */
  const lien = f => { const t = String(f || '').trim(); return /^(https?:)?\/\//.test(t) ? t : t.replace(/^\/+/, ''); };
  const FICHIERS = (Array.isArray(window.SITE_MUSIQUES) ? window.SITE_MUSIQUES : [])
    .filter(x => x && x.fichier)
    .map(x => ({ titre: String(x.titre || String(x.fichier).split('/').pop().replace(/\.[a-z0-9]+$/i, '')), auteur: String(x.artiste || ''), fichier: lien(x.fichier), duree: 0 }));
  // la liste complète : d'abord les fichiers, puis les chiptunes
  const PISTES = [...FICHIERS.map(f => ({ type: 'fichier', ...f })), ...MORCEAUX.map((m, i) => ({ type: 'chip', i, titre: m.titre, auteur: m.auteur, tempo: m.tempo }))];
  let elAudio = null, branche = false, gainFichier = null, pisteFichier = null;
  function lecteurAudio() {
    if (elAudio) return elAudio;
    elAudio = new Audio();
    elAudio.preload = 'auto';
    elAudio.addEventListener('ended', () => { pisteFichier = null; if (ecouteurs.fin) ecouteurs.fin(); });
    elAudio.addEventListener('error', () => { if (!pisteFichier) return; pisteFichier = null; if (ecouteurs.erreur) ecouteurs.erreur(); });
    return elAudio;
  }
  function jouerFichier(p, depuis = 0) {
    arreter();
    const a = contexte(), el = lecteurAudio();
    // on passe le son par WebAudio (égaliseur + volume), seulement si le fichier vient du site
    if (!branche) {
      try {
        const memeSite = new URL(p.fichier, location.href).origin === location.origin;
        if (memeSite) { gainFichier = a.createGain(); gainFichier.gain.value = 2; a.createMediaElementSource(el).connect(gainFichier).connect(sortie); branche = true; }
      } catch (e) { /* tant pis : le son sort directement */ }
    }
    el.volume = branche ? 1 : volume;
    const url = new URL(p.fichier, location.href).href;
    if (el.src !== url) el.src = url;
    pisteFichier = p;
    const go = () => { try { if (depuis) el.currentTime = depuis; } catch (e) { /* rien */ } el.play().catch(() => {}); };
    if (el.readyState >= 1) go(); else el.addEventListener('loadedmetadata', go, { once: true });
    el.addEventListener('loadedmetadata', () => { if (isFinite(el.duration)) p.duree = el.duration; }, { once: true });
  }
  function arreterFichier() { if (elAudio) { elAudio.pause(); } pisteFichier = null; }
  // durée des fichiers : lue en avance (juste l'en-tête du fichier)
  function chargerDurees(fini) {
    PISTES.filter(p => p.type === 'fichier' && !p.duree).forEach(p => {
      const t = new Audio(); t.preload = 'metadata';
      t.addEventListener('loadedmetadata', () => { if (isFinite(t.duration)) { p.duree = t.duration; fini(); } t.src = ''; }, { once: true });
      t.src = p.fichier;
    });
  }

  /* ---------- L'interface ---------- */
  const STYLE = `
    .dinoamp { height: 100%; display: flex; flex-direction: column; gap: 8px; padding: 10px; box-sizing: border-box; background: linear-gradient(#2a2a35, #15151c); color: #d4ffd4; font: 12px Tahoma, Verdana, sans-serif; user-select: none; }
    .dinoamp .ecran { display: grid; grid-template-columns: 92px 1fr; gap: 8px; padding: 8px; border: 2px inset #3a3a48; background: #000; }
    .dinoamp .temps { font: bold 26px/1 "Courier New", monospace; color: #3cff3c; text-shadow: 0 0 6px rgba(60, 255, 60, .6); }
    .dinoamp .etat { font: 10px "Courier New", monospace; color: #1fa31f; margin-top: 4px; }
    .dinoamp .titre { overflow: hidden; white-space: nowrap; font: bold 12px "Courier New", monospace; color: #3cff3c; }
    .dinoamp .titre span { display: inline-block; padding-left: 100%; animation: dinoamp-defile 12s linear infinite; }
    @keyframes dinoamp-defile { to { transform: translateX(-100%); } }
    .dinoamp canvas { width: 100%; height: 34px; margin-top: 6px; display: block; }
    .dinoamp .boutons { display: flex; gap: 4px; align-items: center; }
    .dinoamp button { height: 26px; min-width: 32px; border: 1px solid #555; border-radius: 3px; background: linear-gradient(#5a5a6a, #33333f); color: #eee; font: bold 12px Tahoma, sans-serif; cursor: pointer; }
    .dinoamp button:active, .dinoamp button.actif { background: linear-gradient(#2c6e2c, #1d4d1d); color: #c8ffc8; }
    .dinoamp input[type=range] { flex: 1; accent-color: #3cff3c; }
    .dinoamp .barre { height: 8px; border: 1px inset #3a3a48; background: #000; cursor: pointer; }
    .dinoamp .barre i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #1fa31f, #3cff3c); }
    .dinoamp ol { flex: 1; min-height: 60px; margin: 0; padding: 4px; overflow-y: auto; list-style: none; border: 2px inset #3a3a48; background: #000; font: 12px "Courier New", monospace; }
    .dinoamp li { display: flex; justify-content: space-between; padding: 2px 4px; color: #1fd31f; cursor: pointer; }
    .dinoamp li.actif { background: #0b3a0b; color: #fff; }
    .dinoamp li:hover { background: #082808; }
    .dinoamp li span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; margin-right: 8px; }
    .dinoamp li.chip span:first-child::after { content: ' ♪'; color: #1fa31f; }
    .dinoamp li.sep { cursor: default; color: #3d5a3d; font-size: 10.5px; padding-top: 6px; }
    .dinoamp li.sep:hover { background: none; }
    .dinoamp .note { color: #7a8a7a; font-size: 10.5px; text-align: center; }`;

  function lecteur(conteneur) {
    if (!document.getElementById('style-dinoamp')) { const st = document.createElement('style'); st.id = 'style-dinoamp'; st.textContent = STYLE; document.head.append(st); }
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    conteneur.innerHTML = `
      <div class="dinoamp">
        <div class="ecran"><div><div class="temps">0:00</div><div class="etat">ARRÊT</div></div><div><div class="titre"><span>Lecteur de musique — choisis un morceau</span></div><canvas width="200" height="34"></canvas></div></div>
        <div class="barre" title="Avancer"><i></i></div>
        <div class="boutons">
          <button data-b="prec" title="Précédent">⏮</button><button data-b="lecture" title="Lecture">▶</button><button data-b="pause" title="Pause">⏸</button><button data-b="stop" title="Arrêt">⏹</button><button data-b="suiv" title="Suivant">⏭</button>
          <button data-b="hasard" title="Lecture au hasard">🔀</button><button data-b="boucle" title="Répéter">🔁</button>
        </div>
        <div class="boutons"><span>🔈</span><input type="range" min="0" max="100" value="${Math.round(volume * 100)}" aria-label="Volume"><span>🔊</span></div>
        <ol></ol>
        <div class="note">${FICHIERS.length ? `${FICHIERS.length} musique${FICHIERS.length > 1 ? 's' : ''} du site, puis des morceaux chiptune joués en direct (♪).` : 'Musiques chiptune originales jouées en direct par ton navigateur.'}</div>
      </div>`;
    const $ = s => conteneur.querySelector(s);
    const echapper = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const N = PISTES.length;
    let actuel = 0, pause = 0, hasard = false, boucle = true;
    const toile = $('canvas'), g = toile.getContext('2d');
    const duree = p => p.type === 'chip' ? dureeMorceau(MORCEAUX[p.i]) : p.duree;
    const enLecture = () => !!(enCours || (pisteFichier && elAudio && !elAudio.paused));
    const temps = () => pisteFichier && elAudio ? elAudio.currentTime : (enCours && audio ? Math.max(0, audio.currentTime - enCours.debut) : pause);
    function dessinerListe() {
      $('ol').innerHTML = PISTES.map((p, i) => `${p.type === 'chip' && i === FICHIERS.length && FICHIERS.length ? '<li class="sep">— Chiptune —</li>' : ''}<li data-i="${i}" class="${p.type}"><span>${i + 1}. ${echapper(p.auteur ? `${p.auteur} — ${p.titre}` : p.titre)}</span><span>${duree(p) ? fmt(duree(p)) : '--:--'}</span></li>`).join('');
      majListe();
    }
    function lancer(i, depuis = 0) {
      actuel = (i + N) % N;
      pause = 0;
      const p = PISTES[actuel];
      if (p.type === 'chip') jouer(p.i, depuis); else jouerFichier(p, depuis);
      majListe();
    }
    ecouteurs.fin = () => {
      if (!conteneur.isConnected) return;
      if (hasard) lancer(Math.floor(Math.random() * N));
      else if (boucle || actuel < N - 1) lancer(actuel + 1);
      else majListe();
    };
    let erreurs = 0;
    ecouteurs.erreur = () => {
      if (!conteneur.isConnected) return;
      $('.titre span').textContent = `Impossible de lire « ${PISTES[actuel].titre} » — morceau suivant… *** `;
      if (++erreurs < N) setTimeout(() => lancer(actuel + 1), 1200);
    };
    function majListe() {
      conteneur.querySelectorAll('li[data-i]').forEach(li => li.classList.toggle('actif', Number(li.dataset.i) === actuel));
      const p = PISTES[actuel];
      $('.titre span').textContent = `${actuel + 1}. ${p.auteur ? p.auteur + ' — ' : ''}${p.titre}${p.type === 'chip' ? ` (${p.tempo} bpm)` : ''} *** `;
    }
    conteneur.addEventListener('click', e => {
      const li = e.target.closest('li[data-i]');
      if (li) { lancer(Number(li.dataset.i)); return; }
      const b = e.target.closest('[data-b]');
      if (!b) return;
      const quoi = b.dataset.b;
      if (quoi === 'lecture' && !enLecture()) { erreurs = 0; lancer(actuel, pause); }
      if (quoi === 'pause' && enLecture()) { pause = temps(); arreter(); }
      if (quoi === 'stop') { arreter(); pause = 0; }
      if (quoi === 'suiv') lancer(hasard ? Math.floor(Math.random() * N) : actuel + 1);
      if (quoi === 'prec') lancer(actuel - 1);
      if (quoi === 'hasard') { hasard = !hasard; b.classList.toggle('actif', hasard); }
      if (quoi === 'boucle') { boucle = !boucle; b.classList.toggle('actif', boucle); }
    });
    $('[data-b="boucle"]').classList.add('actif');
    $('.barre').addEventListener('click', e => {
      const r = e.currentTarget.getBoundingClientRect();
      const d = duree(PISTES[actuel]);
      if (d) lancer(actuel, (e.clientX - r.left) / r.width * d);
    });
    $('input[type=range]').addEventListener('input', e => {
      volume = Number(e.target.value) / 100;
      try { localStorage.setItem('dinoamp-volume', String(volume)); } catch (err) { /* rien */ }
      if (sortie) sortie.gain.value = volume * 0.5;
      if (elAudio && !branche) elAudio.volume = volume;
    });
    dessinerListe();
    chargerDurees(() => { if (conteneur.isConnected) dessinerListe(); });
    // l'affichage : temps, barre et égaliseur
    const donnees = new Uint8Array(32);
    (function dessiner() {
      if (!conteneur.isConnected) { arreter(); return; }
      requestAnimationFrame(dessiner);
      const t = temps(), d = duree(PISTES[actuel]), joue = enLecture();
      $('.temps').textContent = fmt(t);
      $('.etat').textContent = joue ? 'LECTURE ▶' : pause ? 'PAUSE ⏸' : 'ARRÊT';
      $('.barre i').style.width = (d ? Math.min(100, t / d * 100) : 0) + '%';
      g.clearRect(0, 0, toile.width, toile.height);
      if (analyse && joue && (enCours || branche)) analyse.getByteFrequencyData(donnees); else donnees.fill(0);
      const n = 20, w = toile.width / n;
      for (let i = 0; i < n; i++) {
        const v = donnees[i + 1] / 255;
        const h = Math.max(1, v * toile.height);
        const grad = g.createLinearGradient(0, toile.height, 0, 0);
        grad.addColorStop(0, '#1fa31f'); grad.addColorStop(0.7, '#e5e517'); grad.addColorStop(1, '#ff4040');
        g.fillStyle = grad;
        g.fillRect(i * w + 1, toile.height - h, w - 2, h);
      }
    })();
  }

  window.DinoMusique = { lecteur, morceaux: MORCEAUX, pistes: PISTES, arreter, partition, rendre };
})();
