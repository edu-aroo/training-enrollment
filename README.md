# AROO — Enquête interactive sur les besoins en formation

Projet statique HTML/CSS/JavaScript, éditable dans RStudio, publiable sur GitHub Pages. Réponses collectées dans **votre** Google Sheets via Apps Script. Aucune infrastructure R Shiny ni serveur payant nécessaire.

## Questions reprises du fichier Excel

1. Nom et prénom (obligatoire)
2. Email (obligatoire, validation du format)
3. Numéro de téléphone (facultatif, **texte** pour conserver les `+261` et les zéros)
4. Domaine d'étude / recherche / professionnel (obligatoire)
5. Affiliation : type de rattachement (obligatoire) et nom de la structure (obligatoire sauf indépendant)
6. Formations souhaitées (choix multiples, au moins une), avec tarif indicatif par formation (0 Ar par défaut)
7. Loisir préféré (facultatif)
8. Plat préféré (facultatif)

Consentement explicite ajouté avant soumission. Les champs facultatifs sont un choix de conception modifiable.

## Modifier les tarifs des formations
Dans **`assets/config.js`**, chaque formation suit le format :

```js
['r','📊','Formation R','Explorer, analyser et visualiser des données',0],
```

Le **dernier nombre** est le prix en **ariary (Ar)**. Pour afficher 50 000 Ar, remplacer `0` par `50000` (sans espaces et sans guillemets). Le site affichera le nouveau tarif sur la carte de formation. Les prix sont **indicatifs** et le questionnaire ne réalise aucun paiement. Le tarif affiché au moment de la réponse est enregistré dans `formations_tarifs_indicatifs` pour garder la trace des changements de prix. Après publication sur GitHub Pages, mettre à jour `assets/config.js` puis faire un commit et un push Git.

## Affiliation des participants
Le questionnaire propose : université, centre de recherche, ONG/association, entreprise, administration, indépendant/freelance/sans rattachement et autre. Le nom de la structure apparaît et devient obligatoire pour toutes les catégories **sauf indépendant**. Dans Google Sheets, les deux nouvelles colonnes sont `affiliation_type` et `affiliation_nom`. En cas de réutilisation d'une feuille existante, le script Apps Script ajoute automatiquement les nouvelles colonnes sans déplacer les anciennes.

## Publication étape par étape

### 1. Tester en local
Ouvrir `aroo_training_survey.Rproj` dans RStudio. Dans l'onglet Terminal, exécuter `python -m http.server 8000` (ou ouvrir `index.html` directement dans un navigateur). Visiter http://localhost:8000. **Sans configuration du backend, l'envoi est volontairement désactivé.**

### 2. Créer la feuille de réponses
Dans Google Drive, créer un Google Sheets vide nommé `AROO - Réponses aux formations`. Dans la feuille : **Extensions > Apps Script**. Copier intégralement le contenu de `apps-script/Code.gs` dans l'éditeur, puis enregistrer.

### 3. Déployer le collecteur
Dans Apps Script, cliquer **Déployer > Nouveau déploiement > Application Web**. Choisir **Exécuter en tant que : Moi** et **Qui a accès : Tout le monde** (les libellés varient selon les comptes). Autoriser les permissions requises. Copier l'URL se terminant par `/exec`.

### 4. Relier le questionnaire
Ouvrir `assets/config.js` et remplacer `appsScriptUrl: ''` par `appsScriptUrl: 'https://script.google.com/macros/s/XXXX/exec'`. Ne jamais mettre de mot de passe ni de clé privée dans ce fichier public.

### 5. Publier sur GitHub Pages
Créer un **nouveau dépôt GitHub** (ex. `aroo-training-survey`). Décompresser le ZIP, ouvrir le dossier dans RStudio, puis dans le Terminal :

```bash
git init
git add .
git commit -m "Initial AROO training survey"
git branch -M main
git remote add origin https://github.com/VOTRE-IDENTIFIANT/aroo-training-survey.git
git push -u origin main
```

Dans GitHub : **Settings > Pages > Build and deployment > Deploy from a branch > main > /(root) > Save**. Le site sera généralement accessible à `https://VOTRE-IDENTIFIANT.github.io/aroo-training-survey/` après la publication.

### 6. Tester de bout en bout
Soumettre **une réponse fictive** avec un e-mail de test. Vérifier qu'une ligne apparaît dans l'onglet `Reponses` de Google Sheets. **Important :** le navigateur utilise `no-cors` : l'écran de fin ne prouve pas à lui seul que la ligne a été enregistrée. Vérifiez toujours la feuille, les autorisations Apps Script et les journaux d'exécution.

### 7. Analyser dans R
Dans Google Sheets : **Fichier > Télécharger > Valeurs séparées par des virgules (.csv)** en étant sur l'onglet `Reponses`. Enregistrer le fichier sous `data/reponses.csv` dans le projet. Exécuter `analysis/analyse_reponses.R` dans RStudio. Les fichiers CSV locaux sont exclus de Git par `.gitignore`.

## Confidentialité et limites importantes
- **Le site GitHub Pages est public** : ne jamais committer des réponses personnelles ou des secrets. Les réponses sont stockées dans le Google Sheets privé du compte qui héberge le script, sous réserve de ses paramètres de partage.
- Le point d'accès Apps Script publié à tout le monde peut recevoir des soumissions automatisées. Le champ piège est une protection faible, pas un anti-spam robuste. Pour un déploiement important, prévoir protection anti-abus et contrôle des accès.
- Le nom, l'e-mail et le téléphone sont des données personnelles. Ajouter avant diffusion les coordonnées réelles du responsable, la durée de conservation, les droits des répondants et les informations de confidentialité adaptées à votre contexte. Limiter l'accès à la feuille.
- Les textes du formulaire sont en français, les valeurs de formations sont des identifiants stables utiles pour l'analyse.
- Après toute modification de `Code.gs`, créer une **nouvelle version du déploiement** Apps Script pour rendre le changement actif.
- Le logo fourni est conservé tel quel comme ressource graphique.

## Personnalisation
- `assets/config.js` : URL de collecte, options de formations et prix indicatifs (en ariary).
- `index.html` : textes et questions.
- `assets/style.css` : couleurs, mise en page et animations.
- `assets/app.js` : navigation et validation.
- `apps-script/Code.gs` : schéma de collecte Google Sheets.

**Source des questions :** `questionnaire.xlsx` fourni par le commanditaire (7 questions initiales, plus la question ajoutée sur l’affiliation). Ce projet est une nouvelle enquête AROO indépendante du questionnaire national sur les pêcheries de l'ancien ZIP.

**Mise à jour v1.1 :** ajout du rattachement institutionnel et des tarifs personnalisables. Si le projet avait déjà été publié, redéployez une nouvelle version de Google Apps Script et republiez le site GitHub Pages.
