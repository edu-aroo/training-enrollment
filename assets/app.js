(() => {
'use strict';
const form=document.getElementById('surveyForm'),steps=[...document.querySelectorAll('.step')],feedback=document.getElementById('feedback');
const next=document.getElementById('next'),back=document.getElementById('back'),submit=document.getElementById('submit');
let current=0,busy=false;
const choices=document.getElementById('courseChoices');
const affiliationType=document.getElementById('affiliationType');
const affiliationName=document.getElementById('affiliationName');
const affiliationNameBox=document.getElementById('affiliationNameBox');
function syncAffiliation(){
 const needsName=affiliationType.value!==''&&affiliationType.value!=='independant';
 affiliationNameBox.hidden=!needsName;
 affiliationName.required=needsName;
 if(!needsName) affiliationName.value='';
}
affiliationType.addEventListener('change',syncAffiliation);syncAffiliation();
const formatPrice=(amount)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(amount)+' Ar';
window.AROO_COURSES.forEach(([id,emoji,title,description,price])=>{
 const label=document.createElement('label');label.className='choice';
 const input=document.createElement('input');input.type='checkbox';input.name='formations';input.value=id;
 const text=document.createElement('span');text.className='choice-text';
 const heading=document.createElement('strong');heading.textContent=emoji+' '+title;
 const detail=document.createElement('small');detail.textContent=description;
 const priceTag=document.createElement('span');priceTag.className='course-price';priceTag.textContent=formatPrice(price);
 priceTag.setAttribute('aria-label','Tarif indicatif : '+formatPrice(price));
 text.append(heading,detail,priceTag);label.append(input,text);choices.append(label);
});
function show(i){current=i;steps.forEach((s,n)=>s.classList.toggle('active',n===i));document.getElementById('stepLabel').textContent=`Étape ${i+1} sur 3`;document.getElementById('percent').textContent=`${Math.round((i/3)*100)} %`;document.getElementById('bar').style.width=`${i/3*100}%`;back.hidden=i===0;next.hidden=i===2;submit.hidden=i!==2;feedback.textContent='';window.scrollTo({top:0,behavior:'smooth'});}
function validate(){feedback.textContent='';if(current===0){for(const el of steps[0].querySelectorAll('[required]')){if(!el.checkValidity()){feedback.textContent=el.validity.typeMismatch?'Vérifiez votre adresse e-mail.':'Merci de compléter les champs obligatoires.';el.focus();return false;}}}if(current===1&&!choices.querySelector('input:checked')){feedback.textContent='Choisissez au moins une formation qui vous intéresse.';return false;}if(current===2&&!document.getElementById('consent').checked){feedback.textContent='Votre accord est nécessaire pour envoyer vos réponses.';return false;}return true;}
next.addEventListener('click',()=>{if(validate())show(current+1)});back.addEventListener('click',()=>show(current-1));
form.addEventListener('submit',async e=>{e.preventDefault();if(busy||!validate())return;
const endpoint=(window.AROO_CONFIG.appsScriptUrl||'').trim();if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(endpoint)){feedback.textContent='Le formulaire n’est pas encore connecté : configurez l’URL Google Apps Script dans assets/config.js.';return;}
const data=Object.fromEntries(new FormData(form).entries());data.formations=[...choices.querySelectorAll('input:checked')].map(x=>x.value);
data.formations_tarifs_indicatifs=window.AROO_COURSES.filter(course=>data.formations.includes(course[0])).map(course=>course[0]+': '+formatPrice(course[4])).join(' | ');data.consent=true;data.submitted_at_client=new Date().toISOString();data.survey_version=window.AROO_CONFIG.surveyVersion;data.response_id=crypto.randomUUID?.()||('aroo-'+Date.now()+'-'+Math.random().toString(36).slice(2));data.website='';
busy=true;submit.disabled=true;submit.textContent='Envoi en cours…';feedback.textContent='';
try{ // Apps Script ne fournit généralement pas d'en-têtes CORS pour les réponses cross-origin.
 // Une requête no-cors ne permet PAS de confirmer l'enregistrement côté serveur.
 await fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(data)});
 form.hidden=true;document.getElementById('success').hidden=false;document.getElementById('bar').style.width='100%';document.getElementById('percent').textContent='100 %';document.getElementById('stepLabel').textContent='Parcours terminé';
 document.querySelector('#success p').textContent='Votre réponse a été transmise au service de collecte. Sa sauvegarde doit être vérifiée dans Google Sheets.';
}catch(err){feedback.textContent='L’envoi a échoué. Vérifiez votre connexion et réessayez. Vos réponses sont toujours dans le formulaire.';}
finally{busy=false;submit.disabled=false;submit.textContent='Envoyer mes réponses ✨';}
});
document.getElementById('restart').addEventListener('click',()=>location.reload());show(0);
})();
