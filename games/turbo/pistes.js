/* ==========================================================
   Turbo — le tracé des circuits (partagé par le jeu et le serveur)
   Chaque plan décrit la route morceau par morceau :
   droite(n), courbe(n, force, montée), colline(n, montée), ondulations(), esses(), bosses(), descenteFin()
   (n = nombre de segments ; force > 0 : virage à droite).
   Le serveur s'en sert pour connaître la longueur des circuits (courses en ligne).
   ========================================================== */
export const SEG = 200;                  // longueur d'un segment
export const VITESSE_MAX = SEG * 60;     // 12 000 par seconde
export const NITRO_FACTEUR = 1.28;
export const TOURS = 3;

export const PLANS = {
  plage(R) {
    R.droite(40); R.courbe(60, 2, 0); R.colline(40, 20); R.droite(50);
    R.courbe(80, -3, 30); R.ondulations(); R.courbe(60, 2, -20); R.droite(80);
    R.esses(); R.colline(60, 40); R.courbe(100, -2, -40); R.droite(60);
    R.courbe(50, 4, 0); R.droite(40); R.courbe(70, -2, 20); R.bosses(); R.descenteFin();
  },
  foret(R) {
    R.droite(30); R.courbe(50, 4, 20); R.courbe(50, -4, -20); R.colline(50, 60);
    R.esses(); R.courbe(80, 5, -40); R.droite(40); R.bosses(); R.courbe(60, -5, 30);
    R.courbe(60, 3, -30); R.ondulations(); R.courbe(40, -6, 0); R.droite(40);
    R.courbe(70, 4, 50); R.courbe(70, -4, -50); R.esses(); R.descenteFin();
  },
  neon(R) {
    R.droite(60); R.courbe(40, 6, 0); R.droite(60); R.courbe(40, -6, 30); R.esses();
    R.droite(80); R.colline(50, -40); R.courbe(60, 5, 40); R.courbe(30, -6, 0);
    R.courbe(30, 6, 0); R.droite(70); R.bosses(); R.courbe(80, -4, -30); R.esses();
    R.courbe(50, 6, 20); R.droite(40); R.descenteFin();
  }
};
// vitesse des adversaires (fraction de la vitesse max) : du plus lent au plus rapide
export const IA = { plage: [0.84, 0.94], foret: [0.88, 0.97], neon: [0.91, 0.99] };
export const NOMS_CIRCUITS = { plage: 'Côte d’Azur', foret: 'Forêt noire', neon: 'Néon City' };

// le même découpage que le jeu (ajouterRoute fait entree + tenue + sortie segments)
export function nombreSegments(id) {
  let n = 0;
  const route = (a, b, c) => { n += Math.ceil(a) + Math.ceil(b) + Math.ceil(c); };
  const R = {
    droite(k) { route(k / 4, k / 2, k / 4); },
    courbe(k) { route(k / 4, k / 2, k / 4); },
    colline(k) { route(k / 4, k / 2, k / 4); },
    ondulations() { for (let i = 0; i < 5; i++) route(25, 25, 25); },
    esses() { for (let i = 0; i < 5; i++) route(25, 25, 25); },
    bosses() { for (let i = 0; i < 8; i++) route(10, 10, 10); },
    descenteFin() { route(100, 100, 100); }
  };
  PLANS[id](R);
  return n;
}
export const longueurCircuit = id => nombreSegments(id) * SEG;
