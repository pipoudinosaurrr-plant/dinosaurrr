/* ==========================================================
   Les comptes des joueurs (un seul objet pour tout le site, base SQLite)
   - pseudo réservé + mot de passe choisi par le joueur (modifiable)
   - le mot de passe n'est jamais stocké : seulement une empreinte
     (PBKDF2-SHA256, 100 000 tours, sel aléatoire)
   - sessions : un jeton aléatoire par appareil (on ne garde que son empreinte)
   - victoires par jeu, amis, dernière visite, réglages (invisible, invitations)
   ========================================================== */

import { DurableObject } from 'cloudflare:workers';
import { XP, niveauDe, xpPourNiveau, titreDe, AVATARS, avatarDe, CLASSEMENTS, JEUX_PROGRES, SUCCES, jourDe, defiDuJour, defiReussi } from '../assets/progres-defs.js';

const TOURS = 100000;                         // maximum autorisé par Cloudflare
const DUREE_SESSION = 180 * 24 * 3600 * 1000; // 6 mois sans visite = session expirée
const ECHECS_MAX = 5;                         // 5 mauvais mots de passe…
const BLOCAGE = 5 * 60 * 1000;                // … = compte bloqué 5 minutes
const MOTS_INTERDITS = new Set(['visiteur', 'invite', 'admin', 'administrateur', 'moderateur', 'modo', 'dinosaurrr', 'joueur', 'bot', 'systeme', 'serveur', 'anonyme']);
const INVITATIONS = ['tous', 'amis', 'personne'];

const enc = new TextEncoder();
const hex = octets => Array.from(new Uint8Array(octets), o => o.toString(16).padStart(2, '0')).join('');
const deHex = t => new Uint8Array(t.match(/../g).map(h => parseInt(h, 16)));
const aleatoire = n => hex(crypto.getRandomValues(new Uint8Array(n)));

// « Pipou », « pipou » et « Pípou » sont le même pseudo
export const clePseudo = nom => String(nom || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/* ----- Le compte du propriétaire du site -----
   Toutes les formes de « pipou » et « dinosaur » (majuscules, accents, chiffres
   à la place des lettres, lettres doublées, séparateurs…) mènent à ce compte.
   Personne ne peut créer un compte qui en contient une. */
export const PROPRIO = { cle: 'pipou_dinosaur', nom: 'Pipou_Dinosaur' };
// empreinte du code secret qui permet au propriétaire de créer / reprendre son compte
const CODE_PROPRIO = 'a136f0086169d1566b924ec868db421b25bd93477c2f9ef65c8b83f70f03b9a6';
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's', '!': 'i', '|': 'i', y: 'i', z: 's', k: 'c', q: 'c', w: 'v' };
const MOTS_PROPRIO = ['pipou', 'pipu', 'dinosaur', 'dinosor', 'dinosaor', 'dinausor', 'dinausaur'];
export function formeProprio(nom) {
  const base = clePseudo(nom).replace(/./g, c => LEET[c] || c).replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
  // « dinosaur » s'écrit aussi avec un z (dinozaur → dinosaur grâce à z→s)
  return MOTS_PROPRIO.some(m => base.includes(m));
}
// la clé du compte à utiliser pour un pseudo tapé
export const cleCompte = nom => formeProprio(nom) ? PROPRIO.cle : clePseudo(nom);

async function empreinte(mdp, sel) {
  const cle = await crypto.subtle.importKey('raw', enc.encode(mdp), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deHex(sel), iterations: TOURS }, cle, 256);
  return hex(bits);
}

const sha256 = async t => hex(await crypto.subtle.digest('SHA-256', enc.encode(t)));

function egal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function verifierPseudo(nom) {
  const n = String(nom || '').trim();
  if (n.length < 3 || n.length > 14) return 'Le pseudo doit faire entre 3 et 14 caractères.';
  if (!/^[\p{L}\p{N}_.-]+$/u.test(n)) return 'Le pseudo ne peut contenir que des lettres, des chiffres, _ . et -';
  const cle = clePseudo(n);
  if (formeProprio(n)) return 'Ce pseudo est réservé, choisis-en un autre.';
  if (MOTS_INTERDITS.has(cle) || /^(joueur|invite|bot)\d*$/.test(cle)) return 'Ce pseudo est réservé, choisis-en un autre.';
  return null;
}

function verifierMdp(mdp) {
  const m = String(mdp || '');
  if (m.length < 6) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (m.length > 100) return 'Le mot de passe est trop long (100 caractères maximum).';
  return null;
}

export class Comptes extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.essaisIp = new Map();   // limite les essais par adresse (en mémoire)
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS comptes (
        cle TEXT PRIMARY KEY, nom TEXT NOT NULL, sel TEXT NOT NULL, hash TEXT NOT NULL,
        cree INTEGER NOT NULL, vu INTEGER NOT NULL,
        echecs INTEGER NOT NULL DEFAULT 0, bloque INTEGER NOT NULL DEFAULT 0,
        invisible INTEGER NOT NULL DEFAULT 0, invitations TEXT NOT NULL DEFAULT 'tous'
      );
      CREATE TABLE IF NOT EXISTS sessions (jeton TEXT PRIMARY KEY, cle TEXT NOT NULL, cree INTEGER NOT NULL, vu INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS sessions_cle ON sessions(cle);
      CREATE TABLE IF NOT EXISTS stats (cle TEXT NOT NULL, jeu TEXT NOT NULL, parties INTEGER NOT NULL DEFAULT 0, victoires INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (cle, jeu));
      CREATE TABLE IF NOT EXISTS amis (de TEXT NOT NULL, a TEXT NOT NULL, accepte INTEGER NOT NULL DEFAULT 0, cree INTEGER NOT NULL, PRIMARY KEY (de, a));
      CREATE INDEX IF NOT EXISTS amis_a ON amis(a);
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS succes (cle TEXT NOT NULL, id TEXT NOT NULL, t INTEGER NOT NULL, PRIMARY KEY (cle, id));
      CREATE TABLE IF NOT EXISTS records (cle TEXT NOT NULL, jeu TEXT NOT NULL, score REAL NOT NULL, t INTEGER NOT NULL, PRIMARY KEY (cle, jeu));
      CREATE TABLE IF NOT EXISTS joues (cle TEXT NOT NULL, jeu TEXT NOT NULL, parties INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (cle, jeu));
      CREATE TABLE IF NOT EXISTS defis (cle TEXT NOT NULL, jour TEXT NOT NULL, PRIMARY KEY (cle, jour));
      CREATE TABLE IF NOT EXISTS xpjour (cle TEXT NOT NULL, jour TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (cle, jour));
      CREATE TABLE IF NOT EXISTS stats_site (jour TEXT NOT NULL, type TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (jour, type));
      CREATE TABLE IF NOT EXISTS tournois (id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL, jeu TEXT NOT NULL, quand INTEGER NOT NULL, etat TEXT NOT NULL, cree INTEGER NOT NULL, gagnant TEXT);
      CREATE TABLE IF NOT EXISTS tinscrits (tid INTEGER NOT NULL, cle TEXT NOT NULL, t INTEGER NOT NULL, PRIMARY KEY (tid, cle));
      CREATE TABLE IF NOT EXISTS tmatchs (tid INTEGER NOT NULL, tour INTEGER NOT NULL, pos INTEGER NOT NULL, a TEXT, b TEXT, gagnant TEXT, code TEXT, PRIMARY KEY (tid, tour, pos));
    `);
    // colonnes ajoutées après coup (on ignore l'erreur si elles existent déjà)
    for (const col of ['xp INTEGER NOT NULL DEFAULT 0', "avatar TEXT NOT NULL DEFAULT ''", 'banni INTEGER NOT NULL DEFAULT 0', 'chat INTEGER NOT NULL DEFAULT 0']) {
      try { this.sql.exec('ALTER TABLE comptes ADD COLUMN ' + col); } catch (e) { /* déjà là */ }
    }
    this.derniersProgres = new Map();
    // une seule fois : on supprime les comptes créés avec une forme de « pipou » / « dinosaur »
    if (!this.un("SELECT v FROM meta WHERE k = 'reserve-proprio-1'")) {
      for (const { cle } of this.tous('SELECT cle FROM comptes')) {
        if (cle !== PROPRIO.cle && formeProprio(cle)) this.effacerCompte(cle);
      }
      this.sql.exec("INSERT OR REPLACE INTO meta (k, v) VALUES ('reserve-proprio-1', ?)", String(Date.now()));
    }
  }

  effacerCompte(cle) {
    this.sql.exec('DELETE FROM sessions WHERE cle = ?', cle);
    this.sql.exec('DELETE FROM stats WHERE cle = ?', cle);
    this.sql.exec('DELETE FROM amis WHERE de = ? OR a = ?', cle, cle);
    for (const table of ['succes', 'records', 'joues', 'defis', 'xpjour', 'tinscrits']) this.sql.exec(`DELETE FROM ${table} WHERE cle = ?`, cle);
    this.sql.exec('DELETE FROM comptes WHERE cle = ?', cle);
  }

  /* ---------- Progression ---------- */

  ajouterXp(cle, n, solo) {
    if (n <= 0) return 0;
    if (solo) {
      const jour = jourDe();
      const deja = (this.un('SELECT xp FROM xpjour WHERE cle = ? AND jour = ?', cle, jour) || { xp: 0 }).xp;
      n = Math.max(0, Math.min(n, XP.maxSoloParJour - deja));
      if (!n) return 0;
      this.sql.exec('INSERT INTO xpjour (cle, jour, xp) VALUES (?, ?, ?) ON CONFLICT (cle, jour) DO UPDATE SET xp = xp + excluded.xp', cle, jour, n);
    }
    this.sql.exec('UPDATE comptes SET xp = xp + ? WHERE cle = ?', n, cle);
    return n;
  }

  // une partie vient de finir (ev), ou quelque chose a changé (ev = null : amis, chat…)
  evenement(cle, ev) {
    const c = this.un('SELECT * FROM comptes WHERE cle = ?', cle);
    if (!c) return {};
    const niveauAvant = niveauDe(c.xp || 0);
    let xp = 0;
    const r = { xp: 0, succes: [], defi: null };
    if (ev) {
      this.sql.exec('INSERT INTO joues (cle, jeu, parties) VALUES (?, ?, 1) ON CONFLICT (cle, jeu) DO UPDATE SET parties = parties + 1', cle, ev.jeu);
      xp += ev.enligne ? this.ajouterXp(cle, XP.partieEnLigne + (ev.gagne ? XP.victoireEnLigne : 0), false)
        : this.ajouterXp(cle, XP.partie + (ev.gagne ? XP.victoireSolo : 0), true);
      // record personnel (pour les classements)
      const def = CLASSEMENTS[ev.jeu];
      if (def && Number.isFinite(ev.score) && ev.score !== null && (def.sens === '+' ? ev.score > 0 : ev.score > 0)) {
        const ancien = this.un('SELECT score FROM records WHERE cle = ? AND jeu = ?', cle, ev.jeu);
        if (!ancien || (def.sens === '+' ? ev.score > ancien.score : ev.score < ancien.score)) {
          this.sql.exec('INSERT OR REPLACE INTO records (cle, jeu, score, t) VALUES (?, ?, ?, ?)', cle, ev.jeu, ev.score, Date.now());
          r.record = true;
        }
      }
      // défi du jour
      const defi = defiDuJour();
      if (defiReussi(defi, ev) && !this.un('SELECT cle FROM defis WHERE cle = ? AND jour = ?', cle, defi.jour)) {
        this.sql.exec('INSERT INTO defis (cle, jour) VALUES (?, ?)', cle, defi.jour);
        xp += this.ajouterXp(cle, XP.defi, false);
        r.defi = defi.texte;
      }
    }
    // succès (on peut en débloquer plusieurs d'un coup, et le niveau peut en débloquer d'autres)
    for (let tour = 0; tour < 3; tour++) {
      const e = this.etatSucces(cle, ev);
      let nouveau = false;
      for (const s of SUCCES) {
        if (r.succes.includes(s.id) || this.un('SELECT id FROM succes WHERE cle = ? AND id = ?', cle, s.id)) continue;
        let ok = false;
        try { ok = s.test(e); } catch (err) { ok = false; }
        if (!ok) continue;
        this.sql.exec('INSERT OR IGNORE INTO succes (cle, id, t) VALUES (?, ?, ?)', cle, s.id, Date.now());
        r.succes.push(s.id);
        xp += this.ajouterXp(cle, XP.succes, false);
        nouveau = true;
      }
      if (!nouveau) break;
    }
    const apres = this.un('SELECT xp FROM comptes WHERE cle = ?', cle).xp || 0;
    r.xp = xp;
    r.total = apres;
    r.niveau = niveauDe(apres);
    if (r.niveau > niveauAvant) r.niveauGagne = r.niveau;
    return r;
  }

  etatSucces(cle, ev) {
    const c = this.un('SELECT xp, chat FROM comptes WHERE cle = ?', cle) || {};
    return {
      ev,
      parties: this.un('SELECT COALESCE(SUM(parties), 0) AS n FROM joues WHERE cle = ?', cle).n,
      jeux: this.un('SELECT COUNT(*) AS n FROM joues WHERE cle = ?', cle).n,
      victoires: this.un('SELECT COALESCE(SUM(victoires), 0) AS n FROM stats WHERE cle = ?', cle).n,
      defis: this.un('SELECT COUNT(*) AS n FROM defis WHERE cle = ?', cle).n,
      niveau: niveauDe(c.xp || 0),
      amis: this.un('SELECT COUNT(*) AS n FROM amis WHERE de = ? AND accepte = 1', cle).n,
      chat: c.chat || 0,
      tournois: this.un('SELECT COUNT(*) AS n FROM tournois WHERE gagnant = ?', cle).n
    };
  }

  etatProgres(cle) {
    const c = this.un('SELECT * FROM comptes WHERE cle = ?', cle);
    const xp = c.xp || 0, niveau = niveauDe(xp);
    const defi = defiDuJour();
    const jours = this.tous('SELECT jour FROM defis WHERE cle = ? ORDER BY jour DESC LIMIT 60', cle).map(x => x.jour);
    // série : jours de défi d'affilée (jusqu'à aujourd'hui ou hier)
    let serie = 0;
    for (let i = 0; i < 60; i++) {
      const j = jourDe(Date.now() - i * 86400000);
      if (jours.includes(j)) serie++;
      else if (i > 0) break;
    }
    return {
      xp, niveau, titre: titreDe(niveau), debut: xpPourNiveau(niveau), suivant: xpPourNiveau(niveau + 1), avatar: avatarDe(c.avatar).id,
      succes: this.tous('SELECT id, t FROM succes WHERE cle = ? ORDER BY t', cle),
      defi: { ...defi, fait: jours.includes(defi.jour) }, serie,
      records: this.tous('SELECT jeu, score FROM records WHERE cle = ?', cle),
      xpSoloAujourdhui: (this.un('SELECT xp FROM xpjour WHERE cle = ? AND jour = ?', cle, jourDe()) || { xp: 0 }).xp
    };
  }

  /* ---------- Tournois ---------- */

  nomDe(cle) { const c = cle && this.un('SELECT nom FROM comptes WHERE cle = ?', cle); return c ? c.nom : null; }

  listeTournois() {
    return this.tous('SELECT * FROM tournois ORDER BY CASE etat WHEN \'en cours\' THEN 0 WHEN \'inscriptions\' THEN 1 ELSE 2 END, quand DESC LIMIT 12').map(tr => ({
      id: tr.id, nom: tr.nom, jeu: tr.jeu, quand: tr.quand, etat: tr.etat, gagnant: this.nomDe(tr.gagnant),
      inscrits: this.tous('SELECT cle FROM tinscrits WHERE tid = ? ORDER BY t', tr.id).map(x => this.nomDe(x.cle)).filter(Boolean),
      matchs: this.tous('SELECT * FROM tmatchs WHERE tid = ? ORDER BY tour, pos', tr.id).map(m => ({ tour: m.tour, pos: m.pos, a: this.nomDe(m.a), b: this.nomDe(m.b), gagnant: this.nomDe(m.gagnant), code: m.code }))
    }));
  }

  // le gagnant d'un match passe au tour suivant ; le dernier match désigne le champion
  avancer(tid, tour, pos, gagnant) {
    this.sql.exec('UPDATE tmatchs SET gagnant = ? WHERE tid = ? AND tour = ? AND pos = ?', gagnant, tid, tour, pos);
    const suivant = this.un('SELECT * FROM tmatchs WHERE tid = ? AND tour = ? AND pos = ?', tid, tour + 1, Math.floor(pos / 2));
    if (!suivant) {
      this.sql.exec("UPDATE tournois SET etat = 'fini', gagnant = ? WHERE id = ?", gagnant, tid);
      if (gagnant) { this.ajouterXp(gagnant, XP.tournoi, false); this.evenement(gagnant, null); }
      return;
    }
    this.sql.exec(`UPDATE tmatchs SET ${pos % 2 ? 'b' : 'a'} = ? WHERE tid = ? AND tour = ? AND pos = ?`, gagnant, tid, tour + 1, suivant.pos);
    const m = this.un('SELECT * FROM tmatchs WHERE tid = ? AND tour = ? AND pos = ?', tid, tour + 1, suivant.pos);
    // un joueur seul (exempté) passe directement quand l'autre côté ne peut plus arriver
    this.verifierExempt(tid, m);
  }

  verifierExempt(tid, m) {
    if (m.gagnant) return;
    const avant = this.tous('SELECT * FROM tmatchs WHERE tid = ? AND tour = ? AND pos IN (?, ?)', tid, m.tour - 1, m.pos * 2, m.pos * 2 + 1);
    const fini = side => { const x = avant.find(y => y.pos === m.pos * 2 + side); return !x || x.gagnant || (!x.a && !x.b); };
    if (m.a && !m.b && fini(1) && !avant.find(y => y.pos === m.pos * 2 + 1 && y.gagnant)) this.avancer(tid, m.tour, m.pos, m.a);
    else if (m.b && !m.a && fini(0) && !avant.find(y => y.pos === m.pos * 2 && y.gagnant)) this.avancer(tid, m.tour, m.pos, m.b);
  }

  resultatTournoi(jeu, code, gagnant, joueurs) {
    const m = this.un(`SELECT m.* FROM tmatchs m JOIN tournois t ON t.id = m.tid
      WHERE t.etat = 'en cours' AND t.jeu = ? AND m.code = ? AND m.gagnant IS NULL AND m.a IS NOT NULL AND m.b IS NOT NULL`, jeu, code);
    if (!m) return { ok: false };
    if (!joueurs.includes(m.a) || !joueurs.includes(m.b) || ![m.a, m.b].includes(gagnant)) return { ok: false };
    this.avancer(m.tid, m.tour, m.pos, gagnant);
    return { ok: true };
  }

  adminTournoi(d, t) {
    const JEUX_TOURNOI = ['puissance4', 'morpion', 'navale', 'pong', 'echecs', 'hockey'];
    const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), x => LETTRES[x % LETTRES.length]).join('');
    if (d.faire === 'creer') {
      const nom = String(d.nom || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60);
      if (!nom) return { erreur: 'Donne un nom au tournoi.', statut: 400 };
      if (!JEUX_TOURNOI.includes(d.jeu)) return { erreur: 'Choisis un jeu à 2 joueurs.', statut: 400 };
      const quand = Number(d.quand) || t;
      this.sql.exec("INSERT INTO tournois (nom, jeu, quand, etat, cree) VALUES (?, ?, ?, 'inscriptions', ?)", nom, d.jeu, quand, t);
      return { tournois: this.listeTournois() };
    }
    const tr = this.un('SELECT * FROM tournois WHERE id = ?', Number(d.id) || 0);
    if (!tr) return { erreur: 'Tournoi introuvable.', statut: 404 };
    if (d.faire === 'supprimer') {
      this.sql.exec('DELETE FROM tmatchs WHERE tid = ?', tr.id);
      this.sql.exec('DELETE FROM tinscrits WHERE tid = ?', tr.id);
      this.sql.exec('DELETE FROM tournois WHERE id = ?', tr.id);
      return { tournois: this.listeTournois() };
    }
    if (d.faire === 'lancer') {
      if (tr.etat !== 'inscriptions') return { erreur: 'Ce tournoi est déjà lancé.', statut: 400 };
      const joueurs = this.tous('SELECT cle FROM tinscrits WHERE tid = ?', tr.id).map(x => x.cle);
      if (joueurs.length < 2) return { erreur: 'Il faut au moins 2 inscrits.', statut: 400 };
      for (let i = joueurs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [joueurs[i], joueurs[j]] = [joueurs[j], joueurs[i]]; }
      let taille = 2;
      while (taille < joueurs.length) taille *= 2;
      const tours = Math.log2(taille);
      // les exemptés sont répartis : un joueur par match d'abord, puis les autres
      const places = Array(taille).fill(null);
      for (let i = 0; i < joueurs.length; i++) places[i < taille / 2 ? i * 2 : (i - taille / 2) * 2 + 1] = joueurs[i];
      for (let tour = 1; tour <= tours; tour++) {
        const n = taille / Math.pow(2, tour);
        for (let pos = 0; pos < n; pos++) {
          const a = tour === 1 ? places[pos * 2] : null, b = tour === 1 ? places[pos * 2 + 1] : null;
          this.sql.exec('INSERT INTO tmatchs (tid, tour, pos, a, b, gagnant, code) VALUES (?, ?, ?, ?, ?, NULL, ?)', tr.id, tour, pos, a, b, code());
        }
      }
      this.sql.exec("UPDATE tournois SET etat = 'en cours' WHERE id = ?", tr.id);
      // les joueurs seuls au premier tour passent directement
      for (const m of this.tous('SELECT * FROM tmatchs WHERE tid = ? AND tour = 1', tr.id)) {
        if (m.a && !m.b) this.avancer(tr.id, 1, m.pos, m.a);
        else if (m.b && !m.a) this.avancer(tr.id, 1, m.pos, m.b);
      }
      return { tournois: this.listeTournois() };
    }
    if (d.faire === 'gagnant') {
      const m = this.un('SELECT * FROM tmatchs WHERE tid = ? AND tour = ? AND pos = ?', tr.id, Number(d.tour), Number(d.pos));
      if (!m || m.gagnant || tr.etat !== 'en cours') return { erreur: 'Ce match ne peut pas être modifié.', statut: 400 };
      const cle = cleCompte(d.gagnant);
      if (![m.a, m.b].includes(cle)) return { erreur: 'Ce joueur ne joue pas ce match.', statut: 400 };
      this.avancer(tr.id, m.tour, m.pos, cle);
      return { tournois: this.listeTournois() };
    }
    return { erreur: 'Action inconnue.', statut: 400 };
  }

  un(requete, ...args) { const r = this.sql.exec(requete, ...args).toArray(); return r[0] || null; }
  tous(requete, ...args) { return this.sql.exec(requete, ...args).toArray(); }

  /* --- limites anti-force-brute par adresse IP --- */
  tropDEssais(ip, type, max, fenetre) {
    if (!ip) return false;
    const k = type + ':' + ip;
    const t = Date.now();
    const liste = (this.essaisIp.get(k) || []).filter(x => t - x < fenetre);
    this.essaisIp.set(k, liste);
    if (this.essaisIp.size > 5000) this.essaisIp.clear();
    return liste.length >= max;
  }
  noterEssai(ip, type) {
    if (!ip) return;
    const k = type + ':' + ip;
    const liste = this.essaisIp.get(k) || [];
    liste.push(Date.now());
    this.essaisIp.set(k, liste);
  }

  async nouvelleSession(cle) {
    const jeton = aleatoire(32);
    const t = Date.now();
    this.sql.exec('INSERT INTO sessions (jeton, cle, cree, vu) VALUES (?, ?, ?, ?)', await sha256(jeton), cle, t, t);
    // au plus 20 appareils connectés : on oublie les plus anciens
    this.sql.exec('DELETE FROM sessions WHERE cle = ? AND jeton NOT IN (SELECT jeton FROM sessions WHERE cle = ? ORDER BY vu DESC LIMIT 20)', cle, cle);
    return jeton;
  }

  async session(jeton) {
    if (typeof jeton !== 'string' || !/^[0-9a-f]{64}$/.test(jeton)) return null;
    const h = await sha256(jeton);
    const s = this.un('SELECT * FROM sessions WHERE jeton = ?', h);
    if (!s) return null;
    const t = Date.now();
    if (t - s.vu > DUREE_SESSION) { this.sql.exec('DELETE FROM sessions WHERE jeton = ?', h); return null; }
    const c = this.un('SELECT * FROM comptes WHERE cle = ?', s.cle);
    if (!c || c.banni > t) return null;
    if (t - s.vu > 60000) {
      this.sql.exec('UPDATE sessions SET vu = ? WHERE jeton = ?', t, h);
      this.sql.exec('UPDATE comptes SET vu = ? WHERE cle = ?', t, c.cle);
    }
    return { ...c, jetonHache: h };
  }

  publicCompte(c) {
    const niveau = niveauDe(c.xp || 0);
    return { nom: c.nom, cree: c.cree, invisible: !!c.invisible, invitations: c.invitations, admin: c.cle === PROPRIO.cle, avatar: avatarDe(c.avatar).id, xp: c.xp || 0, niveau, titre: titreDe(niveau) };
  }

  stats(cle) {
    return this.tous('SELECT jeu, parties, victoires FROM stats WHERE cle = ? ORDER BY victoires DESC, parties DESC', cle);
  }

  listeAmis(cle) {
    const envoyes = this.tous('SELECT a AS cle, accepte FROM amis WHERE de = ?', cle);
    const recus = this.tous('SELECT de AS cle FROM amis WHERE a = ? AND accepte = 0', cle);
    const liste = [];
    for (const r of envoyes) liste.push({ cle: r.cle, statut: r.accepte ? 'ami' : 'envoyee' });
    for (const r of recus) if (!envoyes.some(e => e.cle === r.cle)) liste.push({ cle: r.cle, statut: 'recue' });
    return liste.map(x => {
      const c = this.un('SELECT nom, vu FROM comptes WHERE cle = ?', x.cle);
      return c ? { nom: c.nom, cle: x.cle, statut: x.statut, vu: x.statut === 'ami' ? c.vu : null } : null;
    }).filter(Boolean).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  async fetch(requete) {
    let d;
    try { d = await requete.json(); } catch (e) { return Response.json({ erreur: 'Requête invalide.' }, { status: 400 }); }
    try {
      const r = await this.action(d || {});
      return Response.json(r, { status: r.statut || 200 });
    } catch (e) {
      return Response.json({ erreur: 'Erreur du serveur.' }, { status: 500 });
    }
  }

  async action(d) {
    const t = Date.now();
    const ip = d.ip || '';

    switch (d.action) {
      /* ===== publiques (appelées depuis le site) ===== */

      case 'inscription': {
        const nom = String(d.nom || '').trim();
        const err = verifierPseudo(nom) || verifierMdp(d.mdp);
        if (err) return { erreur: err, statut: 400 };
        if (this.tropDEssais(ip, 'inscription', 5, 3600000)) return { erreur: 'Trop de comptes créés depuis cet appareil. Réessaie dans une heure.', statut: 429 };
        const cle = clePseudo(nom);
        if (this.un('SELECT cle FROM comptes WHERE cle = ?', cle)) return { erreur: 'Ce pseudo est déjà pris.', statut: 409 };
        const sel = aleatoire(16);
        this.sql.exec('INSERT INTO comptes (cle, nom, sel, hash, cree, vu) VALUES (?, ?, ?, ?, ?, ?)', cle, nom, sel, await empreinte(String(d.mdp), sel), t, t);
        this.noterEssai(ip, 'inscription');
        return { jeton: await this.nouvelleSession(cle), compte: this.publicCompte(this.un('SELECT * FROM comptes WHERE cle = ?', cle)) };
      }

      case 'connexion': {
        if (this.tropDEssais(ip, 'echec', 20, 600000)) return { erreur: 'Trop d’essais. Réessaie dans 10 minutes.', statut: 429 };
        const c = this.un('SELECT * FROM comptes WHERE cle = ?', cleCompte(d.nom));
        if (!c) { this.noterEssai(ip, 'echec'); return { erreur: 'Pseudo ou mot de passe incorrect.', statut: 401 }; }
        if (c.bloque > t) return { erreur: `Trop d’erreurs : compte bloqué encore ${Math.ceil((c.bloque - t) / 60000)} min.`, statut: 429 };
        if (c.banni > t) return { erreur: c.banni > t + 50 * 365 * 86400000 ? 'Ce compte a été banni par l’admin.' : `Ce compte est banni par l’admin jusqu’au ${new Date(c.banni).toLocaleString('fr-FR', { timeZone: 'Europe/Brussels', dateStyle: 'long', timeStyle: 'short' })}.`, statut: 403 };
        const ok = egal(await empreinte(String(d.mdp || ''), c.sel), c.hash);
        if (!ok) {
          this.noterEssai(ip, 'echec');
          const echecs = c.echecs + 1;
          if (echecs >= ECHECS_MAX) this.sql.exec('UPDATE comptes SET echecs = 0, bloque = ? WHERE cle = ?', t + BLOCAGE, c.cle);
          else this.sql.exec('UPDATE comptes SET echecs = ? WHERE cle = ?', echecs, c.cle);
          return { erreur: 'Pseudo ou mot de passe incorrect.', statut: 401 };
        }
        this.sql.exec('UPDATE comptes SET echecs = 0, bloque = 0, vu = ? WHERE cle = ?', t, c.cle);
        return { jeton: await this.nouvelleSession(c.cle), compte: this.publicCompte(c) };
      }

      case 'profil': {
        const c = this.un('SELECT * FROM comptes WHERE cle = ?', cleCompte(d.nom));
        if (!c) return { erreur: 'Ce joueur n’existe pas.', statut: 404 };
        const niveau = niveauDe(c.xp || 0);
        return { profil: { nom: c.nom, cree: c.cree, avatar: avatarDe(c.avatar).id, xp: c.xp || 0, niveau, titre: titreDe(niveau) }, stats: this.stats(c.cle),
          succes: this.tous('SELECT id, t FROM succes WHERE cle = ? ORDER BY t', c.cle), records: this.tous('SELECT jeu, score FROM records WHERE cle = ?', c.cle) };
      }

      case 'existe': {
        const cle = cleCompte(d.nom);
        return { existe: !!this.un('SELECT cle FROM comptes WHERE cle = ?', cle), libre: !verifierPseudo(d.nom) && !this.un('SELECT cle FROM comptes WHERE cle = ?', cle), proprio: formeProprio(d.nom) };
      }

      // le propriétaire crée (ou reprend) son compte avec le code secret
      case 'reclamer': {
        if (this.tropDEssais(ip, 'reclamer', 5, 3600000)) return { erreur: 'Trop d’essais. Réessaie dans une heure.', statut: 429 };
        const code = String(d.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(?=.)/g, '$1-');
        if (!egal(await sha256('dino-proprio:' + code), CODE_PROPRIO)) {
          this.noterEssai(ip, 'reclamer');
          return { erreur: 'Code propriétaire incorrect.', statut: 403 };
        }
        const err = verifierMdp(d.mdp);
        if (err) return { erreur: err, statut: 400 };
        const sel = aleatoire(16);
        const hash = await empreinte(String(d.mdp), sel);
        if (this.un('SELECT cle FROM comptes WHERE cle = ?', PROPRIO.cle)) {
          this.sql.exec('UPDATE comptes SET nom = ?, sel = ?, hash = ?, echecs = 0, bloque = 0, vu = ? WHERE cle = ?', PROPRIO.nom, sel, hash, t, PROPRIO.cle);
          this.sql.exec('DELETE FROM sessions WHERE cle = ?', PROPRIO.cle);
        } else {
          this.sql.exec('INSERT INTO comptes (cle, nom, sel, hash, cree, vu) VALUES (?, ?, ?, ?, ?, ?)', PROPRIO.cle, PROPRIO.nom, sel, hash, t, t);
        }
        return { jeton: await this.nouvelleSession(PROPRIO.cle), compte: this.publicCompte(this.un('SELECT * FROM comptes WHERE cle = ?', PROPRIO.cle)) };
      }

      /* ===== verifier : utilisé par les salles de jeu et la présence (interne) ===== */
      case 'verifier': {
        const s = d.jeton ? await this.session(d.jeton) : null;
        if (s) return { compte: { cle: s.cle, nom: s.nom, invisible: !!s.invisible, invitations: s.invitations, avatar: avatarDe(s.avatar).id, niveau: niveauDe(s.xp || 0) } };
        const cle = cleCompte(d.nom);
        return { reserve: !!(cle && (formeProprio(d.nom) || this.un('SELECT cle FROM comptes WHERE cle = ?', cle) || MOTS_INTERDITS.has(cle))) };
      }
      case 'resultats': {
        const jeu = String(d.jeu || '').slice(0, 20);
        for (const j of Array.isArray(d.joueurs) ? d.joueurs.slice(0, 16) : []) {
          if (!j || !this.un('SELECT cle FROM comptes WHERE cle = ?', j.cle)) continue;
          this.sql.exec(`INSERT INTO stats (cle, jeu, parties, victoires) VALUES (?, ?, 1, ?)
            ON CONFLICT (cle, jeu) DO UPDATE SET parties = parties + 1, victoires = victoires + excluded.victoires`, j.cle, jeu, j.gagne ? 1 : 0);
          this.evenement(j.cle, { jeu, gagne: !!j.gagne, enligne: true });
        }
        return { ok: true };
      }
      // les classements de tous les temps (visibles par tout le monde)
      case 'classements': {
        const r = {};
        for (const [jeu, def] of Object.entries(CLASSEMENTS)) {
          r[jeu] = this.tous(`SELECT c.nom, c.avatar, c.xp, r.score, r.t FROM records r JOIN comptes c ON c.cle = r.cle
            WHERE r.jeu = ? AND c.banni <= ? ORDER BY r.score ${def.sens === '-' ? 'ASC' : 'DESC'}, r.t ASC LIMIT 10`, jeu, t)
            .map(x => ({ nom: x.nom, avatar: avatarDe(x.avatar).id, niveau: niveauDe(x.xp || 0), score: x.score }));
        }
        const xp = this.tous('SELECT nom, avatar, xp FROM comptes WHERE banni <= ? ORDER BY xp DESC, cree ASC LIMIT 10', t)
          .map(x => ({ nom: x.nom, avatar: avatarDe(x.avatar).id, niveau: niveauDe(x.xp || 0), score: x.xp || 0 }));
        return { classements: r, xp };
      }
      // statistiques du site (appelé par le serveur : visites, heures, parties)
      case 'stat': {
        const types = Array.isArray(d.types) ? d.types.slice(0, 4) : [];
        const jour = jourDe(t);
        for (const type of types) {
          if (typeof type !== 'string' || !/^[a-z0-9:-]{1,30}$/.test(type)) continue;
          this.sql.exec('INSERT INTO stats_site (jour, type, n) VALUES (?, ?, 1) ON CONFLICT (jour, type) DO UPDATE SET n = n + 1', jour, type);
        }
        return { ok: true };
      }
      // un message envoyé dans le chat (pour le succès « Bavard »)
      case 'chat-message': {
        const c = this.un('SELECT cle FROM comptes WHERE cle = ?', String(d.cle || ''));
        if (!c) return { ok: false };
        this.sql.exec('UPDATE comptes SET chat = chat + 1 WHERE cle = ?', c.cle);
        this.evenement(c.cle, null);
        return { ok: true };
      }
      // fin d'un match de tournoi (appelé par une table de jeu)
      case 'tournoi-resultat':
        return this.resultatTournoi(String(d.jeu || ''), String(d.code || ''), String(d.gagnant || ''), Array.isArray(d.joueurs) ? d.joueurs.map(String) : []);
      case 'tournois':
        return { tournois: this.listeTournois() };

      case 'vu': {
        this.sql.exec('UPDATE comptes SET vu = ? WHERE cle = ?', t, String(d.cle || ''));
        return { ok: true };
      }
      case 'sont-amis': {
        return { amis: !!this.un('SELECT de FROM amis WHERE de = ? AND a = ? AND accepte = 1', String(d.a || ''), String(d.b || '')) };
      }
    }

    /* ===== les actions suivantes demandent d'être connecté ===== */
    const moi = await this.session(d.jeton);
    if (!moi) return { erreur: 'Tu n’es plus connecté. Reconnecte-toi.', statut: 401, deconnecte: true };

    switch (d.action) {
      case 'moi':
        return { compte: this.publicCompte(moi), stats: this.stats(moi.cle) };

      case 'deconnexion':
        this.sql.exec('DELETE FROM sessions WHERE jeton = ?', moi.jetonHache);
        return { ok: true };

      case 'mdp': {
        if (!egal(await empreinte(String(d.ancien || ''), moi.sel), moi.hash)) {
          const echecs = moi.echecs + 1;
          if (echecs >= ECHECS_MAX) this.sql.exec('UPDATE comptes SET echecs = 0, bloque = ? WHERE cle = ?', t + BLOCAGE, moi.cle);
          else this.sql.exec('UPDATE comptes SET echecs = ? WHERE cle = ?', echecs, moi.cle);
          return { erreur: 'Ton mot de passe actuel n’est pas bon.', statut: 403 };
        }
        const err = verifierMdp(d.nouveau);
        if (err) return { erreur: err, statut: 400 };
        const sel = aleatoire(16);
        this.sql.exec('UPDATE comptes SET sel = ?, hash = ?, echecs = 0 WHERE cle = ?', sel, await empreinte(String(d.nouveau), sel), moi.cle);
        // on déconnecte tous les autres appareils
        this.sql.exec('DELETE FROM sessions WHERE cle = ? AND jeton <> ?', moi.cle, moi.jetonHache);
        return { ok: true };
      }

      case 'reglages': {
        const invisible = d.invisible === undefined ? moi.invisible : (d.invisible ? 1 : 0);
        const invitations = INVITATIONS.includes(d.invitations) ? d.invitations : moi.invitations;
        this.sql.exec('UPDATE comptes SET invisible = ?, invitations = ? WHERE cle = ?', invisible, invitations, moi.cle);
        return { compte: this.publicCompte({ ...moi, invisible, invitations }) };
      }

      case 'supprimer': {
        if (!egal(await empreinte(String(d.mdp || ''), moi.sel), moi.hash)) return { erreur: 'Mot de passe incorrect.', statut: 403 };
        this.effacerCompte(moi.cle);
        return { ok: true };
      }

      case 'amis':
        return { amis: this.listeAmis(moi.cle) };

      case 'ami-demande': {
        const autre = this.un('SELECT * FROM comptes WHERE cle = ?', cleCompte(d.nom));
        if (!autre) return { erreur: 'Aucun joueur avec ce pseudo.', statut: 404 };
        if (autre.cle === moi.cle) return { erreur: 'Tu ne peux pas t’ajouter toi-même.', statut: 400 };
        const nb = this.un('SELECT COUNT(*) AS n FROM amis WHERE de = ?', moi.cle).n;
        if (nb >= 200) return { erreur: 'Tu as déjà 200 amis ou demandes.', statut: 400 };
        // l'autre m'avait déjà demandé : on devient amis directement
        if (this.un('SELECT de FROM amis WHERE de = ? AND a = ?', autre.cle, moi.cle)) {
          this.sql.exec('UPDATE amis SET accepte = 1 WHERE de = ? AND a = ?', autre.cle, moi.cle);
          this.sql.exec('INSERT OR REPLACE INTO amis (de, a, accepte, cree) VALUES (?, ?, 1, ?)', moi.cle, autre.cle, t);
        } else {
          this.sql.exec('INSERT OR IGNORE INTO amis (de, a, accepte, cree) VALUES (?, ?, 0, ?)', moi.cle, autre.cle, t);
        }
        this.evenement(moi.cle, null); this.evenement(autre.cle, null);
        return { amis: this.listeAmis(moi.cle) };
      }

      case 'ami-accepter': {
        const cle = cleCompte(d.nom);
        if (!this.un('SELECT de FROM amis WHERE de = ? AND a = ?', cle, moi.cle)) return { erreur: 'Pas de demande de ce joueur.', statut: 404 };
        this.sql.exec('UPDATE amis SET accepte = 1 WHERE de = ? AND a = ?', cle, moi.cle);
        this.sql.exec('INSERT OR REPLACE INTO amis (de, a, accepte, cree) VALUES (?, ?, 1, ?)', moi.cle, cle, t);
        this.evenement(moi.cle, null); this.evenement(cle, null);
        return { amis: this.listeAmis(moi.cle) };
      }

      /* ===== progression : XP, niveaux, succès, défi du jour ===== */
      case 'progres': {
        // fin d'une partie d'un jeu (solo ou contre l'ordinateur), envoyée par le site
        const jeu = String(d.jeu || '');
        if (!JEUX_PROGRES.has(jeu)) return { erreur: 'Jeu inconnu.', statut: 400 };
        const k = moi.cle + ':' + jeu;
        if (t - (this.derniersProgres.get(k) || 0) < 3000) return { ignore: true };
        this.derniersProgres.set(k, t);
        if (this.derniersProgres.size > 5000) this.derniersProgres.clear();
        const sc = Number(d.score);
        const ev = { jeu, score: Number.isFinite(sc) ? Math.max(-1e9, Math.min(1e9, sc)) : null, gagne: !!d.gagne, enligne: false };
        this.sql.exec("INSERT INTO stats_site (jour, type, n) VALUES (?, ?, 1) ON CONFLICT (jour, type) DO UPDATE SET n = n + 1", jourDe(t), 'jeu:' + jeu);
        return this.evenement(moi.cle, ev);
      }
      case 'progres-etat':
        return this.etatProgres(moi.cle);
      case 'avatar': {
        const a = AVATARS.find(x => x.id === d.avatar);
        if (!a) return { erreur: 'Avatar inconnu.', statut: 400 };
        if (niveauDe(moi.xp || 0) < a.niveau) return { erreur: `Cet avatar se débloque au niveau ${a.niveau}.`, statut: 403 };
        this.sql.exec('UPDATE comptes SET avatar = ? WHERE cle = ?', a.id, moi.cle);
        return { compte: this.publicCompte({ ...moi, avatar: a.id }) };
      }
      case 'tournoi-inscrire': {
        const tr = this.un('SELECT * FROM tournois WHERE id = ?', Number(d.id) || 0);
        if (!tr) return { erreur: 'Tournoi introuvable.', statut: 404 };
        if (tr.etat !== 'inscriptions') return { erreur: 'Les inscriptions sont fermées.', statut: 400 };
        if (d.retirer) this.sql.exec('DELETE FROM tinscrits WHERE tid = ? AND cle = ?', tr.id, moi.cle);
        else this.sql.exec('INSERT OR IGNORE INTO tinscrits (tid, cle, t) VALUES (?, ?, ?)', tr.id, moi.cle, t);
        return { tournois: this.listeTournois() };
      }

      /* ===== console admin : seulement le compte du propriétaire ===== */
      case 'admin-liste': {
        if (moi.cle !== PROPRIO.cle) return { erreur: 'Réservé à l’admin.', statut: 403 };
        const comptes = this.tous(`SELECT c.cle, c.nom, c.cree, c.vu, c.bloque, c.banni, c.xp,
            COALESCE(SUM(s.parties), 0) AS parties, COALESCE(SUM(s.victoires), 0) AS victoires
          FROM comptes c LEFT JOIN stats s ON s.cle = c.cle GROUP BY c.cle ORDER BY c.vu DESC`);
        return { comptes: comptes.map(c => ({ ...c, bloque: c.bloque > t, banni: c.banni > t ? c.banni : 0, niveau: niveauDe(c.xp || 0) })) };
      }
      case 'admin-compte': {
        if (moi.cle !== PROPRIO.cle) return { erreur: 'Réservé à l’admin.', statut: 403 };
        const c = this.un('SELECT * FROM comptes WHERE cle = ?', cleCompte(d.nom));
        if (!c) return { erreur: 'Ce compte n’existe pas.', statut: 404 };
        return { compte: { nom: c.nom, cle: c.cle, cree: c.cree, vu: c.vu, invisible: !!c.invisible }, stats: this.stats(c.cle), amis: this.listeAmis(c.cle).length };
      }
      case 'admin-supprimer': {
        if (moi.cle !== PROPRIO.cle) return { erreur: 'Réservé à l’admin.', statut: 403 };
        const cle = cleCompte(d.nom);
        if (cle === PROPRIO.cle) return { erreur: 'Tu ne peux pas supprimer ton propre compte d’ici.', statut: 400 };
        if (!this.un('SELECT cle FROM comptes WHERE cle = ?', cle)) return { erreur: 'Ce compte n’existe pas.', statut: 404 };
        this.effacerCompte(cle);
        return { ok: true };
      }
      case 'admin-mdp': {
        if (moi.cle !== PROPRIO.cle) return { erreur: 'Réservé à l’admin.', statut: 403 };
        const c = this.un('SELECT * FROM comptes WHERE cle = ?', cleCompte(d.nom));
        if (!c) return { erreur: 'Ce compte n’existe pas.', statut: 404 };
        if (c.cle === PROPRIO.cle) return { erreur: 'Change ton mot de passe dans l’onglet Réglages.', statut: 400 };
        const err = verifierMdp(d.nouveau);
        if (err) return { erreur: err, statut: 400 };
        const sel = aleatoire(16);
        this.sql.exec('UPDATE comptes SET sel = ?, hash = ?, echecs = 0, bloque = 0 WHERE cle = ?', sel, await empreinte(String(d.nouveau), sel), c.cle);
        this.sql.exec('DELETE FROM sessions WHERE cle = ?', c.cle);
        return { ok: true };
      }
      case 'admin-victoires': {
        if (moi.cle !== PROPRIO.cle) return { erreur: 'Réservé à l’admin.', statut: 403 };
        const c = this.un('SELECT cle FROM comptes WHERE cle = ?', cleCompte(d.nom));
        if (!c) return { erreur: 'Ce compte n’existe pas.', statut: 404 };
        const jeu = String(d.jeu || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
        if (!jeu) return { erreur: 'Choisis un jeu.', statut: 400 };
        const v = Math.max(0, Math.min(1000000, Math.floor(Number(d.victoires) || 0)));
        const p = Math.max(v, Math.min(1000000, Math.floor(Number(d.parties) || 0)));
        if (!v && !p) this.sql.exec('DELETE FROM stats WHERE cle = ? AND jeu = ?', c.cle, jeu);
        else this.sql.exec('INSERT OR REPLACE INTO stats (cle, jeu, parties, victoires) VALUES (?, ?, ?, ?)', c.cle, jeu, p, v);
        return { stats: this.stats(c.cle) };
      }

      case 'admin-ban': {
        if (moi.cle !== PROPRIO.cle) return { erreur: 'Réservé à l’admin.', statut: 403 };
        const c = this.un('SELECT cle, nom FROM comptes WHERE cle = ?', cleCompte(d.nom));
        if (!c) return { erreur: 'Ce compte n’existe pas.', statut: 404 };
        if (c.cle === PROPRIO.cle) return { erreur: 'Tu ne peux pas te bannir toi-même.', statut: 400 };
        const h = Number(d.heures);
        const jusqua = h < 0 ? t + 100 * 365 * 86400000 : h > 0 ? t + Math.min(h, 24 * 365) * 3600000 : 0;
        this.sql.exec('UPDATE comptes SET banni = ? WHERE cle = ?', jusqua, c.cle);
        if (jusqua) this.sql.exec('DELETE FROM sessions WHERE cle = ?', c.cle);
        return { ok: true, nom: c.nom, banni: jusqua };
      }
      case 'admin-stats': {
        if (moi.cle !== PROPRIO.cle) return { erreur: 'Réservé à l’admin.', statut: 403 };
        const depuis = jourDe(t - 29 * 86400000);
        const lignes = this.tous('SELECT jour, type, n FROM stats_site WHERE jour >= ? ORDER BY jour', depuis);
        const jours = {};
        for (let i = 13; i >= 0; i--) jours[jourDe(t - i * 86400000)] = { visites: 0, parties: 0 };
        const jeux = {}, heures = Array(24).fill(0);
        for (const l of lignes) {
          if (l.type === 'visite' && jours[l.jour]) jours[l.jour].visites += l.n;
          if (l.type.startsWith('jeu:')) { jeux[l.type.slice(4)] = (jeux[l.type.slice(4)] || 0) + l.n; if (jours[l.jour]) jours[l.jour].parties += l.n; }
          if (l.type.startsWith('heure:')) heures[Number(l.type.slice(6)) % 24] += l.n;
        }
        const nb = this.un('SELECT COUNT(*) AS n FROM comptes').n;
        const nouveaux = this.un('SELECT COUNT(*) AS n FROM comptes WHERE cree > ?', t - 7 * 86400000).n;
        const actifs = this.un('SELECT COUNT(*) AS n FROM comptes WHERE vu > ?', t - 7 * 86400000).n;
        return { jours, jeux: Object.entries(jeux).sort((a, b) => b[1] - a[1]), heures, comptes: nb, nouveaux, actifs };
      }
      case 'admin-tournoi': {
        if (moi.cle !== PROPRIO.cle) return { erreur: 'Réservé à l’admin.', statut: 403 };
        return this.adminTournoi(d, t);
      }

      case 'ami-retirer': {
        const cle = cleCompte(d.nom);
        this.sql.exec('DELETE FROM amis WHERE (de = ? AND a = ?) OR (de = ? AND a = ?)', moi.cle, cle, cle, moi.cle);
        return { amis: this.listeAmis(moi.cle) };
      }
    }
    return { erreur: 'Action inconnue.', statut: 400 };
  }
}

// actions que le site a le droit d'appeler (les autres sont réservées au serveur)
export const ACTIONS_PUBLIQUES = new Set(['inscription', 'connexion', 'reclamer', 'profil', 'existe', 'moi', 'deconnexion', 'mdp', 'reglages', 'supprimer', 'amis', 'ami-demande', 'ami-accepter', 'ami-retirer', 'admin-liste', 'admin-compte', 'admin-supprimer', 'admin-mdp', 'admin-victoires',
  'classements', 'tournois', 'progres', 'progres-etat', 'avatar', 'tournoi-inscrire', 'admin-ban', 'admin-stats', 'admin-tournoi']);
