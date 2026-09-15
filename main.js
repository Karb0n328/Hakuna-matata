import './migration.js';
await import('./auto-debt.js');

if('serviceWorker' in navigator){
  try{
    const reg=await navigator.serviceWorker.register('./sw.js');
    await reg.update();
    await new Promise(resolve=>setTimeout(resolve,350));
  }catch{}
}

await import('./app.js?v=week20');
import('./account-sync-v2.js?v=2').catch(()=>{});
await import('./smooth-save-ui.js?v=1');
await import('./mata-fallback.js');
await import('./mata-loader.js');
await import('./week-settings.js');
await import('./question-tools.js?v=2');
await import('./question-delete-fix.js?v=1');
await import('./plan-mode.js?v=2');
await import('./plan-mode-pure-cards.js?v=2');
await import('./immediate-debt-status.js?v=2');
