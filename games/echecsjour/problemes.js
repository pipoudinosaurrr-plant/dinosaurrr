/* Échecs du jour : un problème par jour (le même pour tout le monde)
   La liste est dans liste.json (fabriquée à partir de vraies parties jouées par l'ordinateur,
   en gardant seulement les positions où il existe UN SEUL premier coup qui mate en 2 ou en 3).
   Pour en ajouter : mets-les À LA FIN de la liste (sinon les problèmes des jours suivants changent). */
import LISTE from './liste.json' with { type: 'json' };
export { verifierSolution } from './regles.js';
export const PROBLEMES = LISTE;
export const problemeDuJour = n => PROBLEMES[((n - 1) % PROBLEMES.length + PROBLEMES.length) % PROBLEMES.length];
