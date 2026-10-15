/* ==========================================================
   Pouvoirs admin en pleine partie (réservés au compte du propriétaire)
   Utilisé à la fois par le mode solo (dans le navigateur) et par le serveur.
   - Chaque jeu peut avoir ses propres pouvoirs : moteur.admin.commandes / faire
   - Tous les jeux ont « Gagner la partie »
   - En ligne, le serveur vérifie le compte et prévient tous les joueurs
   ========================================================== */
import { classer, indexDe } from './jeux/outils.js';

export const CLE_ADMIN = 'pipou_dinosaur';

const COMMUNES = [{ id: 'victoire', nom: 'Gagner la partie', icone: '🏆', texte: 'a gagné la partie' }];

// pouvoirs des jeux dont le moteur n'a pas besoin d'être modifié
const SIMPLES = {
  quiz: {
    commandes: [
      { id: 'pts', nom: '+500 points', icone: '➕', texte: '+500 points' },
      { id: 'reponse', nom: 'Voir la bonne réponse', icone: '👀', texte: 'a regardé la bonne réponse' }
    ],
    faire(e, id, cmd) {
      if (cmd === 'pts') { e.scores[id] += 500; return {}; }
      if (cmd === 'reponse') {
        const q = e.questions[e.n];
        if (!q) return null;
        return { prive: 'Bonne réponse : ' + q.choix[q.bonne] };
      }
      return null;
    }
  },
  course: {
    commandes: [{ id: 'pts', nom: '+3 points', icone: '➕', texte: '+3 points' }],
    faire(e, id, cmd) { if (cmd === 'pts') { e.points[id] += 3; return {}; } return null; }
  },
  dessin: {
    commandes: [
      { id: 'pts', nom: '+100 points', icone: '➕', texte: '+100 points' },
      { id: 'mot', nom: 'Voir le mot', icone: '👀', texte: 'a regardé le mot' }
    ],
    faire(e, id, cmd) {
      if (cmd === 'pts') { e.scores[id] += 100; return {}; }
      if (cmd === 'mot') return e.mot ? { prive: 'Le mot : ' + e.mot } : null;
      return null;
    }
  }
};

const pouvoirs = mod => mod.admin || SIMPLES[mod.id] || { commandes: [], faire: () => null };

// la liste à afficher dans le panneau ⚡
export function commandesAdmin(mod) {
  return [...pouvoirs(mod).commandes, ...COMMUNES].map(({ id, nom, icone }) => ({ id, nom, icone }));
}

// victoire « magique » pour les jeux qui n'ont pas la leur
function victoireGenerique(e, id) {
  e.fini = true;
  e.gagnant = indexDe(e, id);
  e.classement = classer(e.joueurs, j => (j.id === id ? 1 : 0), j => (j.id === id ? 'Victoire ⚡' : 'Défaite'));
}

// applique un pouvoir ; renvoie { texte, prive } ou null si impossible
export function appliquerAdmin(mod, e, id, cmd, t) {
  if (!e || e.fini || indexDe(e, id) < 0 || typeof cmd !== 'string') return null;
  const p = pouvoirs(mod);
  if (cmd === 'victoire') {
    if (p.victoire) p.victoire(e, id, t); else victoireGenerique(e, id);
    e.triche = true;
    return { texte: COMMUNES[0].texte };
  }
  const c = p.commandes.find(x => x.id === cmd);
  if (!c) return null;
  const r = p.faire(e, id, cmd, t);
  if (!r) return null;
  e.triche = true;
  return { texte: c.texte || c.nom, prive: r.prive || '' };
}
