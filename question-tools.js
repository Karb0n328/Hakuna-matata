(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  let enhanceQueued=false;

  const uid=(prefix='q')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('app'))req.result.createObjectStore('app');};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function readState(){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('app','readonly');
      const req=tx.objectStore('app').get(STATE_KEY);
      req.onsuccess=()=>resolve({db,state:req.result||null});
      req.onerror=()=>{db.close();reject(req.error);};
    });
  }

  async function updateState(mutator){
    const holder=await readState();
    const {db,state}=holder;
    if(!state){db.close();throw new Error('Hakuna verisi bulunamadı.');}
    state.questions=Array.isArray(state.questions)?state.questions:[];
    mutator(state);
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('app','readwrite');
      tx.objectStore('app').put(state,STATE_KEY);
      tx.oncomplete=()=>{db.close();resolve(state);};
      tx.onerror=()=>{db.close();reject(tx.error);};
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

  function parseReferences(raw){
    const text=String(raw||'').trim();
    if(!text)return [];
    let parts=text.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);
    if(parts.length===1 && /^\d+(?:\s+\d+)+$/.test(parts[0]))parts=parts[0].split(/\s+/);
    return parts.map(x=>/^\d+$/.test(x)?`Sayfa ${x}`:x);
  }

  function closeModal(){
    const root=document.getElementById('modalRoot');
    if(root)root.innerHTML='';
  }

  async function returnToQuestions(message){
    closeModal();
    if(window.HakunaCore?.refreshFromDB){
      await window.HakunaCore.refreshFromDB('questions');
      if(message)toast(message);
      scheduleEnhance();
      return;
    }
    sessionStorage.setItem('hakuna.returnQuestions','1');
    if(message)sessionStorage.setItem('hakuna.questionMessage',message);
    location.reload();
  }

  function injectStyle(){
    if(document.getElementById('hm-question-tools-style'))return;
    const st=document.createElement('style');
    st.id='hm-question-tools-style';
    st.textContent=`
      .hm-q-actions{display:flex;align-items:center;gap:7px;flex:0 0 auto}
      .hm-q-copy{border:1px solid #d9e4f2;background:#f7faff;color:#234c7f;border-radius:11px;padding:8px 10px;font:inherit;font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer}
      .hm-q-copy:active{transform:scale(.98)}
      .hm-q-help{font-size:11px;line-height:1.45;color:var(--muted,#718096);margin-top:6px}
      .hm-q-source-card{border:1px solid var(--line,#e3e8ef);border-radius:14px;padding:12px;background:#f8fbff;margin-bottom:14px}
      .hm-q-source-card strong{display:block;font-size:14px;color:var(--ink,#172033)}
      .hm-q-source-card span{display:block;margin-top:4px;font-size:11px;color:var(--muted,#718096)}
      .hm-q-reference-area{min-height:100px;resize:vertical}
      @media(max-width:720px){.hm-q-copy{padding:7px 8px;font-size:10px}}
    `;
    document.head.append(st);
  }

  function makeCopyButton(id){
    const b=document.createElement('button');
    b.type='button';
    b.className='hm-q-copy';
    b.dataset.hmQCopy=id;
    b.title='Soruyu çoğalt';
    b.textContent='⧉ Çoğalt';
    return b;
  }

  function enhanceQuestionRows(){
    document.querySelectorAll('[data-q-toggle]').forEach(toggle=>{
      const id=toggle.dataset.qToggle;
      const row=toggle.closest('.list-item');
      if(!row||!id)return;
      const stale=row.querySelector('[data-q-duplicate]');
      if(stale)stale.replaceWith(makeCopyButton(id));
      if(row.querySelector('[data-hm-q-copy]'))return;
      const del=row.querySelector('[data-q-delete]');
      const copy=makeCopyButton(id);
      if(del)del.before(copy);else row.append(copy);
    });
  }

  function enhanceQuestionForm(){
    const form=document.getElementById('questionForm');
    if(!form||form.dataset.hmMultiReady==='1')return;
    form.dataset.hmMultiReady='1';
    const old=form.elements.reference;
    if(!old)return;
    const field=old.closest('.field');
    const area=document.createElement('textarea');
    area.name='reference';
    area.required=true;
    area.className='hm-q-reference-area';
    area.placeholder='Örn. 124, 137, 141\nveya Test 7 / Soru 4, Test 8 / Soru 2';
    area.value=old.value||'';
    old.replaceWith(area);
    const label=field?.querySelector('label');
    if(label)label.textContent='Sayfa / test / soru(lar)';
    if(field&&!field.querySelector('.hm-q-help')){
      const help=document.createElement('div');
      help.className='hm-q-help';
      help.textContent='Birden fazla kayıt için virgül, noktalı virgül veya yeni satır kullan. Her biri Sorular bölümünde ayrı kayıt olur.';
      field.append(help);
    }

    form.onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(form);
      const refs=parseReferences(fd.get('reference'));
      if(!refs.length)return toast('En az bir sayfa / test / soru gir.');
      const subject=String(fd.get('subject')||'');
      const topic=String(fd.get('topic')||'').trim();
      const source=String(fd.get('source')||'').trim();
      const note=String(fd.get('note')||'').trim();
      if(!source)return toast('Kaynak adını gir.');
      try{
        await updateState(s=>{
          const base=Date.now();
          refs.forEach((reference,i)=>s.questions.push({id:uid('q'),subject,topic,source,reference,note,status:'open',createdAt:new Date(base+i).toISOString()}));
        });
        await returnToQuestions(refs.length===1?'Soru eklendi.':`${refs.length} soru ayrı ayrı eklendi.`);
      }catch(err){console.error(err);toast('Sorular kaydedilemedi.');}
    };
  }

  async function openCopyModal(id){
    let state;
    try{state=(await readState()).state;}catch{return toast('Soru okunamadı.');}
    const q=state?.questions?.find(x=>x.id===id);
    if(!q)return toast('Bu soru bulunamadı.');
    const root=document.getElementById('modalRoot');
    if(!root)return;
    root.innerHTML=`
      <div class="modal-backdrop" data-hm-q-close>
        <section class="modal-card" role="dialog" aria-modal="true">
          <header class="modal-head"><div><div class="eyebrow modal-eyebrow">Kaynak, konu ve not korunur</div><h2 class="modal-title">Soruyu çoğalt</h2></div><button class="icon-button" type="button" data-hm-q-close aria-label="Kapat">✕</button></header>
          <div class="modal-body">
            <div class="hm-q-source-card"><strong>${esc(q.source)} · ${esc(q.subject)}</strong><span>${esc(q.topic||'Konu belirtilmemiş')}${q.note?` · ${esc(q.note)}`:''}</span></div>
            <form id="hmQuestionCopyForm">
              <div class="field"><label>Sayfa / test / soru(lar)</label><textarea class="hm-q-reference-area" name="reference" required>${esc(q.reference||'')}</textarea><div class="hm-q-help">Sadece burayı değiştir. Birden fazla kayıt için örneğin <b>124, 137, 141</b> yazabilirsin; her biri ayrı soru olur.</div></div>
              <div class="form-actions"><button type="button" class="secondary-btn" data-hm-q-close>Vazgeç</button><button class="primary-btn" type="submit">Çoğalt</button></div>
            </form>
          </div>
        </section>
      </div>`;

    root.querySelectorAll('[data-hm-q-close]').forEach(el=>el.addEventListener('click',e=>{
      if(e.currentTarget.classList.contains('modal-backdrop')&&e.target!==e.currentTarget)return;
      closeModal();
    }));
    root.querySelector('.modal-card')?.addEventListener('click',e=>e.stopPropagation());

    const area=root.querySelector('textarea[name="reference"]');
    setTimeout(()=>{
      if(!area)return;
      area.focus({preventScroll:true});
      const m=/sayfa\s*(\d+)/i.exec(area.value||'');
      if(m){const start=m.index+m[0].lastIndexOf(m[1]);area.setSelectionRange(start,start+m[1].length);}else area.select();
    },40);

    root.querySelector('#hmQuestionCopyForm').onsubmit=async e=>{
      e.preventDefault();
      const refs=parseReferences(new FormData(e.currentTarget).get('reference'));
      if(!refs.length)return toast('En az bir sayfa / test / soru gir.');
      try{
        await updateState(s=>{
          const base=Date.now();
          refs.forEach((reference,i)=>s.questions.push({id:uid('q'),subject:q.subject,topic:q.topic||'',source:q.source,reference,note:q.note||'',status:'open',createdAt:new Date(base+i).toISOString()}));
        });
        await returnToQuestions(refs.length===1?'Soru çoğaltıldı.':`${refs.length} soru ayrı ayrı çoğaltıldı.`);
      }catch(err){console.error(err);toast('Soru çoğaltılamadı.');}
    };
  }

  function enhance(){enhanceQuestionRows();enhanceQuestionForm();}
  function scheduleEnhance(){
    if(enhanceQueued)return;
    enhanceQueued=true;
    requestAnimationFrame(()=>{enhanceQueued=false;enhance();});
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-hm-q-copy],[data-q-duplicate]');
    if(!btn)return;
    const id=btn.dataset.hmQCopy||btn.dataset.qDuplicate;
    if(!id)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    openCopyModal(id);
  },true);

  const observer=new MutationObserver(scheduleEnhance);

  function restoreQuestionPage(){
    if(sessionStorage.getItem('hakuna.returnQuestions')!=='1')return;
    sessionStorage.removeItem('hakuna.returnQuestions');
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const nav=document.querySelector('[data-nav="questions"]');
      if(nav){
        clearInterval(timer);nav.click();
        setTimeout(()=>{
          const msg=sessionStorage.getItem('hakuna.questionMessage');
          if(msg){sessionStorage.removeItem('hakuna.questionMessage');toast(msg);}
          enhance();
        },120);
      }else if(tries>30)clearInterval(timer);
    },80);
  }

  function init(){
    injectStyle();enhance();
    const view=document.getElementById('view');
    const modal=document.getElementById('modalRoot');
    if(view)observer.observe(view,{childList:true});
    if(modal)observer.observe(modal,{childList:true});
    restoreQuestionPage();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
