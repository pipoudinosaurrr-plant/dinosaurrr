# dinosaurrr

Blog et mini-jeux faits maison. Sur ordinateur, le site s'affiche comme un bureau noir inspiré de Windows XP (fenêtres, barre des tâches, menu démarrer). Sur téléphone, il devient une vraie appli : accueil, onglets en bas, articles et jeux en plein écran.

Ce fichier explique comment mettre le site en ligne sur ton domaine, brancher ton adresse mail et écrire des articles.

---

## Ce qu'il y a dans le dossier

| Fichier / dossier | À quoi ça sert |
| --- | --- |
| `index.html` | La page d'accueil (bureau sur ordi, appli sur téléphone) |
| `assets/config.js` | **Tes réglages** : nom du site, pseudo, slogan, phrase d'accroche, présentation, adresse mail |
| `assets/jeux.js` | La liste des jeux (pour en ajouter) |
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
| `serveur/`, `wrangler.jsonc`, `package.json` | Le serveur des jeux multijoueurs (il tourne chez Cloudflare, voir étape 7) |
| `games/cercle/moteur.js` | Les règles du Cercle, utilisées à la fois par le mode solo et par le serveur |

Les jeux : Le Cercle (multijoueur), Pluie de météorites, Data Clicker, L'histoire du jeu vidéo, Test de réflexes, Le bouton qui fuit, Générateur de pseudo et Paint.

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

Si ton domaine n'est pas en `.com`, ouvre le fichier `CNAME` et remplace `dinosaurrr.com` par ton vrai domaine (et pareil dans `assets/config.js` et `_config.yml`).

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

Astuce : dans un article, un lien vers `/#jeu/meteorites` ouvre directement le jeu, sur ordi comme sur téléphone (remplace `meteorites` par l'`id` d'un autre jeu de `assets/jeux.js`).

## 6. Personnaliser

- **Nom du site, pseudo, slogan, phrase d'accroche, présentation, mail** : `assets/config.js`. L'accroche est le gros titre de l'accueil sur téléphone.
- **Ajouter un jeu** :
  1. copie `games/modele.html` → par exemple `games/mon-jeu.html` et code ton jeu dedans (le style noir du site est déjà branché via `jeu.css`) ;
  2. ajoute un bloc dans `assets/jeux.js` (copie un bloc existant et change `id`, `titre`, `fichier`, `icone`, `description`). Mets `bureau: true` pour avoir une icône sur le bureau, `nouveau: true` pour le badge « Nouveau ».
- **Changer le fond d'écran du bureau** : clic droit sur le bureau (ou menu démarrer → Fond d'écran). Quatre fonds : colline la nuit, halo vert, grille, noir pur.

Sur GitHub, tu peux modifier n'importe quel fichier directement : ouvre-le, clique sur l'icône crayon, puis **Commit changes**.

## 7. Activer le multijoueur (Le Cercle)

Le mode solo contre des bots marche tout de suite. Pour jouer en ligne avec tes potes, il faut allumer le petit serveur chez Cloudflare (gratuit). À faire une seule fois :

1. Sur [dash.cloudflare.com](https://dash.cloudflare.com), va dans **Workers & Pages**, puis **Create application**.
2. À côté de **Import a repository**, clique **Get started**. Connecte ton compte GitHub et choisis le dépôt `dinosaurrr`.
3. Laisse les réglages par défaut (nom `dinosaurrr`, pas de commande de build, commande de déploiement `npx wrangler deploy`) et clique **Save and Deploy**.
4. Quand c'est fini, ouvre le Worker `dinosaurrr` → **Settings** → **Domains & Routes** → **Add** → **Custom domain**, et écris `multi.dinosaurrr.com`.
5. Ouvre `https://multi.dinosaurrr.com` : la page doit dire « Serveur de jeux dinosaurrr : en ligne. ». Dans Le Cercle, le point en bas de l'accueil devient vert.

Ensuite, chaque modification envoyée sur GitHub met aussi le serveur à jour tout seul.

- **Inviter des potes** : crée une partie, puis « Copier le lien ». Le lien ressemble à `dinosaurrr.com/#jeu/cercle/K7QF`.
- **Gratuit** : l'offre gratuite de Cloudflare permet 100 000 requêtes par jour, largement assez pour des dizaines de parties par jour.
- **Pas de chat** : exprès. Les parties sont privées (code à 4 caractères) et on ne voit que les pseudos.

## Si quelque chose ne marche pas

- **Le site ne change pas** : attends 2 minutes puis recharge avec **Ctrl + F5** (ou **Cmd + Maj + R** sur Mac).
- **Le blog dit « Impossible de charger »** : le blog ne marche qu'une fois en ligne (pas en ouvrant `index.html` sur ton ordi). Sur GitHub, regarde l'onglet **Actions** : une croix rouge = une erreur dans un article.
- **Le domaine ne s'affiche pas** : les changements DNS peuvent prendre jusqu'à 24 h. Vérifie qu'il ne reste pas d'ancien A/AAAA.
- **« Enforce HTTPS » est grisé** : c'est normal au début, GitHub prépare le certificat. Réessaie plus tard.
- **Les mails n'arrivent pas** : vérifie que seuls les MX d'Apple sont présents.
- **Le Cercle dit « Serveur hors ligne »** : vérifie l'étape 7 (le domaine `multi.dinosaurrr.com` doit être ajouté au Worker). Dans Cloudflare, l'onglet **Deployments** du Worker montre si le dernier envoi a marché.

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
