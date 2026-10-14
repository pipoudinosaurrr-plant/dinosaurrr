/* Présence vue depuis un jeu.
   Dans une fenêtre du site : on utilise la connexion de la page (une seule par onglet).
   Jeu ouvert tout seul dans un onglet : on charge assets/presence.js ici. */

let promesse = null;

function charger(chemin) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL(chemin, import.meta.url).href;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

// le compte du joueur (celui de la page du site si le jeu est dans une fenêtre)
export async function obtenirCompte() {
  try {
    if (window.parent !== window && window.parent.DinoCompte) return window.parent.DinoCompte;
  } catch (e) { /* rien */ }
  if (!window.DinoCompte) { try { await charger('../../assets/compte.js'); } catch (e) { return null; } }
  return window.DinoCompte || null;
}

// branche le champ « pseudo » d'un jeu sur le compte : connecté = pseudo du compte, non modifiable
export function brancherPseudo(champ, valeurInvite) {
  obtenirCompte().then(c => {
    if (!c) return;
    const etiquette = champ.id ? document.querySelector(`label[for="${champ.id}"]`) : null;
    const texteEtiquette = etiquette ? etiquette.textContent : '';
    const arreter = c.ecouter(compte => {
      if (compte && c.jeton) {
        champ.value = compte.nom;
        champ.readOnly = true;
        champ.title = 'Pseudo de ton compte';
        champ.classList.add('pseudo-compte');
        if (etiquette) etiquette.textContent = 'Connecté en tant que';
      } else {
        if (champ.readOnly && valeurInvite) champ.value = valeurInvite();
        champ.readOnly = false;
        champ.title = '';
        champ.classList.remove('pseudo-compte');
        if (etiquette) etiquette.textContent = texteEtiquette;
      }
    });
    window.addEventListener('pagehide', arreter, { once: true });
  });
}

// jeton à envoyer au serveur de jeu (ou '')
export async function jetonCompte() {
  const c = await obtenirCompte();
  return (c && c.jeton) || '';
}

function obtenir() {
  if (!promesse) {
    promesse = new Promise(resolve => {
      try {
        if (window.parent !== window && window.parent.DinoPresence) return resolve(window.parent.DinoPresence);
      } catch (e) { /* page parente d'un autre site */ }
      if (window.DinoPresence) return resolve(window.DinoPresence);
      charger('../../assets/compte.js')
        .then(() => charger('../../assets/presence.js'))
        .then(() => resolve(window.DinoPresence || null), () => resolve(null));
    });
  }
  return promesse;
}

// fn(n) : n = nombre de personnes sur le site (toi compris), ou null si inconnu
export function suivrePresence(fn) {
  obtenir().then(p => {
    if (!p) return fn(null);
    const arreter = p.ecouter(m => { if (m.t === 'compte') fn(m.n); });
    window.addEventListener('pagehide', arreter, { once: true });
  });
}

// fn(liste) : les parties ouvertes du site [{ jeu, code, hote, n, max, phase }]
export function suivreParties(fn) {
  obtenir().then(p => {
    if (!p) return fn([]);
    const arreter = p.ecouter(m => { if (m.t === 'parties') fn(m.liste || []); });
    window.addEventListener('pagehide', arreter, { once: true });
  });
}

// renvoie le nombre de personnes prévenues (ou null)
export async function annoncerPartie(jeu, code, nom) {
  const p = await obtenir();
  return p ? p.annoncer(jeu, code, nom) : null;
}

// petit texte prêt à afficher
export function texteEnLigne(n) {
  if (n === null || n === undefined) return '';
  const autres = Math.max(0, n - 1);
  if (autres === 0) return 'Personne d’autre sur le site pour l’instant';
  return autres === 1 ? '1 autre personne en ligne sur le site' : `${autres} autres personnes en ligne sur le site`;
}

const echapper = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Remplit la boîte « Parties ouvertes » d'un jeu. rejoindre(code) est appelé au clic.
export function brancherPartiesOuvertes(boite, jeu, rejoindre) {
  const ul = boite.querySelector('ul');
  ul.addEventListener('click', e => {
    const b = e.target.closest('button[data-code]');
    if (b) rejoindre(b.dataset.code);
  });
  suivreParties(liste => {
    const miennes = liste.filter(p => p.jeu === jeu);
    boite.hidden = !miennes.length;
    ul.innerHTML = miennes.map(p => {
      const attend = p.phase === 'salon' && p.n < p.max;
      return `<li>
        <i class="${attend ? 'attend' : ''}"></i>
        <span class="nom">Partie de ${echapper(p.hote)}</span>
        <span class="tag">${p.phase === 'jeu' ? 'EN COURS' : `${p.n}/${p.max}`}</span>
        <button class="btn petit${attend ? ' primaire' : ''}" data-code="${echapper(p.code)}">${attend ? 'Rejoindre' : 'Regarder'}</button>
      </li>`;
    }).join('');
  });
}
