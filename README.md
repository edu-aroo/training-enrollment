# AROO · Formulaire d'inscription aux formations

Lien : https://edu-aroo.github.io/training-enrolment/

## Fichiers
- `index.html` : structure de la page (4 étapes).
- `assets/config.js` : **le seul fichier à modifier au quotidien** (formations, prix, disponibilité, structures partenaires, numéros Mobile Money).
- `assets/app.js` : fonctionnement du formulaire (photos des panneaux latéraux : tableau `VISUALS`).
- `assets/style.css` : design.
- `apps-script/Code.gs` : script Google Apps Script (Sheets + Drive + e-mails).

## Gérer les formations (`assets/config.js`)
- **Bloquer / débloquer** : `disponible: false` / `disponible: true`. Le texte du badge vient de `messageIndisponible`.
- **Ajouter** : copier un bloc `{ ... }` de `window.AROO_COURSES`, le coller avant `];`, changer l'`id` (unique, sans espace ni accent) et les textes.
- **Prix** : `prix` (en ariary).
- **Structures gratuites** : `structuresPartenaires` (à modifier aussi dans `Code.gs` > `PARTENAIRES`).
- **Logos MVola / Orange Money** : déposer `logo-mvola.png` et `logo-orange-money.png` dans `assets/img/`.

## Après inscription
1. Ligne ajoutée dans l'onglet `Reponses` (statut « À vérifier »), justificatif rangé dans le dossier Drive « AROO – Justificatifs inscriptions ».
2. E-mail de confirmation automatique à l'inscrit + alerte à l'organisatrice.
3. Après vérification : remplir `lien_plateforme`, `identifiant`, `mot_de_passe`, passer `statut` à « Validé », puis menu **AROO › Envoyer les accès**.

## Mettre à jour le script
Coller `Code.gs` dans l'éditeur Apps Script, puis **Déployer > Gérer les déploiements > Modifier > Nouvelle version**. Autoriser Gmail et Drive à la première exécution.
