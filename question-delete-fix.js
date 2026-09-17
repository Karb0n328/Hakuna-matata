(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  const TOMBSTONE_PREFIX='__hakuna_deleted_question__:';
  const LOCAL_KEY='hakuna.deletedQuestionTombstones.v1';
  let deleting=false;

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('app'))req.result.createObjectStore('app');};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  function rememberDeletedLocally(id,deletedAt){
    try{
      const map=JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}');
      const safe=map&&typeof map==='object'&&!Array.isArray(map)?map:{};
      if(!safe[id] || String(safe[id])<String(deletedAt))safe[id]=deletedAt;
      localStorage.setItem(LOCAL_KEY,JSON.stringify(safe));
    }catch{}
  }

  async function deleteQuestion(id){
    const deletedAt=new Date().toISOString();
    rememberDeletedLocally(String(id),deletedAt);

    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('app','readwrite');
      const store=tx.objectStore('app');
      const req=store.get(STATE_KEY);
      let found=false;

      req.onsuccess=()=>{
        const state=req.result;
        if(!state){tx.abort();return reject(new Error('Hakuna verisi bulunamadı.'));}
        state.questions=Array.isArray(state.questions)?state.questions:[];
        const before=state.questions.length;
        state.questions=state.questions.filter(q=>String(q.id)!==String(id));
        found=state.questions.length!==before;

        // Deletion is data too. Keep a tombstone in the synced state so a stale
        // device/cloud revision cannot resurrect this question during ID merge.
        state[TOMBSTONE_PREFIX+String(id)]={deletedAt};
        store.put(state,STATE_KEY);
      };
      req.onerror=()=>reject(req.error);
      tx.oncomplete=()=>{db.close();resolve(found);};
      tx.onerror=()=>{db.close();reject(tx.error);};
      tx.onabort=()=>{db.close();};
    });
  }

  function toast(text){
    const root=document.getElementById('toastRoot');
    if(!root)return;
    const el=document.createElement('div');
    el.className='toast';
    el.textContent=text;
    root.append(el);
    setTimeout(()=>el.remove(),2400);
  }

  document.addEventListener('click',async e=>{
    const btn=e.target.closest?.('[data-q-delete]');
    if(!btn||deleting)return;
    const id=btn.dataset.qDelete;
    if(!id)return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    deleting=true;
    btn.disabled=true;

    try{
      const found=await deleteQuestion(id);
      window.HakunaDebtDeleteGuard?.markQuestionDeleted?.(id);
      if(!found){
        deleting=false;
        btn.disabled=false;
        return toast('Bu soru zaten silinmiş.');
      }
      if(window.HakunaCore?.refreshFromDB){
        await window.HakunaCore.refreshFromDB('questions');
        deleting=false;
        toast('Soru silindi.');
      }else{
        sessionStorage.setItem('hakuna.returnQuestions','1');
        sessionStorage.setItem('hakuna.questionMessage','Soru silindi.');
        location.reload();
      }
    }catch(err){
      console.error('Soru silinemedi',err);
      deleting=false;
      btn.disabled=false;
      toast('Soru silinemedi. Tekrar dene.');
    }
  },true);
})();
