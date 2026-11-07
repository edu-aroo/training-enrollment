# Analyse exploratoire AROO — exporter l'onglet Reponses de Google Sheets en CSV.
# Utiliser RStudio, sans packages externes.
path <- 'data/reponses.csv'
if (!file.exists(path)) stop('Exporter Google Sheets > Reponses en CSV dans data/reponses.csv')
d <- read.csv(path, stringsAsFactors = FALSE, check.names = FALSE, fileEncoding = 'UTF-8-BOM')
cat('Nombre de réponses :', nrow(d), '\n')
cat('\nDomaines déclarés :\n')
print(sort(table(d$domaine), decreasing = TRUE))
formations <- unlist(strsplit(paste(d$formations, collapse = ' | '), ' \\| '))
cat('\nFormations demandées :\n')
print(sort(table(trimws(formations)), decreasing = TRUE))

if ('affiliation_type' %in% names(d)) {
  cat('\nTypes de rattachement :\n')
  print(sort(table(d$affiliation_type), decreasing = TRUE))
}
# Les tarifs sont indicatifs et ne représentent pas des paiements.
