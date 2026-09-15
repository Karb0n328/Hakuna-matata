import './migration.js';
await import('./auto-debt.js');

// Core UI first: never hold the first paint behind service-worker updates or optional modules.
await import('./app.js?v=week20');
await import('./performance-runtime.js?v=2');

// Service worker refreshes in the background. Existing installations keep working,
// while first paint is no longer delayed by an unconditional 350 ms wait.
if('serviceWorker' in navigator){
  requestAnimationFrame(()=>{
    navigator.serviceWorker.register('./sw.js')
      .then(reg=>reg.update())
      .catch(()=>{});
  });
}

async function importAccountSyncOptimized(){
  const nativeSetInterval=window.setInterval;
  const NativeMutationObserver=window.MutationObserver;

  // account-sync-v2 was written defensively and polled every 1.8 s. Keep its
  // safety net, but reduce idle CPU/IndexedDB/hash churn. Also restrict its
  // account-UI observer to top-level page swaps instead of every descendant.
  window.setInterval=function(fn,delay,...args){
    let next=Number(delay)||0;
    if(next===1800)next=5000;
    else if(next===45000)next=60000;
    return nativeSetInterval.call(window,fn,next,...args);
  };

  if(NativeMutationObserver){
    window.MutationObserver=class HakunaPerfMutationObserver extends NativeMutationObserver{
      observe(target,options){
        if(target?.id==='view'&&options?.subtree){
          return super.observe(target,{...options,subtree:false});
        }
        return super.observe(target,options);
      }
    };
  }

  try{
    await import('./account-sync-v2.js?v=perf1');
  }finally{
    window.setInterval=nativeSetInterval;
    if(NativeMutationObserver)window.MutationObserver=NativeMutationObserver;
  }
}

function afterFirstPaint(fn){
  requestAnimationFrame(()=>requestAnimationFrame(fn));
}

// Small local enhancements are deferred until the core screen is already visible.
afterFirstPaint(()=>{
  void (async()=>{
    try{await importAccountSyncOptimized();}catch{}

    await Promise.allSettled([
      import('./account-auth-hotfix.js?v=5'),
      import('./settings-copy-fix.js?v=1'),
      import('./debt-edit.js?v=1'),
      import('./sidebar-welcome.js?v=2')
    ]);
  })();

  // These modules have ordering relationships, so keep the proven order while
  // moving the whole chain off the critical first-paint path.
  void (async()=>{
    try{
      await import('./week-settings.js?v=2');
      await import('./question-tools.js?v=2');
      await import('./question-delete-fix.js?v=1');
      await import('./plan-mode.js?v=2');
      await import('./plan-mode-pure-cards.js?v=2');
      await import('./immediate-debt-status.js?v=2');
    }catch(err){console.warn('Hakuna enhancement load',err);}
  })();
});

// Mata is the heaviest optional UI surface. Load it when the browser has a quiet
// moment (or shortly after startup on browsers without requestIdleCallback).
const loadMata=()=>void (async()=>{
  try{
    await import('./mata-fallback.js');
    await import('./mata-loader.js?v=4');
  }catch(err){console.warn('Mata load',err);}
})();

if('requestIdleCallback' in window)requestIdleCallback(loadMata,{timeout:700});
else setTimeout(loadMata,180);
