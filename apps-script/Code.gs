/**
 * AROO · Collecte des inscriptions aux formations
 * ------------------------------------------------
 * Script lié à un Google Sheets.
 *  1. Enregistre chaque inscription dans l'onglet « Reponses ».
 *  2. Range le justificatif (capture de paiement ou preuve d'appartenance)
 *     dans un dossier Google Drive et met le lien dans le tableau.
 *  3. Envoie un e-mail de confirmation à l'inscrit et une alerte à l'organisatrice.
 *  4. Menu « AROO » dans le Sheets : envoie les accès (lien, identifiant,
 *     mot de passe) aux lignes dont le statut est « Validé ».
 *
 * Déploiement (après toute modification de ce fichier) :
 *   Déployer > Gérer les déploiements > ✏️ Modifier > Version : « Nouvelle version » > Déployer.
 *   (Ainsi l'URL /exec reste la même que dans assets/config.js.)
 *   Au premier lancement, Google demande d'autoriser Gmail et Drive : acceptez.
 */

const CONFIG = {
  TAB: 'Reponses',
  ADMIN_EMAIL: 'aroo.madaeducation@gmail.com',
  SENDER_NAME: 'AROO Formations',
  DRIVE_FOLDER_NAME: 'AROO – Justificatifs inscriptions',
  DELAI_HEURES: 24,
  // Même liste que dans assets/config.js (vérifiée à nouveau côté serveur).
  PARTENAIRES: ['ZA SPaFi', 'SpaFi','IHSM', 'IH.SM', 'Institut Halieutique et des Sciences Marines'],
  STATUTS: ['À vérifier', 'Validé', 'Refusé']
};

const FIELDS = [
  'response_id', 'horodatage_serveur', 'statut',
  'nom_prenom', 'email', 'telephone', 'facebook', 'domaine',
  'affiliation_type', 'affiliation_nom', 'tarif', 'structure_partenaire',
  'formations', 'formations_titres', 'montant_total',
  'mode_paiement', 'reference_paiement', 'justificatif_lien',
  'lien_plateforme', 'identifiant', 'mot_de_passe', 'acces_envoye_le',
  'loisir', 'plat_prefere', 'consent', 'survey_version', 'submitted_at_client',
  // anciennes colonnes conservées si elles existent déjà
  'formations_tarifs_indicatifs'
];

// ---------------------------------------------------------------------
//  Réception d'une inscription
// ---------------------------------------------------------------------
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return reply({ ok: true }); // pot de miel anti-robots

    const required = ['response_id', 'nom_prenom', 'email', 'telephone', 'facebook', 'domaine', 'affiliation_type', 'justificatif_base64'];
    const missing = required.filter(function (k) { return !d[k]; });
    if (missing.length || !d.consent || !Array.isArray(d.formations) || !d.formations.length ||
        (d.affiliation_type !== 'independant' && !d.affiliation_nom)) {
      throw new Error('Champs obligatoires manquants : ' + missing.join(', '));
    }

    const sh = getSheet_();
    const headers = ensureHeaders_(sh);

    // Doublon (même envoi reçu deux fois)
    const idCol = headers.indexOf('response_id') + 1;
    if (sh.getLastRow() > 1) {
      const ids = sh.getRange(2, idCol, sh.getLastRow() - 1, 1).getValues().flat();
      if (ids.indexOf(d.response_id) !== -1) return reply({ ok: true, duplicate: true });
    }

    // Tarif recalculé côté serveur
    const partner = detectPartner_(d.affiliation_nom);
    d.structure_partenaire = partner || '';
    d.tarif = partner ? 'Partenaire (gratuit)' : 'Standard';
    if (partner) d.montant_total = 0;

    // Justificatif → Google Drive
    const file = saveProof_(d);
    d.justificatif_lien = file.getUrl();

    const row = Object.assign({}, d, {
      horodatage_serveur: new Date(),
      statut: 'À vérifier',
      formations: d.formations.join(' | ')
    });
    delete row.justificatif_base64;
    sh.appendRow(headers.map(function (k) { return safeCell_(row[k]); }));
    applyStatusValidation_(sh, headers);

    // E-mails (une erreur d'envoi ne bloque pas l'inscription)
    try { sendConfirmation_(d); } catch (err) { console.error('Confirmation', err); }
    try { notifyAdmin_(d, file); } catch (err) { console.error('Alerte admin', err); }

    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return reply({ ok: true, service: 'AROO inscriptions' }); }

// ---------------------------------------------------------------------
//  E-mails
// ---------------------------------------------------------------------
function sendConfirmation_(d) {
  const formations = String(d.formations_titres || d.formations.join(', ')).split(' | ');
  const isPartner = !!d.structure_partenaire;
  const montant = isPartner ? 'Gratuit (structure partenaire)' : formatAr_(d.montant_total);
  const piece = isPartner ? 'votre justificatif d’appartenance' : 'votre preuve de paiement';

  const html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#10243a;max-width:600px">' +
    '<p>Bonjour ' + esc_(d.nom_prenom) + ',</p>' +
    '<p>Nous avons bien reçu votre inscription aux formations AROO :</p>' +
    '<ul>' + formations.map(function (f) { return '<li>' + esc_(f) + '</li>'; }).join('') + '</ul>' +
    '<p><b>Montant :</b> ' + esc_(montant) + '</p>' +
    '<p>Nous allons vérifier ' + piece + ' dans les <b>' + CONFIG.DELAI_HEURES + ' heures</b>. ' +
    'Une fois la vérification faite, vous recevrez par e-mail le <b>lien de la plateforme de formation</b>, ' +
    'votre <b>identifiant</b> et votre <b>mot de passe</b>.</p>' +
    '<p style="background:#fff4e0;padding:10px 12px;border-radius:8px">Si vous n’avez pas reçu de réponse dans les ' +
    CONFIG.DELAI_HEURES + ' heures, merci de <b>répondre directement à cet e-mail</b>.</p>' +
    '<p>À très bientôt,<br>L’équipe AROO</p>' +
    '</div>';

  MailApp.sendEmail({
    to: d.email,
    replyTo: CONFIG.ADMIN_EMAIL,
    name: CONFIG.SENDER_NAME,
    subject: 'AROO · Inscription reçue – vérification sous ' + CONFIG.DELAI_HEURES + ' h',
    htmlBody: html
  });
}

function notifyAdmin_(d, file) {
  const url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#10243a">' +
    '<p><b>Nouvelle inscription à vérifier</b></p>' +
    '<p>' + esc_(d.nom_prenom) + ' · ' + esc_(d.email) + ' · ' + esc_(d.telephone) + '<br>' +
    'Facebook : ' + esc_(d.facebook) + '<br>' +
    'Structure : ' + esc_(d.affiliation_nom || d.affiliation_type) + ' — <b>' + esc_(d.tarif) + '</b><br>' +
    'Formations : ' + esc_(d.formations_titres) + '<br>' +
    'Montant : ' + esc_(formatAr_(d.montant_total)) +
    (d.mode_paiement ? ' · ' + esc_(d.mode_paiement) + (d.reference_paiement ? ' · réf. ' + esc_(d.reference_paiement) : '') : '') + '</p>' +
    '<p><a href="' + file.getUrl() + '">Ouvrir le justificatif</a> · <a href="' + url + '">Ouvrir le tableau</a></p>' +
    '<p>Pour envoyer les accès : remplissez lien_plateforme, identifiant, mot_de_passe, passez le statut à « Validé », ' +
    'puis menu AROO › Envoyer les accès.</p></div>';
  MailApp.sendEmail({
    to: CONFIG.ADMIN_EMAIL,
    replyTo: d.email,
    name: CONFIG.SENDER_NAME,
    subject: '[AROO] Inscription à vérifier – ' + d.nom_prenom + ' (' + d.tarif + ')',
    htmlBody: html
  });
}

// ---------------------------------------------------------------------
//  Menu du Google Sheets : envoi des accès
// ---------------------------------------------------------------------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('AROO')
    .addItem('Envoyer les accès (lignes « Validé »)', 'sendAccessToValidated')
    .addItem('Préparer / mettre à jour les colonnes', 'setupSheet')
    .addToUi();
}

function setupSheet() {
  const sh = getSheet_();
  const headers = ensureHeaders_(sh);
  applyStatusValidation_(sh, headers);
  sh.setFrozenRows(1);
}

function sendAccessToValidated() {
  const sh = getSheet_();
  const headers = ensureHeaders_(sh);
  const col = function (k) { return headers.indexOf(k); };
  const last = sh.getLastRow();
  if (last < 2) return;
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  let sent = 0, skipped = [];

  values.forEach(function (r, i) {
    if (String(r[col('statut')]).trim() !== 'Validé' || r[col('acces_envoye_le')]) return;
    const lien = String(r[col('lien_plateforme')]).trim();
    const login = String(r[col('identifiant')]).trim();
    const mdp = String(r[col('mot_de_passe')]).trim();
    if (!lien || !login || !mdp) { skipped.push(r[col('nom_prenom')]); return; }

    const formations = String(r[col('formations_titres')] || r[col('formations')]).split(' | ');
    const html =
      '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#10243a;max-width:600px">' +
      '<p>Bonjour ' + esc_(r[col('nom_prenom')]) + ',</p>' +
      '<p>Votre inscription est validée. Bienvenue !</p>' +
      '<ul>' + formations.map(function (f) { return '<li>' + esc_(f) + '</li>'; }).join('') + '</ul>' +
      '<p><b>Plateforme :</b> <a href="' + esc_(lien) + '">' + esc_(lien) + '</a><br>' +
      '<b>Identifiant :</b> ' + esc_(login) + '<br>' +
      '<b>Mot de passe :</b> ' + esc_(mdp) + '</p>' +
      '<p>Vous serez ajouté(e) au groupe Facebook de la formation. Pour toute question, répondez à cet e-mail.</p>' +
      '<p>Bonne formation,<br>L’équipe AROO</p></div>';

    MailApp.sendEmail({
      to: r[col('email')], replyTo: CONFIG.ADMIN_EMAIL, name: CONFIG.SENDER_NAME,
      subject: 'AROO · Vos accès à la plateforme de formation', htmlBody: html
    });
    sh.getRange(i + 2, col('acces_envoye_le') + 1).setValue(new Date());
    sent++;
  });

  let msg = sent + ' e-mail(s) d’accès envoyé(s).';
  if (skipped.length) msg += '\nNon envoyés (lien, identifiant ou mot de passe manquant) : ' + skipped.join(', ');
  SpreadsheetApp.getUi().alert(msg);
}

// ---------------------------------------------------------------------
//  Outils
// ---------------------------------------------------------------------
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(CONFIG.TAB) || ss.insertSheet(CONFIG.TAB);
}

function ensureHeaders_(sh) {
  if (sh.getLastRow() === 0) sh.appendRow(FIELDS);
  let headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  const missing = FIELDS.filter(function (k) { return headers.indexOf(k) === -1; });
  if (missing.length) {
    sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }
  return headers;
}

function applyStatusValidation_(sh, headers) {
  const c = headers.indexOf('statut') + 1;
  if (!c) return;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(CONFIG.STATUTS, true).build();
  sh.getRange(2, c, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

function getFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recréé ci-dessous */ } }
  const it = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function saveProof_(d) {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  const mime = allowed.indexOf(d.justificatif_type) !== -1 ? d.justificatif_type : 'application/octet-stream';
  const bytes = Utilities.base64Decode(d.justificatif_base64);
  if (bytes.length > 10 * 1024 * 1024) throw new Error('Justificatif trop lourd');
  const stamp = Utilities.formatDate(new Date(), 'Indian/Antananarivo', 'yyyy-MM-dd_HHmm');
  const safeName = String(d.nom_prenom).replace(/[^\wÀ-ÿ -]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);
  const ext = (String(d.justificatif_nom || '').match(/\.[a-z0-9]{2,5}$/i) || [''])[0];
  const blob = Utilities.newBlob(bytes, mime, stamp + '_' + safeName + '_' + (d.structure_partenaire ? 'appartenance' : 'paiement') + ext);
  return getFolder_().createFile(blob);
}

function detectPartner_(name) {
  const norm = function (s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  };
  const n = norm(name);
  if (!n) return null;
  for (var i = 0; i < CONFIG.PARTENAIRES.length; i++) {
    const p = norm(CONFIG.PARTENAIRES[i]);
    if (p && n.indexOf(p) !== -1) return CONFIG.PARTENAIRES[i];
  }
  return null;
}

function formatAr_(n) {
  return Number(n || 0).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' Ar';
}
function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function safeCell_(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) v = v.join(' | ');
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}
function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
