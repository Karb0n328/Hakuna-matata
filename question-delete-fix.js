(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  let deleting=false;

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('app'))req.result.createObjectStore('app');};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function deleteQuestion(id){
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
        if(found)store.put(state,STATE_KEY);
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
    setTimeout(()=>el.remove(),2800);
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
      if(!found){
        deleting=false;
        btn.disabled=false;
        return toast('Bu soru zaten silinmiş.');
      }
      sessionStorage.setItem('hakuna.returnQuestions','1');
      sessionStorage.setItem('hakuna.questionMessage','Soru silindi.');
      location.reload();
    }catch(err){
      console.error('Soru silinemedi',err);
      deleting=false;
      btn.disabled=false;
      toast('Soru silinemedi. Tekrar dene.');
    }
  },true);
})();
