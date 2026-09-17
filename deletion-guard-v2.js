(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STORE='app';
  const STATE_KEY='state';
  const GENERIC_PREFIX='__hakuna_deleted_item__:';
  const JOURNAL_KEY='hakuna.deletionJournal.v2';
  const SNAPSHOT_KEY='hakuna.deletionSnapshot.v2';
  const MAX_AGE_MS=180*24*60*60*1000;
  const COLLECTIONS=['blocks','tasks','debts','exams','questions','planItems'];
  const LEGACY={
    debts:{statePrefix:'__hakuna_deleted_debt__:',localKey:'hakuna.deletedDebtTombstones.v1'},
    questions:{statePrefix:'__hakuna_deleted_question__:',localKey:'hakuna.deletedQuestionTombstones.v1'}
  };

  let busy=false;
  let timer=null;

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function readState(){
    const db=await openDb();
    try{
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly');
        const req=tx.objectStore(STORE).get(STATE_KEY);
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>reject(req.error);
      });
    }finally{db.close();}
  }

  async function writeState(state){
    const db=await openDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put(state,STATE_KEY);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
      });
    }finally{db.close();}
  }

  function blankJournal(){
    const out={};
    for(const collection of COLLECTIONS)out[collection]={};
    return out;
  }

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value??fallback;
    }catch{return fallback;}
  }

  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}catch{}
  }

  function normalizeJournal(raw){
    const out=blankJournal();
    const cutoff=Date.now()-MAX_AGE_MS;
    if(raw&&typeof raw==='object'){
      for(const collection of COLLECTIONS){
        const source=raw[collection];
        if(!source||typeof source!=='object'||Array.isArray(source))continue;
        for(const [id,stamp] of Object.entries(source)){
          const ts=String(stamp||'');
          const ms=Date.parse(ts);
          if(!id||!ts||!Number.isFinite(ms)||ms<cutoff)continue;
          out[collection][String(id)]=ts;
        }
      }
    }
    return out;
  }

  function readJournal(){
    const journal=normalizeJournal(readJson(JOURNAL_KEY,{}));
    for(const [collection,cfg] of Object.entries(LEGACY)){
      const legacy=readJson(cfg.localKey,{});
      if(!legacy||typeof legacy!=='object'||Array.isArray(legacy))continue;
      for(const [id,stamp] of Object.entries(legacy))rememberIn(journal,collection,id,stamp);
    }
    return journal;
  }

  function rememberIn(journal,collection,id,deletedAt=new Date().toISOString()){
    if(!COLLECTIONS.includes(collection))return false;
    id=String(id||'').trim();
    if(!id)return false;
    const ts=String(deletedAt||new Date().toISOString());
    const current=journal[collection][id];
    if(!current||String(current)<ts){
      journal[collection][id]=ts;
      return true;
    }
    return false;
  }

  function genericKey(collection,id){
    return `${GENERIC_PREFIX}${collection}:${encodeURIComponent(String(id))}`;
  }

  function parseGenericKey(key){
    key=String(key||'');
    if(!key.startsWith(GENERIC_PREFIX))return null;
    const rest=key.slice(GENERIC_PREFIX.length);
    const sep=rest.indexOf(':');
    if(sep<1)return null;
    const collection=rest.slice(0,sep);
    if(!COLLECTIONS.includes(collection))return null;
    try{return {collection,id:decodeURIComponent(rest.slice(sep+1))};}catch{return null;}
  }

  function timestampOf(value){
    if(typeof value==='string')return value;
    if(value&&typeof value==='object'&&value.deletedAt)return String(value.deletedAt);
    return new Date().toISOString();
  }

  function snapshotOf(state){
    const out={};
    for(const collection of COLLECTIONS){
      out[collection]=(Array.isArray(state?.[collection])?state[collection]:[])
        .map(item=>item?.id==null?'':String(item.id))
        .filter(Boolean);
    }
    return out;
  }

  function readSnapshot(){
    const value=readJson(SNAPSHOT_KEY,null);
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const out={};
    for(const collection of COLLECTIONS){
      out[collection]=Array.isArray(value[collection])?value[collection].map(String):[];
    }
    return out;
  }

  function importStateTombstones(state,journal){
    let changed=false;
    for(const [key,value] of Object.entries(state||{})){
      const parsed=parseGenericKey(key);
      if(parsed){
        if(rememberIn(journal,parsed.collection,parsed.id,timestampOf(value)))changed=true;
        continue;
      }
      for(const [collection,cfg] of Object.entries(LEGACY)){
        if(String(key).startsWith(cfg.statePrefix)){
          const id=String(key).slice(cfg.statePrefix.length);
          if(rememberIn(journal,collection,id,timestampOf(value)))changed=true;
        }
      }
    }
    return changed;
  }

  function detectDisappearances(state,journal,previous){
    if(!previous)return false;
    let changed=false;
    const current=snapshotOf(state);
    const now=new Date().toISOString();
    for(const collection of COLLECTIONS){
      const present=new Set(current[collection]);
      for(const id of previous[collection]||[]){
        if(!present.has(String(id))){
          if(rememberIn(journal,collection,id,now))changed=true;
        }
      }
    }
    return changed;
  }

  function reassertTombstones(state,journal){
    let changed=false;
    for(const collection of COLLECTIONS){
      for(const [id,deletedAt] of Object.entries(journal[collection])){
        const key=genericKey(collection,id);
        const current=state[key];
        const currentAt=current&&typeof current==='object'?current.deletedAt:current;
        if(!currentAt||String(currentAt)<String(deletedAt)){
          state[key]={deletedAt:String(deletedAt)};
          changed=true;
        }
      }
    }
    return changed;
  }

  function applyTombstones(state,journal){
    let changed=false;
    for(const collection of COLLECTIONS){
      if(!Array.isArray(state[collection]))continue;
      const deleted=new Set(Object.keys(journal[collection]));
      if(!deleted.size)continue;
      const before=state[collection].length;
      state[collection]=state[collection].filter(item=>!deleted.has(String(item?.id||'')));
      if(state[collection].length!==before)changed=true;
    }
    return changed;
  }

  async function reconcile(){
    if(busy)return;
    busy=true;
    try{
      const state=await readState();
      if(!state||typeof state!=='object')return;

      const journal=readJournal();
      const previous=readSnapshot();
      let stateChanged=false;
      let journalChanged=false;
      let visibleChanged=false;

      if(importStateTombstones(state,journal))journalChanged=true;
      if(detectDisappearances(state,journal,previous))journalChanged=true;
      if(reassertTombstones(state,journal))stateChanged=true;
      if(applyTombstones(state,journal)){
        stateChanged=true;
        visibleChanged=true;
      }

      if(journalChanged)writeJson(JOURNAL_KEY,journal);
      else writeJson(JOURNAL_KEY,journal);

      if(stateChanged)await writeState(state);
      writeJson(SNAPSHOT_KEY,snapshotOf(state));

      if(visibleChanged&&window.HakunaCore?.refreshFromDB){
        await window.HakunaCore.refreshFromDB();
      }
    }catch(err){
      console.warn('Hakuna deletion journal',err);
    }finally{
      busy=false;
    }
  }

  function mark(collection,id,deletedAt=new Date().toISOString()){
    if(!COLLECTIONS.includes(collection))return;
    id=String(id||'').trim();
    if(!id)return;
    const journal=readJournal();
    rememberIn(journal,collection,id,deletedAt);
    writeJson(JOURNAL_KEY,journal);
    scheduleBurst();
  }

  function scheduleBurst(){
    clearTimeout(timer);
    timer=setTimeout(reconcile,40);
    setTimeout(reconcile,160);
    setTimeout(reconcile,500);
    setTimeout(reconcile,1200);
  }

  document.addEventListener('click',event=>{
    const task=event.target.closest?.('[data-delete-task]');
    if(task?.dataset.deleteTask)mark('tasks',task.dataset.deleteTask);

    const debt=event.target.closest?.('[data-delete-debt]');
    if(debt?.dataset.deleteDebt)mark('debts',debt.dataset.deleteDebt);

    const question=event.target.closest?.('[data-q-delete]');
    if(question?.dataset.qDelete)mark('questions',question.dataset.qDelete);

    const planDelete=event.target.closest?.('[data-hm-delete]');
    if(planDelete){
      const key=planDelete.closest?.('[data-hm-item]')?.dataset.hmItem||'';
      const [kind,id]=String(key).split(':');
      if(kind==='plan'&&id)mark('planItems',id);
    }

    if(event.target.closest?.('[data-delete-block],[data-delete-exam],[data-mata-apply],[data-status="complete"],[data-hm-status="complete"]')){
      scheduleBurst();
    }
  },true);

  window.HakunaDeletionGuard={mark,reconcile,collections:[...COLLECTIONS]};
  window.HakunaDebtDeleteGuard={
    markDeleted:id=>mark('debts',id),
    markQuestionDeleted:id=>mark('questions',id),
    reconcile
  };

  window.addEventListener('online',scheduleBurst);
  window.addEventListener('focus',scheduleBurst);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleBurst();});

  reconcile();
  setInterval(reconcile,900);
})();
