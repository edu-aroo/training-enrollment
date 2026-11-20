(() => {
  'use strict';

  const CFG = window.AROO_CONFIG;
  const COURSES = window.AROO_COURSES;
  const $ = (id) => document.getElementById(id);

  const form = $('enrolForm');
  const steps = [...document.querySelectorAll('.step')];
  const stepperItems = [...document.querySelectorAll('#stepper li')];
  const feedback = $('feedback');
  const btnNext = $('next'), btnBack = $('back'), btnSubmit = $('submit');
  const affType = $('affiliationType'), affName = $('affiliationName');

  const state = {
    step: 0,
    partner: null,          // nom de la structure partenaire reconnue, sinon null
    selected: new Set(),
    filter: 'Toutes',
    proof: null,            // { name, mime, base64, size, preview }
    busy: false
  };

  // ------------------------------------------------------------------
  //  Images et textes des panneaux latéraux (un couple par étape)
  //  Photos Unsplash (licence libre, chargées directement depuis Unsplash)
  //  et photos Freepik enregistrées dans assets/img/.
  // ------------------------------------------------------------------
  const unsplash = (id) => `https://images.unsplash.com/${id}?w=800&q=70&auto=format&fit=crop`;
  const VISUALS = [
    {
      left: {
        img: 'assets/img/atelier.jpg', alt: 'Participants échangeant autour d’ordinateurs portables pendant un atelier',
        tag: 'Étape 1', title: 'Des formations pratiques, en petit groupe',
        text: 'Chaque formation repose sur des exercices concrets et un groupe d’échange pour poser vos questions.'
      },
      right: {
        img: 'assets/img/formulaire.jpg', alt: 'Formulaire en ligne affiché sur un ordinateur portable',
        tag: 'Pourquoi ces informations ?', title: 'Vos accès arrivent par e-mail',
        list: ['E-mail : lien de la plateforme et identifiants', 'Facebook : ajout au groupe-forum de la formation', 'Structure : pour adapter les formations à votre contexte']
      }
    },
    {
      left: {
        img: unsplash('photo-1753613648242-6b6c5b88e4d1'), alt: 'Personne analysant des données sur un ordinateur portable',
        tag: 'Étape 2', title: 'Du script au résultat',
        text: 'R, statistiques, collecte avec KoboCollect : des compétences directement utiles pour vos mémoires, rapports et projets.'
      },
      right: {
        img: unsplash('photo-1682687982049-b3d433368cd1'), alt: 'Plongeur au-dessus d’un récif corallien',
        tag: 'Bon à savoir', title: '💡 Une opportunité à saisir',
        text: 'Ailleurs, chacune de ces formations coûte généralement entre 150 000 Ar et 500 000 Ar. Profitez-en pour acquérir des compétences précieuses sur la plateforme AROO.',
        list: ['Des exemples tirés des sciences marines', 'Formations indépendantes : choisissez librement', 'Plusieurs niveaux pour R et KoboCollect', 'Un certificat pour chaque formation réussie', 'Accompagnement en présentiel en cas d’échec à un niveau']
      }
    },
    {
      left: {
        img: unsplash('photo-1531791450705-029269398079'), alt: 'Personne tenant un smartphone',
        tag: 'Étape 3', title: 'Payer par Mobile Money',
        text: 'Faites le transfert depuis votre téléphone, puis faites une capture d’écran du message de confirmation.'
      },
      right: {
        img: 'assets/img/formulaire.jpg', alt: 'Formulaire en ligne affiché sur un ordinateur portable',
        tag: 'Vérification', title: 'Que se passe-t-il ensuite ?',
        list: ['E-mail de confirmation immédiat', 'Vérification du justificatif sous 24 h', 'Envoi du lien de la plateforme, de l’identifiant et du mot de passe']
      }
    },
    {
      left: {
        img: unsplash('photo-1682687981907-170c006e3744'), alt: 'Plongeur au-dessus d’un récif corallien coloré',
        tag: 'Étape 4', title: 'La recherche est aussi une aventure humaine',
        text: 'AROO est un espace de rencontre et de partage où chacun peut développer son potentiel et contribuer à une dynamique collective.'
      },
      right: {
        img: 'assets/img/atelier.jpg', alt: 'Participants échangeant pendant un atelier',
        tag: 'Communauté', title: 'Un groupe Facebook par formation',
        text: 'Après validation, vous serez ajouté(e) au groupe-forum de la formation pour échanger avec le formateur et les autres participants.'
      }
    }
  ];

  function setVisual(side, v) {
    const img = $(side + 'Img');
    img.src = v.img; img.alt = v.alt;
    $(side + 'Tag').textContent = v.tag;
    $(side + 'Title').textContent = v.title;
    const box = $(side + 'Text');
    box.textContent = '';
    // Texte et liste peuvent être combinés (texte d'abord, puis la liste).
    if (v.text) {
      if (v.list) box.append(el('span', 'visual-lead', v.text));
      else box.textContent = v.text;
    }
    if (v.list) {
      const ul = document.createElement('ul');
      v.list.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.append(li); });
      box.append(ul);
    }
  }
  // Si une photo en ligne ne charge pas, on affiche une photo locale.
  ['leftImg', 'rightImg'].forEach((id) => $(id).addEventListener('error', (e) => {
    if (!e.target.src.includes('assets/img/atelier.jpg')) e.target.src = 'assets/img/atelier.jpg';
  }));

  // ------------------------------------------------------------------
  //  Utilitaires
  // ------------------------------------------------------------------
  const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n).replace(/ | /g, ' ') + ' Ar';
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function detectPartner(name) {
    const n = norm(name);
    if (!n) return null;
    const hit = (CFG.structuresPartenaires || []).find((p) => norm(p) && n.includes(norm(p)));
    return hit || null;
  }
  const priceOf = (c) => (state.partner ? 0 : Number(c.prix) || 0);
  const selectedCourses = () => COURSES.filter((c) => state.selected.has(c.id));
  const total = () => selectedCourses().reduce((s, c) => s + priceOf(c), 0);

  // ------------------------------------------------------------------
  //  Étape 1 : structure / partenaire
  // ------------------------------------------------------------------
  function syncAffiliation() {
    const needsName = affType.value !== '' && affType.value !== 'independant';
    $('affiliationNameBox').hidden = !needsName;
    affName.required = needsName;
    if (!needsName) affName.value = '';
    syncPartner();
  }
  function syncPartner() {
    state.partner = detectPartner(affName.value);
    $('partnerNotice').hidden = !state.partner;
    renderCourses();
  }
  affType.addEventListener('change', syncAffiliation);
  affName.addEventListener('input', syncPartner);

  // ------------------------------------------------------------------
  //  Étape 2 : formations
  // ------------------------------------------------------------------
  (CFG.infosFormations || []).forEach((t) => $('courseInfo').append(el('li', null, t)));
  if (!(CFG.infosFormations || []).length) $('courseInfo').hidden = true;

  const categories = ['Toutes', ...new Set(COURSES.map((c) => c.categorie).filter(Boolean))];
  categories.forEach((cat) => {
    const b = el('button', null, cat);
    b.type = 'button'; b.setAttribute('role', 'tab');
    b.addEventListener('click', () => { state.filter = cat; renderCourses(); });
    $('filters').append(b);
  });

  const lvlClass = (l) => 'lvl-' + norm(l);

  function detailBlock(title, content, full) {
    if (!content || (Array.isArray(content) && !content.length)) return null;
    const box = el('div', full ? 'detail-full' : null);
    box.append(el('h4', null, title));
    if (Array.isArray(content)) {
      const ul = el('ul');
      content.forEach((t) => ul.append(el('li', null, t)));
      box.append(ul);
    } else box.append(el('p', null, content));
    return box;
  }

  function renderCourses() {
    const list = $('courseList');
    const openIds = new Set([...list.querySelectorAll('details[open]')].map((d) => d.dataset.id));
    list.textContent = '';

    [...$('filters').children].forEach((b) => b.setAttribute('aria-selected', String(b.textContent === state.filter)));

    COURSES.filter((c) => state.filter === 'Toutes' || c.categorie === state.filter).forEach((c) => {
      const locked = c.disponible === false;
      if (locked) state.selected.delete(c.id);
      const card = el('article', 'course' + (locked ? ' locked' : '') + (state.selected.has(c.id) ? ' selected' : ''));

      const head = el('label', 'course-head');
      const cb = el('input');
      cb.type = 'checkbox'; cb.value = c.id; cb.disabled = locked; cb.checked = state.selected.has(c.id);
      cb.setAttribute('aria-describedby', 'sum-' + c.id);
      cb.addEventListener('change', () => {
        cb.checked ? state.selected.add(c.id) : state.selected.delete(c.id);
        card.classList.toggle('selected', cb.checked);
        updateTotal();
      });

      const body = el('div');
      body.append(el('div', 'course-title', `${c.emoji || ''} ${c.titre}`.trim()));
      const meta = el('div', 'course-meta');
      if (c.niveau) meta.append(el('span', 'chip ' + lvlClass(c.niveau), c.niveau));
      if (c.categorie) meta.append(el('span', 'chip', c.categorie));
      if (c.duree) meta.append(el('span', 'chip', c.duree));
      if (locked) meta.append(el('span', 'chip locked', '🔒 ' + (c.messageIndisponible || 'Indisponible')));
      body.append(meta);
      const sum = el('p', 'course-sum', c.resume || '');
      sum.id = 'sum-' + c.id;
      body.append(sum);

      const price = el('div', 'price');
      if (state.partner) {
        price.append(el('strong', 'free', 'Gratuit'), el('s', null, fmt(c.prix)));
      } else {
        price.append(el('strong', null, fmt(c.prix)));
      }

      head.append(cb, body, price);
      card.append(head);

      const grid = el('div', 'detail-grid');
      [
        detailBlock('Objectifs', c.objectifs),
        detailBlock('Contenu', c.contenu),
        detailBlock('Prérequis', c.prerequis),
        detailBlock('Public', c.public),
        detailBlock('Format', c.format),
        detailBlock('Durée', c.duree),
        detailBlock('Certificat', c.certificat, true)
      ].filter(Boolean).forEach((b) => grid.append(b));

      if (grid.children.length) {
        const det = el('details');
        det.dataset.id = c.id;
        if (openIds.has(c.id)) det.open = true;
        det.append(el('summary', null, 'Programme détaillé'), grid);
        card.append(det);
      }
      list.append(card);
    });
    updateTotal();
  }

  function updateTotal() {
    const n = state.selected.size;
    $('totalCount').textContent = n ? `${n} formation${n > 1 ? 's' : ''} sélectionnée${n > 1 ? 's' : ''}` : 'Aucune formation sélectionnée';
    $('totalAmount').textContent = state.partner && n ? 'Gratuit' : fmt(total());
  }

  // ------------------------------------------------------------------
  //  Étape 3 : paiement / justificatif
  // ------------------------------------------------------------------
  const pay = CFG.paiement || { comptes: [] };
  pay.comptes.forEach((w) => {
    const card = el('div', 'wallet');
    const top = el('div', 'wallet-top');
    const logo = el('div', 'wallet-logo', w.nom);
    logo.style.background = w.couleur; logo.style.color = w.texte;
    if (w.logo) {
      const img = new Image();
      img.alt = 'Logo ' + w.nom;
      img.onload = () => { logo.textContent = ''; logo.style.background = '#fff'; logo.style.border = '1px solid #d5e0e8'; logo.append(img); };
      img.src = w.logo;
    }
    const txt = el('div');
    txt.append(el('div', 'wallet-name', w.nom), el('div', 'wallet-holder', 'Titulaire : ' + (pay.titulaire || '')));
    top.append(logo, txt);

    const num = el('div', 'wallet-num');
    num.append(el('span', null, w.numero));
    const copy = el('button', 'copy', 'Copier');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(w.numero.replace(/\s/g, '')); copy.textContent = 'Copié ✓'; }
      catch { copy.textContent = 'Sélectionnez'; }
      setTimeout(() => (copy.textContent = 'Copier'), 1800);
    });
    num.append(copy);
    card.append(top, num);
    $('wallets').append(card);

    const opt = el('option', null, w.nom); opt.value = w.nom;
    $('operator').append(opt);
  });

  function syncPaymentStep() {
    const isPartner = !!state.partner;
    $('payPartner').hidden = !isPartner;
    $('payStandard').hidden = isPartner;
    $('operator').required = !isPartner;
    $('partnerName').textContent = affName.value.trim();
    $('step3Title').textContent = isPartner ? 'Justificatif d’appartenance' : 'Paiement et preuve de paiement';
    $('proofLabel').innerHTML = isPartner
      ? 'Justificatif d’appartenance (carte, attestation…) <b>*</b>'
      : 'Capture d’écran du paiement Mobile Money <b>*</b>';
    const n = state.selected.size;
    $('amountDue').textContent = fmt(total());
    $('amountDetail').textContent = n > 1 ? selectedCourses().map((c) => fmt(c.prix)).join(' + ') : `1 formation`;
  }

  // Lecture et compression du fichier
  const MAX = (CFG.justificatifMaxMo || 8) * 1024 * 1024;
  const readAsDataURL = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });

  async function compressImage(file) {
    const url = await readAsDataURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  async function handleFile(file) {
    feedback.textContent = '';
    if (!file) return;
    const isImg = /^image\//.test(file.type), isPdf = file.type === 'application/pdf';
    if (!isImg && !isPdf) { feedback.textContent = 'Format non accepté : envoyez une image (JPG, PNG) ou un PDF.'; return; }
    if (file.size > MAX) { feedback.textContent = `Fichier trop lourd (max. ${CFG.justificatifMaxMo || 8} Mo).`; return; }
    try {
      let dataUrl, mime = file.type, name = file.name;
      if (isImg && file.type !== 'image/gif') {
        dataUrl = await compressImage(file);
        mime = 'image/jpeg';
        name = name.replace(/\.[^.]+$/, '') + '.jpg';
      } else {
        dataUrl = await readAsDataURL(file);
      }
      state.proof = { name, mime, base64: dataUrl.split(',')[1], preview: isImg ? dataUrl : null };
      const box = $('proofPreview');
      box.textContent = '';
      if (state.proof.preview) { const i = new Image(); i.src = state.proof.preview; i.alt = ''; box.append(i); }
      box.append(el('span', null, '✓ ' + file.name));
      const rm = el('button', 'copy', 'Retirer'); rm.type = 'button';
      rm.addEventListener('click', () => { state.proof = null; $('proof').value = ''; box.hidden = true; });
      box.append(rm);
      box.hidden = false;
    } catch {
      feedback.textContent = 'Impossible de lire ce fichier. Essayez une autre image ou un PDF.';
    }
  }
  $('proof').addEventListener('change', (e) => handleFile(e.target.files[0]));
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  // ------------------------------------------------------------------
  //  Étape 4 : identifiants AROO (nouveau compte ou compte existant)
  //  Les vérifications passent par le script Google (doGet) :
  //   ?action=check_username&u=…   et   ?action=check_email&email=…
  // ------------------------------------------------------------------
  const USER_RE = /^[A-Za-z0-9._-]{3,20}$/;
  const acct = {
    emailChecked: '',   // dernier e-mail vérifié
    hasAccount: null,   // true / false / null (inconnu)
    userState: 'idle'   // idle | checking | free | taken | invalid | unknown
  };
  const api = (params) => fetch((CFG.appsScriptUrl || '').trim() + '?' + new URLSearchParams(params))
    .then((r) => r.json());

  function setAccountMsg(text, cls) {
    const m = $('accountMsg');
    m.hidden = !text;
    if (text) { m.className = 'notice ' + cls; m.textContent = text; }
  }

  function syncAccountBox() {
    const box = $('hasAccount');
    box.disabled = acct.hasAccount === true;   // compte retrouvé : on garde ce compte
    $('newAccountBox').hidden = box.checked;
    if (state.step === 3) renderRecap();
    if (!box.checked) return setAccountMsg('');
    if (acct.hasAccount === true) {
      setAccountMsg(' 🔓Bonne nouvelle : nous avons retrouvé votre compte AROO avec cette adresse e-mail. Vous gardez votre identifiant et votre mot de passe habituels.', 'ok');
    } else if (acct.hasAccount === false) {
      setAccountMsg('🤔 Hmm, aucun compte AROO avec ' + $('email').value.trim() + '. Utilisez la même adresse e-mail que lors de votre première inscription (bouton « Retour »), ou décochez la case pour créer vos identifiants.', 'warn');
    } else {
      setAccountMsg('Nous retrouverons votre compte grâce à votre adresse e-mail : utilisez bien la même que lors de votre première inscription.', 'info');
    }
  }
  $('hasAccount').addEventListener('change', syncAccountBox);

  async function checkEmailAccount() {
    const email = $('email').value.trim().toLowerCase();
    if (!email || acct.emailChecked === email) return syncAccountBox();
    acct.emailChecked = email;
    acct.hasAccount = null;
    try { const j = await api({ action: 'check_email', email }); acct.hasAccount = j.ok ? !!j.hasAccount : null; }
    catch { acct.hasAccount = null; }
    if (acct.hasAccount) $('hasAccount').checked = true;
    syncAccountBox();
  }

  function renderUserStatus() {
    const s = $('usernameStatus');
    const msg = {
      idle: ['', '3 à 20 caractères : lettres, chiffres, point, tiret ou _ (sans espace).'],
      invalid: ['err', '3 à 20 caractères : lettres, chiffres, point, tiret ou _ (sans espace ni accent).'],
      checking: ['', 'Vérification…'],
      free: ['ok', '✓ Super, cet identifiant est libre !'],
      taken: ['err', '✗ Déjà pris… quelqu’un a eu la même idée géniale. Essayez une variante !'],
      unknown: ['', 'Vérification impossible pour l’instant : nous le ferons à l’envoi.']
    }[acct.userState];
    s.className = msg[0];
    s.textContent = msg[1];
  }

  let userTimer;
  $('username').addEventListener('input', () => {
    clearTimeout(userTimer);
    const u = $('username').value.trim();
    if (!u) acct.userState = 'idle';
    else if (!USER_RE.test(u)) acct.userState = 'invalid';
    else { acct.userState = 'checking'; userTimer = setTimeout(checkUsername, 450); }
    renderUserStatus();
    renderRecap();
  });
  async function checkUsername() {
    const u = $('username').value.trim();
    let next = 'unknown';
    try {
      const j = await api({ action: 'check_username', u });
      if (j.ok) next = !j.valid ? 'invalid' : (j.available ? 'free' : 'taken');
    } catch { /* réseau : on revérifiera à l’envoi */ }
    if (u !== $('username').value.trim()) return;   // l’utilisateur a continué à taper
    acct.userState = next;
    renderUserStatus();
  }

  $('showPass').addEventListener('change', (e) => {
    ['password', 'password2'].forEach((id) => ($(id).type = e.target.checked ? 'text' : 'password'));
  });

  function validateAccount() {
    if ($('hasAccount').checked) {
      if (acct.hasAccount === false) return 'Aucun compte AROO trouvé avec cette adresse e-mail : revenez à l’étape 1 pour la corriger, ou décochez « J’ai déjà un compte AROO ».';
      return '';
    }
    const u = $('username').value.trim();
    if (!USER_RE.test(u)) { $('username').focus(); return 'Choisissez un identifiant de 3 à 20 caractères (lettres, chiffres, point, tiret ou _).'; }
    if (acct.userState === 'checking') return 'Un instant, nous vérifions que votre identifiant est libre…';
    if (acct.userState === 'taken') { $('username').focus(); return 'Cet identifiant est déjà pris : choisissez-en un autre.'; }
    if ($('password').value.length < 6) { $('password').focus(); return 'Votre mot de passe doit contenir au moins 6 caractères.'; }
    if ($('password').value !== $('password2').value) { $('password2').focus(); return 'Les deux mots de passe ne sont pas identiques.'; }
    return '';
  }

  // ------------------------------------------------------------------
  //  Étape 4 : récapitulatif
  // ------------------------------------------------------------------
  function renderRecap() {
    const dl = el('dl');
    const add = (k, v) => { dl.append(el('dt', null, k)); const dd = el('dd'); typeof v === 'string' ? (dd.textContent = v) : dd.append(v); dl.append(dd); };
    add('Nom', $('name').value.trim());
    add('E-mail', $('email').value.trim());
    add('Téléphone', $('phone').value.trim());
    add('Facebook', $('facebook').value.trim());
    add('Structure', affName.value.trim() || affType.options[affType.selectedIndex].text);
    const ul = el('ul');
    selectedCourses().forEach((c) => ul.append(el('li', null, `${c.titre} — ${state.partner ? 'Gratuit' : fmt(c.prix)}`)));
    add('Formations', ul);
    add('Total', state.partner ? 'Gratuit (structure partenaire)' : fmt(total()));
    if (!state.partner) add('Paiement', $('operator').value + ($('reference').value.trim() ? ' · réf. ' + $('reference').value.trim() : ''));
    add('Justificatif', state.proof ? state.proof.name : '—');
    add('Identifiant', $('hasAccount').checked ? 'Compte AROO existant' : ($('username').value.trim() || '—'));
    $('recap').textContent = '';
    $('recap').append(dl);
  }

  // ------------------------------------------------------------------
  //  Navigation
  // ------------------------------------------------------------------
  function show(i, scroll = true) {
    state.step = i;
    steps.forEach((s, n) => s.classList.toggle('active', n === i));
    stepperItems.forEach((li, n) => { li.classList.toggle('active', n === i); li.classList.toggle('done', n < i); });
    btnBack.hidden = i === 0;
    btnNext.hidden = i === steps.length - 1;
    btnSubmit.hidden = i !== steps.length - 1;
    feedback.textContent = '';
    if (i === 2) syncPaymentStep();
    if (i === 3) { renderRecap(); checkEmailAccount(); }
    setVisual('left', VISUALS[i].left);
    setVisual('right', VISUALS[i].right);
    if (scroll) document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validate() {
    feedback.textContent = '';
    if (state.step === 0) {
      for (const f of steps[0].querySelectorAll('[required]')) {
        if (!f.value.trim() || !f.checkValidity()) {
          feedback.textContent = f.validity.typeMismatch ? 'Vérifiez votre adresse e-mail.' : 'Merci de compléter tous les champs obligatoires (*).';
          f.focus();
          return false;
        }
      }
    }
    if (state.step === 1 && !state.selected.size) {
      feedback.textContent = 'Choisissez au moins une formation.';
      return false;
    }
    if (state.step === 2) {
      if (!state.partner && !$('operator').value) { feedback.textContent = 'Indiquez le moyen de paiement utilisé.'; $('operator').focus(); return false; }
      if (!state.proof) {
        feedback.textContent = state.partner ? 'Joignez votre justificatif d’appartenance.' : 'Joignez la capture d’écran de votre paiement.';
        return false;
      }
    }
    if (state.step === 3) {
      const err = validateAccount();
      if (err) { feedback.textContent = err; return false; }
    }
    if (state.step === 3 && !$('consent').checked) {
      feedback.textContent = 'Votre accord est nécessaire pour envoyer l’inscription.';
      return false;
    }
    return true;
  }

  btnNext.addEventListener('click', () => { if (validate()) show(state.step + 1); });
  btnBack.addEventListener('click', () => show(state.step - 1));

  // ------------------------------------------------------------------
  //  Envoi
  // ------------------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.busy || !validate()) return;

    const endpoint = (CFG.appsScriptUrl || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(endpoint)) {
      feedback.textContent = 'Le formulaire n’est pas encore connecté : configurez l’URL Google Apps Script dans assets/config.js.';
      return;
    }

    const fd = Object.fromEntries(new FormData(form).entries());
    const courses = selectedCourses();
    const data = {
      ...fd,
      formations: courses.map((c) => c.id),
      formations_titres: courses.map((c) => c.titre).join(' | '),
      tarif: state.partner ? 'Partenaire (gratuit)' : 'Standard',
      structure_partenaire: state.partner || '',
      montant_total: total(),
      justificatif_nom: state.proof.name,
      justificatif_type: state.proof.mime,
      justificatif_base64: state.proof.base64,
      consent: true,
      submitted_at_client: new Date().toISOString(),
      survey_version: CFG.surveyVersion,
      response_id: (crypto.randomUUID && crypto.randomUUID()) || ('aroo-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
      website: ''
    };
    if (state.partner) { data.mode_paiement = ''; data.reference_paiement = ''; }
    data.compte_existant = $('hasAccount').checked;
    if (data.compte_existant) { data.identifiant = ''; data.mot_de_passe = ''; }
    else data.identifiant = $('username').value.trim();

    state.busy = true;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Envoi en cours…';

    const body = JSON.stringify(data);
    try {
      let ok = true, msg = '';
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
        const j = await r.json();
        ok = !!j.ok; msg = j.error || '';
      } catch (corsOrParse) {
        // Si la réponse n'est pas lisible (CORS), on renvoie en mode simple.
        // Le serveur ignore les doublons grâce à response_id.
        await fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
      }
      if (!ok) {
        if (/identifiant/i.test(msg)) { acct.userState = /pris/.test(msg) ? 'taken' : 'invalid'; renderUserStatus(); }
        const e2 = new Error(msg); e2.server = true; throw e2;
      }

      form.hidden = true;
      $('stepper').querySelectorAll('li').forEach((li) => { li.classList.remove('active'); li.classList.add('done'); });
      $('successText').textContent = `Merci ${$('name').value.trim()} ! Votre inscription à ${courses.length} formation${courses.length > 1 ? 's' : ''} a bien été transmise.`;
      $('success').hidden = false;
    } catch (err) {
      feedback.textContent = err && err.server && err.message
        ? err.message
        : 'L’envoi a échoué. Vérifiez votre connexion et réessayez : vos réponses sont conservées dans le formulaire.';
    } finally {
      state.busy = false;
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Envoyer mon inscription';
    }
  });

  $('restart').addEventListener('click', () => location.reload());
  $('contactLink').textContent = CFG.contactEmail;
  $('contactLink').href = 'mailto:' + CFG.contactEmail;

  syncAffiliation();
  show(0, false);
})();
