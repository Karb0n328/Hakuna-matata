(() => {
  'use strict';

  const KEY='hakuna.studyTimer.v1';
  const MAX_MINUTES=600;
  let modalOpen=false;
  let modalStatus=null;
  let lastKnownStatus=null;

  function read(){
    try{
      const value=JSON.parse(localStorage.getItem(KEY)||'null');
      return value&&typeof value==='object'?value:{status:'idle'};
    }catch{return {status:'idle'};}
  }

  function write(value){
    localStorage.setItem(KEY,JSON.stringify(value));
    return value;
  }

  function setBadge(){try{if(navigator.setAppBadge)navigator.setAppBadge(1);}catch{}}
  function clearBadge(){try{if(navigator.clearAppBadge)navigator.clearAppBadge();}catch{}}

  function normalize(){
    let state=read();
    if(state.status==='running'&&Number(state.endAt)>0&&Date.now()>=Number(state.endAt)){
      state=write({
        status:'finished',
        durationMs:Number(state.durationMs)||0,
        startedAt:Number(state.startedAt)||null,
        endAt:Number(state.endAt),
        completedAt:Number(state.endAt)
      });
      setBadge();
    }
    return state;
  }

  function remaining(state){
    if(state.status==='running')return Math.max(0,Number(state.endAt)-Date.now());
    if(state.status==='paused')return Math.max(0,Number(state.remainingMs)||0);
    return 0;
  }

  function pad(n){return String(n).padStart(2,'0');}
  function formatMs(ms){
    let sec=Math.max(0,Math.ceil(ms/1000));
    const h=Math.floor(sec/3600);
    sec%=3600;
    const m=Math.floor(sec/60);
    sec%=60;
    return h?String(h)+':'+pad(m)+':'+pad(sec):pad(m)+':'+pad(sec);
  }

  function formatClock(ts){
    if(!ts)return '—';
    try{return new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit'}).format(new Date(ts));}
    catch{return '—';}
  }

  function progress(state){
    const total=Math.max(1,Number(state.durationMs)||1);
    if(state.status==='finished')return 100;
    if(state.status==='idle')return 0;
    return Math.max(0,Math.min(100,(1-(remaining(state)/total))*100));
  }

  function start(minutes){
    const m=Math.round(Number(minutes)||0);
    if(m<1||m>MAX_MINUTES)return false;
    const t=Date.now();
    write({status:'running',durationMs:m*60000,startedAt:t,endAt:t+m*60000});
    clearBadge();
    removeNotice();
    removePageBanner();
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
    if(s.status==='running'){
      write(Object.assign({},s,{endAt:Number(s.endAt)+300000,durationMs:(Number(s.durationMs)||0)+300000}));
    }else if(s.status==='paused'){
      write(Object.assign({},s,{remainingMs:(Number(s.remainingMs)||0)+300000,durationMs:(Number(s.durationMs)||0)+300000}));
    }
    update(true);
  }

  function stop(){
    write({status:'idle'});
    clearBadge();
    removeNotice();
    removePageBanner();
    closeModal();
    update(true);
  }

  function acknowledge(){
    const s=normalize();
    if(s.status==='finished')write({status:'idle'});
    clearBadge();
    removeNotice();
    removePageBanner();
    update(true);
  }

  function dockMarkup(){
    return '<section class="hm-timer-dock" data-timer-dock data-state="idle">'
      +'<div class="hm-timer-dock-head"><div class="hm-timer-dock-title"><span>⏱</span><span>Sayaç</span></div><span class="hm-timer-dock-badge">SESSİZ</span></div>'
      +'<div class="hm-timer-dock-clock" data-timer-dock-clock>50:00</div>'
      +'<div class="hm-timer-dock-sub" data-timer-dock-sub>Hazır · hızlı başlat</div>'
      +'<div class="hm-timer-dock-progress"><i data-timer-dock-progress></i></div>'
      +'<div class="hm-timer-dock-actions" data-timer-dock-actions></div>'
      +'<button type="button" class="hm-timer-dock-open" data-timer-open>Detaylı sayaç</button>'
      +'</section>';
  }

  function ensureDock(){
    const sidebar=document.querySelector('.sidebar');
    const foot=document.querySelector('.sidebar-foot');
    if(sidebar&&foot&&!document.querySelector('[data-timer-dock]')){
      foot.insertAdjacentHTML('beforebegin',dockMarkup());
    }
    if(!document.querySelector('[data-timer-mobile]')){
      document.body.insertAdjacentHTML('beforeend','<button type="button" class="hm-timer-mobile-dock" data-timer-mobile data-state="idle"><strong data-timer-mobile-clock>50:00</strong><span data-timer-mobile-sub>Sayaç · hazır</span></button>');
    }
  }

  function renderDock(state){
    ensureDock();
    const dock=document.querySelector('[data-timer-dock]');
    const mobile=document.querySelector('[data-timer-mobile]');
    const dc=document.querySelector('[data-timer-dock-clock]');
    const ds=document.querySelector('[data-timer-dock-sub]');
    const dp=document.querySelector('[data-timer-dock-progress]');
    const da=document.querySelector('[data-timer-dock-actions]');
    const mc=document.querySelector('[data-timer-mobile-clock]');
    const ms=document.querySelector('[data-timer-mobile-sub]');

    let main='50:00',sub='Hazır · hızlı başlat',actions='';
    if(state.status==='running'){
      main=formatMs(remaining(state));
      sub='Bitiş '+formatClock(state.endAt);
      actions='<button type="button" data-timer-pause>Duraklat</button><button type="button" data-timer-add>+5 dk</button><button type="button" data-timer-open>Aç</button>';
    }else if(state.status==='paused'){
      main=formatMs(remaining(state));
      sub='Duraklatıldı';
      actions='<button type="button" data-timer-resume>Devam</button><button type="button" data-timer-add>+5 dk</button><button type="button" data-timer-open>Aç</button>';
    }else if(state.status==='finished'){
      main='Süre bitti';
      sub=formatClock(state.completedAt)+' · sessiz tamamlandı';
      actions='<button type="button" data-timer-new>Yeni</button><button type="button" data-timer-ok>Tamam</button><button type="button" data-timer-open>Aç</button>';
    }else{
      actions='<button type="button" data-timer-start="25">25 dk</button><button type="button" data-timer-start="50">50 dk</button><button type="button" data-timer-start="90">90 dk</button>';
    }

    if(dock)dock.dataset.state=state.status||'idle';
    if(mobile)mobile.dataset.state=state.status||'idle';
    if(dc&&dc.textContent!==main)dc.textContent=main;
    if(ds&&ds.textContent!==sub)ds.textContent=sub;
    if(dp)dp.style.width=progress(state).toFixed(1)+'%';
    if(da&&da.innerHTML!==actions)da.innerHTML=actions;
    if(mc&&mc.textContent!==main)mc.textContent=main;
    if(ms){
      const mobileSub=state.status==='running'?'Bitiş '+formatClock(state.endAt):state.status==='paused'?'Duraklatıldı':state.status==='finished'?'Sessiz tamamlandı':'Sayaç · hazır';
      if(ms.textContent!==mobileSub)ms.textContent=mobileSub;
    }
  }

  function modalMarkup(state){
    const st=state.status||'idle';
    let value='50:00';
    let note='Süre seç veya özel dakika gir. Ses ve titreşim yok.';
    let controls='';

    if(st==='running'){
      value=formatMs(remaining(state));
      note='Bitiş '+formatClock(state.endAt)+' · uygulama kapansa da gerçek saate göre devam eder.';
      controls='<div class="hm-timer-meta"><span>Sessiz</span><span>Arka plan uyumlu</span><span>'+Math.round((Number(state.durationMs)||0)/60000)+' dk</span></div>'
        +'<div class="hm-timer-modal-actions"><button type="button" class="secondary-btn" data-timer-pause>Duraklat</button><button type="button" class="secondary-btn" data-timer-add>+5 dk</button><button type="button" class="danger-btn" data-timer-stop>Bitir</button></div>';
    }else if(st==='paused'){
      value=formatMs(remaining(state));
      note='Duraklatıldı · uygulama kapansa bile süre azalmaz.';
      controls='<div class="hm-timer-meta"><span>Duraklatıldı</span><span>'+formatMs(remaining(state))+' kaldı</span></div>'
        +'<div class="hm-timer-modal-actions"><button type="button" class="primary-btn" data-timer-resume>Devam et</button><button type="button" class="secondary-btn" data-timer-add>+5 dk</button><button type="button" class="danger-btn" data-timer-stop>Bitir</button></div>';
    }else if(st==='finished'){
      value='00:00';
      note='Sayaç '+formatClock(state.completedAt)+' tarihinde tamamlandı.';
      controls='<div class="hm-timer-finish-box">Süre bitti. Ses, alarm veya titreşim kullanılmadı.</div>'
        +'<div class="hm-timer-modal-actions"><button type="button" class="secondary-btn" data-timer-new>Yeni sayaç</button><button type="button" class="primary-btn" data-timer-ok>Tamam</button></div>';
    }else{
      controls='<div class="hm-timer-presets"><button type="button" data-timer-start="15">15 dk</button><button type="button" data-timer-start="25">25 dk</button><button type="button" data-timer-start="50">50 dk</button><button type="button" data-timer-start="90">90 dk</button></div>'
        +'<div class="hm-timer-custom"><input type="number" min="1" max="'+MAX_MINUTES+'" inputmode="numeric" placeholder="Özel süre (dk)" data-timer-custom><button type="button" class="primary-btn" data-timer-custom-start>Başlat</button></div>';
    }

    return '<div class="hm-timer-modal" data-timer-modal data-modal-status="'+st+'">'
      +'<section class="hm-timer-modal-card" role="dialog" aria-modal="true" aria-label="Hakuna sayacı">'
      +'<header class="hm-timer-modal-head"><div><div class="hm-timer-modal-kicker">Hakuna</div><div class="hm-timer-modal-title">Sessiz sayaç</div></div><button type="button" class="hm-timer-modal-close" data-timer-close aria-label="Kapat">✕</button></header>'
      +'<div class="hm-timer-modal-body"><div class="hm-timer-big"><div class="hm-timer-big-value" data-timer-big-value>'+value+'</div><div class="hm-timer-big-note" data-timer-big-note>'+note+'</div><div class="hm-timer-big-progress"><i data-timer-big-progress style="width:'+progress(state).toFixed(1)+'%"></i></div></div>'+controls+'</div>'
      +'</section></div>';
  }

  function renderModal(){
    if(!modalOpen)return;
    const old=document.querySelector('[data-timer-modal]');
    if(old)old.remove();
    const state=normalize();
    document.body.insertAdjacentHTML('beforeend',modalMarkup(state));
    modalStatus=state.status||'idle';
  }

  function openModal(){
    modalOpen=true;
    renderModal();
  }

  function closeModal(){
    modalOpen=false;
    modalStatus=null;
    const modal=document.querySelector('[data-timer-modal]');
    if(modal)modal.remove();
  }

  function updateModal(state){
    if(!modalOpen)return;
    if(modalStatus!==(state.status||'idle')){
      renderModal();
      return;
    }
    const value=document.querySelector('[data-timer-big-value]');
    const note=document.querySelector('[data-timer-big-note]');
    const bar=document.querySelector('[data-timer-big-progress]');
    if(value&&(state.status==='running'||state.status==='paused')){
      const next=formatMs(remaining(state));
      if(value.textContent!==next)value.textContent=next;
    }
    if(note&&state.status==='running'){
      const next='Bitiş '+formatClock(state.endAt)+' · uygulama kapansa da gerçek saate göre devam eder.';
      if(note.textContent!==next)note.textContent=next;
    }
    if(bar)bar.style.width=progress(state).toFixed(1)+'%';
  }

  function noticeMarkup(state){
    return '<aside class="hm-timer-notice" data-timer-notice role="status" aria-live="polite">'
      +'<div class="hm-timer-notice-mark">✓</div>'
      +'<div class="hm-timer-notice-copy"><strong>Sayaç tamamlandı</strong><span>'+formatClock(state.completedAt)+' · Sessiz olarak tamamlandı. Çalışmaya ara verebilirsin.</span></div>'
      +'<div class="hm-timer-notice-actions"><button type="button" data-timer-new>Yeni</button><button type="button" data-timer-ok>Tamam</button></div>'
      +'</aside>';
  }

  function showNotice(state){
    if(state.status!=='finished')return;
    if(document.querySelector('[data-timer-notice]'))return;
    document.body.insertAdjacentHTML('beforeend',noticeMarkup(state));
  }

  function removeNotice(){
    const el=document.querySelector('[data-timer-notice]');
    if(el)el.remove();
  }

  function pageBannerMarkup(state){
    return '<section class="hm-timer-page-banner" data-timer-page-banner>'
      +'<div class="hm-timer-page-main"><div class="hm-timer-page-mark">✓</div><div class="hm-timer-page-copy"><strong>Sayaç tamamlandı</strong><span>'+formatClock(state.completedAt)+' · ses veya titreşim olmadan süre doldu.</span></div></div>'
      +'<div class="hm-timer-page-actions"><button type="button" class="secondary-btn" data-timer-new>Yeni sayaç</button><button type="button" class="primary-btn" data-timer-ok>Tamam</button></div>'
      +'</section>';
  }

  function ensurePageBanner(state){
    const old=document.querySelector('[data-timer-page-banner]');
    const title=document.getElementById('pageTitle');
    const view=document.getElementById('view');
    const isToday=title&&title.textContent.trim()==='Bugün';
    if(state.status!=='finished'||!isToday||!view){
      if(old)old.remove();
      return;
    }
    if(!old)view.insertAdjacentHTML('afterbegin',pageBannerMarkup(state));
  }

  function removePageBanner(){
    const el=document.querySelector('[data-timer-page-banner]');
    if(el)el.remove();
  }

  function update(force){
    ensureDock();
    const before=read().status||'idle';
    const state=normalize();
    const status=state.status||'idle';
    const justFinished=before==='running'&&status==='finished';

    renderDock(state);
    ensurePageBanner(state);
    updateModal(state);

    if(justFinished||status==='finished'){
      showNotice(state);
      setBadge();
    }else{
      removeNotice();
    }

    lastKnownStatus=status;
  }

  function onClick(event){
    const target=event.target;
    if(!target||!target.closest)return;

    if(target.closest('[data-timer-close]')){
      event.preventDefault();
      event.stopPropagation();
      closeModal();
      return;
    }

    const modal=target.closest('[data-timer-modal]');
    if(modal&&target===modal){
      closeModal();
      return;
    }

    if(target.closest('[data-timer-open]')||target.closest('[data-timer-mobile]')){
      openModal();
      return;
    }

    const startBtn=target.closest('[data-timer-start]');
    if(startBtn){start(startBtn.dataset.timerStart);return;}

    if(target.closest('[data-timer-pause]')){pause();return;}
    if(target.closest('[data-timer-resume]')){resume();return;}
    if(target.closest('[data-timer-add]')){addFive();return;}
    if(target.closest('[data-timer-stop]')){stop();return;}

    if(target.closest('[data-timer-new]')){
      acknowledge();
      openModal();
      return;
    }

    if(target.closest('[data-timer-ok]')){
      acknowledge();
      closeModal();
      return;
    }

    if(target.closest('[data-timer-custom-start]')){
      const input=document.querySelector('[data-timer-custom]');
      if(!start(input&&input.value)&&input)input.focus();
    }
  }

  function onKey(event){
    if(event.key==='Escape'&&modalOpen){
      closeModal();
      return;
    }
    if(event.key==='Enter'&&event.target&&event.target.matches&&event.target.matches('[data-timer-custom]')){
      const value=event.target.value;
      if(!start(value))event.target.focus();
    }
  }

  function init(){
    ensureDock();
    const first=normalize();
    lastKnownStatus=first.status||'idle';
    update(true);

    document.addEventListener('click',onClick,true);
    document.addEventListener('keydown',onKey,true);

    setInterval(function(){update(false);},1000);
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')update(true);});
    window.addEventListener('focus',function(){update(true);},{passive:true});
    window.addEventListener('pageshow',function(){update(true);},{passive:true});
    window.addEventListener('storage',function(event){if(event.key===KEY)update(true);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.HakunaStudyTimer={open:openModal,close:closeModal,start:start,pause:pause,resume:resume,stop:stop,addFive:addFive,acknowledge:acknowledge,state:normalize};
})();
