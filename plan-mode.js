(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  const SUBJECTS=['Türkçe','Matematik','Geometri','Fizik','Kimya','Biyoloji','Tarih','Coğrafya','Felsefe','Din','Deneme','Diğer'];
  const UNITS=['dakika','test','soru','sayfa','bölüm'];
  const EMOJI={'Türkçe':'📖','Matematik':'🧮','Geometri':'📐','Fizik':'⚡','Kimya':'🧪','Biyoloji':'🧬','Tarih':'🏛️','Coğrafya':'🌍','Felsefe':'💭','Din':'☾','Deneme':'📝','Diğer':'✨'};
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=(p='id')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;

  function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function parseISO(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d);}
  function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function addDays(s,n){const d=parseISO(s);d.setDate(d.getDate()+n);return iso(d);}
  function formatDate(s,opts={weekday:'long',day:'numeric',month:'long'}){return new Intl.DateTimeFormat('tr-TR',opts).format(parseISO(s));}
  function weekStart(date){const raw=Number(localStorage.getItem('hakuna.weekStartDay'));const startDay=Number.isInteger(raw)&&raw>=0&&raw<=6?raw:1;const d=parseISO(date);const diff=(d.getDay()-startDay+7)%7;d.setDate(d.getDate()-diff);return iso(d);}
  function duration(start,end){if(!start||!end)return 0;const [sh,sm]=String(start).split(':').map(Number),[eh,em]=String(end).split(':').map(Number);return Math.max(0,(eh*60+em)-(sh*60+sm));}
  function fmtDuration(m){if(!m)return '—';return m<60?`${m} dk`:`${Math.floor(m/60)} sa${m%60?` ${m%60} dk`:''}`;}

  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('app'))req.result.createObjectStore('app');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function readState(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('app','readonly');const req=tx.objectStore('app').get(STATE_KEY);req.onsuccess=()=>{const s=req.result||{};db.close();normalize(s);resolve(s);};req.onerror=()=>{db.close();reject(req.error);};});}
  async function writeState(state){normalize(state);const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('app','readwrite');tx.objectStore('app').put(state,STATE_KEY);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
  function normalize(s){s.settings=s.settings&&typeof s.settings==='object'?s.settings:{};if(!['timeline','cards'].includes(s.settings.planMode))s.settings.planMode='timeline';if(!Array.isArray(s.planItems))s.planItems=[];for(const k of ['blocks','tasks','debts'])if(!Array.isArray(s[k]))s[k]=[];if(!s.selectedDate)s.selectedDate=todayISO();return s;}
  const mode=s=>normalize(s).settings.planMode;

  function toast(text){const root=$('#toastRoot');if(!root)return;const el=document.createElement('div');el.className='toast';el.textContent=text;root.append(el);setTimeout(()=>el.remove(),2600);}
  function closeModal(){const root=$('#modalRoot');if(root)root.innerHTML='';}
  function subjectEmoji(s){return EMOJI[s]||'✨';}

  function itemKey(item){return `${item.kind}:${item.data.id}`;}
  function itemsFor(state,date){
    const plans=(state.planItems||[]).filter(x=>x.date===date).map((x,i)=>({kind:'plan',data:x,sort:`2-${String(Number.isFinite(x.order)?x.order:i).padStart(6,'0')}-${x.createdAt||''}`}));
    const blocks=(state.blocks||[]).filter(x=>x.date===date).map(x=>({kind:'block',data:x,sort:`1-${x.start||'99:99'}-${x.createdAt||''}`}));
    return [...blocks,...plans].sort((a,b)=>a.sort.localeCompare(b.sort));
  }
  function itemMetric(x){return x.metricValue?`${x.metricValue} ${x.metricUnit||''}`:'';}
  function statusLabel(s){return s==='complete'?'Tamamlandı':s==='partial'?'Kısmen':s==='incomplete'?'Yapılmadı':'Bekliyor';}

  function planCardHTML(item,{compact=false}={}){
    const x=item.data,status=x.status||'pending',metric=itemMetric(x);
    return `<article class="hm-plan-card hm-status-${status} ${compact?'hm-plan-card-compact':''}" data-hm-item="${esc(itemKey(item))}">
      <div class="hm-plan-card-main">
        <div class="hm-plan-subject">${subjectEmoji(x.subject)} ${esc(x.subject||'Diğer')}</div>
        <div class="hm-plan-title">${esc(x.title||'Çalışma')}</div>
        <div class="hm-plan-meta">${metric?esc(metric):'Miktar belirtilmedi'}${x.note?` · ${esc(x.note)}`:''}</div>
      </div>
      <div class="hm-plan-state"><span>${statusLabel(status)}</span></div>
      <div class="hm-plan-status-actions" aria-label="Durum">
        <button type="button" class="hm-status-btn complete ${status==='complete'?'active':''}" data-hm-status="complete">Tamamlandı</button>
        <button type="button" class="hm-status-btn partial ${status==='partial'?'active':''}" data-hm-status="partial">Kısmen</button>
        <button type="button" class="hm-status-btn incomplete ${status==='incomplete'?'active':''}" data-hm-status="incomplete">Yapılmadı</button>
      </div>
      <div class="hm-plan-card-tools">
        ${item.kind==='plan'?'<button type="button" class="icon-button" data-hm-edit title="Düzenle">✎</button>':''}
        ${item.kind==='plan'?'<button type="button" class="icon-button" data-hm-delete title="Sil">🗑</button>':''}
      </div>
    </article>`;
  }

  function dateControlHTML(state){const d=state.selectedDate;return `<div class="date-strip"><button class="icon-button" data-hm-date-step="-1">‹</button><button class="date-chip ${d===todayISO()?'active':''}" data-hm-today>${esc(formatDate(d,{weekday:'short',day:'numeric',month:'short'}))}</button><button class="icon-button" data-hm-date-step="1">›</button></div>`;}

  function debtListHTML(state){const ds=[...(state.debts||[])].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,5);return ds.length?`<div class="hm-mini-list">${ds.map(d=>`<div class="hm-mini-row"><div><strong>${esc(d.title||'Borç')}</strong><span>${esc(d.subject||'Diğer')}</span></div><b>${esc(d.value)} ${esc(d.unit||'')}</b></div>`).join('')}</div>`:'<div class="empty-state"><div class="empty-emoji">✨</div><div class="empty-title">Borç yok</div><div>Şimdilik tertemiz.</div></div>';}
  function taskListHTML(state){const ts=(state.tasks||[]).filter(t=>!t.completed).slice(0,5);return ts.length?`<div class="hm-mini-list">${ts.map(t=>`<div class="hm-mini-row"><div><strong>${esc(t.title||'Görev')}</strong><span>${esc(t.subject||'Diğer')}</span></div><b>${t.value?`${esc(t.value)} ${esc(t.unit||'')}`:''}</b></div>`).join('')}</div>`:'<div class="empty-state"><div class="empty-emoji">🗂️</div><div class="empty-title">Havuz boş</div><div>Görev ekleyebilirsin.</div></div>';}

  async function renderCardsToday(){
    const state=await readState();if(mode(state)!=='cards')return false;
    const title=$('#pageTitle');if(!title||title.textContent.trim()!=='Bugün')return false;
    const view=$('#view'),actions=$('#topbarActions');if(!view||!actions)return false;
    if(view.dataset.hmPlanMode==='cards-today')return true;
    const date=state.selectedDate,items=itemsFor(state,date);const complete=items.filter(i=>(i.data.status||'pending')==='complete').length;const pct=items.length?Math.round(complete/items.length*100):0;
    view.dataset.hmPlanMode='cards-today';
    actions.innerHTML=`${dateControlHTML(state)}<button class="primary-btn" data-hm-add>＋ Plan kartı</button>`;
    view.innerHTML=`<div class="hm-card-dashboard">
      <section class="card hm-plan-list-card"><div class="card-head"><div><div class="card-title">${esc(formatDate(date))}</div><div class="card-subtitle">Saat vermeden çalışmalarını sıraya koy. Durumu kartın üzerinden işaretle.</div></div><span class="subject-badge">${items.length} kart</span></div><div class="card-body">${items.length?`<div class="hm-plan-stack">${items.map(i=>planCardHTML(i)).join('')}</div>`:`<div class="empty-state"><div class="empty-emoji">🗒️</div><div class="empty-title">Bugünün planı boş</div><div>“Plan kartı” ile saate bağlı olmayan ilk çalışmanı ekle.</div></div>`}</div></section>
      <aside class="dashboard-side">
        <section class="card"><div class="card-head"><div><div class="card-title">Günün özeti</div><div class="card-subtitle">Sıralı plan → gerçekleşme</div></div><span>☀️</span></div><div class="card-body"><div class="summary-grid"><div class="summary-box"><div class="summary-value">${items.length}</div><div class="summary-label">Kart</div></div><div class="summary-box"><div class="summary-value">${complete}</div><div class="summary-label">Biten</div></div><div class="summary-box"><div class="summary-value">%${pct}</div><div class="summary-label">Tamamlanma</div></div></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div></section>
        <section class="card"><div class="card-head"><div><div class="card-title">📥 Borçlar</div><div class="card-subtitle">Kısmen veya yapılmayanlardan kalanlar</div></div></div><div class="card-body">${debtListHTML(state)}</div></section>
        <section class="card"><div class="card-head"><div><div class="card-title">✓ Görev havuzu</div><div class="card-subtitle">Henüz plana alınmayan işler</div></div></div><div class="card-body">${taskListHTML(state)}</div></section>
      </aside>
    </div>`;
    bindCardPage(state,'today');return true;
  }

  async function renderCardsPlan(){
    const state=await readState();if(mode(state)!=='cards')return false;
    const title=$('#pageTitle');if(!title||title.textContent.trim()!=='Plan')return false;
    const view=$('#view'),actions=$('#topbarActions');if(!view||!actions)return false;
    if(view.dataset.hmPlanMode==='cards-plan')return true;
    const start=weekStart(state.selectedDate),days=Array.from({length:7},(_,i)=>addDays(start,i));
    view.dataset.hmPlanMode='cards-plan';
    actions.innerHTML=`${dateControlHTML(state)}<button class="primary-btn" data-hm-add>＋ Plan kartı</button>`;
    view.innerHTML=`<section class="card"><div class="card-head"><div><div class="card-title">Haftalık sıralı plan</div><div class="card-subtitle">Saat çizelgesi yok; her gün çalışmalar kartlar halinde sırayla görünür.</div></div><span class="subject-badge">Kutucuk düzeni</span></div><div class="card-body"><div class="hm-week-cards">${days.map(day=>{const list=itemsFor(state,day);return `<section class="hm-week-day ${day===state.selectedDate?'selected':''}" data-hm-day="${day}"><button type="button" class="hm-week-day-head" data-hm-select-day="${day}"><strong>${esc(formatDate(day,{weekday:'short'}))}</strong><span>${esc(formatDate(day,{day:'numeric',month:'short'}))}</span><b>${list.length}</b></button><div class="hm-week-day-list">${list.length?list.map(i=>`<div class="hm-week-mini hm-status-${i.data.status||'pending'}"><span>${subjectEmoji(i.data.subject)}</span><strong>${esc(i.data.title||'Çalışma')}</strong></div>`).join(''):'<div class="week-empty">Boş</div>'}</div></section>`;}).join('')}</div></div></section>`;
    bindCardPage(state,'plan');return true;
  }

  function openItemForm(state,item=null){
    const root=$('#modalRoot');if(!root)return;const x=item?.data||{};root.innerHTML=`<div class="modal-backdrop" data-hm-close><section class="modal-card" role="dialog" aria-modal="true"><header class="modal-head"><div><div class="eyebrow">Sıralı plan</div><h2 class="modal-title">${item?'Plan kartını düzenle':'Yeni plan kartı'}</h2></div><button class="icon-button" type="button" data-hm-close>✕</button></header><div class="modal-body"><form id="hmPlanForm"><div class="form-grid"><div class="field full"><label>Çalışma adı</label><input name="title" required value="${esc(x.title||'')}" placeholder="Örn. Apotemi Türev"></div><div class="field"><label>Ders</label><select name="subject">${SUBJECTS.map(s=>`<option ${s===(x.subject||'Matematik')?'selected':''}>${esc(s)}</option>`).join('')}</select></div><div class="field"><label>Tarih</label><input type="date" name="date" required value="${esc(x.date||state.selectedDate)}"></div><div class="field"><label>Miktar</label><input type="number" min="0" step="0.5" name="metricValue" value="${x.metricValue??''}" placeholder="Örn. 5"></div><div class="field"><label>Birim</label><select name="metricUnit">${UNITS.map(u=>`<option ${u===(x.metricUnit||'test')?'selected':''}>${esc(u)}</option>`).join('')}</select></div><div class="field full"><label>Not</label><textarea name="note" placeholder="İsteğe bağlı">${esc(x.note||'')}</textarea></div></div><div class="form-actions"><button type="button" class="secondary-btn" data-hm-close>Vazgeç</button><button class="primary-btn" type="submit">${item?'Kaydet':'Ekle'}</button></div></form></div></section></div>`;
    root.querySelectorAll('[data-hm-close]').forEach(el=>el.onclick=e=>{if(el.classList.contains('modal-backdrop')&&e.target!==el)return;closeModal();});root.querySelector('.modal-card')?.addEventListener('click',e=>e.stopPropagation());
    $('#hmPlanForm',root).onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const s=await readState();const payload={title:String(fd.get('title')||'').trim(),subject:String(fd.get('subject')||'Diğer'),date:String(fd.get('date')||state.selectedDate),metricValue:fd.get('metricValue')!==''?Number(fd.get('metricValue')):null,metricUnit:String(fd.get('metricUnit')||'test'),note:String(fd.get('note')||'').trim()};if(!payload.title)return toast('Çalışma adını yaz.');if(item?.kind==='plan'){const p=s.planItems.find(p=>p.id===item.data.id);if(p)Object.assign(p,payload);}else{s.planItems.push({id:uid('plan'),...payload,status:'pending',order:s.planItems.filter(p=>p.date===payload.date).length,sourceDebtId:null,createdAt:new Date().toISOString()});}s.selectedDate=payload.date;await writeState(s);closeModal();await forceRenderCurrent();toast(item?'Plan kartı güncellendi.':'Plan kartı eklendi.');};
  }

  function openPartialModal(item){const x=item.data,root=$('#modalRoot');if(!root)return;root.innerHTML=`<div class="modal-backdrop" data-hm-close><section class="modal-card" role="dialog" aria-modal="true"><header class="modal-head"><div><div class="eyebrow">Kısmen tamamlandı</div><h2 class="modal-title">Ne kadar kaldı?</h2></div><button class="icon-button" type="button" data-hm-close>✕</button></header><div class="modal-body"><form id="hmPartialForm"><div class="form-grid"><div class="field"><label>Kalan miktar</label><input type="number" min="0" step="0.5" name="value" required value="${x.metricValue??''}"></div><div class="field"><label>Birim</label><select name="unit">${UNITS.map(u=>`<option ${u===(x.metricUnit||'test')?'selected':''}>${esc(u)}</option>`).join('')}</select></div></div><div class="form-actions"><button type="button" class="secondary-btn" data-hm-close>Vazgeç</button><button class="primary-btn" type="submit">Kısmen tamamlandı yap</button></div></form></div></section></div>`;root.querySelectorAll('[data-hm-close]').forEach(el=>el.onclick=e=>{if(el.classList.contains('modal-backdrop')&&e.target!==el)return;closeModal();});root.querySelector('.modal-card')?.addEventListener('click',e=>e.stopPropagation());$('#hmPartialForm',root).onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await setStatus(item,'partial',{value:Number(fd.get('value')),unit:String(fd.get('unit'))});closeModal();};}

  function findItem(state,key){const [kind,id]=String(key).split(':');if(kind==='block'){const x=state.blocks.find(b=>b.id===id);return x?{kind,data:x}:null;}const x=state.planItems.find(p=>p.id===id);return x?{kind:'plan',data:x}:null;}
  function linkedDebt(state,item){if(item.kind==='block'){const x=item.data;if(x.sourceDebtId)return state.debts.find(d=>d.id===x.sourceDebtId)||null;return state.debts.find(d=>d.sourceBlockId===x.id)||null;}const x=item.data;if(x.sourceDebtId)return state.debts.find(d=>d.id===x.sourceDebtId)||null;return state.debts.find(d=>d.sourcePlanItemId===x.id)||null;}
  function upsertDebt(state,item,remaining=null){const x=item.data;let d=linkedDebt(state,item);const value=remaining?.value??x.metricValue??(item.kind==='block'?duration(x.start,x.end):1),unit=remaining?.unit??x.metricUnit??(item.kind==='block'&&!x.metricValue?'dakika':'test');if(d){d.value=value;d.unit=unit;d.title=x.title;d.subject=x.subject;return;}d={id:uid('debt'),title:x.title,subject:x.subject,value,unit,sourceBlockId:item.kind==='block'?x.id:null,sourcePlanItemId:item.kind==='plan'?x.id:null,sourceDate:x.date,createdAt:new Date().toISOString()};state.debts.push(d);}
  async function setStatus(item,status,remaining=null){const state=await readState();const current=findItem(state,itemKey(item));if(!current)return toast('Plan öğesi bulunamadı.');current.data.status=status;if(status==='complete'){state.debts=state.debts.filter(d=>!(current.kind==='block'?(d.sourceBlockId===current.data.id||d.id===current.data.sourceDebtId):(d.sourcePlanItemId===current.data.id||d.id===current.data.sourceDebtId)));}else if(status==='partial'||status==='incomplete'){upsertDebt(state,current,status==='partial'?remaining:null);}await writeState(state);await forceRenderCurrent();toast(status==='complete'?'Tamamlandı.':status==='partial'?'Kalan borca aktarıldı.':'Borçlara eklendi.');}
  async function deletePlanItem(item){if(item.kind!=='plan')return;if(!confirm('Bu plan kartı silinsin mi?'))return;const state=await readState();state.planItems=state.planItems.filter(p=>p.id!==item.data.id);state.debts=state.debts.filter(d=>d.sourcePlanItemId!==item.data.id);await writeState(state);await forceRenderCurrent();toast('Plan kartı silindi.');}

  function bindCardPage(state,page){
    $$('[data-hm-date-step]').forEach(b=>b.onclick=async()=>{const s=await readState();s.selectedDate=addDays(s.selectedDate,Number(b.dataset.hmDateStep));await writeState(s);await forceRenderCurrent();});
    $$('[data-hm-today]').forEach(b=>b.onclick=async()=>{const s=await readState();s.selectedDate=todayISO();await writeState(s);await forceRenderCurrent();});
    $('[data-hm-add]')?.addEventListener('click',()=>openItemForm(state));
    $$('[data-hm-select-day]').forEach(b=>b.onclick=async()=>{const s=await readState();s.selectedDate=b.dataset.hmSelectDay;await writeState(s);await forceRenderCurrent();});
    $$('[data-hm-item]').forEach(card=>{const item=findItem(state,card.dataset.hmItem);if(!item)return;$$('[data-hm-status]',card).forEach(b=>b.onclick=e=>{e.stopPropagation();const st=b.dataset.hmStatus;if(st==='partial')openPartialModal(item);else setStatus(item,st);});$('[data-hm-edit]',card)?.addEventListener('click',e=>{e.stopPropagation();openItemForm(state,item);});$('[data-hm-delete]',card)?.addEventListener('click',e=>{e.stopPropagation();deletePlanItem(item);});});
  }

  async function injectTimelineUnscheduled(){
    const state=await readState();if(mode(state)!=='timeline')return;const title=$('#pageTitle');if(!title||title.textContent.trim()!=='Bugün')return;const view=$('#view');if(!view||view.querySelector('[data-hm-unscheduled]'))return;const items=(state.planItems||[]).filter(p=>p.date===state.selectedDate).map(p=>({kind:'plan',data:p}));if(!items.length)return;const sec=document.createElement('section');sec.className='card hm-unscheduled-card';sec.dataset.hmUnscheduled='1';sec.innerHTML=`<div class="card-head"><div><div class="card-title">🗒️ Saati belirlenmemiş işler</div><div class="card-subtitle">Kutucuk düzeninde oluşturuldu. Saat çizelgesine geçsen de burada kaybolmaz.</div></div><span class="subject-badge">${items.length}</span></div><div class="card-body"><div class="hm-plan-stack">${items.map(i=>planCardHTML(i,{compact:true})).join('')}</div></div>`;view.append(sec);bindCardPage(state,'today');
  }

  async function injectSettings(){
    const title=$('#pageTitle');if(!title||title.textContent.trim()!=='Ayarlar')return;const view=$('#view');if(!view||view.querySelector('[data-hm-plan-setting]'))return;const state=await readState();const general=view.querySelector('.settings-section');if(!general)return;const row=document.createElement('div');row.className='settings-row hm-plan-setting';row.dataset.hmPlanSetting='1';row.innerHTML=`<div><div class="settings-row-title">Planlama düzeni</div><div class="settings-row-desc">Saat Çizelgesi çalışmalarını başlangıç–bitiş saatleriyle planlar. Sıralı Plan ise saat vermeden günlük işleri kartlar halinde sıraya koyar. İki düzende de tamamlandı / kısmen / yapılmadı durumları ve borç sistemi çalışır.</div></div><div class="hm-mode-switch"><button type="button" data-hm-mode="timeline" class="${mode(state)==='timeline'?'active':''}">Saat Çizelgesi</button><button type="button" data-hm-mode="cards" class="${mode(state)==='cards'?'active':''}">Sıralı Plan</button></div>`;const heading=general.querySelector('.card-title');heading?.after(row);$$('[data-hm-mode]',row).forEach(b=>b.onclick=async()=>{const s=await readState();s.settings.planMode=b.dataset.hmMode;await writeState(s);localStorage.setItem('hakuna.planMode',b.dataset.hmMode);$$('[data-hm-mode]',row).forEach(x=>x.classList.toggle('active',x===b));toast(b.dataset.hmMode==='cards'?'Sıralı Plan açıldı.':'Saat Çizelgesi açıldı.');});
  }

  async function forceRenderCurrent(){const view=$('#view');if(view)delete view.dataset.hmPlanMode;const title=$('#pageTitle')?.textContent.trim();if(title==='Bugün')return renderCardsToday()||injectTimelineUnscheduled();if(title==='Plan')return renderCardsPlan();if(title==='Ayarlar')return injectSettings();}

  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(async()=>{queued=false;try{await renderCardsToday();await renderCardsPlan();await injectTimelineUnscheduled();await injectSettings();}catch(err){console.warn('Hakuna plan mode',err);}});}
  const observer=new MutationObserver(schedule);

  function init(){
    if(!document.querySelector('link[data-hm-plan-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='./plan-mode.css?v=1';l.dataset.hmPlanCss='1';document.head.append(l);}
    const view=$('#view');const actions=$('#topbarActions');if(view)observer.observe(view,{childList:true,subtree:false});if(actions)observer.observe(actions,{childList:true,subtree:false});const title=$('#pageTitle');if(title)observer.observe(title,{childList:true,subtree:true,characterData:true});schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
