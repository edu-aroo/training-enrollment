(() => {
  'use strict';

  const form = document.getElementById('surveyForm');
  const steps = [...document.querySelectorAll('.step')];
  const feedback = document.getElementById('feedback');
  const next = document.getElementById('next');
  const back = document.getElementById('back');
  const submit = document.getElementById('submit');
  const choices = document.getElementById('courseChoices');
  const affiliationType = document.getElementById('affiliationType');
  const affiliationName = document.getElementById('affiliationName');
  const affiliationNameBox = document.getElementById('affiliationNameBox');
  const leftVisual = document.getElementById('leftVisual');
  const rightVisual = document.getElementById('rightVisual');
  const leftVisualTitle = document.getElementById('leftVisualTitle');
  const rightVisualTitle = document.getElementById('rightVisualTitle');
  const leftVisualCaption = document.getElementById('leftVisualCaption');
  const rightVisualCaption = document.getElementById('rightVisualCaption');

  let current = 0;
  let busy = false;

  const STEP_VISUALS = [
    {
      left: {
        src: 'assets/step1-left.svg',
        alt: 'Illustration d’accueil avec une personne devant un ordinateur portable',
        title: 'Une expérience accueillante',
        caption: 'Un parcours chaleureux pour mieux connaître chaque participant et son contexte.'
      },
      right: {
        src: 'assets/step1-right.svg',
        alt: 'Illustration d’une fiche questionnaire structurée',
        title: 'Un questionnaire structuré',
        caption: 'Des questions claires et académiques, avec une présentation plus vivante et engageante.'
      }
    },
    {
      left: {
        src: 'assets/step2-left.svg',
        alt: 'Illustration d’un groupe suivant une formation',
        title: 'Des formations qui donnent envie',
        caption: 'Visualisez des ateliers dynamiques, pratiques et utiles pour votre montée en compétences.'
      },
      right: {
        src: 'assets/step2-right.svg',
        alt: 'Illustration d’outils d’analyse et de tableau de bord',
        title: 'Des compétences concrètes',
        caption: 'Analyse de données, outils numériques, vidéos ou enquêtes : choisissez ce qui vous inspire.'
      }
    },
    {
      left: {
        src: 'assets/step3-left.svg',
        alt: 'Illustration d’une personne et d’une fiche de profil',
        title: 'La dimension humaine compte',
        caption: 'Au-delà des données, AROO s’intéresse aussi aux personnes, à leurs envies et à leur énergie.'
      },
      right: {
        src: 'assets/step3-right.svg',
        alt: 'Illustration d’une petite communauté d’apprentissage',
        title: 'Une communauté d’apprentissage',
        caption: 'Vos réponses aideront à créer des formations utiles, conviviales et adaptées à la communauté.'
      }
    }
  ];

  function syncAffiliation() {
    const needsName = affiliationType.value !== '' && affiliationType.value !== 'independant';
    affiliationNameBox.hidden = !needsName;
    affiliationName.required = needsName;
    if (!needsName) affiliationName.value = '';
  }

  affiliationType.addEventListener('change', syncAffiliation);
  syncAffiliation();

  const formatPrice = (amount) => new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0
  }).format(amount) + ' Ar';

  window.AROO_COURSES.forEach(([id, emoji, title, description, price]) => {
    const label = document.createElement('label');
    label.className = 'choice';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'formations';
    input.value = id;

    const text = document.createElement('span');
    text.className = 'choice-text';

    const heading = document.createElement('strong');
    heading.textContent = emoji + ' ' + title;

    const detail = document.createElement('small');
    detail.textContent = description;

    const priceTag = document.createElement('span');
    priceTag.className = 'course-price';
    priceTag.textContent = formatPrice(price);
    priceTag.setAttribute('aria-label', 'Tarif indicatif : ' + formatPrice(price));

    text.append(heading, detail, priceTag);
    label.append(input, text);
    choices.append(label);
  });

  function updateVisuals(stepIndex) {
    const visual = STEP_VISUALS[stepIndex];
    if (!visual) return;

    leftVisual.src = visual.left.src;
    leftVisual.alt = visual.left.alt;
    leftVisualTitle.textContent = visual.left.title;
    leftVisualCaption.textContent = visual.left.caption;

    rightVisual.src = visual.right.src;
    rightVisual.alt = visual.right.alt;
    rightVisualTitle.textContent = visual.right.title;
    rightVisualCaption.textContent = visual.right.caption;
  }

  function show(i) {
    current = i;
    steps.forEach((step, n) => step.classList.toggle('active', n === i));
    document.getElementById('stepLabel').textContent = `Étape ${i + 1} sur 3`;
    document.getElementById('percent').textContent = `${Math.round((i / 3) * 100)} %`;
    document.getElementById('bar').style.width = `${(i / 3) * 100}%`;
    back.hidden = i === 0;
    next.hidden = i === 2;
    submit.hidden = i !== 2;
    feedback.textContent = '';
    updateVisuals(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validate() {
    feedback.textContent = '';

    if (current === 0) {
      for (const el of steps[0].querySelectorAll('[required]')) {
        if (!el.checkValidity()) {
          feedback.textContent = el.validity.typeMismatch
            ? 'Vérifiez votre adresse e-mail.'
            : 'Merci de compléter les champs obligatoires.';
          el.focus();
          return false;
        }
      }
    }

    if (current === 1 && !choices.querySelector('input:checked')) {
      feedback.textContent = 'Choisissez au moins une formation qui vous intéresse.';
      return false;
    }

    if (current === 2 && !document.getElementById('consent').checked) {
      feedback.textContent = 'Votre accord est nécessaire pour envoyer vos réponses.';
      return false;
    }

    return true;
  }

  next.addEventListener('click', () => {
    if (validate()) show(current + 1);
  });

  back.addEventListener('click', () => show(current - 1));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy || !validate()) return;

    const endpoint = (window.AROO_CONFIG.appsScriptUrl || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(endpoint)) {
      feedback.textContent = 'Le formulaire n’est pas encore connecté : configurez l’URL Google Apps Script dans assets/config.js.';
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    data.formations = [...choices.querySelectorAll('input:checked')].map((x) => x.value);
    data.formations_tarifs_indicatifs = window.AROO_COURSES
      .filter((course) => data.formations.includes(course[0]))
      .map((course) => course[0] + ': ' + formatPrice(course[4]))
      .join(' | ');
    data.consent = true;
    data.submitted_at_client = new Date().toISOString();
    data.survey_version = window.AROO_CONFIG.surveyVersion;
    data.response_id = crypto.randomUUID?.() || ('aroo-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    data.website = '';

    busy = true;
    submit.disabled = true;
    submit.textContent = 'Envoi en cours…';
    feedback.textContent = '';

    try {
      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });

      form.hidden = true;
      document.getElementById('success').hidden = false;
      document.getElementById('bar').style.width = '100%';
      document.getElementById('percent').textContent = '100 %';
      document.getElementById('stepLabel').textContent = 'Parcours terminé';
      document.querySelector('#success p').textContent = 'Votre réponse a été transmise au service de collecte. Sa sauvegarde doit être vérifiée dans Google Sheets.';
    } catch (err) {
      feedback.textContent = 'L’envoi a échoué. Vérifiez votre connexion et réessayez. Vos réponses sont toujours dans le formulaire.';
    } finally {
      busy = false;
      submit.disabled = false;
      submit.textContent = 'Envoyer mes réponses ✨';
    }
  });

  document.getElementById('restart').addEventListener('click', () => location.reload());
  show(0);
})();
