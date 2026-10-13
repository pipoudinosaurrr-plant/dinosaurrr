/* Petits outils partagés par les moteurs des jeux à plusieurs */

export function melanger(liste) {
  const t = [...liste];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

export const hasard = (min, max) => min + Math.random() * (max - min);
export const entier = (min, max) => Math.floor(hasard(min, max + 1));

export function copieJoueurs(liste) {
  return liste.map(j => ({ id: j.id, nom: j.nom, couleur: j.couleur, bot: !!j.bot }));
}

export const indexDe = (e, id) => e.joueurs.findIndex(j => j.id === id);

// Classement : valeur(j) plus grande = mieux ; texte(j) = ce qu'on affiche
export function classer(joueurs, valeur, texte) {
  const tri = [...joueurs].sort((a, b) => valeur(b) - valeur(a));
  let place = 0, avant = null;
  return tri.map((j, i) => {
    const v = valeur(j);
    if (v !== avant) { place = i + 1; avant = v; }
    return { id: j.id, nom: j.nom, couleur: j.couleur, bot: !!j.bot, place, score: texte(j) };
  });
}

// Pour comparer des mots sans se soucier des accents ni des majuscules
export function normaliser(texte) {
  return String(texte || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function distance(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}
