/* ==========================================================
   Serveur des jeux multijoueurs de dinosaurrr (Cloudflare Workers)
   - Chaque partie a un code de 4 lettres (ex : K7QF).
   - Une « salle » (Durable Object) par code : elle garde la liste des joueurs
     et fait tourner la partie 30 fois par seconde.
   - Le moteur du jeu est le même fichier que celui du mode solo :
     games/cercle/moteur.js (Le Cercle) et games/multi/jeux/*.js (les autres)
   ========================================================== */

import { DurableObject } from 'cloudflare:workers';
import * as M from '../games/cercle/moteur.js';
import JEUX from '../games/multi/jeux/index.js';
import { Comptes, ACTIONS_PUBLIQUES, formeProprio } from './comptes.js';
import { appliquerAdmin, CLE_ADMIN } from '../games/multi/admin.js';

export { Comptes };

// Les sites qui ont le droit de se connecter au serveur
const ORIGINES = ['https://dinosaurrr.com', 'https://www.dinosaurrr.com'];

function origineAutorisee(origine) {
  if (!origine) return false;
  try {
    const u = new URL(origine);
    return ORIGINES.includes(u.origin)
      || u.hostname === 'localhost'
      || u.hostname === '127.0.0.1'
      || u.hostname.endsWith('.github.io');
  } catch (e) {
    return false;
  }
}

export default {
  async fetch(requete, env) {
    const url = new URL(requete.url);

    if (url.pathname === '/' || url.pathname === '/sante') {
      return new Response('Serveur de jeux dinosaurrr : en ligne.', {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' }
      });
    }

    // comptes des joueurs : /compte/inscription, /compte/connexion, /compte/mdp…
    const compte = url.pathname.match(/^\/compte\/([a-z-]+)$/);
    if (compte) {
      const origine = requete.headers.get('Origin');
      const cors = origineAutorisee(origine) ? {
        'access-control-allow-origin': origine,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-max-age': '86400',
        'vary': 'Origin'
      } : {};
      if (requete.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (requete.method !== 'POST' || !(ACTIONS_PUBLIQUES.has(compte[1]) || ACTIONS_ADMIN_SITE.has(compte[1]))) return new Response('Introuvable', { status: 404, headers: cors });
      if (!origineAutorisee(origine)) return new Response('Origine refusée', { status: 403 });
      const texte = await requete.text();
      if (texte.length > 2000) return new Response('Trop long', { status: 413, headers: cors });
      let d = {};
      try { d = texte ? JSON.parse(texte) : {}; } catch (e) { return Response.json({ erreur: 'Requête invalide.' }, { status: 400, headers: cors }); }
      if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
      const jeton = (requete.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (ACTIONS_ADMIN_SITE.has(compte[1])) {
        const r = await adminSite(env, compte[1], d, jeton);
        return Response.json(r, { status: r.statut || 200, headers: { ...cors, 'cache-control': 'no-store' } });
      }
      const corps = JSON.stringify({ ...d, action: compte[1], jeton, ip: requete.headers.get('CF-Connecting-IP') || '' });
      const rep = await comptes(env).fetch('https://comptes/', { method: 'POST', body: corps });
      return new Response(rep.body, { status: rep.status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    }

    // présence : qui est sur le site + annonces des nouvelles parties
    if (url.pathname === '/presence') {
      if (requete.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket attendu', { status: 426 });
      if (!origineAutorisee(requete.headers.get('Origin'))) return new Response('Origine refusée', { status: 403 });
      return env.PRESENCE.get(env.PRESENCE.idFromName('site')).fetch(requete);
    }

    const cercle = url.pathname.match(/^\/cercle\/([A-Z0-9]{4})$/);
    const autre = url.pathname.match(/^\/jeu\/([a-z0-9]+)\/([A-Z0-9]{4})$/);
    if (!cercle && !(autre && JEUX[autre[1]])) return new Response('Introuvable', { status: 404 });
    if (requete.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket attendu', { status: 426 });
    if (!origineAutorisee(requete.headers.get('Origin'))) return new Response('Origine refusée', { status: 403 });

    if (cercle) return env.SALLES.get(env.SALLES.idFromName('cercle:' + cercle[1])).fetch(requete);
    return env.TABLES.get(env.TABLES.idFromName(autre[1] + ':' + autre[2])).fetch(requete);
  }
};

/* ---------- Console admin : actions sur tout le site ---------- */

const ACTIONS_ADMIN_SITE = new Set(['admin-annonce', 'admin-site', 'admin-fermer']);

async function adminSite(env, action, d, jeton) {
  const v = await appelComptes(env, { action: 'verifier', jeton });
  if (!v.compte || v.compte.cle !== CLE_ADMIN) return { erreur: 'Réservé à l’admin.', statut: 403 };
  const presence = env.PRESENCE.get(env.PRESENCE.idFromName('site'));
  if (action === 'admin-annonce') {
    const texte = String(d.texte || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
    if (!texte) return { erreur: 'Écris un message.', statut: 400 };
    const r = await presence.fetch('https://presence/admin-annonce', { method: 'POST', body: JSON.stringify({ texte, nom: v.compte.nom }) });
    return await r.json();
  }
  if (action === 'admin-site') {
    const r = await presence.fetch('https://presence/admin-etat', { method: 'POST', body: '{}' });
    return await r.json();
  }
  if (action === 'admin-fermer') {
    const jeu = String(d.jeu || ''), code = String(d.code || '');
    if (!/^[A-Z0-9]{4}$/.test(code) || !(jeu === 'cercle' || JEUX[jeu])) return { erreur: 'Partie inconnue.', statut: 400 };
    const salle = jeu === 'cercle' ? env.SALLES.get(env.SALLES.idFromName('cercle:' + code)) : env.TABLES.get(env.TABLES.idFromName(jeu + ':' + code));
    await salle.fetch('https://salle/fermer', { method: 'POST', body: '{}' });
    await presence.fetch('https://presence/partie', { method: 'POST', body: JSON.stringify({ jeu, code, fin: true }) });
    return { ok: true };
  }
  return { erreur: 'Action inconnue.', statut: 400 };
}

// l'admin ferme une partie : tout le monde est renvoyé à l'accueil
function fermerSalle(objet) {
  const texte = JSON.stringify({ t: 'erreur', message: 'Cette partie a été fermée par l’admin.' });
  for (const ws of objet.ctx.getWebSockets()) {
    try { ws.send(texte); ws.close(4001, 'fermee'); } catch (e) { /* déjà fermée */ }
  }
}
const estFermeture = requete => requete.method === 'POST' && new URL(requete.url).pathname === '/fermer';

/* ---------- Petits outils ---------- */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const idAleatoire = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), o => ALPHABET[o % ALPHABET.length]).join('');

function nettoyerNom(texte) {
  const propre = String(texte || '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14);
  return propre || 'Joueur';
}

// l'objet qui garde tous les comptes
const comptes = env => env.COMPTES.get(env.COMPTES.idFromName('comptes'));

async function appelComptes(env, donnees) {
  try {
    const r = await comptes(env).fetch('https://comptes/', { method: 'POST', body: JSON.stringify(donnees) });
    return await r.json();
  } catch (e) { return {}; }
}

// Un joueur arrive dans une salle : s'il est connecté à son compte, on prend
// son vrai pseudo ; sinon, il n'a pas le droit d'utiliser le pseudo d'un compte.
async function identifier(env, msg) {
  const voulu = nettoyerNom(msg.nom);
  const r = await appelComptes(env, { action: 'verifier', jeton: typeof msg.jeton === 'string' ? msg.jeton : '', nom: voulu });
  if (r.compte) return { nom: r.compte.nom, compte: r.compte.cle };
  if (r.reserve) return { nom: 'Invité' + Math.floor(100 + Math.random() * 900), compte: null };
  return { nom: voulu, compte: null };
}

// fin de partie : on note les parties et victoires des joueurs qui ont un compte
// (seulement s'il y avait au moins 2 vrais joueurs, pour éviter de gonfler ses victoires contre des bots)
function noterResultats(objet, jeu, classement, triche) {
  if (triche) return;   // partie avec pouvoirs admin : ne compte pas
  const parId = new Map(objet.connectes().map(({ info }) => [info.id, info]));
  const humains = classement.filter(c => !c.bot && parId.has(c.id));
  if (humains.length < 2) return;
  const joueurs = humains.map(c => ({ cle: parId.get(c.id).compte, gagne: c.place === 1 })).filter(j => j.cle);
  if (!joueurs.length) return;
  const envoi = appelComptes(objet.env, { action: 'resultats', jeu, joueurs });
  try { objet.ctx.waitUntil(envoi); } catch (e) { /* rien */ }
}

// prévient l'objet Présence de l'état d'un salon (pour la liste des parties ouvertes)
// on n'envoie que si quelque chose a changé
function signalerPartie(objet, donnees) {
  const texte = JSON.stringify(donnees);
  if (objet.dernierSignal === texte) return;
  objet.dernierSignal = texte;
  const stub = objet.env.PRESENCE.get(objet.env.PRESENCE.idFromName('site'));
  const envoi = stub.fetch('https://presence/partie', { method: 'POST', body: texte }).catch(() => {});
  try { objet.ctx.waitUntil(envoi); } catch (e) { /* rien */ }
}

const TIC = 1000 / 30;
const PAS = 1 / 60;
const MAX_HUMAINS = 8;

/* ---------- Une salle de jeu ---------- */

export class Salle extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.phase = 'salon';          // salon → jeu → fin → salon
    this.partie = null;
    this.boucle = null;
    this.bots = [];
    this.victoiresBots = {};
    this.infos = new WeakMap();
    this.debit = new WeakMap();
    // répondre aux « ping » sans réveiller la salle (gratuit)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => {
      this.bots = (await ctx.storage.get('bots')) || [];
      this.code = (await ctx.storage.get('code')) || null;
    });
  }

  async fetch(requete) {
    if (estFermeture(requete)) { fermerSalle(this); return new Response('ok'); }
    const mc = new URL(requete.url).pathname.match(/\/([A-Z0-9]{4})$/);
    if (mc && mc[1] !== this.code) { this.code = mc[1]; await this.ctx.storage.put("code", this.code); }
    const paire = new WebSocketPair();
    const [client, serveur] = Object.values(paire);
    this.ctx.acceptWebSocket(serveur);
    const info = { id: idAleatoire(), nom: '', couleur: '', arrive: Date.now(), victoires: 0 };
    this.ecrireInfo(serveur, info);
    return new Response(null, { status: 101, webSocket: client });
  }

  /* --- infos attachées à chaque connexion (survivent à la mise en veille) --- */

  lireInfo(ws) {
    let info = this.infos.get(ws);
    if (!info) {
      info = ws.deserializeAttachment() || {};
      this.infos.set(ws, info);
    }
    return info;
  }

  ecrireInfo(ws, info) {
    this.infos.set(ws, info);
    ws.serializeAttachment(info);
  }

  connectes() {
    return this.ctx.getWebSockets()
      .filter(ws => ws.readyState === 1)
      .map(ws => ({ ws, info: this.lireInfo(ws) }));
  }

  joueursHumains() {
    return this.connectes().filter(c => c.info.nom).sort((a, b) => a.info.arrive - b.info.arrive);
  }

  hote() {
    const h = this.joueursHumains()[0];
    return h ? h.info.id : null;
  }

  envoyer(ws, msg) {
    try { ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); } catch (e) { /* connexion fermée */ }
  }

  diffuser(msg) {
    const texte = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) this.envoyer(ws, texte);
  }

  diffuserSalle() {
    const hote = this.hote();
    const humains = this.joueursHumains().map(({ info }) => ({
      id: info.id, nom: info.nom, couleur: info.couleur, victoires: info.victoires || 0, hote: info.id === hote, compte: !!info.compte
    }));
    const bots = this.bots.map(b => ({ ...b, victoires: this.victoiresBots[b.id] || 0 }));
    this.diffuser({ t: 'salle', phase: this.phase, hote, joueurs: [...humains, ...bots], max: M.MAX_JOUEURS });
    if (this.code && humains.length) {
      const h = humains.find(x => x.hote) || humains[0];
      signalerPartie(this, { jeu: 'cercle', code: this.code, hote: h.nom, n: humains.length + bots.length, max: M.MAX_JOUEURS, phase: this.phase === 'salon' ? 'salon' : 'jeu' });
    }
  }

  couleurLibre(sauf) {
    const prises = new Set([
      ...this.joueursHumains().filter(c => c.info.id !== sauf).map(c => c.info.couleur),
      ...this.bots.map(b => b.couleur)
    ]);
    return M.COULEURS.find(c => !prises.has(c)) || M.COULEURS[Math.floor(Math.random() * M.COULEURS.length)];
  }

  async enregistrerBots() {
    await this.ctx.storage.put('bots', this.bots);
  }

  /* --- messages reçus --- */

  async webSocketMessage(ws, brut) {
    if (typeof brut !== 'string' || brut.length > 300) return;

    // limite : 60 messages par seconde et par joueur
    const maintenant = Date.now();
    const d = this.debit.get(ws) || { n: 0, depuis: maintenant };
    if (maintenant - d.depuis > 1000) { d.n = 0; d.depuis = maintenant; }
    d.n++;
    this.debit.set(ws, d);
    if (d.n > 60) return;

    let msg;
    try { msg = JSON.parse(brut); } catch (e) { return; }
    if (!msg || typeof msg !== 'object') return;
    const info = this.lireInfo(ws);

    switch (msg.t) {
      case 'salut': {
        const deja = !!info.nom;
        if (!deja && this.joueursHumains().length >= MAX_HUMAINS) {
          this.envoyer(ws, { t: 'erreur', message: 'Cette partie est pleine (8 joueurs maximum).' });
          try { ws.close(4000, 'pleine'); } catch (e) { /* rien */ }
          return;
        }
        const ident = await identifier(this.env, msg);
        let nom = ident.nom;
        const pris = new Set([...this.joueursHumains().filter(c => c.info.id !== info.id).map(c => c.info.nom), ...this.bots.map(b => b.nom)]);
        if (pris.has(nom)) {
          let i = 2;
          while (pris.has(nom.slice(0, 12) + i)) i++;
          nom = nom.slice(0, 12) + i;
        }
        info.nom = nom;
        info.compte = ident.compte;
        if (!info.couleur) info.couleur = this.couleurLibre(info.id);
        this.ecrireInfo(ws, info);
        // trop de monde avec les bots : on retire des bots
        while (this.bots.length && this.joueursHumains().length + this.bots.length > M.MAX_JOUEURS) this.bots.pop();
        await this.enregistrerBots();
        this.envoyer(ws, { t: 'bienvenue', id: info.id, nom: info.nom, couleur: info.couleur, admin: info.compte === CLE_ADMIN });
        if (this.partie && this.phase === 'jeu') this.envoyer(ws, { t: 'debut', equipe: M.equipe(this.partie), spectateur: true });
        this.diffuserSalle();
        break;
      }

      case 'vise':
        if (this.partie && this.phase === 'jeu') M.viser(this.partie, info.id, Number(msg.x), Number(msg.y));
        break;

      case 'fonce':
        if (this.partie && this.phase === 'jeu') M.foncer(this.partie, info.id);
        break;

      case 'lance':
        if (this.phase === 'salon' && info.id === this.hote()) this.lancer();
        break;

      // pouvoir admin : seulement le compte du propriétaire (vérifié par son jeton)
      case 'admin': {
        if (info.compte !== CLE_ADMIN || !this.partie || this.phase !== 'jeu') return;
        const r = M.admin(this.partie, info.id, String(msg.cmd || ''));
        if (r) this.diffuser({ t: 'admin', nom: info.nom, texte: r.texte });
        break;
      }

      case 'bot':
        if (this.phase !== 'salon' || info.id !== this.hote()) return;
        if (msg.ajout) {
          if (this.joueursHumains().length + this.bots.length >= M.MAX_JOUEURS) return;
          const nomsPris = new Set(this.bots.map(b => b.nom));
          const nom = M.NOMS_BOTS.find(n => !nomsPris.has(n)) || 'Bot';
          this.bots.push({ id: 'bot-' + idAleatoire(), nom, couleur: this.couleurLibre(), bot: true });
        } else {
          this.bots.pop();
        }
        await this.enregistrerBots();
        this.diffuserSalle();
        break;
    }
  }

  async webSocketClose(ws, code) {
    const info = this.lireInfo(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'au revoir'); } catch (e) { /* déjà fermée */ }
    if (this.partie && this.phase === 'jeu' && info.id) M.retirer(this.partie, info.id);
    if (this.joueursHumains().length === 0) {
      if (this.code) signalerPartie(this, { jeu: 'cercle', code: this.code, fin: true });
      this.arreter();
      this.bots = [];
      this.victoiresBots = {};
      await this.ctx.storage.deleteAll();
      return;
    }
    this.diffuserSalle();
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws, 1011);
  }

  /* --- la partie --- */

  lancer() {
    const humains = this.joueursHumains().slice(0, M.MAX_JOUEURS);
    if (!humains.length) return;
    const liste = [
      ...humains.map(({ info }) => ({ id: info.id, nom: info.nom, couleur: info.couleur })),
      ...this.bots.slice(0, M.MAX_JOUEURS - humains.length)
    ];
    this.partie = M.creerPartie(liste);
    this.phase = 'jeu';
    this.accumule = 0;
    this.dernier = Date.now();
    this.diffuser({ t: 'debut', equipe: M.equipe(this.partie) });
    this.diffuserSalle();
    this.boucle = setInterval(() => this.tic(), TIC);
  }

  tic() {
    const p = this.partie;
    if (!p) return this.arreter();
    const maintenant = Date.now();
    this.accumule += Math.min(0.1, (maintenant - this.dernier) / 1000);
    this.dernier = maintenant;
    while (this.accumule >= PAS) {
      M.piloterBots(p, PAS);
      M.etape(p, PAS);
      this.accumule -= PAS;
    }
    const msg = { t: 'etat', s: M.instantane(p) };
    if (p.evts.length) { msg.e = p.evts; p.evts = []; }
    this.diffuser(msg);
    if (p.fini) this.finir();
  }

  finir() {
    const p = this.partie;
    this.arreter();
    this.phase = 'fin';
    const gagnant = p.classement.find(c => c.place === 1);
    if (gagnant) {
      if (gagnant.bot) this.victoiresBots[gagnant.id] = (this.victoiresBots[gagnant.id] || 0) + 1;
      for (const { ws, info } of this.connectes()) {
        if (info.id === gagnant.id) { info.victoires = (info.victoires || 0) + 1; this.ecrireInfo(ws, info); }
      }
    }
    noterResultats(this, 'cercle', p.classement, p.triche);
    this.diffuser({ t: 'fin', classement: p.classement });
    setTimeout(() => {
      this.partie = null;
      this.phase = 'salon';
      this.diffuserSalle();
    }, 5000);
  }

  arreter() {
    if (this.boucle) clearInterval(this.boucle);
    this.boucle = null;
    if (this.phase === 'jeu') this.phase = 'salon';
  }
}

/* ==========================================================
   Une table de jeu (tous les autres jeux à plusieurs)
   Le moteur du jeu est choisi d'après l'adresse : /jeu/puissance4/K7QF
   ========================================================== */

export class Table extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.phase = 'salon';
    this.partie = null;
    this.boucle = null;
    this.bots = [];
    this.victoiresBots = {};
    this.jeu = null;
    this.mod = null;
    this.infos = new WeakMap();
    this.debit = new WeakMap();
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => {
      this.bots = (await ctx.storage.get('bots')) || [];
      this.choisirJeu(await ctx.storage.get('jeu'));
      this.code = (await ctx.storage.get('code')) || null;
    });
  }

  choisirJeu(id) {
    if (id && JEUX[id]) { this.jeu = id; this.mod = JEUX[id]; }
  }

  async fetch(requete) {
    if (estFermeture(requete)) { fermerSalle(this); return new Response('ok'); }
    if (!this.mod) {
      const m = new URL(requete.url).pathname.match(/^\/jeu\/([a-z0-9]+)\//);
      this.choisirJeu(m && m[1]);
      if (!this.mod) return new Response('Jeu inconnu', { status: 404 });
      await this.ctx.storage.put('jeu', this.jeu);
    }
    const m = new URL(requete.url).pathname.match(/\/([A-Z0-9]{4})$/);
    if (m && m[1] !== this.code) { this.code = m[1]; await this.ctx.storage.put('code', this.code); }
    const paire = new WebSocketPair();
    const [client, serveur] = Object.values(paire);
    this.ctx.acceptWebSocket(serveur);
    this.ecrireInfo(serveur, { id: idAleatoire(), nom: '', couleur: '', arrive: Date.now(), victoires: 0 });
    return new Response(null, { status: 101, webSocket: client });
  }

  lireInfo(ws) {
    let info = this.infos.get(ws);
    if (!info) { info = ws.deserializeAttachment() || {}; this.infos.set(ws, info); }
    return info;
  }

  ecrireInfo(ws, info) { this.infos.set(ws, info); ws.serializeAttachment(info); }

  connectes() {
    return this.ctx.getWebSockets().filter(ws => ws.readyState === 1).map(ws => ({ ws, info: this.lireInfo(ws) }));
  }

  joueursHumains() {
    return this.connectes().filter(c => c.info.nom).sort((a, b) => a.info.arrive - b.info.arrive);
  }

  hote() { const h = this.joueursHumains()[0]; return h ? h.info.id : null; }

  envoyer(ws, msg) { try { ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); } catch (e) { /* fermée */ } }

  diffuser(msg) {
    const texte = typeof msg === 'string' ? msg : JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) this.envoyer(ws, texte);
  }

  diffuserSalle() {
    const hote = this.hote();
    const humains = this.joueursHumains().map(({ info }) => ({ id: info.id, nom: info.nom, couleur: info.couleur, victoires: info.victoires || 0, hote: info.id === hote, compte: !!info.compte }));
    const bots = this.mod.bots ? this.bots.map(b => ({ ...b, victoires: this.victoiresBots[b.id] || 0 })) : [];
    this.diffuser({ t: 'salle', jeu: this.jeu, phase: this.phase, hote, joueurs: [...humains, ...bots], max: this.mod.max, min: this.mod.min, bots: !!this.mod.bots });
    if (this.code && humains.length) {
      const h = humains.find(x => x.hote) || humains[0];
      signalerPartie(this, { jeu: this.jeu, code: this.code, hote: h.nom, n: humains.length + bots.length, max: this.mod.max, phase: this.phase === 'salon' ? 'salon' : 'jeu' });
    }
  }

  couleurLibre(sauf) {
    const prises = new Set([...this.joueursHumains().filter(c => c.info.id !== sauf).map(c => c.info.couleur), ...this.bots.map(b => b.couleur)]);
    return M.COULEURS.find(c => !prises.has(c)) || M.COULEURS[Math.floor(Math.random() * M.COULEURS.length)];
  }

  async webSocketMessage(ws, brut) {
    if (!this.mod || typeof brut !== 'string' || brut.length > 4000) return;
    const maintenant = Date.now();
    const d = this.debit.get(ws) || { n: 0, depuis: maintenant };
    if (maintenant - d.depuis > 1000) { d.n = 0; d.depuis = maintenant; }
    d.n++;
    this.debit.set(ws, d);
    if (d.n > 60) return;

    let msg;
    try { msg = JSON.parse(brut); } catch (e) { return; }
    if (!msg || typeof msg !== 'object') return;
    const info = this.lireInfo(ws);

    switch (msg.t) {
      case 'salut': {
        if (!info.nom && this.joueursHumains().length >= this.mod.max + 4) {
          this.envoyer(ws, { t: 'erreur', message: 'Cette partie est pleine.' });
          try { ws.close(4000, 'pleine'); } catch (e) { /* rien */ }
          return;
        }
        const ident = await identifier(this.env, msg);
        let nom = ident.nom;
        const pris = new Set([...this.joueursHumains().filter(c => c.info.id !== info.id).map(c => c.info.nom), ...this.bots.map(b => b.nom)]);
        if (pris.has(nom)) { let i = 2; while (pris.has(nom.slice(0, 12) + i)) i++; nom = nom.slice(0, 12) + i; }
        info.nom = nom;
        info.compte = ident.compte;
        if (!info.couleur) info.couleur = this.couleurLibre(info.id);
        this.ecrireInfo(ws, info);
        while (this.bots.length && this.joueursHumains().length + this.bots.length > this.mod.max) this.bots.pop();
        await this.ctx.storage.put('bots', this.bots);
        this.envoyer(ws, { t: 'bienvenue', id: info.id, nom: info.nom, couleur: info.couleur, admin: info.compte === CLE_ADMIN });
        if (this.partie && this.phase === 'jeu') {
          this.envoyer(ws, { t: 'debut', equipe: this.equipe(), spectateur: true });
          this.envoyer(ws, { t: 'etat', s: this.mod.vue(this.partie, info.id, Date.now()) });
        }
        this.diffuserSalle();
        break;
      }

      case 'lance': {
        if (this.phase !== 'salon' || info.id !== this.hote()) return;
        const nb = Math.min(this.mod.max, this.joueursHumains().length + (this.mod.bots ? this.bots.length : 0));
        if (nb < this.mod.min) { this.envoyer(ws, { t: 'erreur-douce', message: `Il faut au moins ${this.mod.min} joueurs.` }); return; }
        this.lancer();
        break;
      }

      case 'bot':
        if (!this.mod.bots || this.phase !== 'salon' || info.id !== this.hote()) return;
        if (msg.ajout) {
          if (this.joueursHumains().length + this.bots.length >= this.mod.max) return;
          const pris = new Set(this.bots.map(b => b.nom));
          this.bots.push({ id: 'bot-' + idAleatoire(), nom: M.NOMS_BOTS.find(n => !pris.has(n)) || 'Bot', couleur: this.couleurLibre(), bot: true });
        } else this.bots.pop();
        await this.ctx.storage.put('bots', this.bots);
        this.diffuserSalle();
        break;

      // pouvoir admin : seulement le compte du propriétaire (vérifié par son jeton)
      case 'admin': {
        if (info.compte !== CLE_ADMIN || !this.partie || this.phase !== 'jeu') return;
        const r = appliquerAdmin(this.mod, this.partie, info.id, String(msg.cmd || ''), Date.now());
        if (!r) { this.envoyer(ws, { t: 'erreur-douce', message: 'Ce pouvoir ne marche pas maintenant.' }); return; }
        this.diffuser({ t: 'admin', nom: info.nom, texte: r.texte });
        if (r.prive) this.envoyer(ws, { t: 'admin-prive', texte: r.prive });
        this.publier(true);
        break;
      }

      case 'jeu': {
        if (!this.partie || this.phase !== 'jeu' || !msg.d || typeof msg.d !== 'object') return;
        if (!this.partie.joueurs.some(j => j.id === info.id)) return;
        const change = this.mod.action(this.partie, info.id, msg.d, Date.now());
        this.publier(change && !this.mod.tempsReel);
        break;
      }
    }
  }

  async webSocketClose(ws, code) {
    const info = this.lireInfo(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'au revoir'); } catch (e) { /* déjà fermée */ }
    if (this.partie && this.phase === 'jeu' && info.id && this.mod.retirer) {
      const change = this.mod.retirer(this.partie, info.id, Date.now());
      this.publier(change);
    }
    if (this.joueursHumains().length === 0) {
      if (this.code) signalerPartie(this, { jeu: this.jeu, code: this.code, fin: true });
      this.arreter();
      this.partie = null;
      this.phase = 'salon';
      this.bots = [];
      this.victoiresBots = {};
      await this.ctx.storage.deleteAll();
      return;
    }
    this.diffuserSalle();
  }

  async webSocketError(ws) { await this.webSocketClose(ws, 1011); }

  equipe() { return this.partie.joueurs.map(j => ({ id: j.id, nom: j.nom, couleur: j.couleur, bot: !!j.bot })); }

  lancer() {
    const humains = this.joueursHumains().slice(0, this.mod.max).map(({ info }) => ({ id: info.id, nom: info.nom, couleur: info.couleur }));
    const liste = [...humains, ...(this.mod.bots ? this.bots.slice(0, this.mod.max - humains.length) : [])];
    this.partie = this.mod.creer(liste, Date.now());
    this.phase = 'jeu';
    this.dernier = Date.now();
    this.diffuser({ t: 'debut', equipe: this.equipe() });
    this.diffuserSalle();
    this.publier(true);
    this.boucle = setInterval(() => this.tic(), this.mod.tic || 200);
  }

  // envoie les évènements, puis l'état (une vue par joueur si besoin)
  publier(envoyerEtat) {
    const p = this.partie;
    if (!p) return;
    const maintenant = Date.now();
    if (p.evts && p.evts.length) {
      const evts = p.evts;
      p.evts = [];
      const publics = evts.filter(ev => Array.isArray(ev));
      if (publics.length) this.diffuser({ t: 'evt', e: publics });
      const cibles = evts.filter(ev => !Array.isArray(ev));
      if (cibles.length) {
        for (const { ws, info } of this.connectes()) {
          const siens = cibles.filter(ev => (ev.pour ? ev.pour === info.id : ev.sauf !== info.id)).map(ev => ev.d);
          if (siens.length) this.envoyer(ws, { t: 'evt', e: siens });
        }
      }
    }
    if (envoyerEtat) {
      if (this.mod.vueCommune) this.diffuser({ t: 'etat', s: this.mod.vue(p, null, maintenant) });
      else for (const { ws, info } of this.connectes()) this.envoyer(ws, { t: 'etat', s: this.mod.vue(p, info.id, maintenant) });
    }
    if (p.fini) this.finir();
  }

  tic() {
    const p = this.partie;
    if (!p || this.phase !== 'jeu') return this.arreter();
    const maintenant = Date.now();
    const dt = Math.min(200, maintenant - this.dernier);
    this.dernier = maintenant;
    let change = false;
    if (this.mod.bots) {
      for (const j of p.joueurs) {
        if (!j.bot) continue;
        const d = this.mod.bot(p, j.id, maintenant);
        if (d) change = this.mod.action(p, j.id, d, maintenant) || change;
      }
    }
    change = this.mod.etape(p, maintenant, dt) || change;
    this.publier(change || this.mod.tempsReel);
  }

  finir() {
    const p = this.partie;
    if (!p || this.phase !== 'jeu') return;
    this.arreter();
    this.phase = 'fin';
    for (const c of p.classement.filter(x => x.place === 1)) {
      if (c.bot) this.victoiresBots[c.id] = (this.victoiresBots[c.id] || 0) + 1;
      for (const { ws, info } of this.connectes()) if (info.id === c.id) { info.victoires = (info.victoires || 0) + 1; this.ecrireInfo(ws, info); }
    }
    noterResultats(this, this.jeu, p.classement, p.triche);
    this.diffuser({ t: 'fin', classement: p.classement });
    setTimeout(() => {
      this.partie = null;
      this.phase = 'salon';
      if (this.mod) this.diffuserSalle();
    }, 6000);
  }

  arreter() {
    if (this.boucle) clearInterval(this.boucle);
    this.boucle = null;
  }
}

/* ---------- Présence : les visiteurs du site ----------
   Un seul objet pour tout le site. Chaque onglet ouvert s'y connecte.
   - il compte les personnes en ligne et prévient tout le monde quand ça change
   - quand quelqu'un crée une partie, il prévient tous les autres
   ------------------------------------------------------- */

const JEUX_ANNONCABLES = new Set(['cercle', ...Object.keys(JEUX)]);
const PAUSE_ANNONCE = 20000;  // une annonce toutes les 20 s maximum par personne

const DUREE_MAX_PARTIE = 3 * 3600 * 1000;  // une partie oubliée disparaît de la liste après 3 h

export class Presence extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.infos = new WeakMap();
    this.minuterie = null;
    this.minuterieParties = null;
    this.parties = {};
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => {
      this.parties = (await ctx.storage.get('parties')) || {};
    });
  }

  async fetch(requete) {
    // un salon de jeu nous donne de ses nouvelles
    if (requete.method === 'POST' && new URL(requete.url).pathname === '/partie') {
      let d;
      try { d = await requete.json(); } catch (e) { return new Response('?', { status: 400 }); }
      if (!d || !JEUX_ANNONCABLES.has(d.jeu) || !/^[A-Z0-9]{4}$/.test(d.code || '')) return new Response('?', { status: 400 });
      const cle = d.jeu + ':' + d.code;
      if (d.fin) delete this.parties[cle];
      else {
        const avant = this.parties[cle];
        this.parties[cle] = {
          jeu: d.jeu, code: d.code, hote: nettoyerNom(d.hote),
          n: Math.max(0, Number(d.n) || 0), max: Math.max(1, Number(d.max) || 2),
          phase: d.phase === 'jeu' ? 'jeu' : 'salon',
          debut: avant ? avant.debut : Date.now(), maj: Date.now()
        };
      }
      const limite = Date.now() - DUREE_MAX_PARTIE;
      for (const [k, p] of Object.entries(this.parties)) if (p.maj < limite) delete this.parties[k];
      await this.ctx.storage.put('parties', this.parties);
      this.prevoirParties();
      return new Response('ok');
    }

    // console admin (appelé par le serveur après avoir vérifié le compte)
    if (requete.method === 'POST' && new URL(requete.url).pathname === '/admin-annonce') {
      const d = await requete.json();
      const texte = JSON.stringify({ t: 'annonce-admin', texte: String(d.texte || '').slice(0, 200), nom: nettoyerNom(d.nom) });
      const liste = this.ouverts();
      for (const ws of liste) { try { ws.send(texte); } catch (e) { /* fermée */ } }
      return Response.json({ ok: true, n: liste.length });
    }
    if (requete.method === 'POST' && new URL(requete.url).pathname === '/admin-etat') {
      const liste = this.ouverts();
      const tous = liste.map(ws => this.lireInfo(ws)).filter(i => i.compte).map(i => ({ nom: i.compte.nom, invisible: !!i.compte.invisible, jeu: i.activite || null }));
      const parNom = new Map();
      for (const c of tous) if (!parNom.has(c.nom) || c.jeu) parNom.set(c.nom, c);
      return Response.json({ n: liste.length, comptes: [...parNom.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')), visiteurs: liste.length - tous.length, parties: this.listeParties() });
    }

    const paire = new WebSocketPair();
    const [client, serveur] = Object.values(paire);
    this.ctx.acceptWebSocket(serveur);
    this.ecrireInfo(serveur, { id: idAleatoire(), derniereAnnonce: 0 });
    this.envoyer(serveur, { t: 'compte', n: this.ouverts().length });
    this.envoyer(serveur, { t: 'parties', liste: this.listeParties() });
    this.envoyer(serveur, this.contacts(this.ouverts()));
    this.prevoirCompte();
    return new Response(null, { status: 101, webSocket: client });
  }

  // d'abord les parties qui attendent des joueurs, les plus récentes en premier
  listeParties() {
    const attend = p => (p.phase === 'salon' && p.n < p.max) ? 0 : 1;
    return Object.values(this.parties)
      .sort((a, b) => attend(a) - attend(b) || b.debut - a.debut)
      .slice(0, 30)
      .map(({ jeu, code, hote, n, max, phase }) => ({ jeu, code, hote, n, max, phase }));
  }

  prevoirParties() {
    if (this.minuterieParties) return;
    this.minuterieParties = setTimeout(() => {
      this.minuterieParties = null;
      const texte = JSON.stringify({ t: 'parties', liste: this.listeParties() });
      for (const ws of this.ouverts()) { try { ws.send(texte); } catch (e) { /* fermée */ } }
    }, 300);
  }

  lireInfo(ws) {
    let info = this.infos.get(ws);
    if (!info) { info = ws.deserializeAttachment() || {}; this.infos.set(ws, info); }
    return info;
  }

  ecrireInfo(ws, info) { this.infos.set(ws, info); ws.serializeAttachment(info); }

  ouverts(sauf) {
    return this.ctx.getWebSockets().filter(ws => ws !== sauf && ws.readyState === 1);
  }

  envoyer(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch (e) { /* fermée */ } }

  // on regroupe les changements (plein d'arrivées d'un coup = un seul message)
  prevoirCompte(sauf) {
    if (this.minuterie) return;
    this.minuterie = setTimeout(() => {
      this.minuterie = null;
      const liste = this.ouverts(sauf);
      const texte = JSON.stringify({ t: 'compte', n: liste.length });
      const contacts = JSON.stringify(this.contacts(liste));
      for (const ws of liste) { try { ws.send(texte); ws.send(contacts); } catch (e) { /* fermée */ } }
    }, 400);
  }

  // les joueurs connectés à leur compte (et pas invisibles), un seul par compte
  contacts(liste) {
    const parCle = new Map();
    let visiteurs = 0;
    for (const ws of liste) {
      const info = this.lireInfo(ws);
      const c = info.compte;
      if (!c || c.invisible) { visiteurs++; continue; }
      const deja = parCle.get(c.cle);
      if (!deja) parCle.set(c.cle, { cle: c.cle, nom: c.nom, jeu: info.activite || null });
      else if (!deja.jeu && info.activite) deja.jeu = info.activite;
    }
    return { t: 'contacts', liste: [...parCle.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')), visiteurs };
  }

  appelComptes(donnees) { return appelComptes(this.env, donnees); }

  async webSocketMessage(ws, brut) {
    if (typeof brut !== 'string' || brut.length > 300) return;
    let msg;
    try { msg = JSON.parse(brut); } catch (e) { return; }
    if (!msg || typeof msg !== 'object') return;
    const info = this.lireInfo(ws);

    if (msg.t === 'annonce') {
      const jeu = String(msg.jeu || '');
      const code = String(msg.code || '');
      if (!JEUX_ANNONCABLES.has(jeu) || !/^[A-Z0-9]{4}$/.test(code)) return;
      const maintenant = Date.now();
      if (maintenant - (info.derniereAnnonce || 0) < PAUSE_ANNONCE) return;
      info.derniereAnnonce = maintenant;
      this.ecrireInfo(ws, info);
      const annonce = JSON.stringify({ t: 'partie', jeu, code, nom: info.compte ? info.compte.nom : (formeProprio(msg.nom) ? 'Invité' : nettoyerNom(msg.nom)) });
      const autres = this.ouverts(ws);
      for (const autre of autres) { try { autre.send(annonce); } catch (e) { /* fermée */ } }
      this.envoyer(ws, { t: 'annonce-ok', n: autres.length });
    }

    // qui je suis : jeton de compte (ou rien pour un visiteur)
    if (msg.t === 'moi') {
      const avant = info.compte && info.compte.cle;
      let compte = null;
      if (typeof msg.jeton === 'string' && msg.jeton) {
        const r = await this.appelComptes({ action: 'verifier', jeton: msg.jeton });
        if (r.compte) compte = r.compte;
      }
      const info2 = this.lireInfo(ws);
      info2.compte = compte;
      this.ecrireInfo(ws, info2);
      if (avant && avant !== (compte && compte.cle)) this.ctx.waitUntil(this.appelComptes({ action: 'vu', cle: avant }));
      this.envoyer(ws, { t: 'moi-ok', nom: compte ? compte.nom : null });
      this.prevoirCompte();
    }

    // ce que je fais : le jeu ouvert en ce moment (ou rien)
    if (msg.t === 'activite') {
      const jeu = JEUX_ANNONCABLES.has(msg.jeu) ? msg.jeu : null;
      if (info.activite === jeu) return;
      info.activite = jeu;
      this.ecrireInfo(ws, info);
      if (info.compte && !info.compte.invisible) this.prevoirCompte();
    }

    // inviter un joueur (il faut avoir un compte, 1 invitation toutes les 4 s)
    if (msg.t === 'inviter') {
      const jeu = String(msg.jeu || '');
      const code = String(msg.code || '');
      const repondre = (ok, raison) => this.envoyer(ws, { t: 'invite-ok', ok, raison: raison || '', cible: String(msg.cible || '') });
      if (!info.compte) return repondre(false, 'Connecte-toi à ton compte pour inviter.');
      if (!JEUX_ANNONCABLES.has(jeu) || !/^[A-Z0-9]{4}$/.test(code)) return repondre(false, 'Invitation invalide.');
      const maintenant = Date.now();
      if (maintenant - (info.dernierInvite || 0) < 4000) return repondre(false, 'Attends un peu avant d’inviter encore.');
      info.dernierInvite = maintenant;
      this.ecrireInfo(ws, info);
      const cible = String(msg.cible || '');
      const siens = this.ouverts(ws).filter(w => { const i = this.lireInfo(w); return i.compte && i.compte.cle === cible; });
      if (!siens.length) return repondre(false, 'Ce joueur n’est plus en ligne.');
      const reglage = this.lireInfo(siens[0]).compte.invitations || 'tous';
      if (reglage === 'personne') return repondre(false, 'Ce joueur ne reçoit pas d’invitations.');
      if (reglage === 'amis') {
        const r = await this.appelComptes({ action: 'sont-amis', a: cible, b: info.compte.cle });
        if (!r.amis) return repondre(false, 'Ce joueur accepte seulement les invitations de ses amis.');
      }
      const texte = JSON.stringify({ t: 'invitation', de: info.compte.nom, deCle: info.compte.cle, jeu, code });
      for (const w of siens) { try { w.send(texte); } catch (e) { /* fermée */ } }
      repondre(true);
    }
  }

  async webSocketClose(ws, code) {
    const info = this.lireInfo(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'au revoir'); } catch (e) { /* déjà fermée */ }
    if (info.compte) this.ctx.waitUntil(this.appelComptes({ action: 'vu', cle: info.compte.cle }));
    this.prevoirCompte(ws);
  }

  async webSocketError(ws) { await this.webSocketClose(ws, 1011); }
}
