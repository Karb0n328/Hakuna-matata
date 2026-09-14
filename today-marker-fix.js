(() => {
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let scheduled=false;

  function minute(t){
    const [h,m]=String(t||'').split(':').map(Number);
    return h*60+m;
  }
  function todayISO(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function nowLabel(){
    const d=new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  function markerMarkup(){
    return '<div class="hm-now-spacer" aria-hidden="true"></div><div class="hm-now-rail-dot" aria-hidden="true"></div><div class="hm-now-chip"><span class="hm-now-live-dot" aria-hidden="true"></span><span>Şimdi</span><strong class="hm-now-clock"></strong></div>';
  }
  function makeMarker(){
    const el=document.createElement('div');
    el.className='hm-agenda-now hm-now-after-block';
    el.dataset.hmNow='1';
    el.setAttribute('aria-label','Şu an');
    el.innerHTML=markerMarkup();
    return el;
  }
  function ensureCompactMarker(marker){
    if(!marker.querySelector('.hm-now-chip'))marker.innerHTML=markerMarkup();
    marker.className='hm-agenda-now hm-now-after-block';
    marker.dataset.hmNow='1';
    const clock=$('.hm-now-clock',marker);
    const label=nowLabel();
    if(clock&&clock.textContent!==label)clock.textContent=label;
    marker.setAttribute('aria-label',`Şu an ${label}`);
  }
  function placeMarker(){
    scheduled=false;
    const wrap=$('.timeline-wrap');
    const original=$('.timeline-scroll',wrap||document);
    const timeline=$('.timeline',original||document);
    const agenda=$('.hm-agenda',wrap||document);
    if(!timeline||!agenda)return;

    if(timeline.dataset.timelineDate!==todayISO()){
      $$('[data-hm-now]',agenda).forEach(x=>x.remove());
      return;
    }

    // Eski sürümden kalabilecek blok-içi göstergeleri temizle.
    $$('.hm-agenda-now-inline',agenda).forEach(x=>x.remove());

    const rows=$$('.hm-agenda-row',agenda);
    if(!rows.length)return;

    const d=new Date();
    const now=d.getHours()*60+d.getMinutes();
    let latest=null;
    for(const row of rows){
      const start=$('.hm-agenda-start',row);
      if(start&&minute(start.textContent)<=now)latest=row;
      else break;
    }

    const markers=$$('[data-hm-now]',agenda);
    let marker=markers[0]||makeMarker();
    markers.slice(1).forEach(x=>x.remove());
    ensureCompactMarker(marker);

    // Gösterge gerçek saat oranını çizmez; son başlamış bloğun hemen altında durur.
    // Böylece kartların üstüne binmez, alanı da uzun bir çizgiyle kaplamaz.
    if(latest){
      if(latest.nextElementSibling!==marker)latest.insertAdjacentElement('afterend',marker);
    }else{
      if(rows[0].previousElementSibling!==marker)agenda.insertBefore(marker,rows[0]);
    }
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(placeMarker);
  }

  const style=document.createElement('style');
  style.textContent=`
    .hm-agenda-now.hm-now-after-block{
      position:relative;
      z-index:5;
      display:grid;
      grid-template-columns:72px 18px minmax(0,1fr);
      align-items:center;
      min-height:24px;
      margin:-1px 0 4px;
      pointer-events:none;
    }
    .hm-now-spacer{min-height:1px}
    .hm-now-rail-dot{
      width:9px;
      height:9px;
      justify-self:center;
      border-radius:50%;
      background:#2f7ee6;
      border:2px solid #fff;
      box-shadow:0 0 0 2px #b9d7fb,0 2px 5px rgba(47,126,230,.16);
    }
    .hm-now-chip{
      width:max-content;
      max-width:100%;
      display:inline-flex;
      align-items:center;
      gap:5px;
      margin-left:7px;
      padding:4px 8px 4px 7px;
      border:1px solid #cfe2fb;
      border-radius:999px;
      background:#f3f8ff;
      color:#4e6e97;
      font-size:9.5px;
      line-height:1;
      font-weight:800;
      box-shadow:0 2px 7px rgba(47,126,230,.06);
      white-space:nowrap;
    }
    .hm-now-chip strong{
      color:#236fd3;
      font-size:10px;
      font-variant-numeric:tabular-nums;
      letter-spacing:.01em;
    }
    .hm-now-live-dot{
      width:5px;
      height:5px;
      border-radius:50%;
      background:#2f7ee6;
      box-shadow:0 0 0 3px rgba(47,126,230,.09);
    }
    .hm-agenda-now.hm-now-after-block .hm-agenda-now-time,
    .hm-agenda-now.hm-now-after-block .hm-agenda-now-dot,
    .hm-agenda-now.hm-now-after-block .hm-agenda-now-line{display:none!important}
    @media(max-width:720px){
      .hm-agenda-now.hm-now-after-block{grid-template-columns:62px 16px minmax(0,1fr)}
      .hm-now-chip{margin-left:6px;padding:4px 7px;font-size:9px}
      .hm-now-chip strong{font-size:9.5px}
    }
  `;
  document.head.appendChild(style);

  const view=$('#view');
  if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(schedule,50),true);
  setInterval(schedule,30000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();
