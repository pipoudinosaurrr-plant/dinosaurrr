---
title: Comment ce site est construit
date: 2026-10-11
categorie: Tech
resume: GitHub Pages, Jekyll, un éditeur en ligne et zéro serveur à gérer. Le tour de la technique derrière le site.
---
Ce site ne tourne sur aucun serveur à moi. Tout est hébergé gratuitement, et j'écris mes articles depuis un éditeur en ligne. Voici comment ça marche.

## L'hébergement : GitHub Pages

Tous les fichiers du site sont rangés dans un dépôt GitHub. GitHub Pages les publie automatiquement à chaque modification, avec le HTTPS inclus.

## Le blog : Jekyll

Chaque article est un simple fichier texte au format Markdown, rangé dans le dossier `_posts`. Au moment de publier, Jekyll transforme ces fichiers en pages web et fabrique la liste des articles que le site affiche.

## L'éditeur : Pages CMS

Pour écrire, j'utilise Pages CMS : un éditeur en ligne qui se connecte au dépôt GitHub. J'écris, j'ajoute des images, j'enregistre, et le site se met à jour tout seul une minute plus tard.

## Les jeux

Chaque jeu est une page HTML indépendante, avec son propre code JavaScript. Pas de moteur de jeu, pas de bibliothèque : du canvas, du CSS et beaucoup d'essais.

## Le design

Sur ordinateur, l'interface reprend les codes de Windows XP (fenêtres, barre des tâches, menu Démarrer) dans une version entièrement noire. Sur téléphone, le site se transforme en appli avec une barre d'onglets.
