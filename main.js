import './migration.js';
await import('./auto-debt.js');

async function ensureStableServiceWorker(){
  if(!('serviceWorker' in navigator))return;
  try{
    let controllerChanged=false;
    let resolveChange;
    const changed=new Promise(resolve=>{resolveChange=resolve;});
    const onChange=()=>{controllerChanged=true;navigator.serviceWorker.removeEventListener('controllerchange',onChange);resolveChange();};
    navigator.serviceWorker.addEventListener('controllerchange',onChange);

    const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    await reg.update().catch(()=>{});
    const pending=!!(reg.installing||reg.waiting);

    if(pending){
      await Promise.race([changed,new Promise(resolve=>setTimeout(resolve,5000))]);
      if(!controllerChanged){
        const tries=Number(sessionStorage.getItem('hakuna.swRecoveryTry')||0);
        if(tries<1){
          sessionStorage.setItem('hakuna.swRecoveryTry',String(tries+1));
          location.reload();
          await new Promise(()=>{});
        }
      }
    }
    sessionStorage.removeItem('hakuna.swRecoveryTry');
    navigator.serviceWorker.removeEventListener('controllerchange',onChange);
  }catch{}
}

// Critical rule: core navigation is never runtime-rewritten for performance.
// If a new worker is waiting, let the stable worker take control first so an
// older cached performance patch cannot poison app.js on iPhone/PWA installs.
await ensureStableServiceWorker();
await import('./app.js?v=stable-core-1');
await import('./performance-runtime.js?v=3');

async function importAccountSyncOptimized(){
  const nativeSetInterval=window.setInterval;
  window.setInterval=function(fn,delay,...args){
    let next=Number(delay)||0;
    if(next===1800)next=5000;
    else if(next===45000)next=60000;
    return nativeSetInterval.call(window,fn,next,...args);
  };
  try{
    await import('./account-sync-v2.js?v=perf1');
  }finally{
    window.setInterval=nativeSetInterval;
  }
}

function afterFirstPaint(fn){
  requestAnimationFrame(()=>requestAnimationFrame(fn));
}

afterFirstPaint(()=>{
  void (async()=>{
    try{await importAccountSyncOptimized();}catch{}
    await Promise.allSettled([
      import('./account-auth-hotfix.js?v=6'),
      import('./settings-copy-fix.js?v=1'),
      import('./debt-edit.js?v=2'),
      import('./sidebar-welcome.js?v=2')
    ]);
  })();

  void (async()=>{
    try{
      await import('./week-settings.js?v=2');
      await import('./question-tools.js?v=3');
      await import('./question-delete-fix.js?v=2');
      await import('./plan-mode.js?v=2');
      await import('./plan-mode-pure-cards.js?v=2');
      await import('./immediate-debt-status.js?v=2');
    }catch(err){console.warn('Hakuna enhancement load',err);}
  })();
});

const loadMata=()=>void (async()=>{
  try{
    await import('./mata-fallback.js');
    await import('./mata-loader.js?v=4');
  }catch(err){console.warn('Mata load',err);}
})();

if('requestIdleCallback' in window)requestIdleCallback(loadMata,{timeout:700});
else setTimeout(loadMata,180);
