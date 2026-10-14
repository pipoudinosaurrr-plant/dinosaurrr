/* ==========================================================
   Les comptes des joueurs (un seul objet pour tout le site, base SQLite)
   - pseudo réservé + mot de passe choisi par le joueur (modifiable)
   - le mot de passe n'est jamais stocké : seulement une empreinte
     (PBKDF2-SHA256, 100 000 tours, sel aléatoire)
   - sessions : un jeton aléatoire par appareil (on ne garde que son empreinte)
   - victoires par jeu, amis, dernière visite, réglages (invisible, invitations)
   ========================================================== */

import { DurableObject } from 'cloudflare:workers';

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
    `);
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
    if (!c) return null;
    if (t - s.vu > 60000) {
      this.sql.exec('UPDATE sessions SET vu = ? WHERE jeton = ?', t, h);
      this.sql.exec('UPDATE comptes SET vu = ? WHERE cle = ?', t, c.cle);
    }
    return { ...c, jetonHache: h };
  }

  publicCompte(c) {
    return { nom: c.nom, cree: c.cree, invisible: !!c.invisible, invitations: c.invitations };
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
        const c = this.un('SELECT * FROM comptes WHERE cle = ?', clePseudo(d.nom));
        if (!c) { this.noterEssai(ip, 'echec'); return { erreur: 'Pseudo ou mot de passe incorrect.', statut: 401 }; }
        if (c.bloque > t) return { erreur: `Trop d’erreurs : compte bloqué encore ${Math.ceil((c.bloque - t) / 60000)} min.`, statut: 429 };
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
        const c = this.un('SELECT * FROM comptes WHERE cle = ?', clePseudo(d.nom));
        if (!c) return { erreur: 'Ce joueur n’existe pas.', statut: 404 };
        return { profil: { nom: c.nom, cree: c.cree }, stats: this.stats(c.cle) };
      }

      case 'existe': {
        const cle = clePseudo(d.nom);
        return { existe: !!this.un('SELECT cle FROM comptes WHERE cle = ?', cle), libre: !verifierPseudo(d.nom) && !this.un('SELECT cle FROM comptes WHERE cle = ?', cle) };
      }

      /* ===== verifier : utilisé par les salles de jeu et la présence (interne) ===== */
      case 'verifier': {
        const s = d.jeton ? await this.session(d.jeton) : null;
        if (s) return { compte: { cle: s.cle, nom: s.nom, invisible: !!s.invisible, invitations: s.invitations } };
        const cle = clePseudo(d.nom);
        return { reserve: !!(cle && (this.un('SELECT cle FROM comptes WHERE cle = ?', cle) || MOTS_INTERDITS.has(cle))) };
      }
      case 'resultats': {
        const jeu = String(d.jeu || '').slice(0, 20);
        for (const j of Array.isArray(d.joueurs) ? d.joueurs.slice(0, 16) : []) {
          if (!j || !this.un('SELECT cle FROM comptes WHERE cle = ?', j.cle)) continue;
          this.sql.exec(`INSERT INTO stats (cle, jeu, parties, victoires) VALUES (?, ?, 1, ?)
            ON CONFLICT (cle, jeu) DO UPDATE SET parties = parties + 1, victoires = victoires + excluded.victoires`, j.cle, jeu, j.gagne ? 1 : 0);
        }
        return { ok: true };
      }
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
        this.sql.exec('DELETE FROM sessions WHERE cle = ?', moi.cle);
        this.sql.exec('DELETE FROM stats WHERE cle = ?', moi.cle);
        this.sql.exec('DELETE FROM amis WHERE de = ? OR a = ?', moi.cle, moi.cle);
        this.sql.exec('DELETE FROM comptes WHERE cle = ?', moi.cle);
        return { ok: true };
      }

      case 'amis':
        return { amis: this.listeAmis(moi.cle) };

      case 'ami-demande': {
        const autre = this.un('SELECT * FROM comptes WHERE cle = ?', clePseudo(d.nom));
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
        return { amis: this.listeAmis(moi.cle) };
      }

      case 'ami-accepter': {
        const cle = clePseudo(d.nom);
        if (!this.un('SELECT de FROM amis WHERE de = ? AND a = ?', cle, moi.cle)) return { erreur: 'Pas de demande de ce joueur.', statut: 404 };
        this.sql.exec('UPDATE amis SET accepte = 1 WHERE de = ? AND a = ?', cle, moi.cle);
        this.sql.exec('INSERT OR REPLACE INTO amis (de, a, accepte, cree) VALUES (?, ?, 1, ?)', moi.cle, cle, t);
        return { amis: this.listeAmis(moi.cle) };
      }

      case 'ami-retirer': {
        const cle = clePseudo(d.nom);
        this.sql.exec('DELETE FROM amis WHERE (de = ? AND a = ?) OR (de = ? AND a = ?)', moi.cle, cle, cle, moi.cle);
        return { amis: this.listeAmis(moi.cle) };
      }
    }
    return { erreur: 'Action inconnue.', statut: 400 };
  }
}

// actions que le site a le droit d'appeler (les autres sont réservées au serveur)
export const ACTIONS_PUBLIQUES = new Set(['inscription', 'connexion', 'profil', 'existe', 'moi', 'deconnexion', 'mdp', 'reglages', 'supprimer', 'amis', 'ami-demande', 'ami-accepter', 'ami-retirer']);
