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

    const cercle = url.pathname.match(/^\/cercle\/([A-Z0-9]{4})$/);
    const autre = url.pathname.match(/^\/jeu\/([a-z0-9]+)\/([A-Z0-9]{4})$/);
    if (!cercle && !(autre && JEUX[autre[1]])) return new Response('Introuvable', { status: 404 });
    if (requete.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket attendu', { status: 426 });
    if (!origineAutorisee(requete.headers.get('Origin'))) return new Response('Origine refusée', { status: 403 });

    if (cercle) return env.SALLES.get(env.SALLES.idFromName('cercle:' + cercle[1])).fetch(requete);
    return env.TABLES.get(env.TABLES.idFromName(autre[1] + ':' + autre[2])).fetch(requete);
  }
};

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
    });
  }

  async fetch() {
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
      id: info.id, nom: info.nom, couleur: info.couleur, victoires: info.victoires || 0, hote: info.id === hote
    }));
    const bots = this.bots.map(b => ({ ...b, victoires: this.victoiresBots[b.id] || 0 }));
    this.diffuser({ t: 'salle', phase: this.phase, hote, joueurs: [...humains, ...bots], max: M.MAX_JOUEURS });
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
        let nom = nettoyerNom(msg.nom);
        const pris = new Set([...this.joueursHumains().filter(c => c.info.id !== info.id).map(c => c.info.nom), ...this.bots.map(b => b.nom)]);
        if (pris.has(nom)) {
          let i = 2;
          while (pris.has(nom.slice(0, 12) + i)) i++;
          nom = nom.slice(0, 12) + i;
        }
        info.nom = nom;
        if (!info.couleur) info.couleur = this.couleurLibre(info.id);
        this.ecrireInfo(ws, info);
        // trop de monde avec les bots : on retire des bots
        while (this.bots.length && this.joueursHumains().length + this.bots.length > M.MAX_JOUEURS) this.bots.pop();
        await this.enregistrerBots();
        this.envoyer(ws, { t: 'bienvenue', id: info.id, nom: info.nom, couleur: info.couleur });
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
    });
  }

  choisirJeu(id) {
    if (id && JEUX[id]) { this.jeu = id; this.mod = JEUX[id]; }
  }

  async fetch(requete) {
    if (!this.mod) {
      const m = new URL(requete.url).pathname.match(/^\/jeu\/([a-z0-9]+)\//);
      this.choisirJeu(m && m[1]);
      if (!this.mod) return new Response('Jeu inconnu', { status: 404 });
      await this.ctx.storage.put('jeu', this.jeu);
    }
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
    const humains = this.joueursHumains().map(({ info }) => ({ id: info.id, nom: info.nom, couleur: info.couleur, victoires: info.victoires || 0, hote: info.id === hote }));
    const bots = this.mod.bots ? this.bots.map(b => ({ ...b, victoires: this.victoiresBots[b.id] || 0 })) : [];
    this.diffuser({ t: 'salle', jeu: this.jeu, phase: this.phase, hote, joueurs: [...humains, ...bots], max: this.mod.max, min: this.mod.min, bots: !!this.mod.bots });
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
        let nom = nettoyerNom(msg.nom);
        const pris = new Set([...this.joueursHumains().filter(c => c.info.id !== info.id).map(c => c.info.nom), ...this.bots.map(b => b.nom)]);
        if (pris.has(nom)) { let i = 2; while (pris.has(nom.slice(0, 12) + i)) i++; nom = nom.slice(0, 12) + i; }
        info.nom = nom;
        if (!info.couleur) info.couleur = this.couleurLibre(info.id);
        this.ecrireInfo(ws, info);
        while (this.bots.length && this.joueursHumains().length + this.bots.length > this.mod.max) this.bots.pop();
        await this.ctx.storage.put('bots', this.bots);
        this.envoyer(ws, { t: 'bienvenue', id: info.id, nom: info.nom, couleur: info.couleur });
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
