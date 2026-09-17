(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STORE='app';
  const STATE_KEY='state';
  const TOMBSTONE_PREFIX='__hakuna_deleted_debt__:';
  const LOCAL_KEY='hakuna.deletedDebtTombstones.v1';

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

  function readLocalTombstones(){
    try{
      const value=JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{return {};}
  }

  function writeLocalTombstones(value){
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify(value));}catch{}
  }

  function rememberDeleted(id,deletedAt=new Date().toISOString()){
    id=String(id||'').trim();
    if(!id)return;
    const map=readLocalTombstones();
    if(!map[id] || String(map[id])<String(deletedAt)){
      map[id]=deletedAt;
      writeLocalTombstones(map);
    }
  }

  function tombstoneId(key){
    return String(key).startsWith(TOMBSTONE_PREFIX)?String(key).slice(TOMBSTONE_PREFIX.length):'';
  }

  async function reconcile(){
    if(busy)return;
    busy=true;
    try{
      const state=await readState();
      if(!state||typeof state!=='object')return;

      const local=readLocalTombstones();
      let localChanged=false;
      let stateChanged=false;

      // Tombstones received from cloud are also kept locally. This protects a
      // deletion even if a later account reconcile temporarily replaces state.
      for(const [key,value] of Object.entries(state)){
        const id=tombstoneId(key);
        if(!id)continue;
        const deletedAt=typeof value==='string'?value:(value?.deletedAt||new Date().toISOString());
        if(!local[id] || String(local[id])<String(deletedAt)){
          local[id]=deletedAt;
          localChanged=true;
        }
      }

      // Each deleted debt is stored as its own top-level key. The existing
      // cloud merge spreads remote + local objects, so different tombstones
      // naturally survive/union even during revision conflicts.
      for(const [id,deletedAt] of Object.entries(local)){
        const key=TOMBSTONE_PREFIX+id;
        const current=state[key];
        const currentAt=typeof current==='string'?current:current?.deletedAt;
        if(!currentAt || String(currentAt)<String(deletedAt)){
          state[key]={deletedAt:String(deletedAt)};
          stateChanged=true;
        }
      }

      const deletedIds=new Set(Object.keys(state).map(tombstoneId).filter(Boolean));
      if(Array.isArray(state.debts)&&deletedIds.size){
        const before=state.debts.length;
        state.debts=state.debts.filter(d=>!deletedIds.has(String(d?.id||'')));
        if(state.debts.length!==before)stateChanged=true;
      }

      if(localChanged)writeLocalTombstones(local);
      if(stateChanged)await writeState(state);
    }catch(err){
      console.warn('Hakuna debt deletion guard',err);
    }finally{
      busy=false;
    }
  }

  function markDeleted(id){
    id=String(id||'').trim();
    if(!id)return;
    rememberDeleted(id);
    // Re-assert after the normal UI mutation finishes. LocalStorage is written
    // synchronously first, so even a racing IndexedDB save cannot lose intent.
    setTimeout(reconcile,80);
    setTimeout(reconcile,500);
  }

  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('[data-delete-debt]');
    if(btn)markDeleted(btn.dataset.deleteDebt);
  },true);

  window.HakunaDebtDeleteGuard={markDeleted,reconcile};

  const schedule=()=>{
    clearTimeout(timer);
    timer=setTimeout(reconcile,120);
  };
  window.addEventListener('online',schedule);
  window.addEventListener('focus',schedule);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule();});

  reconcile();
  setInterval(reconcile,1500);
})();
