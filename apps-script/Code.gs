/**
 * AROO · Collecte des inscriptions aux formations
 * ------------------------------------------------
 * Script lié à un Google Sheets.
 *  1. Enregistre chaque inscription dans l'onglet « Reponses ».
 *  2. Range le justificatif (capture de paiement ou preuve d'appartenance)
 *     dans un dossier Google Drive et met le lien dans le tableau.
 *  3. Envoie un e-mail de confirmation à l'inscrit et une alerte à l'organisatrice.
 *  4. Menu « AROO » dans le Sheets :
 *     a. « Attribuer les identifiants » : pour chaque ligne « Validé », reprend le
 *        compte existant de cet e-mail (onglet « Comptes ») ou en crée un, puis remplit
 *        identifiant, mot_de_passe et lien_plateforme. Les fichiers des cours
 *        (R, Kobo) récupèrent ces valeurs automatiquement (IMPORTRANGE).
 *     b. « Envoyer les accès » : fait l'étape a., puis envoie un e-mail avec
 *        le lien de CHAQUE formation choisie + l'identifiant + le mot de passe.
 *
 *  Un e-mail = un seul compte (même identifiant et mot de passe pour toutes les formations).
 *  Si vous tapez vous-même identifiant / mot_de_passe sur une ligne AVANT l'attribution,
 *  ils sont conservés (sauf si cet e-mail a déjà un compte : c'est alors le compte existant).
 *
 * Déploiement (après toute modification de ce fichier) :
 *   Déployer > Gérer les déploiements > ✏️ Modifier > Version : « Nouvelle version » > Déployer.
 *   (Ainsi l'URL /exec reste la même que dans assets/config.js.)
 *   Au premier lancement, Google demande d'autoriser Gmail et Drive : acceptez.
 */

const CONFIG = {
  TAB: 'Reponses',
  TAB_COMPTES: 'Comptes',
  ADMIN_EMAIL: 'aroo.madaeducation@gmail.com',
  SENDER_NAME: 'AROO Formations',
  DRIVE_FOLDER_NAME: 'AROO – Justificatifs inscriptions',
  DELAI_HEURES: 24,
  // Même liste que dans assets/config.js (vérifiée à nouveau côté serveur).
  PARTENAIRES: ['ZA SPaFi', 'SpaFi','IHSM', 'IH.SM', 'Institut Halieutique et des Sciences Marines'],
  STATUTS: ['À vérifier', 'Validé', 'Refusé'],

  // Durée de validité d'une inscription, à partir de l'envoi des accès (acces_envoye_le).
  // Le retrait des fichiers des cours est fait par les formules IMPORTRANGE (même durée : 30).
  VALIDITE_JOURS: 30,

  // Une entrée par formation. « prefix » = début des codes dans la colonne « formations » ;
  // « debutTitre » = début des titres dans « formations_titres » (pour lister les niveaux dans l'e-mail).
  // Nouvelle formation : ajoutez une ligne ici avec le même code que l'`id` dans assets/config.js.
  COURSES: [
    { id: 'r',    prefix: 'r_',    titre: 'Formation R',  debutTitre: 'Formation R ·',
      lien: 'https://edu-aroo.github.io/begin-R/',
      sheetId: '1cH8Z08POtOBsnDWoatGkeROev-rkfSZsTqQq3tHYpsU' },
    { id: 'kobo', prefix: 'kobo_', titre: 'Formation KoboToolbox / KoboCollect', debutTitre: 'KoboCollect',
      lien: 'https://edu-aroo.github.io/kobocollect/',
      sheetId: '13kCPdrQm-F_Z9q2ydNCproHedzxOZXS0Js0y545OMk8' },
    { id: 'stats', prefix: 'intro_stats_r', titre: 'Introduction à la statistique sur R',
      debutTitre: 'Introduction à la statistique',
      lien: 'https://edu-aroo.github.io/R-stat-introduction/',
      sheetId: '1MAc42f2z8ilvxOAPfjbyJUAsOb6Swl0RjkUFeed4jsE' } // ⚠️ collez ici l'ID du fichier Google Sheets du cours de statistiques
  ]
};

const FIELDS = [
  'response_id', 'horodatage_serveur', 'statut',
  'nom_prenom', 'email', 'telephone', 'facebook', 'domaine',
  'affiliation_type', 'affiliation_nom', 'tarif', 'structure_partenaire',
  'formations', 'formations_titres', 'montant_total',
  'mode_paiement', 'reference_paiement', 'justificatif_lien',
  'lien_plateforme', 'identifiant', 'mot_de_passe', 'acces_envoye_le',
  'loisir', 'plat_prefere', 'consent', 'survey_version', 'submitted_at_client',
  'compte_existant',
  // anciennes colonnes conservées si elles existent déjà
  'formations_tarifs_indicatifs'
];

// ---------------------------------------------------------------------
//  Réception d'une inscription  (inchangé)
// ---------------------------------------------------------------------
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return reply({ ok: true }); // pot de miel anti-robots

    const required = ['response_id', 'nom_prenom', 'email', 'telephone', 'domaine', 'affiliation_type', 'justificatif_base64'];
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

    // Identifiants choisis par l'inscrit (ou compte AROO existant)
    const hasAccount = !!loadAccounts_().byEmail[normEmail_(d.email)];
    if (d.compte_existant || hasAccount) {
      // Le compte existant (retrouvé par l'e-mail) est toujours prioritaire.
      d.compte_existant = hasAccount ? 'oui' : 'déclaré (non trouvé)';
      d.identifiant = ''; d.mot_de_passe = '';
    } else {
      d.compte_existant = '';
      d.identifiant = String(d.identifiant || '').trim();
      d.mot_de_passe = String(d.mot_de_passe || '');
      if (d.identifiant || d.mot_de_passe) {
        if (!USERNAME_RE.test(d.identifiant)) throw new Error('Identifiant non valide : 3 à 20 caractères (lettres, chiffres, point, tiret ou _), sans espace.');
        if (d.mot_de_passe.length < 6) throw new Error('Mot de passe trop court : 6 caractères minimum.');
        if (takenUsernames_(true)[d.identifiant.toLowerCase()]) throw new Error('Cet identifiant est déjà pris : choisissez-en un autre.');
      }
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
      formations: d.formations.join(' | '),
      // L'apostrophe force le texte (ex. mot de passe « 012345 » sans perte du 0).
      identifiant: d.identifiant ? "'" + d.identifiant : '',
      mot_de_passe: d.mot_de_passe ? "'" + d.mot_de_passe : ''
    });
    delete row.justificatif_base64;
    sh.appendRow(headers.map(function (k) { return safeCell_(row[k]); }));
    applyStatusValidation_(sh, headers);
    CacheService.getScriptCache().remove('taken_usernames');

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

// ---------------------------------------------------------------------
//  Vérifications appelées par le formulaire (GET)
//   ?action=check_username&u=...  → l'identifiant est-il libre ?
//   ?action=check_email&email=... → cet e-mail a-t-il déjà un compte AROO ?
// ---------------------------------------------------------------------
const USERNAME_RE = /^[A-Za-z0-9._-]{3,20}$/;

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'check_username') {
      const u = String(p.u || '').trim();
      if (!USERNAME_RE.test(u)) return reply({ ok: true, valid: false, available: false });
      return reply({ ok: true, valid: true, available: !takenUsernames_(false)[u.toLowerCase()] });
    }
    if (p.action === 'check_email') {
      return reply({ ok: true, hasAccount: !!loadAccounts_().byEmail[normEmail_(p.email)] });
    }
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message || err) });
  }
  return reply({ ok: true, service: 'AROO inscriptions' });
}

/**
 * Identifiants déjà utilisés (en minuscules) : onglet « Comptes », identifiants
 * choisis dans « Reponses » (sauf lignes refusées) et onglets « students » des
 * fichiers de cours (comptes ajoutés à la main : test01, aroo…).
 * Mis en cache 60 s pour que la vérification en direct reste rapide.
 */
function takenUsernames_(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    const hit = cache.get('taken_usernames');
    if (hit) return JSON.parse(hit);
  }
  const taken = {};
  const add = function (v) { v = String(v || '').trim().toLowerCase(); if (v) taken[v] = true; };

  const acc = loadAccounts_();
  Object.keys(acc.usernames).forEach(add);

  const sh = getSheet_();
  const headers = ensureHeaders_(sh);
  if (sh.getLastRow() > 1) {
    const cU = headers.indexOf('identifiant'), cS = headers.indexOf('statut');
    sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues().forEach(function (r) {
      if (String(r[cS]).trim() !== 'Refusé') add(r[cU]);
    });
  }

  CONFIG.COURSES.forEach(function (c) {
    if (!c.sheetId) return;
    try {
      const st = SpreadsheetApp.openById(c.sheetId).getSheetByName('students');
      if (st && st.getLastRow() > 1) st.getRange(2, 1, st.getLastRow() - 1, 1).getDisplayValues().forEach(function (r) { add(r[0]); });
    } catch (err) { console.error('Lecture ' + c.id, err); }
  });

  cache.put('taken_usernames', JSON.stringify(taken), 60);
  return taken;
}

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
    (d.compte_existant === 'oui'
      ? '<p><b>Compte :</b> vous utiliserez votre compte AROO habituel (même identifiant, même mot de passe).</p>'
      : (d.identifiant ? '<p><b>Identifiant choisi :</b> ' + esc_(d.identifiant) + '</p>' : '')) +
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
    (d.facebook ? 'Facebook : ' + esc_(d.facebook) + '<br>' : '') +
    'Structure : ' + esc_(d.affiliation_nom || d.affiliation_type) + ' — <b>' + esc_(d.tarif) + '</b><br>' +
    'Formations : ' + esc_(d.formations_titres) + '<br>' +
    'Montant : ' + esc_(formatAr_(d.montant_total)) +
    (d.mode_paiement ? ' · ' + esc_(d.mode_paiement) + (d.reference_paiement ? ' · réf. ' + esc_(d.reference_paiement) : '') : '') + '</p>' +
    '<p><a href="' + file.getUrl() + '">Ouvrir le justificatif</a> · <a href="' + url + '">Ouvrir le tableau</a></p>' +
    '<p>Pour envoyer les accès : passez le statut à « Validé », puis menu AROO › Envoyer les accès ' +
    '(identifiant, mot de passe et liens sont remplis automatiquement).</p></div>';
  MailApp.sendEmail({
    to: CONFIG.ADMIN_EMAIL,
    replyTo: d.email,
    name: CONFIG.SENDER_NAME,
    subject: '[AROO] Inscription à vérifier – ' + d.nom_prenom + ' (' + d.tarif + ')',
    htmlBody: html
  });
}

// ---------------------------------------------------------------------
//  Menu du Google Sheets
// ---------------------------------------------------------------------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('AROO')
    .addItem('1. Attribuer les identifiants (lignes « Validé »)', 'assignAccountsMenu')
    .addItem('2. Envoyer les accès (lignes « Validé »)', 'sendAccessToValidated')
    .addSeparator()
    .addItem('Recopier identifiants / mots de passe depuis « Comptes »', 'restoreFromComptes')
    .addItem('Préparer / mettre à jour les colonnes', 'setupSheet')
    .addToUi();
}

function setupSheet() {
  const sh = getSheet_();
  const headers = ensureHeaders_(sh);
  applyStatusValidation_(sh, headers);
  sh.setFrozenRows(1);
  getComptesSheet_();
}

/**
 * Remet dans « Reponses » (colonnes identifiant / mot_de_passe) les valeurs de l'onglet
 * « Comptes », pour chaque ligne dont l'e-mail a un compte. Les autres lignes ne changent pas.
 * Écrit des VALEURS : une éventuelle formule dans ces colonnes est remplacée.
 */
function restoreFromComptes() {
  const sh = getSheet_();
  const headers = ensureHeaders_(sh);
  const last = sh.getLastRow();
  if (last < 2) return;
  const cE = headers.indexOf('email') + 1;
  const cU = headers.indexOf('identifiant') + 1;
  const cP = headers.indexOf('mot_de_passe') + 1;
  const n = last - 1;
  const emails = sh.getRange(2, cE, n, 1).getValues();
  const users = sh.getRange(2, cU, n, 1).getDisplayValues();
  const pwds = sh.getRange(2, cP, n, 1).getDisplayValues();
  const store = loadAccounts_();
  let changed = 0;
  emails.forEach(function (r, i) {
    const acc = store.byEmail[normEmail_(r[0])];
    if (!acc) return;
    if (users[i][0] !== acc.username || pwds[i][0] !== acc.password) changed++;
    users[i][0] = "'" + acc.username;
    pwds[i][0] = "'" + acc.password;
  });
  sh.getRange(2, cU, n, 1).setValues(users);
  sh.getRange(2, cP, n, 1).setValues(pwds);
  SpreadsheetApp.getUi().alert(changed + ' ligne(s) recopiée(s) depuis « Comptes ».');
}

function assignAccountsMenu() {
  const n = assignAccounts_();
  SpreadsheetApp.getUi().alert(n + ' ligne(s) mise(s) à jour (identifiant, mot de passe, lien).');
}

// ---------------------------------------------------------------------
//  Comptes : un e-mail = un identifiant + un mot de passe
// ---------------------------------------------------------------------

/**
 * Pour chaque ligne « Validé » dont les accès n'ont pas encore été envoyés :
 * prend (ou crée) le compte de l'e-mail et remplit identifiant / mot_de_passe / lien_plateforme.
 * Les lignes déjà envoyées ne sont jamais modifiées ; leur compte est seulement
 * enregistré dans « Comptes » s'il n'y est pas encore (reprise de l'existant).
 * Retourne le nombre de lignes modifiées.
 */
function assignAccounts_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getSheet_();
    const headers = ensureHeaders_(sh);
    const col = function (k) { return headers.indexOf(k); };
    const last = sh.getLastRow();
    if (last < 2) return 0;
    const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
    const store = loadAccounts_();
    let changed = 0;

    // Passe 1 : reprendre les comptes déjà envoyés (pour ne pas les changer).
    values.forEach(function (r) {
      if (String(r[col('statut')]).trim() !== 'Validé' || !r[col('acces_envoye_le')]) return;
      const login = String(r[col('identifiant')]).trim();
      const mdp = String(r[col('mot_de_passe')]).trim();
      if (login && mdp) getOrCreateAccount_(store, r[col('email')], r[col('nom_prenom')], login, mdp);
    });

    // Passe 2 : lignes validées pas encore envoyées.
    values.forEach(function (r, i) {
      if (String(r[col('statut')]).trim() !== 'Validé' || r[col('acces_envoye_le')]) return;
      const courses = coursesFor_(r[col('formations')]);
      if (!courses.length || !String(r[col('email')]).trim()) return;

      const acc = getOrCreateAccount_(store, r[col('email')], r[col('nom_prenom')],
                                      String(r[col('identifiant')]).trim(),
                                      String(r[col('mot_de_passe')]).trim());
      const liens = courses.map(function (c) { return c.lien; }).join(' | ');
      const rowNum = i + 2;
      if (r[col('identifiant')] !== acc.username) sh.getRange(rowNum, col('identifiant') + 1).setValue("'" + acc.username);
      if (r[col('mot_de_passe')] !== acc.password) sh.getRange(rowNum, col('mot_de_passe') + 1).setValue("'" + acc.password);
      if (r[col('lien_plateforme')] !== liens) sh.getRange(rowNum, col('lien_plateforme') + 1).setValue(liens);
      changed++;
    });
    return changed;
  } finally {
    lock.releaseLock();
  }
}

/** Lit l'onglet « Comptes » : Email | Nom complet | Identifiant | Mot de passe | Créé le */
function loadAccounts_() {
  const sh = getComptesSheet_();
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [];
  const byEmail = {}, usernames = {};
  rows.forEach(function (r) {
    const email = normEmail_(r[0]);
    if (!email) return;
    byEmail[email] = { username: String(r[2]), password: String(r[3]) };
    usernames[String(r[2]).toLowerCase()] = true;
  });
  return { sh: sh, byEmail: byEmail, usernames: usernames };
}

/** Compte existant de l'e-mail, sinon nouveau compte (identifiant/mdp tapés à la main conservés si possible). */
function getOrCreateAccount_(store, email, fullName, manualLogin, manualPwd) {
  email = normEmail_(email);
  if (store.byEmail[email]) return store.byEmail[email];

  let username = manualLogin;
  if (!username || store.usernames[username.toLowerCase()]) username = makeUsername_(fullName, email, store.usernames);
  const password = manualPwd || makePassword_(8);

  store.sh.appendRow([email, fullName, "'" + username, "'" + password, new Date()]);
  store.byEmail[email] = { username: username, password: password };
  store.usernames[username.toLowerCase()] = true;
  return store.byEmail[email];
}

function getComptesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONFIG.TAB_COMPTES);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.TAB_COMPTES);
    sh.appendRow(['email', 'nom_prenom', 'identifiant', 'mot_de_passe', 'cree_le']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Identifiant = premier prénom sans accents, en minuscules (+ chiffres si déjà pris). */
function makeUsername_(fullName, email, taken) {
  const words = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  // Les noms de famille sont souvent en MAJUSCULES : on prend le premier mot qui ne l'est pas.
  let base = words.filter(function (w) { return w !== w.toUpperCase(); })[0] || words[0] || email.split('@')[0];
  base = base.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'etudiant';
  let u = base, n = 1;
  while (taken[u]) { n++; u = base + n; }
  return u;
}

/** Mot de passe aléatoire sans caractères ambigus (0/O, 1/l/I). */
function makePassword_(len) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p = '';
  for (let i = 0; i < len; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
  return p;
}

/** Formations choisies d'après les codes (ex. « r_debutant | kobo_avance »). */
function coursesFor_(codes) {
  const list = String(codes || '').split('|').map(function (s) { return s.trim(); });
  return CONFIG.COURSES.filter(function (c) {
    return list.some(function (code) { return code.indexOf(c.prefix) === 0; });
  });
}

function normEmail_(e) { return String(e || '').trim().toLowerCase(); }

// ---------------------------------------------------------------------
//  Envoi des accès
// ---------------------------------------------------------------------
function sendAccessToValidated() {
  assignAccounts_(); // identifiants + liens remplis automatiquement avant l'envoi

  const sh = getSheet_();
  const headers = ensureHeaders_(sh);
  const col = function (k) { return headers.indexOf(k); };
  const last = sh.getLastRow();
  if (last < 2) return;
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  let sent = 0, skipped = [];

  values.forEach(function (r, i) {
    if (String(r[col('statut')]).trim() !== 'Validé' || r[col('acces_envoye_le')]) return;
    const login = String(r[col('identifiant')]).trim();
    const mdp = String(r[col('mot_de_passe')]).trim();
    const courses = coursesFor_(r[col('formations')]);
    if (!courses.length || !login || !mdp) { skipped.push(r[col('nom_prenom')]); return; }

    const titres = String(r[col('formations_titres')] || '').split(' | ');
    const blocs = courses.map(function (c) {
      const niveaux = titres.filter(function (t) { return t.trim().indexOf(c.debutTitre) === 0; });
      return '<p style="margin:0 0 12px"><b>' + esc_(c.titre) + '</b>' +
        (niveaux.length ? '<br><span style="color:#4a5b6c">' + niveaux.map(esc_).join('<br>') + '</span>' : '') +
        '<br>Plateforme : <a href="' + esc_(c.lien) + '">' + esc_(c.lien) + '</a></p>';
    }).join('');

    const html =
      '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#10243a;max-width:600px">' +
      '<p>Bonjour ' + esc_(r[col('nom_prenom')]) + ',</p>' +
      '<p>Votre inscription est validée. Bienvenue !</p>' +
      blocs +
      '<p style="background:#eef5fb;padding:10px 12px;border-radius:8px">' +
      '<b>Identifiant :</b> ' + esc_(login) + '<br>' +
      '<b>Mot de passe :</b> ' + esc_(mdp) +
      (courses.length > 1 ? '<br><i>Le même identifiant et le même mot de passe servent pour toutes vos formations.</i>' : '') +
      '</p>' +
      '<p style="background:#fff4e0;padding:10px 12px;border-radius:8px">Votre accès est valable <b>' +
      CONFIG.VALIDITE_JOURS + ' jours</b>, jusqu’au <b>' +
      Utilities.formatDate(new Date(Date.now() + CONFIG.VALIDITE_JOURS * 86400000), 'Indian/Antananarivo', 'dd/MM/yyyy') +
      '</b>.</p>' +
      '<p>Pour toute question, répondez à cet e-mail.</p>' +
      '<p>Bonne formation,<br>L’équipe AROO</p></div>';

    MailApp.sendEmail({
      to: r[col('email')], replyTo: CONFIG.ADMIN_EMAIL, name: CONFIG.SENDER_NAME,
      subject: 'AROO · Vos accès à la plateforme de formation', htmlBody: html
    });
    sh.getRange(i + 2, col('acces_envoye_le') + 1).setValue(new Date());
    sent++;
  });

  let msg = sent + ' e-mail(s) d’accès envoyé(s).';
  if (skipped.length) msg += '\nNon envoyés (formation non reconnue ou identifiant manquant) : ' + skipped.join(', ');
  SpreadsheetApp.getUi().alert(msg);
}

// ---------------------------------------------------------------------
//  Outils  (inchangé)
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
  return Number(n || 0).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' Ar';
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
