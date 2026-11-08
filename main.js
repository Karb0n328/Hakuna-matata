import './migration.js';

function showBootError(error){
  console.error('Hakuna core boot failed',error);
  const view=document.querySelector('#view');
  if(!view)return;
  view.innerHTML=`<section class="card"><div class="card-body" style="padding:24px"><div class="card-title">Hakuna açılırken bir dosya yenilenemedi</div><div class="card-subtitle" style="margin-top:8px">Verilerin cihazda duruyor. İnternet bağlantın varsa aşağıdaki düğmeyle uygulamayı yeniden yükle.</div><div class="form-actions" style="margin-top:16px"><button class="primary-btn" type="button" data-hakuna-boot-reload>Yeniden dene</button></div></div></section>`;
  view.querySelector('[data-hakuna-boot-reload]')?.addEventListener('click',()=>location.reload());
}

let roomUi;
function loadRoomUi(){
  roomUi??=Promise.all([
    import('./room-weather.js?v=2'),
    import('./room-experience.js?v=7-bloom'),
    import('./room-wardrobe.js?v=8-esila-heart'),
    import('./study-rooms.js?v=23-mooncloud')
  ]);
  return roomUi;
}

const launch=navigator.onLine&&!new URLSearchParams(location.search).has('room')
  ?window.HakunaOffline?.roomLaunch?.():null;
if(launch?.entries.length){
  window.HakunaRoomLaunchReady=loadRoomUi().then(()=>launch).catch(error=>{
    console.warn('Hakuna cached rooms load',error);
    return null;
  });
}

try{
  await import('./app.js?v=room-first-frame-v1');
}catch(error){
  showBootError(error);
}

// These modules protect/repair data but are not allowed to block first paint.
void import('./auto-debt.js?v=state-refresh-v1').catch(err=>console.warn('Auto debt load',err));
void import('./deletion-guard-v2.js?v=1').catch(err=>console.warn('Deletion guard load',err));
void import('./performance-runtime.js?v=4').catch(err=>console.warn('Performance runtime load',err));

async function refreshServiceWorkerLater(){
  if(!('serviceWorker' in navigator))return;
  try{
    const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    // Do not wait for installing/waiting workers and never reload during boot.
    // skipWaiting + clients.claim in sw.js will move clients over safely.
    void reg.update().catch(()=>{});
  }catch(err){
    console.warn('Hakuna service worker refresh',err);
  }
}

async function importAccountSyncOptimized(){
  const nativeSetInterval=window.setInterval;
  window.setInterval=function(fn,delay,...args){
    let next=Number(delay)||0;
    if(next===1800)next=5000;
    else if(next===45000)next=60000;
    return nativeSetInterval.call(window,fn,next,...args);
  };
  try{
    await import('./account-sync-v2.js?v=state-refresh-v1');
  }finally{
    window.setInterval=nativeSetInterval;
  }
}

function afterFirstPaint(fn){
  requestAnimationFrame(()=>requestAnimationFrame(fn));
}

afterFirstPaint(()=>{
  // Cache/service-worker maintenance happens only after the core screen exists.
  void refreshServiceWorkerLater();

  void (async()=>{
    const connect=()=>importAccountSyncOptimized().catch(err=>console.warn('Hakuna cloud sync load',err));
    if(navigator.onLine)void connect();
    window.addEventListener('online',()=>{void connect();},{once:true});
    try{
      await Promise.all([loadRoomUi(),import('./room-notifications.js?v=6-android')]);
      if(document.querySelector('#pageTitle')?.textContent==='Odalar')window.HakunaStudyRooms?.render(document.querySelector('#view'));
    }catch(err){console.warn('Hakuna study rooms load',err);}
    await Promise.allSettled([
      import('./account-auth-hotfix.js?v=6'),
      import('./settings-copy-fix.js?v=1'),
      import('./debt-edit.js?v=2'),
      import('./sidebar-welcome.js?v=3')
    ]);
  })();

  void (async()=>{
    try{
      await import('./week-settings.js?v=2');
      await import('./question-tools.js?v=question-answers-v1');
      await import('./question-delete-fix.js?v=4');
      await import('./plan-mode.js?v=3');
      await import('./plan-mode-pure-cards.js?v=2');
      await import('./immediate-debt-status.js?v=2');
    }catch(err){console.warn('Hakuna enhancement load',err);}
  })();
});

