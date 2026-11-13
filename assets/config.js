// =====================================================================
//  AROO · Configuration du formulaire d'inscription
//  C'est le SEUL fichier à modifier pour gérer les formations,
//  les tarifs, les structures partenaires et les numéros de paiement.
// =====================================================================

window.AROO_CONFIG = {
  // URL /exec du déploiement Google Apps Script (voir apps-script/Code.gs).
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbx7DjVVz64Q0ODbmVpHYEjbQvbMlyRAVzrEegNaMOTS5fpHdOyQv6IqW-kAI8brYT4b/exec',
  contactEmail: 'aroo.madaeducation@gmail.com',
  surveyVersion: '2.0',

  // Structures dont les membres suivent les formations GRATUITEMENT.
  // La comparaison ignore majuscules, accents, espaces, points et tirets :
  // « IH.SM », « ihsm », « I.H.S.M » sont tous reconnus.
  // Si la valeur saisie CONTIENT l'un de ces noms, le tarif devient gratuit.
  structuresPartenaires: [
    'ZA SPaFi',
    'IHSM',
    'IH.SM',
    'Institut Halieutique et des Sciences Marines'
  ],

  // Comptes Mobile Money pour le paiement.
  // Pour afficher le logo officiel, déposez l'image dans assets/img/
  // (ex. logo-mvola.png). Sinon, un badge texte est affiché.
  paiement: {
    titulaire: 'Manampitahiana',
    comptes: [
      { id: 'mvola',  nom: 'MVola',        numero: '+261 34 94 150 05', logo: 'assets/img/logo-mvola.png',        couleur: '#ffd200', texte: '#0b3b26' },
      { id: 'orange', nom: 'Orange Money', numero: '+261 32 60 608 15', logo: 'assets/img/logo-orange-money.png', couleur: '#ff7900', texte: '#000000' }
    ]
  },

  // Délai de vérification annoncé aux inscrits (en heures).
  delaiVerificationHeures: 24,

  // Justificatif : taille maximale acceptée (Mo). Les photos sont
  // automatiquement compressées avant l'envoi.
  justificatifMaxMo: 8,

  // Informations affichées au-dessus de la liste des formations (étape 2).
  infosFormations: [
    '🎓 Un certificat est délivré pour chaque formation réussie.',
    '🤝 En cas d’échec à un niveau, vous êtes accompagné(e) en présentiel pour le réussir.'
  ]
};

// =====================================================================
//  FORMATIONS
//  ---------------------------------------------------------------
//  ➜ Bloquer / débloquer une formation : passez `disponible` à false / true.
//    `messageIndisponible` s'affiche sur la carte quand elle est bloquée.
//  ➜ Ajouter une formation : copiez un bloc { ... }, collez-le à la fin
//    de la liste (avant le « ]; »), puis changez l'`id` (unique, sans
//    espace ni accent), le titre, les textes et le prix.
//  ➜ Changer un tarif : modifiez `prix` (nombre entier en ariary).
//    Tarifs actuels : 50 000 Ar (Débutant / Intermédiaire), 75 000 Ar (Avancé / Expert).
//  ➜ Un champ laissé vide ('' ou []) n'est simplement pas affiché.
// =====================================================================

window.AROO_COURSES = [
  {
    id: 'r_debutant',
    emoji: '📊',
    titre: 'Formation R · Débutant (application sur des données liées aux sciences marines)',
    categorie: 'Analyse de données',
    niveau: 'Débutant',
    resume: 'Installer R et RStudio, comprendre la logique du langage et produire ses premiers tableaux et graphiques à partir de données d’écologie marine.',
    objectifs: [
      'Installer et prendre en main R et RStudio',
      'Importer, explorer et nettoyer un jeu de données',
      'Manipuler les données avec dplyr et réaliser des graphiques avec ggplot2'
    ],
    contenu: [
      'Installation, interface RStudio, projets et scripts',
      'Objets, vecteurs, data frames et fonctions de base de R',
      'Import de fichiers Excel / CSV et contrôle des données',
      'Transformation des données avec dplyr',
      'Premiers graphiques avec ggplot2'
    ],
    prerequis: 'Aucun. Un ordinateur (Windows, macOS ou Linux) et une connexion Internet.',
    public: 'Étudiant·e·s et professionnel·le·s qui débutent avec R',
    format: 'Cours en ligne en autonomie (accès par identifiant) avec quiz à chaque séance',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie (au moins 75 % à chaque séance)',
    prix: 50000,
    disponible: true,
    messageIndisponible: 'Bientôt disponible'
  },
  {
    id: 'r_intermediaire',
    emoji: '📈',
    titre: 'Formation R · Intermédiaire (application sur des données liées aux sciences marines)',
    categorie: 'Analyse de données',
    niveau: 'Intermédiaire',
    resume: 'Travailler sur des jeux de données plus volumineux et désordonnés, automatiser ses traitements et soigner ses graphiques et cartes.',
    objectifs: [
      'Nettoyer et restructurer des données réelles, plus complexes',
      'Écrire des boucles (if / for) et ses propres fonctions',
      'Produire des graphiques soignés et une première carte avec ggplot2',
      'Comparer des moyennes et des pourcentages, tester une corrélation'
    ],
    contenu: [
      'Données d’aquaculture, socio-économiques et physico-chimiques',
      'Conditions, boucles et fonctions',
      'Mise en forme avancée des graphiques ggplot2',
      'Introduction aux cartes avec ggplot2',
      'Tests paramétriques et non paramétriques, distributions, p-values, transformations'
    ],
    prerequis: 'Avoir suivi le niveau Débutant ou maîtriser dplyr et ggplot2.',
    public: 'Utilisateurs de R souhaitant gagner en autonomie',
    format: 'Cours en ligne en autonomie (accès par identifiant) avec quiz à chaque séance',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie (au moins 75 % à chaque séance)',
    prix: 50000,
    disponible: true,
    messageIndisponible: 'Bientôt disponible'
  },
  {
    id: 'r_avance',
    emoji: '🗺️',
    titre: 'Formation R · Avancé (application sur des données liées aux sciences marines)',
    categorie: 'Analyse de données',
    niveau: 'Avancé',
    resume: 'Rapports reproductibles, données spatiales et publication en ligne : passer d’analyses isolées à des projets complets et partageables.',
    objectifs: [
      'Rédiger des rapports dynamiques avec R Markdown et Quarto',
      'Analyser et cartographier des données spatiales',
      'Organiser un projet reproductible et le publier sur GitHub / GitLab'
    ],
    contenu: [
      'R Markdown et Quarto : table des matières, listes de figures, références, export HTML / PDF',
      'Données spatiales avec sf, terra et tmap',
      'Structure d’un projet reproductible',
      'Publication sur GitHub / GitLab'
    ],
    prerequis: 'Avoir suivi le niveau Intermédiaire ou un niveau équivalent.',
    public: 'Utilisateurs réguliers de R (mémoire, thèse, rapports techniques)',
    format: 'Cours en ligne en autonomie (accès par identifiant) avec quiz à chaque séance',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie (au moins 75 % à chaque séance)',
    prix: 75000,
    disponible: true,
    messageIndisponible: 'Bientôt disponible'
  },
  {
    id: 'intro_stats_r',
    emoji: '🔬',
    titre: 'Introduction à la statistique sur R',
    categorie: 'Statistiques',
    niveau: 'Intermédiaire',
    resume: 'Comprendre les notions de base de la statistique et les appliquer sur R pour décrire et comparer des données.',
    objectifs: [
      'Décrire des données (moyenne, médiane, dispersion, proportions)',
      'Choisir un test statistique adapté à sa question',
      'Interpréter correctement un résultat et une p-value'
    ],
    contenu: [
      'Types de variables et statistiques descriptives',
      'Distributions et vérification des conditions d’application',
      'Tests de comparaison et de corrélation courants',
      'Présentation des résultats (tableaux, graphiques)'
    ],
    prerequis: 'Connaître les bases de R (niveau Débutant conseillé).',
    public: '',
    format: '',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie',
    prix: 50000,
    disponible: false,
    messageIndisponible: 'Bientôt disponible'
  },
  {
    id: 'modelisation',
    emoji: '🧮',
    titre: 'Modélisation statistique',
    categorie: 'Statistiques',
    niveau: 'Avancé',
    resume: 'Construire, vérifier et interpréter des modèles statistiques pour expliquer des phénomènes écologiques ou socio-économiques.',
    objectifs: [
      'Formuler une question sous forme de modèle',
      'Ajuster et comparer des modèles sur R',
      'Vérifier les hypothèses et interpréter les résultats'
    ],
    contenu: [
      'ANOVA et régression linéaire',
      'Modèles linéaires généralisés (GLM)',
      'Diagnostic des résidus et sélection de modèles',
      'Présentation et interprétation des résultats'
    ],
    prerequis: 'Bases de R et notions de statistique (« Introduction à la statistique sur R » conseillée).',
    public: '',
    format: '',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie',
    prix: 75000,
    disponible: false,
    messageIndisponible: 'Bientôt disponible'
  },
  {
    id: 'kobo_debutant',
    emoji: '📱',
    titre: 'KoboCollect et XLSForm · Débutant',
    categorie: 'Collecte de données',
    niveau: 'Débutant',
    resume: 'Créer son compte KoboToolbox, concevoir un formulaire sur la plateforme ou sous Excel (XLSForm), le déployer et télécharger les données.',
    objectifs: [
      'Créer et paramétrer son compte KoboToolbox',
      'Construire un questionnaire simple, sur la plateforme ou en XLSForm',
      'Déployer le formulaire et récupérer les données'
    ],
    contenu: [
      'Création d’un compte KoboToolbox',
      'Création de formulaires directement sur la plateforme',
      'Création du questionnaire sous Excel (XLSForm) avec les options de base : réponse obligatoire (required), indication (hint), questionnaire multilingue',
      'Import et déploiement du formulaire',
      'Téléchargement des données'
    ],
    prerequis: '',
    public: '',
    format: '',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie',
    prix: 50000,
    disponible: true,
    messageIndisponible: 'Bientôt disponible'
  },
  {
    id: 'kobo_intermediaire',
    emoji: '🧩',
    titre: 'KoboCollect et XLSForm · Intermédiaire',
    categorie: 'Collecte de données',
    niveau: 'Intermédiaire',
    resume: 'Rendre ses formulaires plus intelligents : calculs, groupes, classements, répétitions, affichage conditionnel et contrôles de saisie.',
    objectifs: [
      'Automatiser des calculs dans le formulaire',
      'Structurer un questionnaire en groupes et répétitions',
      'Limiter les erreurs de saisie avec des conditions et des contraintes'
    ],
    contenu: [
      'Calculs (calculate)',
      'Groupes de questions (group)',
      'Questions de classement (rank)',
      'Répétitions (repeat)',
      'Affichage conditionnel (relevant)',
      'Contrôles de saisie (constraint)'
    ],
    prerequis: 'Avoir suivi le niveau Débutant ou savoir créer et déployer un XLSForm simple.',
    public: '',
    format: '',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie',
    prix: 50000,
    disponible: true,
    messageIndisponible: 'Bientôt disponible'
  },
  {
    id: 'kobo_expert',
    emoji: '🎯',
    titre: 'KoboCollect et XLSForm · Expert',
    categorie: 'Collecte de données',
    niveau: 'Expert',
    resume: 'Maîtriser toute la chaîne, du formulaire de base aux listes filtrées et en cascade, jusqu’à l’extraction des données groupées avec R.',
    objectifs: [
      'Concevoir un formulaire complet, du niveau Débutant aux fonctions avancées',
      'Créer des listes de choix filtrées et des questions en cascade',
      'Télécharger les données et extraire les données des groupes avec R'
    ],
    contenu: [
      'Reprise de l’ensemble des notions depuis le niveau Débutant',
      'Filtre de choix (choice_filter)',
      'Questions en cascade (ex. région › district › commune)',
      'Téléchargement des données',
      'Extraction des données des groupes et répétitions avec R'
    ],
    prerequis: 'Savoir utiliser R.',
    public: '',
    format: '',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie',
    prix: 75000,
    disponible: true,
    messageIndisponible: 'Bientôt disponible'
  },
  {
    id: 'informatique',
    emoji: '💻',
    titre: 'Bases de l’informatique',
    categorie: 'Outils numériques',
    niveau: 'Débutant',
    resume: 'Gagner en autonomie sur ordinateur : organiser ses fichiers, utiliser les outils bureautiques et travailler efficacement en ligne.',
    objectifs: [
      'Organiser et sauvegarder ses fichiers',
      'Utiliser un traitement de texte et un tableur au quotidien',
      'Utiliser la messagerie, le stockage en ligne et la visioconférence'
    ],
    contenu: [
      'Système d’exploitation, dossiers et fichiers',
      'Traitement de texte et tableur : fonctions essentielles',
      'E-mail, Google Drive et outils de travail en ligne',
      'Bonnes pratiques de sécurité et de sauvegarde'
    ],
    prerequis: 'Aucun.',
    public: '',
    format: '',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie',
    prix: 50000,
    disponible: false,
    messageIndisponible: 'Bientôt disponible'
  },
  {
    id: 'reproductibilite',
    emoji: '🔁',
    titre: 'Recherche reproductible',
    categorie: 'Science ouverte',
    niveau: 'Intermédiaire',
    resume: 'Organiser, documenter et partager ses données et ses analyses pour qu’elles puissent être vérifiées et réutilisées.',
    objectifs: [
      'Structurer un projet de recherche clair et durable',
      'Documenter données et scripts',
      'Suivre les versions avec Git et partager son travail'
    ],
    contenu: [
      'Organisation des dossiers et nommage des fichiers',
      'Métadonnées et documentation',
      'Git et GitHub pour le suivi des versions',
      'Principes de science ouverte et partage des données'
    ],
    prerequis: 'Notions de base en R conseillées.',
    public: '',
    format: '',
    duree: '',
    certificat: 'Certificat délivré pour chaque formation réussie',
    prix: 50000,
    disponible: false,
    messageIndisponible: 'Bientôt disponible'
  }
];
