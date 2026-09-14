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
  function makeMarker(){
    const el=document.createElement('div');
    el.className='hm-agenda-now hm-now-after-block';
    el.dataset.hmNow='1';
    el.innerHTML='<div class="hm-agenda-now-time"></div><div class="hm-agenda-now-dot"></div><div class="hm-agenda-now-line"></div>';
    return el;
  }
  function placeMarker(){
    scheduled=false;
    const wrap=$('.timeline-wrap');
    const original=$('.timeline-scroll',wrap||document);
    const timeline=$('.timeline',original||document);
    const agenda=$('.hm-agenda',wrap||document);
    if(!timeline||!agenda)return;

    // Yalnızca bugünün ekranında canlı işaret göster.
    if(timeline.dataset.timelineDate!==todayISO()){
      $$('[data-hm-now]',agenda).forEach(x=>x.remove());
      return;
    }

    // Eski sürümden kalabilecek blok-içi işaretleri tamamen kaldır.
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

    let marker=$('.hm-agenda-now',agenda);
    if(!marker)marker=makeMarker();
    marker.classList.add('hm-now-after-block');
    const time=$('.hm-agenda-now-time',marker);
    if(time)time.textContent=nowLabel();

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
  style.textContent='.hm-agenda-now.hm-now-after-block{position:relative;z-index:3;margin:1px 0 7px;clear:both}.hm-agenda-now.hm-now-after-block .hm-agenda-now-line{background:#2f7ee6}.hm-agenda-now.hm-now-after-block .hm-agenda-now-time{background:#fff;position:relative;z-index:1}';
  document.head.appendChild(style);

  const view=$('#view');
  if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(schedule,50),true);
  setInterval(schedule,30000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();
