---
layout: null
---
/* ==========================================================
   Service worker : rend le site installable comme une appli
   et permet de jouer SANS INTERNET.
   - à l'installation (et à chaque mise à jour du site), il télécharge d'avance
     le bureau et TOUS les jeux de _data/jeux.json, avec tout ce dont ils ont besoin
     (scripts, moteurs, styles, listes de mots…) : il lit chaque fichier pour trouver
     les autres (src=, href=, import, fetch…), donc un nouveau jeu est pris
     automatiquement, rien à ajouter ici
   - en ligne : on prend TOUJOURS la version la plus récente (réseau d'abord)
   - hors ligne : on ressert la copie gardée
   - la musique et les vidéos (/media/) ne passent pas par ici (trop lourdes)
   La version change à chaque mise à jour du site (GitHub Pages).
   ========================================================== */
const VERSION = 'site-{{ site.time | date: "%Y%m%d%H%M%S" }}';
const COEUR = ['./', 'manifest.webmanifest', 'assets/os.css', 'assets/os.js', 'assets/config.js', 'assets/icones.js', 'assets/icones-xp.js', 'assets/jeux.js',
  'assets/compte.js', 'assets/presence.js', 'assets/xp-extras.js', 'assets/appli.js', 'assets/favicon.svg', 'assets/avatars.js', 'assets/musique.js',
  'assets/progres.js', 'assets/progres-defs.js', 'games/jeu.css', 'games/arcade.js',
  'chat.html', 'compte.html', 'profil.html', 'classements.html', 'tournoi.html'];
// tous les jeux du site (la liste de Pages CMS)
const JEUX = [{% for j in site.data.jeux %}{% if j.fichier %}'{{ j.fichier }}',{% endif %}{% endfor %}];

// les fichiers que l'on garde pour le hors ligne
const GARDER = /\.(html?|js|mjs|css|json|svg|png|jpe?g|webp|gif|ico|woff2?|webmanifest)$/i;
function aGarder(url) {
  return url.origin === location.origin && !url.pathname.startsWith('/media/') && url.pathname !== '/sw.js' &&
    (url.pathname.endsWith('/') || GARDER.test(url.pathname));
}

// trouve les fichiers dont une page ou un script a besoin
function liens(texte, type) {
  const trouves = [];
  // racine : le chemin peut aussi être lu depuis la page (fetch() dans un script classique)
  const chercher = (re, racine = false) => { for (const m of texte.matchAll(re)) trouves.push({ l: m[1], racine }); };
  if (type === 'html') {
    chercher(/<script[^>]*\ssrc=["']([^"']+)["']/gi);
    chercher(/<link[^>]*\shref=["']([^"']+)["']/gi);
    chercher(/<img[^>]*\ssrc=["']([^"']+)["']/gi);
  }
  if (type === 'html' || type === 'js') {
    chercher(/\bfrom\s*["']([^"']+)["']/g);                 // import … from '…'
    chercher(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g);     // import('…')
    chercher(/\bimport\s+["']([^"']+)["']/g);               // import '…'
    chercher(/\bfetch\(\s*["']([^"']+)["']/g, type === 'js');              // fetch('…json')
    chercher(/new URL\(\s*["']([^"']+)["']/g, type === 'js');              // new URL('…', …)
  }
  if (type === 'css') chercher(/url\(\s*["']?([^"')]+)["']?\s*\)/g);
  if (type === 'manifeste') chercher(/"src"\s*:\s*"([^"]+)"/g);
  return trouves.filter(({ l }) => !/^(data:|blob:|#|mailto:|javascript:)/.test(l) && !/[${}+]/.test(l));
}

// télécharge tout (8 fichiers à la fois) ; un fichier qui n'arrive pas est repris d'une ancienne copie
async function toutTelecharger() {
  const cache = await caches.open(VERSION);
  const vus = new Set();
  let file = [...COEUR, ...JEUX].map(u => new URL(u, self.registration.scope));
  while (file.length) {
    const lot = file.splice(0, 8);
    const suite = await Promise.all(lot.map(async url => {
      url.hash = ''; url.search = '';
      const cle = url.href;
      if (vus.has(cle) || !aGarder(url)) return [];
      vus.add(cle);
      try {
        const rep = await fetch(url, { cache: 'no-cache' });
        if (!rep.ok) throw new Error(rep.status);
        await cache.put(cle, rep.clone());
        const ct = rep.headers.get('content-type') || '';
        const type = /html/.test(ct) || /\/$|\.html?$/.test(url.pathname) ? 'html' : /javascript/.test(ct) || /\.m?js$/.test(url.pathname) ? 'js' : /css/.test(ct) ? 'css' : /\.webmanifest$/.test(url.pathname) ? 'manifeste' : '';
        if (!type) return [];
        const texte = await rep.text();
        // un script classique lit ses fichiers depuis la page (la racine du site) ; un module, depuis lui-même : on essaie les deux
        const racine = new URL('./', self.registration.scope);
        return liens(texte, type).flatMap(({ l, racine: r }) => (r ? [url, racine] : [url]).map(base => { try { return new URL(l, base); } catch (e) { return null; } })).filter(Boolean);
      } catch (e) {
        // pas réussi : on garde la copie de la version d'avant, si on l'a
        const vieux = await caches.match(cle, { ignoreSearch: true });
        if (vieux) await cache.put(cle, vieux);
        return [];
      }
    }));
    file.push(...suite.flat());
  }
}

self.addEventListener('install', e => {
  e.waitUntil(toutTelecharger().then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== VERSION && k !== 'polices').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// la page demande où en est le téléchargement des jeux (affiché dans « Moi »)
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'etat-hors-ligne') return;
  e.waitUntil(caches.open(VERSION).then(async c => {
    const manquants = [];
    for (const j of JEUX) if (!(await c.match(new URL(j, self.registration.scope).href))) manquants.push(j);
    e.source.postMessage({ type: 'etat-hors-ligne', total: JEUX.length, prets: JEUX.length - manquants.length, version: VERSION });
  }));
});

function deCache(req) {
  return caches.match(req)
    .then(r => r || caches.match(req, { ignoreSearch: true }))
    .then(r => r || (req.mode === 'navigate' ? caches.match('./') : null));
}

function reseauDabord(req) {
  return new Promise(resolve => {
    let fini = false;
    // pas d'internet du tout : directement la copie
    if (self.navigator && self.navigator.onLine === false) {
      deCache(req).then(r => r ? resolve(r) : resolve(fetch(req).catch(() => horsLigne())));
      return;
    }
    // réseau trop lent (6 s) : on montre la copie en attendant
    const minuterie = setTimeout(() => deCache(req).then(r => { if (r && !fini) { fini = true; resolve(r); } }), 6000);
    fetch(req).then(rep => {
      clearTimeout(minuterie);
      if (rep && rep.ok && rep.type === 'basic' && aGarder(new URL(req.url))) { const copie = rep.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
      if (!fini) { fini = true; resolve(rep); }
    }).catch(() => {
      clearTimeout(minuterie);
      deCache(req).then(r => { if (!fini) { fini = true; resolve(r || horsLigne()); } });
    });
  });
}
const horsLigne = () => new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.startsWith('/media/') || url.pathname === '/sw.js') return;
    e.respondWith(reseauDabord(req));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // les polices : une fois chargées, on les garde
    e.respondWith(caches.open('polices').then(c => c.match(req).then(r => r || fetch(req).then(rep => { if (rep.ok || rep.type === 'opaque') c.put(req, rep.clone()); return rep; }))));
  }
  // le reste (serveur de jeux, comptes…) passe tel quel
});
