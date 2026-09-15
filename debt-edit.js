(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STORE='app';
  const STATE_KEY='state';
  const SUBJECTS=['Türkçe','Matematik','Geometri','Fizik','Kimya','Biyoloji','Tarih','Coğrafya','Felsefe','Din','Diğer'];
  const UNITS=['dakika','test','soru','sayfa','bölüm'];
  const RETURN_KEY='hakuna.returnToDebtsAfterEdit';

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
        req.onsuccess=()=>resolve(req.result||{});
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

  async function getDebt(id){
    const state=await readState();
    const debt=Array.isArray(state.debts)?state.debts.find(d=>String(d?.id)===String(id)):null;
    return {state,debt};
  }

  function closeModal(){
    document.querySelector('[data-hakuna-debt-edit-modal]')?.remove();
  }

  function modalShell(title,subtitle,body){
    closeModal();
    const root=document.createElement('div');
    root.setAttribute('data-hakuna-debt-edit-modal','');
    root.style.cssText='position:fixed;inset:0;z-index:12000;background:rgba(8,20,38,.52);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)';
    root.innerHTML=`<section role="dialog" aria-modal="true" style="width:min(470px,100%);max-height:min(760px,92vh);overflow:auto;background:#fff;color:#1c2a3a;border-radius:22px;padding:22px;box-sizing:border-box;box-shadow:0 25px 90px rgba(0,0,0,.28);position:relative">
      <button type="button" data-debt-modal-close aria-label="Kapat" style="position:absolute;right:14px;top:10px;border:0;background:transparent;font-size:27px;color:#7b8795;cursor:pointer;padding:6px 9px">×</button>
      <div style="font-size:11px;font-weight:900;letter-spacing:.08em;color:#708096;text-transform:uppercase;margin-bottom:5px">Haftalık borç</div>
      <h2 style="margin:0 42px 4px 0;font-size:22px;line-height:1.2">${esc(title)}</h2>
      <div style="font-size:13px;color:#6d7887;margin-bottom:18px">${esc(subtitle||'')}</div>
      <div data-debt-modal-body>${body}</div>
    </section>`;
    root.addEventListener('click',e=>{if(e.target===root)closeModal();});
    root.querySelector('[data-debt-modal-close]').onclick=closeModal;
    document.body.append(root);
    return root;
  }

  async function openDebtDetail(id){
    const {debt}=await getDebt(id);
    if(!debt)return;
    const root=modalShell(debt.title,`${debt.value} ${debt.unit} · ${debt.subject||'Diğer'}`,`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
        <button type="button" data-debt-schedule class="primary-btn" style="width:100%">📅 Programa koy</button>
        <button type="button" data-debt-edit class="secondary-btn" style="width:100%">✏️ Borcu düzenle</button>
      </div>`);
    root.querySelector('[data-debt-schedule]').onclick=()=>{
      closeModal();
      const button=document.querySelector(`[data-schedule-debt="${CSS.escape(String(id))}"]`);
      if(button)button.click();
    };
    root.querySelector('[data-debt-edit]').onclick=()=>openDebtEditor(id);
  }

  async function openDebtEditor(id){
    const {debt}=await getDebt(id);
    if(!debt)return;
    const root=modalShell('Borcu düzenle',debt.title,`
      <form data-debt-edit-form>
        <div class="form-grid">
          <div class="field"><label>Ders</label><select name="subject">${SUBJECTS.map(s=>`<option ${s===debt.subject?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="field"><label>Kalan</label><div class="inline-fields"><input type="number" min="0.25" step="0.25" name="value" value="${esc(debt.value)}" required><select name="unit">${UNITS.map(u=>`<option ${u===debt.unit?'selected':''}>${u}</option>`).join('')}</select></div></div>
          <div class="field full"><label>Görev</label><input name="title" value="${esc(debt.title)}" required></div>
        </div>
        <div class="form-actions" style="margin-top:18px"><button type="button" class="secondary-btn" data-debt-edit-cancel>Vazgeç</button><button type="submit" class="primary-btn">Kaydet</button></div>
      </form>`);
    root.querySelector('[data-debt-edit-cancel]').onclick=()=>openDebtDetail(id);
    root.querySelector('[data-debt-edit-form]').onsubmit=async e=>{
      e.preventDefault();
      const form=e.currentTarget;
      const btn=form.querySelector('button[type="submit"]');
      const fd=new FormData(form);
      const title=String(fd.get('title')||'').trim();
      const value=Number(fd.get('value'));
      if(!title||!(value>0))return;
      btn.disabled=true;
      try{
        const state=await readState();
        if(!Array.isArray(state.debts))state.debts=[];
        const target=state.debts.find(d=>String(d?.id)===String(id));
        if(!target)throw new Error('Borç bulunamadı.');
        target.title=title;
        target.subject=String(fd.get('subject')||'Diğer');
        target.value=value;
        target.unit=String(fd.get('unit')||'test');
        target.updatedAt=new Date().toISOString();
        await writeState(state);
        sessionStorage.setItem(RETURN_KEY,'1');
        location.reload();
      }catch(err){
        btn.disabled=false;
        alert(err?.message||'Borç güncellenemedi.');
      }
    };
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-schedule-debt],[data-delete-debt],[data-hakuna-debt-edit-modal]'))return;
    const row=e.target.closest?.('[data-debt-row]');
    if(!row)return;
    if(String(row.style.transform||'').includes('86px'))return;
    e.preventDefault();
    openDebtDetail(row.dataset.debtRow);
  });

  function restoreDebtsTab(){
    if(sessionStorage.getItem(RETURN_KEY)!=='1')return;
    sessionStorage.removeItem(RETURN_KEY);
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const tasks=document.querySelector('[data-nav="tasks"]');
      if(!tasks){if(tries>50)clearInterval(timer);return;}
      tasks.click();
      setTimeout(()=>document.querySelector('[data-task-tab="debts"]')?.click(),80);
      clearInterval(timer);
    },80);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restoreDebtsTab);
  else restoreDebtsTab();
})();
