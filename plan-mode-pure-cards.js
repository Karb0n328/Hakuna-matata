(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  const EMOJI={'Türkçe':'📖','Matematik':'🧮','Geometri':'📐','Fizik':'⚡','Kimya':'🧪','Biyoloji':'🧬','Tarih':'🏛️','Coğrafya':'🌍','Felsefe':'💭','Din':'☾','Deneme':'📝','Diğer':'✨'};
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
      req.onsuccess=()=>{const s=req.result||{};db.close();resolve(s);};
      req.onerror=()=>{db.close();reject(req.error);};
    });
  }

  function statusClass(s){return ['complete','partial','incomplete'].includes(s)?s:'pending';}
  function emoji(s){return EMOJI[s]||'✨';}

  function makeWeekMini(item){
    const el=document.createElement('div');
    el.className=`hm-week-mini hm-status-${statusClass(item.status)}`;
    el.innerHTML=`<span>${emoji(item.subject)}</span><strong>${esc(item.title||'Çalışma')}</strong>`;
    return el;
  }

  function emptyTodayBody(body){
    if(!body)return;
    body.innerHTML='<div class="empty-state"><div class="empty-emoji">🗒️</div><div class="empty-title">Bugünün planı boş</div><div>Plan kartı ekleyip sadece yapıldı / kısmen / yapılmadı olarak takip edebilirsin.</div></div>';
  }

  async function cleanSequentialMode(){
    const state=await readState();
    if(state?.settings?.planMode!=='cards')return;
    const title=$('#pageTitle')?.textContent.trim();
    const selectedDate=state.selectedDate;

    if(title==='Bugün'){
      const view=$('#view');
      if(!view?.querySelector('.hm-card-dashboard'))return;

      // Saat çizelgesinden gelen bloklar Sıralı Plan'a hiç karışmasın.
      $$('[data-hm-item^="block:"]',view).forEach(el=>el.remove());

      const plans=(state.planItems||[]).filter(p=>p.date===selectedDate);
      const done=plans.filter(p=>p.status==='complete').length;
      const pct=plans.length?Math.round(done/plans.length*100):0;

      const listCard=$('.hm-plan-list-card',view);
      const stack=$('.hm-plan-stack',listCard||view);
      if(!plans.length){
        const body=$('.card-body',listCard||view);
        if(body)emptyTodayBody(body);
      }

      const badge=$('.hm-plan-list-card .subject-badge',view);
      if(badge)badge.textContent=`${plans.length} kart`;

      const boxes=$$('.hm-card-dashboard > .dashboard-side .summary-grid .summary-box .summary-value',view);
      if(boxes[0])boxes[0].textContent=String(plans.length);
      if(boxes[1])boxes[1].textContent=String(done);
      if(boxes[2])boxes[2].textContent=`%${pct}`;
      const fill=$('.hm-card-dashboard > .dashboard-side .progress-fill',view);
      if(fill)fill.style.width=`${pct}%`;

      const subtitle=$('.hm-plan-list-card .card-subtitle',view);
      if(subtitle)subtitle.textContent='Bu düzende saat yok. Kartlarını sırayla ekle ve sadece durumlarını işaretle.';
    }

    if(title==='Plan'){
      const view=$('#view');
      if(!view?.querySelector('.hm-week-cards'))return;
      $$('.hm-week-day',view).forEach(day=>{
        const date=day.dataset.hmDay||day.querySelector('[data-hm-select-day]')?.dataset.hmSelectDay;
        if(!date)return;
        const plans=(state.planItems||[])
          .filter(p=>p.date===date)
          .sort((a,b)=>(Number.isFinite(a.order)?a.order:999999)-(Number.isFinite(b.order)?b.order:999999)||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
        const count=$('.hm-week-day-head b',day);
        if(count)count.textContent=String(plans.length);
        const list=$('.hm-week-day-list',day);
        if(!list)return;
        list.innerHTML='';
        if(!plans.length){
          list.innerHTML='<div class="week-empty">Boş</div>';
        }else{
          plans.forEach(p=>list.append(makeWeekMini(p)));
        }
      });
      const subtitle=$('.card > .card-head .card-subtitle',view);
      if(subtitle)subtitle.textContent='Tamamen saatsiz düzen: çalışmalar yalnızca kart sırasına göre görünür.';
    }

    if(title==='Ayarlar'){
      const desc=$('[data-hm-plan-setting] .settings-row-desc');
      if(desc)desc.textContent='Saat Çizelgesi başlangıç–bitiş saatleriyle çalışır. Sıralı Plan ise tamamen saatsizdir: yalnızca günlük kartlar vardır ve Tamamlandı / Kısmen / Yapılmadı olarak işaretlenir. Saatli bloklarla Sıralı Plan kartları birbirine karışmaz.';
    }
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(async()=>{
      queued=false;
      try{await cleanSequentialMode();}catch(err){console.warn('Hakuna pure cards fix',err);}
    });
  }

  const observer=new MutationObserver(schedule);
  function init(){
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-hm-mode],[data-nav],[data-hm-date-step],[data-hm-today],[data-hm-select-day],[data-hm-status],[data-hm-add]'))setTimeout(schedule,40);
    },true);
    schedule();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
