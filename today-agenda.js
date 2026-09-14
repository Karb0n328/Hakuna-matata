(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  let lastDate=null;
  let lastSignature='';
  let observer=null;
  let clockTimer=null;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function esc(v=''){
    return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function minute(t){const [h,m]=String(t).split(':').map(Number);return h*60+m;}
  function fmtDuration(mins){
    if(mins<60)return `${mins} dk`;
    const h=Math.floor(mins/60),m=mins%60;
    return m?`${h} sa ${m} dk`:`${h} sa`;
  }
  function todayISO(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function subjectEmoji(s){
    return ({'Türkçe':'📖','Matematik':'🧮','Geometri':'📐','Fizik':'⚡','Kimya':'🧪','Biyoloji':'🧬','Tarih':'🏛️','Coğrafya':'🌍','Felsefe':'💭','Din':'☾','Deneme':'📝','Diğer':'✨'})[s]||'✨';
  }
  function statusText(status){
    return status==='complete'?'Tamamlandı':status==='partial'?'Kısmen tamamlandı':status==='incomplete'?'Tamamlanmadı':'';
  }
  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function readState(){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('app','readonly');
      const req=tx.objectStore('app').get(STATE_KEY);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
      tx.oncomplete=()=>db.close();
    });
  }

  function buildGap(start,end,date){
    const mins=end-start;
    if(mins<10)return '';
    const s=`${String(Math.floor(start/60)).padStart(2,'0')}:${String(start%60).padStart(2,'0')}`;
    const e=`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;
    return `<div class="hm-agenda-gap" data-gap-start="${s}" data-gap-end="${e}" data-gap-date="${date}">
      <div class="hm-agenda-gap-time">${esc(s)}–${esc(e)}</div>
      <div class="hm-agenda-gap-node"></div>
      <button class="hm-agenda-gap-btn" type="button"><strong>＋ ${esc(fmtDuration(mins))} boş</strong> · blok ekle</button>
    </div>`;
  }
  function nowLabel(nowMin){
    return `${String(Math.floor(nowMin/60)).padStart(2,'0')}:${String(nowMin%60).padStart(2,'0')}`;
  }
  function buildNow(nowMin){
    const t=nowLabel(nowMin);
    return `<div class="hm-agenda-now" data-hm-now>
      <div class="hm-agenda-now-time">${t}</div>
      <div class="hm-agenda-now-dot"></div>
      <div class="hm-agenda-now-line"></div>
    </div>`;
  }
  function buildInlineNow(nowMin,start,end){
    const dur=Math.max(1,end-start);
    const elapsed=Math.max(0,Math.min(dur,nowMin-start));
    const pct=5+(elapsed/dur)*90;
    return `<div class="hm-agenda-now-inline" data-hm-now style="--hm-now-top:${pct.toFixed(2)}%" aria-label="Şu an ${nowLabel(nowMin)}">
      <div class="hm-agenda-now-inline-time">${nowLabel(nowMin)}</div>
      <div class="hm-agenda-now-inline-dot"></div>
      <div class="hm-agenda-now-inline-line"></div>
    </div>`;
  }
  function blockRow(b,overlap=false,activeNowMin=null){
    const start=minute(b.start),end=minute(b.end);
    const dur=Math.max(1,end-start);
    const metric=b.metricValue?`${b.metricValue} ${esc(b.metricUnit||'')}`:'';
    const meta=[b.subject,metric,b.note].filter(Boolean).map(esc).join(' · ');
    const st=statusText(b.status);
    const nowMarkup=activeNowMin!=null?buildInlineNow(activeNowMin,start,end):'';
    return `<div class="hm-agenda-row ${activeNowMin!=null?'hm-agenda-row-active':''}" data-subject="${esc(b.subject||'Diğer')}">
      <div class="hm-agenda-time"><span class="hm-agenda-start">${esc(b.start)}</span><span class="hm-agenda-end">${esc(b.end)}</span></div>
      <div class="hm-agenda-node"></div>
      <button type="button" class="hm-agenda-card" data-agenda-block="${esc(b.id)}" data-subject="${esc(b.subject||'Diğer')}" data-status="${esc(b.status||'pending')}">
        <div class="hm-agenda-topline"><div class="hm-agenda-title">${subjectEmoji(b.subject)} ${esc(b.title)}</div><span class="hm-agenda-duration">${esc(fmtDuration(dur))}</span></div>
        <div class="hm-agenda-meta">${meta||'Çalışma bloğu'}${st?`<span class="hm-agenda-status">· ${esc(st)}</span>`:''}${overlap?'<span class="hm-agenda-overlap">çakışıyor</span>':''}</div>
      </button>
      ${nowMarkup}
    </div>`;
  }

  function signature(state,date){
    const bs=(state?.blocks||[]).filter(b=>b.date===date).sort((a,b)=>a.start.localeCompare(b.start));
    return JSON.stringify(bs.map(b=>[b.id,b.start,b.end,b.title,b.subject,b.status,b.metricValue,b.metricUnit,b.note]));
  }

  async function renderAgenda(force=false){
    const wrap=$('.timeline-wrap');
    const original=$('.timeline-scroll',wrap||document);
    const timeline=$('.timeline',original||document);
    if(!wrap||!original||!timeline)return;

    const date=timeline.dataset.timelineDate;
    if(!date)return;

    let state;
    try{state=await readState();}catch(err){console.warn('Gün akışı okunamadı:',err);return;}
    if(!state)return;

    const sig=signature(state,date);
    if(!force&&lastDate===date&&lastSignature===sig&&$('.hm-agenda-scroll',wrap))return;
    lastDate=date;lastSignature=sig;

    original.style.display='none';
    $('.timeline-toolbar .card-subtitle',wrap)?.replaceChildren(document.createTextNode('Bloklar saat sırasıyla okunabilir akışta gösterilir. Boş aralığa dokunup yeni blok ekleyebilirsin.'));

    let host=$('.hm-agenda-scroll',wrap);
    if(!host){
      host=document.createElement('div');
      host.className='hm-agenda-scroll';
      wrap.appendChild(host);
    }

    const blocks=(state.blocks||[]).filter(b=>b.date===date).sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
    if(!blocks.length){
      host.innerHTML='<div class="hm-agenda"><div class="hm-agenda-empty"><strong>Bugün henüz blok yok</strong>Sağ üstten çalışma bloğu ekleyebilirsin.</div></div>';
      return;
    }

    const now=new Date();
    const isToday=date===todayISO();
    const nowMin=now.getHours()*60+now.getMinutes();
    let nowInserted=false;
    let html='<div class="hm-agenda">';
    let prevEnd=minute(blocks[0].start);

    for(let i=0;i<blocks.length;i++){
      const b=blocks[i];
      const s=minute(b.start),e=minute(b.end);

      if(s>prevEnd){
        if(isToday&&!nowInserted&&nowMin>=prevEnd&&nowMin<s){
          html+=buildNow(nowMin);
          nowInserted=true;
        }
        html+=buildGap(prevEnd,s,date);
      }

      const activeNow=isToday&&!nowInserted&&nowMin>=s&&nowMin<e;
      html+=blockRow(b,s<prevEnd,activeNow?nowMin:null);
      if(activeNow)nowInserted=true;
      prevEnd=Math.max(prevEnd,e);
    }

    if(isToday&&!nowInserted&&nowMin>=prevEnd){
      html+=buildNow(nowMin);
      nowInserted=true;
    }
    html+='</div>';
    host.innerHTML=html;

    $$('[data-agenda-block]',host).forEach(btn=>{
      btn.addEventListener('click',()=>{
        const originalBtn=original.querySelector(`[data-block-id="${CSS.escape(btn.dataset.agendaBlock)}"]`);
        originalBtn?.click();
      });
    });
    $$('.hm-agenda-gap-btn',host).forEach(btn=>{
      btn.addEventListener('click',()=>{
        const gap=btn.closest('.hm-agenda-gap');
        const add=$('[data-add-block]');
        if(!gap||!add)return;
        add.click();
        requestAnimationFrame(()=>{
          const form=$('#blockForm');
          if(!form)return;
          const dateInput=form.querySelector('[name="date"]');
          const startInput=form.querySelector('[name="start"]');
          const endInput=form.querySelector('[name="end"]');
          if(dateInput)dateInput.value=gap.dataset.gapDate;
          if(startInput)startInput.value=gap.dataset.gapStart;
          if(endInput)endInput.value=gap.dataset.gapEnd;
        });
      });
    });

    if(isToday){
      requestAnimationFrame(()=>{
        const nowEl=$('[data-hm-now]',host);
        if(nowEl)nowEl.scrollIntoView({block:'center',behavior:'auto'});
        else{
          const next=[...$$('[data-agenda-block]',host)].find(el=>minute(el.closest('.hm-agenda-row').querySelector('.hm-agenda-start').textContent)>=nowMin);
          next?.scrollIntoView({block:'center',behavior:'auto'});
        }
      });
    }else host.scrollTop=0;
  }

  function scheduleRender(){requestAnimationFrame(()=>renderAgenda(false));}
  function startClock(){
    if(clockTimer)clearInterval(clockTimer);
    clockTimer=setInterval(()=>renderAgenda(true),30000);
  }
  function init(){
    scheduleRender();
    startClock();
    const view=$('#view');
    if(view){
      observer=new MutationObserver(()=>scheduleRender());
      observer.observe(view,{childList:true,subtree:true});
    }
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-nav="today"], [data-date-step], [data-go-today], [data-status], [data-close-modal]'))setTimeout(()=>renderAgenda(true),40);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
