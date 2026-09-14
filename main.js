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
await import('./mata-fallback.js');
await import('./mata-loader.js');
await import('./week-settings.js');
await import('./question-tools.js?v=2');
