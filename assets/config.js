// Collez ici l'URL /exec de votre déploiement Google Apps Script.
// Tant que cette valeur est vide, les réponses ne sont PAS envoyées.
window.AROO_CONFIG = {
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbx7DjVVz64Q0ODbmVpHYEjbQvbMlyRAVzrEegNaMOTS5fpHdOyQv6IqW-kAI8brYT4b/exec',
  contactEmail: 'aroo.madaeducation@gmail.com', // facultatif : adresse de contact visible dans votre politique de confidentialité
  surveyVersion: '1.2'
};

// Format : [id, emoji, titre, description, tarif en ariary (nombre entier)].
// Pour changer un tarif, modifier uniquement le dernier nombre de sa ligne (ex. 25000).
window.AROO_COURSES = [
  ['r','📊','Formation R','Explorer, analyser et visualiser des données',0],
  ['kobo','📱','KoboCollect et XLSForm','Concevoir des enquêtes et collecter des données',0],
  ['video','🎬','Montage vidéo','Raconter des histoires scientifiques en images',0],
  ['informatique','💻','Bases de l’informatique','Gagner en autonomie avec les outils numériques',0],
  ['modelisation','📈','Modélisation statistique','Comprendre et modéliser des phénomènes',0],
  ['intro_stats_r','🔬','Introduction à la statistique sur R','Faire ses premiers pas en statistiques avec R',0],
  ['reproductibilite','🔁','Recherche reproductible','Organiser, partager et reproduire ses analyses',0]
];
