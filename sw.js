---
layout: null
---
/* ==========================================================
   Service worker : rend le site installable comme une appli
   et permet de le rouvrir sans internet (dernière version vue).
   - en ligne : on prend TOUJOURS la version la plus récente (réseau d'abord)
   - hors ligne : on ressert ce qui a déjà été chargé
   - la musique et les vidéos ne passent pas par ici (lecture en morceaux)
   La version change à chaque mise à jour du site (GitHub Pages).
   ========================================================== */
const VERSION = 'site-{{ site.time | date: "%Y%m%d%H%M%S" }}';
const COEUR = ['./', 'assets/os.css', 'assets/os.js', 'assets/config.js', 'assets/icones.js', 'assets/icones-xp.js', 'assets/jeux.js',
  'assets/compte.js', 'assets/presence.js', 'assets/xp-extras.js', 'assets/appli.js', 'assets/favicon.svg', 'assets/avatars.js',
  'assets/progres.js', 'assets/progres-defs.js', 'games/jeu.css', 'games/arcade.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(COEUR.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== VERSION && k !== 'polices').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function reseauDabord(req) {
  return new Promise(resolve => {
    let fini = false;
    const deCache = () => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(r => r || (req.mode === 'navigate' ? caches.match('./') : null));
    // réseau trop lent (8 s) : on montre la copie en attendant
    const minuterie = setTimeout(() => deCache().then(r => { if (r && !fini) { fini = true; resolve(r); } }), 8000);
    fetch(req).then(rep => {
      clearTimeout(minuterie);
      if (rep && rep.ok && rep.type === 'basic') { const copie = rep.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
      if (!fini) { fini = true; resolve(rep); }
    }).catch(() => {
      clearTimeout(minuterie);
      deCache().then(r => { if (!fini) { fini = true; resolve(r || new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })); } });
    });
  });
}

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
