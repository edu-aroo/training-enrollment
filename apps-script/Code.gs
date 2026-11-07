/** AROO survey collector. Bind this script to a Google Spreadsheet.
 * Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
 * Use the resulting /exec URL in assets/config.js.
 */
const TAB='Reponses';
const FIELDS=['response_id','horodatage_serveur','survey_version','submitted_at_client','nom_prenom','email','telephone','domaine','formations','loisir','plat_prefere','consent','affiliation_type','affiliation_nom','formations_tarifs_indicatifs'];
function doPost(e){
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  const d=JSON.parse(e.postData.contents||'{}');
  if(d.website)return reply({ok:true});
  if(!d.response_id||!d.nom_prenom||!d.email||!d.domaine||!d.affiliation_type||!d.consent||!Array.isArray(d.formations)||!d.formations.length||(d.affiliation_type!=='independant'&&!d.affiliation_nom))throw Error('Required data missing');
  const ss=SpreadsheetApp.getActiveSpreadsheet();let sh=ss.getSheetByName(TAB);if(!sh)sh=ss.insertSheet(TAB);
  if(sh.getLastRow()===0)sh.appendRow(FIELDS);
  // Migration douce si un Google Sheets existant dispose de l'ancien schéma.
  let headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const missing=FIELDS.filter(k=>!headers.includes(k));
  if(missing.length){sh.getRange(1,headers.length+1,1,missing.length).setValues([missing]);headers=headers.concat(missing);}
  const ids=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,1).getValues().flat():[];
  if(ids.includes(d.response_id))return reply({ok:true,duplicate:true});
  const row={...d,horodatage_serveur:new Date(),formations:d.formations.join(' | ')};
  sh.appendRow(headers.map(k=>safeCell(row[k])));
  return reply({ok:true});
 }catch(err){console.error(err);return reply({ok:false,error:String(err)});}finally{lock.releaseLock();}
}
function safeCell(value){if(value===null||value===undefined)return '';if(typeof value==='string'&&/^[=+\-@]/.test(value))return "'"+value;return value;}
function reply(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
