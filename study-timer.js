(() => {
  'use strict';

  const KEY='hakuna.studyTimer.v1';
  const MAX_MINUTES=600;
  let modalOpen=false;
  let renderQueued=false;

  function read(){
    try{
      const v=JSON.parse(localStorage.getItem(KEY)||'null');
      return v&&typeof v==='object'?v:{status:'idle'};
    }catch{return {status:'idle'};}
  }
  function write(v){
    localStorage.setItem(KEY,JSON.stringify(v));
    return v;
  }
  function clearBadge(){try{navigator.clearAppBadge&&navigator.clearAppBadge();}catch{}}
  function setBadge(){try{navigator.setAppBadge&&navigator.setAppBadge(1);}catch{}}
  function normalize(){
    let s=read();
    if(s.status==='running'&&Number(s.endAt)&&Date.now()>=Number(s.endAt)){
      s=write({status:'finished',durationMs:Number(s.durationMs)||0,startedAt:Number(s.startedAt)||null,endAt:Number(s.endAt),completedAt:Number(s.endAt),acknowledged:false});
      setBadge();
    }
    return s;
  }
  function remaining(s){
    if(s.status==='running')return Math.max(0,Number(s.endAt)-Date.now());
    if(s.status==='paused')return Math.max(0,Number(s.remainingMs)||0);
    return 0;
  }
  function pad(n){return String(n).padStart(2,'0');}
  function fmt(ms){
    let sec=Math.max(0,Math.ceil(ms/1000));
    const h=Math.floor(sec/3600); sec%=3600;
    const m=Math.floor(sec/60); sec%=60;
    return h?String(h)+':'+pad(m)+':'+pad(sec):pad(m)+':'+pad(sec);
  }
  function clock(ts){
    if(!ts)return '—';
    try{return new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit'}).format(new Date(ts));}
    catch{return '—';}
  }

  function start(minutes){
    const m=Math.round(Number(minutes)||0);
    if(m<1||m>MAX_MINUTES)return false;
    const t=Date.now();
    write({status:'running',durationMs:m*60000,startedAt:t,endAt:t+m*60000,acknowledged:false});
    clearBadge();
    closeModal();
    update(true);
    return true;
  }
  function pause(){
    const s=normalize();
    if(s.status!=='running')return;
    write(Object.assign({},s,{status:'paused',remainingMs:remaining(s),pausedAt:Date.now()}));
    update(true);
  }
  function resume(){
    const s=normalize();
    if(s.status!=='paused')return;
    const rem=Math.max(1000,Number(s.remainingMs)||0);
    write(Object.assign({},s,{status:'running',endAt:Date.now()+rem,resumedAt:Date.now()}));
    update(true);
  }
  function addFive(){
    const s=normalize();
    if(s.status==='running')write(Object.assign({},s,{endAt:Number(s.endAt)+300000,durationMs:(Number(s.durationMs)||0)+300000}));
    else if(s.status==='paused')write(Object.assign({},s,{remainingMs:(Number(s.remainingMs)||0)+300000,durationMs:(Number(s.durationMs)||0)+300000}));
    update(true);
  }
  function stop(){
    write({status:'idle'});
    clearBadge();
    closeModal();
    update(true);
  }
  function acknowledge(){
    if(normalize().status==='finished')write({status:'idle'});
    clearBadge();
    update(true);
  }

  function ensureLaunchers(){
    const sidebar=document.querySelector('.sidebar');
    const foot=document.querySelector('.sidebar-foot');
    if(sidebar&&foot&&!document.querySelector('[data-hm-timer-sidebar]')){
      const b=document.createElement('button');
      b.type='button'; b.className='hm-timer-sidebar'; b.dataset.hmTimerSidebar='1';
      b.innerHTML='<span class="hm-timer-icon">⏱</span><span class="hm-timer-side-copy"><span class="hm-timer-side-title">Sayaç</span><span class="hm-timer-side-value" data-hm-timer-side-value>Hazır</span></span>';
      b.addEventListener('click',openModal);
      sidebar.insertBefore(b,foot);
    }
    if(!document.querySelector('[data-hm-timer-mobile]')){
      const b=document.createElement('button');
      b.type='button'; b.className='hm-timer-mobile'; b.dataset.hmTimerMobile='1';
      b.innerHTML='<span>⏱</span><span class="hm-timer-mobile-label" data-hm-timer-mobile-label>Sayaç</span>';
      b.addEventListener('click',openModal);
      document.body.appendChild(b);
    }
  }

  function label(s){
    if(s.status==='running')return fmt(remaining(s));
    if(s.status==='paused')return 'Duraklatıldı · '+fmt(remaining(s));
    if(s.status==='finished')return 'Süre bitti';
    return 'Hazır';
  }

  function updateLaunchers(s){
    const side=document.querySelector('[data-hm-timer-sidebar]');
    const mob=document.querySelector('[data-hm-timer-mobile]');
    const sv=document.querySelector('[data-hm-timer-side-value]');
    const mv=document.querySelector('[data-hm-timer-mobile-label]');
    const x=label(s);
    if(side){side.dataset.state=s.status||'idle'; if(sv)sv.textContent=x;}
    if(mob){mob.dataset.state=s.status||'idle'; if(mv)mv.textContent=s.status==='idle'?'Sayaç':x;}
  }

  function ensureBanner(s){
    const old=document.querySelector('[data-hm-timer-finished-banner]');
    const today=document.getElementById('pageTitle')&&document.getElementById('pageTitle').textContent.trim()==='Bugün';
    const view=document.getElementById('view');
    if(s.status!=='finished'||!today||!view){if(old)old.remove();return;}
    if(old)return;
    const el=document.createElement('section');
    el.className='hm-timer-finished-banner'; el.dataset.hmTimerFinishedBanner='1';
    el.innerHTML='<div class="hm-timer-finished-main"><div class="hm-timer-finished-mark">✓</div><div class="hm-timer-finished-text"><strong>Sayaç tamamlandı</strong><span>Ses çalmadı. Süre '+clock(s.completedAt)+'\'de bitti.</span></div></div><div class="hm-timer-finished-actions"><button type="button" class="secondary-btn" data-hm-timer-new>Yeni sayaç</button><button type="button" class="primary-btn" data-hm-timer-ok>Tamam</button></div>';
    view.prepend(el);
    el.querySelector('[data-hm-timer-new]').addEventListener('click',function(){acknowledge();openModal();});
    el.querySelector('[data-hm-timer-ok]').addEventListener('click',acknowledge);
  }

  function modalMarkup(s){
    const st=s.status||'idle';
    const rem=remaining(s);
    const value=st==='finished'?'00:00':st==='idle'?'50:00':fmt(rem);
    let note='Bir süre seç veya dakika gir. Sayaç sessiz çalışır.';
    if(st==='running')note='Bitiş: '+clock(s.endAt)+' · uygulama kapansa da gerçek saate göre devam eder.';
    else if(st==='paused')note='Sayaç duraklatıldı. Uygulama kapansa bile süre azalmaz.';
    else if(st==='finished')note='Sayaç '+clock(s.completedAt)+'\'de tamamlandı. Ses veya alarm çalmadı.';

    let controls='';
    if(st==='idle'){
      controls='<div class="hm-timer-presets"><button type="button" class="hm-timer-preset" data-start="25">25 dk</button><button type="button" class="hm-timer-preset" data-start="50">50 dk</button><button type="button" class="hm-timer-preset" data-start="90">90 dk</button></div><div class="hm-timer-custom"><input type="number" min="1" max="'+MAX_MINUTES+'" inputmode="numeric" placeholder="Özel süre (dk)" data-custom><button type="button" class="primary-btn" data-custom-start>Başlat</button></div>';
    }else if(st==='running'){
      controls='<div class="hm-timer-meta"><span>Sessiz</span><span>Arka plan uyumlu</span><span>'+Math.round((Number(s.durationMs)||0)/60000)+' dk</span></div><div class="hm-timer-actions"><button type="button" class="secondary-btn" data-pause>Duraklat</button><button type="button" class="secondary-btn" data-add>+5 dk</button><button type="button" class="danger-btn" data-stop>Bitir</button></div>';
    }else if(st==='paused'){
      controls='<div class="hm-timer-meta"><span>Duraklatıldı</span><span>'+fmt(rem)+' kaldı</span></div><div class="hm-timer-actions"><button type="button" class="primary-btn" data-resume>Devam et</button><button type="button" class="secondary-btn" data-add>+5 dk</button><button type="button" class="danger-btn" data-stop>Bitir</button></div>';
    }else{
      controls='<div class="hm-timer-finished-copy">Süre bitti. Herhangi bir ses, alarm veya titreşim kullanılmadı.</div><div class="hm-timer-actions"><button type="button" class="secondary-btn" data-new>Yeni sayaç</button><button type="button" class="primary-btn" data-ok>Tamam</button></div>';
    }

    return '<div class="hm-timer-overlay" data-overlay><section class="hm-timer-panel" role="dialog" aria-modal="true" aria-label="Hakuna sayacı"><header class="hm-timer-head"><div><div class="hm-timer-kicker">Hakuna</div><div class="hm-timer-title">Sessiz sayaç</div></div><button type="button" class="hm-timer-close" data-close aria-label="Kapat">✕</button></header><div class="hm-timer-body"><div class="hm-timer-clock"><div class="hm-timer-clock-value" data-clock>'+value+'</div><div class="hm-timer-clock-note" data-note>'+note+'</div></div>'+controls+'</div></section></div>';
  }

  function bindModal(){
    const root=document.querySelector('[data-overlay]');
    if(!root)return;
    root.querySelector('[data-close]').addEventListener('click',closeModal);
    root.addEventListener('click',function(e){if(e.target===root)closeModal();});
    root.querySelectorAll('[data-start]').forEach(function(b){b.addEventListener('click',function(){start(b.dataset.start);});});
    const custom=root.querySelector('[data-custom]');
    const customStart=root.querySelector('[data-custom-start]');
    if(customStart)customStart.addEventListener('click',function(){if(!start(custom.value))custom.focus();});
    if(custom)custom.addEventListener('keydown',function(e){if(e.key==='Enter'&&customStart)customStart.click();});
    const p=root.querySelector('[data-pause]'); if(p)p.addEventListener('click',function(){pause();renderModal();});
    const r=root.querySelector('[data-resume]'); if(r)r.addEventListener('click',function(){resume();renderModal();});
    const a=root.querySelector('[data-add]'); if(a)a.addEventListener('click',function(){addFive();renderModal();});
    const x=root.querySelector('[data-stop]'); if(x)x.addEventListener('click',stop);
    const n=root.querySelector('[data-new]'); if(n)n.addEventListener('click',function(){acknowledge();renderModal();});
    const o=root.querySelector('[data-ok]'); if(o)o.addEventListener('click',function(){acknowledge();closeModal();});
  }

  function renderModal(){
    if(!modalOpen)return;
    const old=document.querySelector('[data-overlay]'); if(old)old.remove();
    document.body.insertAdjacentHTML('beforeend',modalMarkup(normalize()));
    bindModal();
  }
  function openModal(){modalOpen=true;renderModal();}
  function closeModal(){modalOpen=false;const x=document.querySelector('[data-overlay]');if(x)x.remove();}

  function update(force){
    ensureLaunchers();
    const before=read().status;
    const s=normalize();
    if(before==='running'&&s.status==='finished')setBadge();
    updateLaunchers(s);
    ensureBanner(s);
    if(modalOpen){
      const c=document.querySelector('[data-clock]');
      const n=document.querySelector('[data-note]');
      if(s.status==='running'&&c){c.textContent=fmt(remaining(s));if(n)n.textContent='Bitiş: '+clock(s.endAt)+' · uygulama kapansa da gerçek saate göre devam eder.';}
      else if(s.status==='paused'&&c)c.textContent=fmt(remaining(s));
      else if(s.status==='finished')renderModal();
      else if(force)renderModal();
    }
  }

  function schedule(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(function(){renderQueued=false;update(false);});
  }

  function init(){
    update(true);
    setInterval(function(){update(false);},1000);
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')update(true);});
    window.addEventListener('focus',function(){update(true);},{passive:true});
    window.addEventListener('pageshow',function(){update(true);},{passive:true});
    window.addEventListener('storage',function(e){if(e.key===KEY)update(true);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modalOpen)closeModal();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.HakunaStudyTimer={open:openModal,start:start,pause:pause,resume:resume,stop:stop,acknowledge:acknowledge,state:normalize};
})();