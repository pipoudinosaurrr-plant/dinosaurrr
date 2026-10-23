/* ==========================================================
   Les jeux du jour : le serveur vérifie qu'un résultat est vrai
   avant de le compter dans la série (et le Hall of Fame).
   - motdujour : la liste des essais ; le dernier doit être le mot du jour pour gagner
   - echecsjour : les coups joués ; ils doivent être légaux et finir par un mat
   ========================================================== */
import { motDuJour } from '../games/motdujour/mots.js';
import { problemeDuJour, verifierSolution } from '../games/echecsjour/problemes.js';

export const JEUX_QUOTIDIENS = new Set(['motdujour', 'echecsjour']);

// renvoie { essais, gagne } ou null si la preuve ne tient pas
export function verifierQuotidien(jeu, numero, preuve) {
  if (jeu === 'motdujour') {
    if (!Array.isArray(preuve) || !preuve.length || preuve.length > 6) return null;
    const essais = preuve.map(m => String(m || '').toLowerCase());
    if (!essais.every(m => /^[a-z]{5}$/.test(m))) return null;
    const mot = motDuJour(numero);
    const trouve = essais.indexOf(mot);
    if (trouve !== -1 && trouve !== essais.length - 1) return null;   // on s'arrête quand on a trouvé
    if (trouve === -1 && essais.length < 6) return null;             // perdu = 6 essais ratés
    return { essais: essais.length, gagne: trouve !== -1 };
  }
  if (jeu === 'echecsjour') {
    if (!preuve || !Array.isArray(preuve.coups) || preuve.coups.length > 12) return null;
    const p = problemeDuJour(numero);
    const r = verifierSolution(p, preuve.coups);
    if (!r) return null;
    const erreurs = Math.max(0, Math.min(3, Number(preuve.erreurs) || 0));
    return { essais: erreurs + 1, gagne: r.mat };
  }
  return null;
}
