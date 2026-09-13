const DB_NAME='hakuna-matata-db';
const DB_VERSION=1;
const STORE='app';
const STATE_KEY='state';
const TARGET_VERSION=3;
const BACKUP_KEY='migration_backup_latest';

function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function clone(v){return JSON.parse(JSON.stringify(v));}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function getValue(db,key){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function setValue(db,key,value){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function normalize(s){for(const k of ['blocks','tasks','debts','exams','questions','assistantMessages'])if(!Array.isArray(s[k]))s[k]=[];if(!s.settings||typeof s.settings!=='object')s.settings={};if(!s.selectedDate)s.selectedDate=todayISO();return s;}
function migrateV1toV2(input){const s=normalize(clone(input));s.version=2;return s;}
function migrateV2toV3(input){const s=normalize(clone(input));s.version=3;return s;}
const steps={1:migrateV1toV2,2:migrateV2toV3};

const db=await openDB();
let state=await getValue(db,STATE_KEY);
if(!state){
  state={version:TARGET_VERSION,selectedDate:todayISO(),blocks:[],tasks:[],debts:[],exams:[],questions:[],assistantMessages:[],settings:{firstRun:true}};
  await setValue(db,STATE_KEY,state);
}else{
  let version=Number(state.version);
  if(!Number.isInteger(version)||version<1)version=1;
  if(version<TARGET_VERSION){
    const original=clone(state);
    await setValue(db,BACKUP_KEY,{schema:'hakuna.migration-backup.v1',created_at:new Date().toISOString(),from_version:version,target_version:TARGET_VERSION,state:original});
    let working=clone(state);
    const from=version;
    while(version<TARGET_VERSION){
      const step=steps[version];
      if(typeof step!=='function')throw new Error(`Eksik geçiş v${version}`);
      working=step(working);
      version=Number(working.version);
    }
    await setValue(db,STATE_KEY,working);
    window.__HAKUNA_MIGRATION_RESULT__={migrated:true,from,to:version};
  }
}
window.HakunaDataGuard={version:TARGET_VERSION,latestMigrationBackup:()=>getValue(db,BACKUP_KEY)};
