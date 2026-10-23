/* Ajoute des problèmes à l'Échecs du jour (games/echecsjour/liste.json)
   Lance : node outils/echecs-du-jour.mjs 50
   L'ordinateur joue des parties ; on garde les positions où UN SEUL premier coup mate en 2 (ou en 3).
   Les nouveaux problèmes sont ajoutés À LA FIN (les jours déjà passés ne changent pas). Ça prend du temps ! */
import fs from 'fs';
import { coupsLegaux, _faire, positionDepart, meilleurCoup } from '../games/multi/jeux/echecs.js';
import { matEn, coupsGagnants, texteCoup } from '../games/echecsjour/regles.js';

const FICHIER = new URL('../games/echecsjour/liste.json', import.meta.url);
const liste = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
const deja = new Set(liste.map(p => p.fen));
const voulu = Number(process.argv[2]) || 20;
const VALEUR = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
const fen = p => p.b.join('') + (p.tour ? 'b' : 'w');
let ajoutes = 0;
while (ajoutes < voulu) {
  const p = { b: positionDepart(), tour: 0, roque: 'KQkq', ep: -1, demi: 0 };
  const niv = [1, 1, 2, 2][Math.floor(Math.random() * 4)];
  let dansCettePartie = 0;
  for (let k = 0; k < 160 && ajoutes < voulu; k++) {
    const legaux = coupsLegaux(p);
    if (!legaux.length || p.demi > 60) break;
    let mat = 0, nb = 0;
    for (const x of p.b) if (x !== '.') { nb++; const v = VALEUR[x.toUpperCase()]; mat += (x === x.toUpperCase() ? v : -v) * (p.tour === 0 ? 1 : -1); }
    if (k >= 16 && dansCettePartie < 2 && mat <= 13 && nb >= 7 && !deja.has(fen(p))) {
      const q = { b: [...p.b], tour: p.tour, roque: '', ep: -1, demi: 0 };
      if (!matEn(q, 1)) {
        const g2 = coupsGagnants(q, 2);
        let pb = null;
        if (g2.length === 1) pb = { fen: fen(q), n: 2, sol: texteCoup(g2[0]) };
        else if (!g2.length && legaux.length <= 40) { const g3 = coupsGagnants(q, 3); if (g3.length === 1) pb = { fen: fen(q), n: 3, sol: texteCoup(g3[0]) }; }
        if (pb) { liste.push(pb); deja.add(pb.fen); ajoutes++; dansCettePartie++; fs.writeFileSync(FICHIER, JSON.stringify(liste)); console.log(`${ajoutes}/${voulu} (mat en ${pb.n})`); }
      }
    }
    const m = Math.random() < 0.12 ? legaux[Math.floor(Math.random() * legaux.length)] : meilleurCoup(p, niv);
    _faire(p, legaux.find(x => x.de === m.de && x.a === m.a && x.promo === m.promo) || legaux[0]);
  }
}
console.log('Fini :', liste.length, 'problèmes dans la liste.');
