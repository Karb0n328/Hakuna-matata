(() => {
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let scheduled=false;
  let clockTimer=null;

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
    return '<div class="hm-now-time-flag"><strong class="hm-now-clock"></strong></div><div class="hm-now-rail-pin" aria-hidden="true"></div><div class="hm-now-short-tick" aria-hidden="true"></div>';
  }
  function makeMarker(){
    const el=document.createElement('div');
    el.className='hm-agenda-now hm-now-after-block hm-now-rail-marker';
    el.dataset.hmNow='1';
    el.innerHTML=markerMarkup();
    return el;
  }
  function ensureMarker(marker){
    if(!marker.querySelector('.hm-now-time-flag'))marker.innerHTML=markerMarkup();
    marker.className='hm-agenda-now hm-now-after-block hm-now-rail-marker';
    marker.dataset.hmNow='1';
    const label=nowLabel();
    const clock=$('.hm-now-clock',marker);
    if(clock&&clock.textContent!==label)clock.textContent=label;
    marker.setAttribute('aria-label',`Güncel saat ${label}`);
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
    ensureMarker(marker);

    if(latest){
      if(latest.nextElementSibling!==marker)latest.insertAdjacentElement('afterend',marker);
    }else if(rows[0].previousElementSibling!==marker){
      agenda.insertBefore(marker,rows[0]);
    }
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(placeMarker);
  }

  function stopClock(){if(clockTimer){clearTimeout(clockTimer);clockTimer=null;}}
  function startClock(){
    stopClock();
    if(document.hidden)return;
    const delay=Math.max(1000,60050-(Date.now()%60000));
    clockTimer=setTimeout(()=>{
      clockTimer=null;
      schedule();
      startClock();
    },delay);
  }

  const style=document.createElement('style');
  style.textContent=`
    .hm-agenda-now.hm-now-rail-marker{position:relative;z-index:6;display:grid;grid-template-columns:72px 18px minmax(0,1fr);align-items:center;min-height:30px;margin:-1px 0 3px;pointer-events:none}
    .hm-now-time-flag{position:relative;justify-self:end;margin-right:8px;min-width:50px;padding:6px 8px 5px;border-radius:9px;background:#2f7ee6;color:#fff;text-align:center;box-shadow:0 4px 10px rgba(47,126,230,.24)}
    .hm-now-time-flag::after{content:"";position:absolute;right:-5px;top:50%;width:10px;height:10px;background:#2f7ee6;transform:translateY(-50%) rotate(45deg);border-radius:2px}
    .hm-now-time-flag strong{position:relative;z-index:1;display:block;font-size:11px;line-height:1;font-weight:900;letter-spacing:.01em;font-variant-numeric:tabular-nums}
    .hm-now-rail-pin{position:relative;z-index:2;width:12px;height:12px;justify-self:center;border-radius:50%;background:#2f7ee6;border:3px solid #fff;box-shadow:0 0 0 3px rgba(47,126,230,.20),0 3px 8px rgba(47,126,230,.20)}
    .hm-now-rail-pin::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(47,126,230,.18)}
    .hm-now-short-tick{width:18px;height:3px;margin-left:4px;border-radius:999px;background:#2f7ee6;opacity:.82}
    .hm-agenda-now.hm-now-rail-marker .hm-agenda-now-time,.hm-agenda-now.hm-now-rail-marker .hm-agenda-now-dot,.hm-agenda-now.hm-now-rail-marker .hm-agenda-now-line,.hm-agenda-now.hm-now-rail-marker .hm-now-chip,.hm-agenda-now.hm-now-rail-marker .hm-now-spacer,.hm-agenda-now.hm-now-rail-marker .hm-now-rail-dot{display:none!important}
    @media(max-width:720px){.hm-agenda-now.hm-now-rail-marker{grid-template-columns:62px 16px minmax(0,1fr);min-height:28px}.hm-now-time-flag{min-width:46px;margin-right:7px;padding:5px 7px}.hm-now-time-flag strong{font-size:10px}.hm-now-rail-pin{width:11px;height:11px}.hm-now-short-tick{width:14px;margin-left:3px}}
  `;
  document.head.appendChild(style);

  const view=$('#view');
  if(view)new MutationObserver(schedule).observe(view,{childList:true});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-nav="today"],[data-date-step],[data-go-today],[data-status],[data-close-modal],[data-add-block]'))setTimeout(schedule,40);
  },true);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stopClock();
    else{schedule();startClock();}
  });
  startClock();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
