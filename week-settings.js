(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  const STORAGE_KEY='hakuna.weekStartDay';
  const DAYS=[
    {value:1,label:'Pazartesi'},
    {value:2,label:'Salı'},
    {value:3,label:'Çarşamba'},
    {value:4,label:'Perşembe'},
    {value:5,label:'Cuma'},
    {value:6,label:'Cumartesi'},
    {value:0,label:'Pazar'}
  ];
  const DAY_NAMES={0:'Pazar',1:'Pazartesi',2:'Salı',3:'Çarşamba',4:'Perşembe',5:'Cuma',6:'Cumartesi'};
  const $=(s,r=document)=>r.querySelector(s);
  let scheduled=false;

  function todayISO(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function parseISO(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Date(y,m-1,d);}
  function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function addDays(isoDate,n){const d=parseISO(isoDate);d.setDate(d.getDate()+n);return iso(d);}
  function startFor(isoDate,startDay){const d=parseISO(isoDate);const delta=(d.getDay()-startDay+7)%7;d.setDate(d.getDate()-delta);return iso(d);}
  function fmt(isoDate){return new Intl.DateTimeFormat('tr-TR',{weekday:'short',day:'numeric',month:'short'}).format(parseISO(isoDate));}
  function getLocalStart(){
    const v=Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(v)&&v>=0&&v<=6?v:1;
  }
  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function readState(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('app','readonly');const req=tx.objectStore('app').get(STATE_KEY);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();});}
  async function writeState(state){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('app','readwrite');tx.objectStore('app').put(state,STATE_KEY);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});}

  async function syncFromState(){
    try{
      const state=await readState();
      const saved=Number(state?.settings?.weekStartDay);
      if(Number.isInteger(saved)&&saved>=0&&saved<=6)localStorage.setItem(STORAGE_KEY,String(saved));
      else if(!localStorage.getItem(STORAGE_KEY))localStorage.setItem(STORAGE_KEY,'1');
    }catch{
      if(!localStorage.getItem(STORAGE_KEY))localStorage.setItem(STORAGE_KEY,'1');
    }
  }

  function previewText(startDay){
    const start=startFor(todayISO(),startDay),end=addDays(start,6);
    return `${fmt(start)} → ${fmt(end)}`;
  }

  async function saveStartDay(startDay){
    localStorage.setItem(STORAGE_KEY,String(startDay));
    try{
      const state=await readState();
      if(state){
        state.settings=state.settings&&typeof state.settings==='object'?state.settings:{};
        state.settings.weekStartDay=startDay;
        await writeState(state);
      }
    }catch(err){console.warn('Hafta düzeni kaydedilemedi:',err);}
  }

  function injectSettings(){
    const grid=$('.settings-grid');
    if(!grid||grid.querySelector('[data-week-settings]'))return;
    const startDay=getLocalStart();
    const section=document.createElement('section');
    section.className='card settings-section hm-week-settings';
    section.dataset.weekSettings='1';
    section.innerHTML=`
      <div class="card-title">📅 Hafta düzeni</div>
      <div class="card-subtitle" style="margin-top:6px;line-height:1.55">Hakuna'daki “hafta” takvim haftası olmak zorunda değil. Rehberlik programını hangi gün alıyorsan o günü başlangıç seçebilirsin. Hafta her zaman 7 gün sürer; bitiş günü otomatik belirlenir.</div>
      <div class="settings-row" style="margin-top:14px">
        <div><div class="settings-row-title">Haftanın başlangıcı</div><div class="settings-row-desc">Plan ve haftalık hesaplar bu günden başlar.</div></div>
        <select data-week-start aria-label="Haftanın başlangıcı">${DAYS.map(d=>`<option value="${d.value}" ${d.value===startDay?'selected':''}>${d.label}</option>`).join('')}</select>
      </div>
      <div class="settings-row">
        <div><div class="settings-row-title">Haftanın bitişi</div><div class="settings-row-desc">Başlangıçtan 6 gün sonrası.</div></div>
        <strong data-week-end>${DAY_NAMES[(startDay+6)%7]}</strong>
      </div>
      <div class="hm-week-preview"><span>Bu haftanın aralığı</span><strong data-week-preview>${previewText(startDay)}</strong></div>
      <div class="hm-week-note">Bu ayar <strong>Plan</strong> sekmesindeki 7 günlük görünümü, <strong>Analiz</strong> bölümündeki haftalık çalışma grafiğini ve haftalık borçların “bu hafta / devreden” sıralamasını aynı aralığa göre düzenler. Günlük kayıtların veya geçmiş verilerin silinmez.</div>
      <div class="form-actions" style="margin-top:12px"><button class="primary-btn" type="button" data-save-week>Kaydet</button></div>`;
    const first=grid.querySelector('.settings-section');
    if(first)first.insertAdjacentElement('afterend',section); else grid.prepend(section);

    const select=$('[data-week-start]',section),end=$('[data-week-end]',section),preview=$('[data-week-preview]',section);
    select.onchange=()=>{
      const v=Number(select.value);
      end.textContent=DAY_NAMES[(v+6)%7];
      preview.textContent=previewText(v);
    };
    $('[data-save-week]',section).onclick=async()=>{
      const v=Number(select.value);
      await saveStartDay(v);
      const btn=$('[data-save-week]',section);
      const old=btn.textContent;btn.textContent='Kaydedildi ✓';btn.disabled=true;
      setTimeout(()=>{btn.textContent=old;btn.disabled=false;},1200);
      enhanceWeeklyViews();
    };
  }

  async function enhanceWeeklyViews(){
    const startDay=getLocalStart();
    const state=await readState().catch(()=>null);
    const ref=state?.selectedDate||todayISO();
    const start=startFor(ref,startDay),end=addDays(start,6);

    const board=$('.week-board');
    if(board){
      const card=board.closest('.card');
      const subtitle=card?.querySelector('.card-subtitle');
      if(subtitle)subtitle.textContent=`${fmt(start)} → ${fmt(end)} · Bir güne dokunup ayrıntılı programa geç.`;
    }

    document.querySelectorAll('.card-title').forEach(title=>{
      if(title.textContent.includes('Haftalık borçlar')){
        const sub=title.parentElement?.querySelector('.card-subtitle');
        if(sub&&!sub.dataset.weekRangeApplied){sub.dataset.weekRangeApplied='1';sub.textContent=`${fmt(start)} → ${fmt(end)} · Önce bu haftanın borçları, sonra devredenler.`;}
      }
    });
  }

  function addStyles(){
    if($('#hmWeekSettingsStyle'))return;
    const style=document.createElement('style');
    style.id='hmWeekSettingsStyle';
    style.textContent=`
      .hm-week-settings select{min-width:138px;border:1px solid #d7e1ee;border-radius:11px;background:#fff;color:var(--ink);padding:9px 10px;font:inherit;font-weight:750}
      .hm-week-preview{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;padding:12px 13px;border:1px solid #dce8f6;border-radius:14px;background:#f6faff;color:#63748a;font-size:11px}
      .hm-week-preview strong{color:#286fc8;font-size:12px;text-align:right}
      .hm-week-note{margin-top:10px;padding:11px 12px;border-radius:12px;background:#f8fafc;color:#68778b;font-size:10.5px;line-height:1.55}
      .hm-week-note strong{color:#354b69}
      @media(max-width:720px){.hm-week-settings .settings-row{align-items:flex-start;gap:10px}.hm-week-settings select{min-width:125px}.hm-week-preview{align-items:flex-start;flex-direction:column}.hm-week-preview strong{text-align:left}}
    `;
    document.head.appendChild(style);
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(async()=>{
      scheduled=false;
      injectSettings();
      await enhanceWeeklyViews();
    });
  }

  async function init(){
    addStyles();
    await syncFromState();
    schedule();
    const view=$('#view');
    if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
    document.addEventListener('click',()=>setTimeout(schedule,30),true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
