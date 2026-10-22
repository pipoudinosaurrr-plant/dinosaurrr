# dinosaurrr

Le meilleur site du monde frr fait par moi btw aller vzy va sur le site je sais ou t'habite -> dinosaurrr.com
Ce fichier explique comment mettre le site en ligne sur ton domaine, brancher ton adresse mail et écrire des articles.

---

## Ce qu'il y a dans le dossier

| Fichier / dossier | À quoi ça sert |
| --- | --- |
| `index.html` | La page d'accueil (bureau sur ordi, appli sur téléphone) |
| `_data/site.json` | **Tes réglages** : nom du site, pseudo, slogan, présentation, mail, fond d'écran par défaut (Pages CMS « Réglages du site ») |
| `_data/jeux.json` | La liste des jeux (Pages CMS « Jeux ») |
| `_data/apparence.json`, `_data/textes.json` | L'apparence et les phrases du site (Pages CMS « Apparence » et « Textes du site ») |
| `_data/musiques.json` + `media/musiques/` | Les musiques du lecteur (Pages CMS « Musiques du lecteur ») |
| `_data/filtre-chat.json` | Les mots interdits du chat et des pseudos (Pages CMS « Filtre du chat ») |
| `_data/commandes.json` | Tes commandes secrètes pour l'Invite de commandes (Pages CMS « Commandes secrètes ») |
| `assets/config.js`, `assets/jeux.js` | Fabriqués automatiquement à partir des fichiers `_data/` (ne pas les modifier) |
| `assets/coffre.json`, `outils/coffre.html` | Le coffre secret chiffré, et la page qui le fabrique |
| `assets/icones.js` | Les icônes (traits fins, style pro) |
| `assets/os.js`, `assets/os.css` | Le « système » : fenêtres, barre des tâches, version mobile |
| `assets/article.css` | Le style des pages d'articles ouvertes seules |
| `games/` | Un fichier par jeu + `modele.html` pour créer les tiens |
| `_posts/` | Les articles du blog (un fichier `.md` par article) |
| `blog/` | La page `/blog/` qui liste tous les articles |
| `_layouts/` | Le modèle des pages d'articles |
| `media/` | Les images que tu ajoutes dans tes articles |
| `.pages.yml` | Les réglages de l'éditeur Pages CMS |
| `_config.yml`, `posts.json` | La « mécanique » du blog (pas besoin d'y toucher) |
| `CNAME` | Le nom de domaine du site (à changer si tu prends une autre extension que `.com`) |
| `serveur/`, `wrangler.jsonc`, `package.json` | Le serveur des jeux multijoueurs (il tourne chez Cloudflare, voir étape 8) |
| `games/cercle/moteur.js` | Les règles du Cercle, utilisées à la fois par le mode solo et par le serveur |
| `games/multi/` | Le salon commun des autres jeux à plusieurs (`salon.js`) et leurs règles (`jeux/`) |
| `games/multi/jeux/questions.json` | Les questions du Quiz battle (Pages CMS « Questions du quiz ») |
| `games/multi/jeux/mots.json` | Les mots de Dessine et devine (Pages CMS « Mots à dessiner ») |
| `games/pendu-mots.json` | Les mots du Pendu (Pages CMS « Mots du Pendu ») |

**Progression des joueurs** (`assets/progres-defs.js` : niveaux, titres, avatars, succès, défis du jour, classements — ajoute une ligne pour un nouveau succès ou défi) : XP à chaque partie (solo limité à 300 XP par jour), défi du jour, succès, avatars à débloquer, Hall of Fame (`classements.html`). Les jeux envoient leur fin de partie avec `DinoProgres.fin(jeu, { score, gagne })` (`assets/progres.js`).

**Chat** (`chat.html`, compte obligatoire, filtre de mots à compléter dans `MOTS_FILTRES` de `serveur/index.js`), **Tournois** (`tournoi.html`, résultats automatiques), **Lecteur de musique** (`assets/musique.js` : tes musiques envoyées dans Pages CMS, puis des morceaux chiptune originaux générés en direct), statistiques du site et bannissement dans la console admin.

**Droits admin** (compte `Pipou_Dinosaur` seulement, vérifié par le serveur) : bouton ⚡ Admin en pleine partie dans tous les jeux à plusieurs (`games/multi/admin.js`, et `admin` dans chaque moteur), et onglet ⚡ Admin dans « Mon compte » (comptes, victoires, mots de passe, message à tout le site, fermer une partie). En ligne, les autres joueurs voient les pouvoirs utilisés et la partie ne compte pas dans les victoires.

Les jeux à plusieurs (en ligne ou contre l'ordinateur) : Le Cercle, Arène.io (une seule grande arène pour tout le site, moteur dans `games/dinoio/moteur.js`, objet `Arene` du serveur), Puissance 4, Morpion géant, Bataille navale, Pong, Tron, Course de réflexes, Quiz battle, Dessine et devine, Échecs, Air hockey (les deux derniers se jouent aussi à 2 sur le même écran), Uno (2 à 6 joueurs, moteur dans `games/multi/jeux/uno.js`).

**Bomberman** (2 à 4 joueurs, moteur dans `games/multi/jeux/bomberman.js`, bots qui esquivent les explosions).

**Appli à installer** : `manifest.webmanifest`, `sw.js` (hors ligne, toujours la dernière version quand on est connecté), `assets/appli.js` (bouton « Installer » dans Moi sur téléphone et dans le menu démarrer), icônes dans `assets/appli/`.

**Profils publics** : `profil.html?nom=Pseudo` (aussi `#profil/Pseudo`), ouverts en cliquant sur un pseudo (Hall of Fame, chat, contacts). Le Hall of Fame a un classement **de la semaine** (remis à zéro le lundi) et affiche le champion de la semaine d'avant.

**Filtre du chat** : la liste est dans `_data/filtre-chat.json` (Pages CMS « Filtre du chat »), le code dans `serveur/filtre.js`. Il bloque aussi les pseudos insultants.

Nouveaux jeux solo : **Flipper** (`games/flipper.html` ; la physique et les règles sont dans `games/flipper/moteur.js` : bille, murs arrondis, flippers qui tournent vraiment, 720 calculs par seconde), **Traverse la route** (`games/route.html`) et **Tuyaux** (`games/tuyaux.html`).

Les jeux en solo : Turbo (course de voitures 3D), Blaster (shooter spatial), Aventure (plateformes), Blocs, Serpent, Casse-briques, Runner, Flap, 2048, Pendu, Solitaire, Démineur, Pluie de météorites, Data Clicker, L'histoire du jeu vidéo, Test de réflexes, Le bouton qui fuit, Générateur de pseudo et Paint.

Les jeux d'arcade (Turbo, Blaster, Aventure, Blocs, Serpent, Casse-briques, Runner, Flap, 2048) partagent `games/arcade.js` : clavier (flèches, WASD/ZQSD), boutons tactiles sur téléphone, menus, pause, records et sons.

---

## 1. Mettre le site sur GitHub

1. Crée un compte gratuit sur [github.com](https://github.com).
2. Clique sur **+ → New repository**.
   - Nom : `dinosaurrr` (ou ce que tu veux)
   - Coche **Public** (obligatoire pour GitHub Pages gratuit)
   - Clique **Create repository**.
3. Sur la page du dépôt, clique **uploading an existing file**, puis glisse **tout le contenu** du dossier (pas le dossier lui-même, ce qu'il y a dedans). Clique **Commit changes**.

> **Attention :** le fichier `.pages.yml` commence par un point, donc il est caché sur Mac.
> Dans le Finder, appuie sur **Cmd + Maj + .** pour voir les fichiers cachés avant de glisser.
> S'il manque quand même, pas grave : Pages CMS te proposera de le créer (étape 5), ou crée-le sur GitHub avec **Add file → Create new file** en copiant le contenu à la fin de ce guide.

## 2. Allumer GitHub Pages

1. Dans ton dépôt : **Settings → Pages**.
2. **Source** : *Deploy from a branch*. Branche : **main**, dossier : **/ (root)**. Clique **Save**.
3. Attends 1 à 2 minutes. Le site est en ligne sur une adresse en `…github.io` (certains liens ne marcheront qu'une fois ton vrai domaine branché).

## 3. Brancher ton nom de domaine

Si ton domaine n'est pas en `.com`, ouvre le fichier `CNAME` et remplace `dinosaurrr.com` par ton vrai domaine (et pareil dans `_data/site.json` et `_config.yml`).

**D'abord sur GitHub** (dans cet ordre, c'est important) :

1. **Settings → Pages → Custom domain** : écris ton domaine (ex. `dinosaurrr.com`) et clique **Save**.

**Ensuite chez ton registrar** (Cloudflare, Porkbun, OVHcloud…), dans la gestion **DNS** du domaine :

1. Supprime les éventuels enregistrements **A** et **AAAA** déjà présents pour le domaine et pour `www` (page « parking »).
2. Ajoute 4 enregistrements **A** pour le domaine (nom vide ou `@`) :

   | Type | Nom | Valeur |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |

3. Ajoute un **CNAME** : nom `www` → valeur `TON-PSEUDO-GITHUB.github.io`
4. **Ne touche pas aux enregistrements MX et TXT** : ceux-là, c'est pour le mail (étape 4).
5. Attends (quelques minutes à 24 h). Quand GitHub affiche une coche verte dans **Settings → Pages**, coche **Enforce HTTPS**.

> **Chez Cloudflare :** mets ces lignes en **« DNS only »** (nuage gris), pas en nuage orange, sinon le HTTPS de GitHub peut bloquer.
>
> **Conseillé :** dans **les réglages de ton compte GitHub → Pages → Add a domain**, vérifie aussi ton domaine (GitHub te donne une ligne TXT à ajouter). Ça empêche quelqu'un d'autre d'utiliser ton domaine sur GitHub.

## 4. Ton adresse mail avec iCloud+

1. Sur l'iPhone : **Réglages → [ton nom] → iCloud → Mail iCloud → Domaine de messagerie personnalisé**
   (ou sur un ordi : [icloud.com/icloudplus](https://www.icloud.com/icloudplus) → Domaine de messagerie personnalisé).
2. Choisis **utiliser un domaine que tu possèdes** et écris ton domaine.
3. Crée ton adresse (ex. `pipou@dinosaurrr.com`).
4. Apple t'affiche des lignes à ajouter dans les DNS de ton registrar : en général **2 MX**, **1 ou 2 TXT** et **1 CNAME**. Copie-les **exactement** comme Apple les montre.
   - S'il y a déjà d'autres MX, supprime-les (sinon les mails partent au mauvais endroit).
   - Désactive aussi une éventuelle redirection d'e-mails chez le registrar.
5. Reviens sur l'iPhone et appuie sur **Terminer la configuration**. Les mails arrivent dans l'app **Mail**.

Les enregistrements du site (A, CNAME `www`) et ceux du mail (MX, TXT, CNAME `sig1._domainkey`) vivent ensemble sans problème.

## 5. Écrire un article (avec un vrai éditeur)

1. Va sur [app.pagescms.org](https://app.pagescms.org) et connecte-toi avec GitHub.
2. Installe l'appli Pages CMS sur ton dépôt quand il te le demande.
3. Ouvre le dépôt → **Articles du blog** → **Add an entry** (ajouter).
4. Remplis :
   - **Titre** et **date**
   - **Catégorie** (Annonce, Projets, Jeux, Tech, Tutoriels, Divers) : elle sert aux filtres du blog
   - **Résumé** : deux lignes affichées dans la liste des articles (si tu le laisses vide, le début de l'article est utilisé)
   - **Image de couverture** si tu veux
   - puis écris ton article dans l'éditeur (gras, titres, listes, images, liens…)
5. **Save**. GitHub met le site à jour tout seul en 1 à 2 minutes. Le temps de lecture est calculé automatiquement.

Chaque article existe à trois endroits : dans la fenêtre Blog du bureau, dans l'onglet Blog sur téléphone, et en page seule (bien pour le partager ou pour Google). La page `/blog/` liste tous les articles.

Astuce : dans un article, un lien vers `/#jeu/meteorites` ouvre directement le jeu, sur ordi comme sur téléphone (remplace `meteorites` par le petit nom d'un autre jeu, visible dans Pages CMS « Jeux »).

## 6. Modifier le site sans coder (Pages CMS)

Tout se fait sur **app.pagescms.org** (marche aussi sur téléphone). Dans le menu de gauche :

| Rubrique | Ce que tu peux changer |
| --- | --- |
| **Articles du blog** | Écrire, modifier, supprimer des articles |
| **Réglages du site** | Nom, pseudo, slogan, présentation, message de bienvenue, fond d'écran par défaut, adresse mail |
| **Jeux** | Titre, description, icône, ordre (glisser), icône sur le bureau, badge « Nouveau », cacher un jeu |
| **Questions du quiz** | Ajouter / modifier / supprimer des questions (bonne réponse + 3 mauvaises) |
| **Mots à dessiner** | La liste des mots de Dessine et devine |
| **Musiques du lecteur** | **Add an entry** → titre, artiste, puis bouton du fichier → **Upload** ton mp3. Elles passent en premier dans le Lecteur de musique (glisser pour changer l'ordre). mp3 conseillé, moins de 15 Mo par musique, et seulement des musiques que tu as le droit de partager |
| **Commandes secrètes** | Ce qui s'affiche quand on tape un mot dans l'Invite de commandes (et ce qui s'ouvre ensuite) |
| **Apparence** | Thème du bureau (bleu, olive, argent, noir), couleur de sélection, photo de profil, bouton démarrer (texte + image), tes propres fonds d'écran, icônes du bureau (lesquelles, ordre, noms), taille du texte, pixelisation, couleurs de la version téléphone, sons et écran de veille par défaut |
| **Textes du site** | Les phrases des bulles et des messages, l'écran bleu, l'Invite de commandes, le coffre… (`{nom}` = nom du site, `{pseudo}` = ton pseudo) |
| **Filtre du chat** | Les mots bloqués dans le chat et les pseudos : un mot par ligne, `mot*` pour tous les mots qui commencent pareil |
| **Coffre secret** | Le contenu du coffre (fabriqué d'abord sur `dinosaurrr.com/outils/coffre.html`) |

Les icônes du bureau choisies dans **Apparence** sont celles de départ : ensuite chaque visiteur range son propre bureau (clic droit sur le bureau → « Ajouter / enlever des icônes… », clic droit sur une icône → Renommer / Supprimer, glisser pour ranger, glisser un jeu depuis la fenêtre Jeux ou le menu démarrer pour l'ajouter, icônes supprimées dans la Corbeille). Son choix est gardé dans son navigateur.

Clique sur **Save** : le site se met à jour en 1 à 2 minutes. Les questions du quiz et les mots à dessiner servent aussi au serveur des parties en ligne : Cloudflare le remet à jour tout seul après chaque **Save**.

## 7. Personnaliser le code

- **Pour modifier n'importe quel fichier** : sur la page de ton dépôt GitHub, appuie sur la touche **.** (point). Un éditeur de code s'ouvre dans le navigateur (github.dev). Modifie, puis dans l'onglet « Source Control » (à gauche), écris un message et clique **Commit & Push**.
- **Ajouter un jeu** :
  1. copie `games/modele.html` → par exemple `games/mon-jeu.html` et code ton jeu dedans (le style noir du site est déjà branché via `jeu.css`) ;
  2. dans Pages CMS → **Jeux**, ajoute une entrée avec le chemin `games/mon-jeu.html`.
- **Les petits plus du bureau** (fichier `assets/xp-extras.js`) : Invite de commandes (tape `aide`), Bloc-notes, Exécuter… (menu démarrer), Date et heure (clic sur l'horloge), écrans de veille (onglet dans Propriétés d'affichage), sons (clic sur le haut-parleur pour couper), sélection au lasso. Il y a aussi des surprises cachées : essaie `crash` dans Exécuter, ou le code Konami (↑ ↑ ↓ ↓ ← → ← → B A) sur le bureau.
- **Changer le fond d'écran du bureau** : clic droit sur le bureau → **Propriétés** (ou menu démarrer → Fond d'écran). Huit fonds en pixel art avec le dino (colline, coucher de soleil, nuit et aurore, plage, volcan, hiver, espace, rétro 80) + bleu et noir unis. Les images sont dans `assets/fonds/` (400 × 250 pixels, agrandies sans lissage).

Sur GitHub, tu peux modifier n'importe quel fichier directement : ouvre-le, clique sur l'icône crayon, puis **Commit changes**.

## 8. Activer le multijoueur (Le Cercle)

Le mode solo contre des bots marche tout de suite. Pour jouer en ligne avec tes potes, il faut allumer le petit serveur chez Cloudflare (gratuit). À faire une seule fois :

1. Sur [dash.cloudflare.com](https://dash.cloudflare.com), va dans **Workers & Pages**, puis **Create application**.
2. À côté de **Import a repository**, clique **Get started**. Connecte ton compte GitHub et choisis le dépôt `dinosaurrr`.
3. Laisse les réglages par défaut (nom `dinosaurrr`, pas de commande de build, commande de déploiement `npx wrangler deploy`) et clique **Save and Deploy**.
4. Quand c'est fini, ouvre le Worker `dinosaurrr` → **Settings** → **Domains & Routes** → **Add** → **Custom domain**, et écris `multi.dinosaurrr.com`.
5. Ouvre `https://multi.dinosaurrr.com` : la page doit dire « Serveur de jeux dinosaurrr : en ligne. ». Dans Le Cercle, le point en bas de l'accueil devient vert.

Ensuite, chaque modification envoyée sur GitHub met aussi le serveur à jour tout seul.

- **Inviter des potes** : crée une partie, puis « Copier le lien ». Le lien ressemble à `dinosaurrr.com/#jeu/cercle/K7QF`.
- **Gratuit** : l'offre gratuite de Cloudflare permet 100 000 requêtes par jour, largement assez pour des dizaines de parties par jour.
- **Pas de chat** : exprès. Les parties sont privées (code à 4 caractères) et on ne voit que les pseudos. Dans Dessine et devine, les mots proposés ne sont jamais montrés aux autres.
- **Tous les jeux à plusieurs** passent par le même serveur : une fois l'étape 8 faite, ils marchent tous en ligne.

## 9. Les comptes joueurs

Les joueurs peuvent créer un compte (bureau : menu démarrer → **Mon compte** ; téléphone : onglet **Moi**).

- **Pseudo réservé** : personne d'autre ne peut jouer avec. Un visiteur qui essaie devient « Invité123 ».
- **Mot de passe** choisi par le joueur, modifiable dans *Mon compte → Réglages*. Il n'est jamais stocké en clair : seulement une empreinte (PBKDF2, 100 000 tours). Pas d'e-mail, donc **un mot de passe oublié ne peut pas être récupéré**.
- 5 mauvais mots de passe = compte bloqué 5 minutes.
- **Victoires par jeu** : seules les parties en ligne avec au moins 2 vrais joueurs comptent.
- **Amis**, **Contacts en ligne** (façon MSN, avec ce que chacun fait), **invitations** à jouer, **mode invisible**, réglage « qui peut m'inviter ».
- Le joueur peut **supprimer son compte** (tout est effacé).

Tout est gardé par le serveur Cloudflare (objet `Comptes`, fichier `serveur/comptes.js`).

## Si quelque chose ne marche pas

- **Le site ne change pas** : attends 2 minutes puis recharge avec **Ctrl + F5** (ou **Cmd + Maj + R** sur Mac).
- **Le blog dit « Impossible de charger »** : le blog ne marche qu'une fois en ligne (pas en ouvrant `index.html` sur ton ordi). Sur GitHub, regarde l'onglet **Actions** : une croix rouge = une erreur dans un article.
- **Le domaine ne s'affiche pas** : les changements DNS peuvent prendre jusqu'à 24 h. Vérifie qu'il ne reste pas d'ancien A/AAAA.
- **« Enforce HTTPS » est grisé** : c'est normal au début, GitHub prépare le certificat. Réessaie plus tard.
- **Les mails n'arrivent pas** : vérifie que seuls les MX d'Apple sont présents.
- **Le Cercle dit « Serveur hors ligne »** : vérifie l'étape 8 (le domaine `multi.dinosaurrr.com` doit être ajouté au Worker). Dans Cloudflare, l'onglet **Deployments** du Worker montre si le dernier envoi a marché.

---

<details>
<summary>Contenu de <code>.pages.yml</code> (si tu dois le recréer)</summary>

```yaml
media:
  input: media
  output: /media
  rename: safe

content:
  - name: articles
    label: Articles du blog
    type: collection
    path: _posts
    filename: "{year}-{month}-{day}-{primary}.md"
    view:
      fields: [title, date]
      primary: title
      sort: [date, title]
      default:
        sort: date
        order: desc
    fields:
      - name: title
        label: Titre
        type: string
        required: true
      - name: date
        label: Date
        type: date
        options:
          format: yyyy-MM-dd
      - name: categorie
        label: Catégorie
        type: select
        options:
          values: [Annonce, Projets, Jeux, Tech, Tutoriels, Divers]
      - name: resume
        label: Résumé (affiché dans la liste des articles)
        type: text
        options:
          maxlength: 200
      - name: cover
        label: Image de couverture (facultatif)
        type: image
      - name: body
        label: Article
        type: rich-text
        options:
          format: markdown
```

</details>
