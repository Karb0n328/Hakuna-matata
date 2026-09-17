(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STORE='app';
  const STATE_KEY='state';
  const TYPES={
    debt:{collection:'debts',prefix:'__hakuna_deleted_debt__:',localKey:'hakuna.deletedDebtTombstones.v1'},
    question:{collection:'questions',prefix:'__hakuna_deleted_question__:',localKey:'hakuna.deletedQuestionTombstones.v1'}
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

  function readLocal(type){
    try{
      const value=JSON.parse(localStorage.getItem(TYPES[type].localKey)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{return {};}
  }

  function writeLocal(type,value){
    try{localStorage.setItem(TYPES[type].localKey,JSON.stringify(value));}catch{}
  }

  function rememberDeleted(type,id,deletedAt=new Date().toISOString()){
    if(!TYPES[type])return;
    id=String(id||'').trim();
    if(!id)return;
    const map=readLocal(type);
    if(!map[id] || String(map[id])<String(deletedAt)){
      map[id]=deletedAt;
      writeLocal(type,map);
    }
  }

  function idFromKey(type,key){
    const prefix=TYPES[type].prefix;
    return String(key).startsWith(prefix)?String(key).slice(prefix.length):'';
  }

  async function reconcile(){
    if(busy)return;
    busy=true;
    try{
      const state=await readState();
      if(!state||typeof state!=='object')return;

      let stateChanged=false;
      let visibleDataChanged=false;

      for(const type of Object.keys(TYPES)){
        const cfg=TYPES[type];
        const local=readLocal(type);
        let localChanged=false;

        // Tombstones arriving from cloud are persisted on the device too.
        for(const [key,value] of Object.entries(state)){
          const id=idFromKey(type,key);
          if(!id)continue;
          const deletedAt=typeof value==='string'?value:(value?.deletedAt||new Date().toISOString());
          if(!local[id] || String(local[id])<String(deletedAt)){
            local[id]=deletedAt;
            localChanged=true;
          }
        }

        // Re-assert local deletion intent into state. Top-level tombstone keys
        // survive the existing cloud object merge even when array records union.
        for(const [id,deletedAt] of Object.entries(local)){
          const key=cfg.prefix+id;
          const current=state[key];
          const currentAt=typeof current==='string'?current:current?.deletedAt;
          if(!currentAt || String(currentAt)<String(deletedAt)){
            state[key]={deletedAt:String(deletedAt)};
            stateChanged=true;
          }
        }

        const deletedIds=new Set(Object.keys(state).map(key=>idFromKey(type,key)).filter(Boolean));
        if(Array.isArray(state[cfg.collection])&&deletedIds.size){
          const before=state[cfg.collection].length;
          state[cfg.collection]=state[cfg.collection].filter(item=>!deletedIds.has(String(item?.id||'')));
          if(state[cfg.collection].length!==before){
            stateChanged=true;
            visibleDataChanged=true;
          }
        }

        if(localChanged)writeLocal(type,local);
      }

      if(stateChanged){
        await writeState(state);
        if(visibleDataChanged && window.HakunaCore?.refreshFromDB){
          await window.HakunaCore.refreshFromDB();
        }
      }
    }catch(err){
      console.warn('Hakuna deletion guard',err);
    }finally{
      busy=false;
    }
  }

  function markDeleted(type,id){
    if(!TYPES[type])return;
    id=String(id||'').trim();
    if(!id)return;
    rememberDeleted(type,id);
    setTimeout(reconcile,50);
    setTimeout(reconcile,250);
    setTimeout(reconcile,900);
  }

  document.addEventListener('click',event=>{
    const debtBtn=event.target.closest?.('[data-delete-debt]');
    if(debtBtn)markDeleted('debt',debtBtn.dataset.deleteDebt);

    const questionBtn=event.target.closest?.('[data-q-delete]');
    if(questionBtn)markDeleted('question',questionBtn.dataset.qDelete);
  },true);

  window.HakunaDebtDeleteGuard={
    markDeleted:id=>markDeleted('debt',id),
    markQuestionDeleted:id=>markDeleted('question',id),
    reconcile
  };

  const schedule=()=>{
    clearTimeout(timer);
    timer=setTimeout(reconcile,100);
  };
  window.addEventListener('online',schedule);
  window.addEventListener('focus',schedule);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule();});

  reconcile();
  setInterval(reconcile,1200);
})();
