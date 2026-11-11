const CACHE='hakuna-matata-v149-refined-fantasy-chairs';
const ASSETS=["./","./account-auth-hotfix.js","./account-auth-hotfix.js?v=6","./account-sync-v2.js","./account-sync-v2.js?v=password-recovery-v1","./account-sync-v2.js?v=push-v1","./account-sync-v2.js?v=room-rename-v1","./account-sync-v2.js?v=room-sessions-v1","./account-sync-v2.js?v=state-refresh-v1","./account-sync-v2.js?v=wardrobe-v1","./account-sync-v2.js?v=wardrobe-v2","./admin-panel-v2.js","./admin-panel-v2.js?v=3","./admin-panel.js","./app.js","./app.js?v=offline-v2","./app.js?v=push-v1","./app.js?v=room-first-frame-v1","./app.js?v=room-resume-v1","./app.js?v=settings-notifications-v1","./app.js?v=settings-notifications-v2","./app.js?v=settings-room-auto-start-v2","./app.js?v=settings-room-start-stop-v3","./app.js?v=study-rooms-v1","./assets/batu-dark-logo-sidebar.svg","./assets/batu-dark-logo.svg","./assets/mata.svg","./ataturk-corner.css","./ataturk-corner.css?v=1","./ataturk-corner.js","./ataturk-corner.js?v=3","./ataturk-corner.js?v=4","./auto-debt.js","./auto-debt.js?v=fastboot1","./auto-debt.js?v=state-refresh-v1","./batu-dark-mode-v2.css","./batu-dark-mode-v2.css?v=public-1","./batu-dark-mode-v2.js","./batu-dark-mode-v2.js?v=public-3","./batu-dark-mode.js","./debt-delete-guard.js","./debt-edit.js","./debt-edit.js?v=2","./deletion-guard-v2.js","./deletion-guard-v2.js?v=1","./fixed-sidebar.css","./fixed-sidebar.css?v=1","./gees-design.css","./gees-design.css?v=2","./gees-preview-access.js","./guidance-v1.css","./guidance-v1.css?v=3","./guidance-v1.js","./guidance-v1.js?v=2-route-isolation","./guidance-v1.js?v=5","./guidance-v1.js?v=offline1","./guidance-weekly-v4.css","./guidance-weekly-v4.css?v=4","./guidance-weekly.css","./guidance-weekly.js","./guidance-weekly.js?v=4","./guidance-weekly.js?v=5-route-isolation","./guidance-weekly.js?v=offline1","./hakuna-palette.css","./hakuna-palette.css?v=1","./hakuna-palette.js","./hakuna-palette.js?v=3","./icons/hakuna-brand-v3.png?v=brand-v3","./icons/hakuna-final.png?v=final-logo-v2","./immediate-debt-status.js","./immediate-debt-status.js?v=2","./index.html","./last-seen-v2.js","./last-seen-v2.js?v=1","./last-seen.js","./main.js","./main.js?v=android-notifications-v1","./main.js?v=independent-timers-v1","./main.js?v=no-teacher-v1","./main.js?v=offline-v2","./main.js?v=plant-v1","./main.js?v=push-permission-v2","./main.js?v=push-timer-v3","./main.js?v=push-v1","./main.js?v=room-bloom-v1","./main.js?v=room-chairs-v1","./main.js?v=room-dragon-v1","./main.js?v=room-esila-heart-v3","./main.js?v=room-fantasy-thrones-v8","./main.js?v=room-first-frame-v1","./main.js?v=room-gift-preview-v1","./main.js?v=room-mooncloud-v2","./main.js?v=room-multiroom-v4","./main.js?v=room-rank-v1","./main.js?v=room-refined-fantasy-v9","./main.js?v=room-rename-v1","./main.js?v=room-resume-v1","./main.js?v=room-sculpted-chairs-v7","./main.js?v=room-sessions-v1","./main.js?v=room-start-stop-together-v6","./main.js?v=room-start-together-v5","./main.js?v=room-thorn-crown-v1","./main.js?v=short-invites-v1","./main.js?v=simple-rooms-v1","./main.js?v=study-rooms-v1","./main.js?v=wardrobe-accessories-v1","./main.js?v=wardrobe-v1","./manifest.webmanifest?v=final-logo-v2","./mata-action-editor-v4.js","./mata-action-editor-v4.js?v=1","./mata-actions-v4.js","./mata-actions-v4.js?v=1","./mata-brain-v3.js","./mata-brain-v3.js?v=2","./mata-capabilities-v4.js","./mata-capabilities-v4.js?v=1","./mata-conversation-v4.js","./mata-conversation-v4.js?v=2","./mata-core-v2.js","./mata-core-v2.js?v=4","./mata-fallback.js","./mata-insights-v1.js","./mata-insights-v1.js?v=2","./mata-loader.js","./mata-nlu-v2.js","./mata-nlu-v2.js?v=4","./mata-observer-guard.js","./mata-observer-guard.js?v=3","./mata-platform-v5.js","./mata-platform-v5.js?v=2","./mata-ui-v2.js","./mata-ui-v2.js?v=5","./mata.css","./mata.js","./migration.js","./offline-support.js","./offline-support.js?v=1","./offline-support.js?v=2","./offline-support.js?v=3","./performance-runtime.js","./performance-runtime.js?v=4","./performance.css","./performance.css?v=1","./plan-mode-pure-cards.js","./plan-mode-pure-cards.js?v=2","./plan-mode.css","./plan-mode.css?v=1","./plan-mode.js","./plan-mode.js?v=3","./question-book-pdf.js","./question-book-pdf.js?v=5","./question-books.css","./question-books.css?v=10","./question-books.js","./question-books.js?v=14","./question-books.js?v=offline1","./question-delete-fix.js","./question-delete-fix.js?v=4","./question-tools.js","./question-tools.js?v=question-answers-v1","./question-ui-compat-v3.css","./question-ui-compat-v3.css?v=3","./question-ui-compat-v3.js","./question-ui-compat-v3.js?v=4","./republic-day-2026.css","./republic-day-2026.css?v=2","./republic-day-2026.js","./republic-day-2026.js?v=2","./republic-day-2026.js?v=3","./reset-password.html","./room-chairs.css","./room-chairs.css?v=1-sculpted-levels","./room-chairs.css?v=2-sculpted-crest","./room-chairs.css?v=3-fantasy-runes","./room-chairs.css?v=4-refined-dark-fantasy","./room-experience.css","./room-experience.css?v=2","./room-experience.css?v=3","./room-experience.css?v=4","./room-experience.css?v=5","./room-experience.css?v=6","./room-experience.css?v=7","./room-experience.css?v=8","./room-experience.css?v=9","./room-experience.js","./room-experience.js?v=2","./room-experience.js?v=3-simple","./room-experience.js?v=4-plant","./room-experience.js?v=5-simple","./room-experience.js?v=6-dragon","./room-experience.js?v=7-bloom","./room-notifications.js","./room-notifications.js?v=1","./room-notifications.js?v=2","./room-notifications.js?v=3","./room-notifications.js?v=4","./room-notifications.js?v=5","./room-notifications.js?v=6-android","./room-wardrobe.js","./room-wardrobe.js?v=1","./room-wardrobe.js?v=2","./room-wardrobe.js?v=3","./room-wardrobe.js?v=4","./room-wardrobe.js?v=5","./room-wardrobe.js?v=6-gift","./room-wardrobe.js?v=7-mooncloud","./room-wardrobe.js?v=8-esila-heart","./room-weather.js","./room-weather.js?v=1","./room-weather.js?v=2","./settings-copy-fix.js","./settings-copy-fix.js?v=1","./sidebar-welcome.js","./sidebar-welcome.js?v=3","./smooth-save-ui.js","./study-rooms-immersive.css","./study-rooms-immersive.css?v=3","./study-rooms-immersive.css?v=4-multiroom","./study-rooms.css","./study-rooms.css?v=10","./study-rooms.css?v=11-gift","./study-rooms.css?v=12-mooncloud","./study-rooms.css?v=13-coffee-anchor","./study-rooms.css?v=2","./study-rooms.css?v=3","./study-rooms.css?v=4","./study-rooms.css?v=5","./study-rooms.css?v=6","./study-rooms.css?v=7","./study-rooms.css?v=8","./study-rooms.css?v=9","./study-rooms.js","./study-rooms.js?v=10-push","./study-rooms.js?v=11-permission","./study-rooms.js?v=12-wardrobe","./study-rooms.js?v=13-rank","./study-rooms.js?v=14-chairs","./study-rooms.js?v=15-sessions","./study-rooms.js?v=16-accessories","./study-rooms.js?v=17-thrones","./study-rooms.js?v=18-android","./study-rooms.js?v=19-bloom","./study-rooms.js?v=20-resume","./study-rooms.js?v=21-thorn-crown","./study-rooms.js?v=22-gift","./study-rooms.js?v=23-mooncloud","./study-rooms.js?v=24-multiroom","./study-rooms.js?v=25-auto-start","./study-rooms.js?v=26-start-stop-all","./study-rooms.js?v=27-sculpted-chairs","./study-rooms.js?v=28-fantasy-thrones","./study-rooms.js?v=29-refined-dark-fantasy","./study-rooms.js?v=4-elazig","./study-rooms.js?v=5-offline","./study-rooms.js?v=6-short-invites","./study-rooms.js?v=7-rename","./study-rooms.js?v=8-independent","./study-rooms.js?v=9-simple","./study-timer-v2.css","./study-timer-v2.css?v=1","./study-timer-v2.js","./study-timer-v2.js?v=2","./study-timer-v2.js?v=3","./study-timer.css","./study-timer.js","./styles.css","./styles.css?v=permission-v1","./styles.css?v=room-settings-toggle-v2","./suggestion-replies.js","./suggestion-replies.js?v=1","./ten-kasim-2026.css","./ten-kasim-2026.css?v=1-memorial","./ten-kasim-2026.css?v=2-salih-photos","./ten-kasim-2026.css?v=3-archival-caption","./ten-kasim-2026.js","./ten-kasim-2026.js?v=1-memorial","./ten-kasim-2026.js?v=2-rooms-lobby","./ten-kasim-2026.js?v=3-pasa-wording","./ten-kasim-2026.js?v=4-salih-chapters","./ten-kasim-2026.js?v=5-archival-photos","./today-agenda.css","./today-agenda.js","./today-agenda.js?v=perf1","./today-marker-fix.js","./today-marker-fix.js?v=perf1","./ui-fixes.css","./ui-fixes.js","./ui-fixes.js?v=perf1","./week-settings.js","./week-settings.js?v=2","./yks-calculator-theme.css","./yks-calculator-theme.css?v=3","./yks-calculator.css","./yks-calculator.css?v=4","./yks-calculator.js","./yks-calculator.js?v=9","./yks-programs.json?v=2026-3","./yks-quota.css","./yks-quota.css?v=1","./yks-quota.js","./yks-quota.js?v=2"];

function patchApp(text){
  const oldWeek="  function startOfWeekISO(iso) {\n    const d=parseISODate(iso); const wd=(d.getDay()+6)%7; d.setDate(d.getDate()-wd); return isoDate(d);\n  }";
  const newWeek="  function weekStartDay() {\n    const raw=Number(localStorage.getItem('hakuna.weekStartDay'));\n    return Number.isInteger(raw)&&raw>=0&&raw<=6?raw:1;\n  }\n  function startOfWeekISO(iso) {\n    const d=parseISODate(iso); const wd=(d.getDay()-weekStartDay()+7)%7; d.setDate(d.getDate()-wd); return isoDate(d);\n  }\n  function weekRangeISO(iso=todayISO()) { const start=startOfWeekISO(iso); return {start,end:addDaysISO(start,6)}; }\n  function inWeekISO(date,ref=todayISO()) { const r=weekRangeISO(ref); return String(date)>=r.start&&String(date)<=r.end; }";
  if(text.includes(oldWeek))text=text.replace(oldWeek,newWeek);

  const oldDebts="  function activeDebts() { return state.debts.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }";
  const newDebts="  function activeDebts() {\n    const ref=(state&&state.selectedDate)||todayISO();\n    return state.debts.slice().sort((a,b)=>{\n      const bw=inWeekISO(b.sourceDate||todayISO(),ref)?1:0, aw=inWeekISO(a.sourceDate||todayISO(),ref)?1:0;\n      return bw-aw || b.createdAt.localeCompare(a.createdAt);\n    });\n  }";
  if(text.includes(oldDebts))text=text.replace(oldDebts,newDebts);

  const oldDebtMeta="${d.value} ${esc(d.unit)} · ${esc(formatDate(d.sourceDate||todayISO(),{day:'numeric',month:'short'}))}'den kaldı";
  const newDebtMeta="${d.value} ${esc(d.unit)} · ${esc(formatDate(d.sourceDate||todayISO(),{day:'numeric',month:'short'}))}'den kaldı · ${inWeekISO(d.sourceDate||todayISO(),state.selectedDate)?'Bu hafta':'Devreden'}";
  if(text.includes(oldDebtMeta))text=text.replaceAll(oldDebtMeta,newDebtMeta);

  text=text.replace("    const last7=Array.from({length:7},(_,i)=>addDaysISO(todayISO(),i-6));","    const week=startOfWeekISO(todayISO());\n    const last7=Array.from({length:7},(_,i)=>addDaysISO(week,i));");
  text=text.replaceAll('Son 7 gün günlük ortalama','Bu hafta günlük ortalama');
  text=text.replaceAll('⏱ Son 7 gün tamamlanan çalışma','⏱ Bu haftanın tamamlanan çalışması');

  const todayMarker="  function renderToday(view,actions) {";
  const smoothTodayHelper=`  function refreshTodaySurface() {
    if(currentPage!=='today' || state.settings?.planMode==='cards'){ render(); return; }
    const view=$('#view');
    if(!view){ render(); return; }
    const date=state.selectedDate;
    const shown=$('[data-timeline-date]',view)?.dataset.timelineDate;
    if(shown && shown!==date){ render(); return; }
    const blocks=blocksFor(date), debts=activeDebts(), tasks=activeTasks();
    const complete=blocks.filter(b=>b.status==='complete').length;
    const pct=blocks.length?Math.round(complete/blocks.length*100):0;
    const planned=blocks.reduce((s,b)=>s+durationMinutes(b.start,b.end),0);

    const scroll=$('.timeline-scroll',view);
    if(scroll){ scroll.innerHTML=timelineHTML(date); bindTimeline(scroll); }
    const badge=$('.timeline-toolbar .subject-badge',view);
    if(badge)badge.textContent=blocks.length+' blok';

    const cards=$$('.dashboard-side > .card',view);
    if(cards[0]){
      const vals=$$('.summary-value',cards[0]);
      if(vals[0])vals[0].textContent=String(blocks.length);
      if(vals[1])vals[1].textContent=String(complete);
      if(vals[2])vals[2].textContent=String(planned?Math.round(planned/60*10)/10:0);
      const fill=$('.progress-fill',cards[0]); if(fill)fill.style.width=pct+'%';
      const sub=$('.card-body > .card-subtitle',cards[0]); if(sub)sub.textContent='%'+pct+' tamamlandı';
    }
    if(cards[1]){
      const body=$('.card-body',cards[1]);
      if(body)body.innerHTML=debts.length?'<div class="list-stack">'+debts.slice(0,4).map(debtItemHTML).join('')+'</div>':emptyHTML('✨','Borç yok','Şimdilik tertemiz.');
    }
    if(cards[2]){
      const body=$('.card-body',cards[2]);
      if(body)body.innerHTML=tasks.length?'<div class="list-stack">'+tasks.slice(0,4).map(taskItemHTML).join('')+'</div>':emptyHTML('🗂️','Havuz boş','Görev ekleyip sonra programa yerleştirebilirsin.');
    }
    bindCommonListActions(view);
  }

`;
  if(!text.includes('function refreshTodaySurface()') && text.includes(todayMarker))text=text.replace(todayMarker,smoothTodayHelper+todayMarker);

  text=text.replace("closeModal(); render(); toast(editing?'Blok güncellendi.':'Blok eklendi.');","closeModal(); refreshTodaySurface(); toast(editing?'Blok güncellendi.':'Blok eklendi.');");
  text=text.replace("closeModal();render();}});","closeModal();refreshTodaySurface();}});");
  text=text.replace("closeModal(); render(); toast(status==='complete'?'Tamamlandı ✓':'Tamamı borçlara aktarıldı.');","closeModal(); refreshTodaySurface(); toast(status==='complete'?'Tamamlandı ✓':'Tamamı borçlara aktarıldı.');");
  text=text.replace("},false); closeModal(); render(); toast(`${value} ${unit} borca eklendi.`);","},false); closeModal(); refreshTodaySurface(); toast(`${value} ${unit} borca eklendi.`);");

  return text;
}

function responseFromText(resp,text){
  const headers=new Headers(resp.headers);headers.delete('content-length');
  return new Response(text,{status:resp.status,statusText:resp.statusText,headers});
}

function cachePut(request,response){
  if(!response || !(response.ok || response.type==='opaque'))return Promise.resolve();
  return caches.open(CACHE).then(c=>c.put(request,response.clone())).catch(()=>{});
}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll([...new Set(ASSETS)])));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hakuna-matata-')&&k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);

  // Migration tooling is intentionally isolated from the normal app cache.
  if(url.origin===self.location.origin && (url.pathname.endsWith('/migration-v2.html') || url.pathname.includes('/v2-migration/'))){
    event.respondWith(fetch(event.request,{cache:'no-store'}));
    return;
  }

  // Recovery email links must reach the dedicated reset page, not the PWA
  // home-screen navigation cache. Only fall back to that page's own cache.
  if(url.origin===self.location.origin && url.pathname.endsWith('/reset-password.html')){
    event.respondWith((async()=>{
      try{
        const resp=await fetch(event.request,{cache:'no-store'});
        if(resp.ok)await cachePut('./reset-password.html',resp);
        return resp;
      }catch{
        return await caches.match('./reset-password.html')||new Response('Şifre sıfırlama sayfası çevrimdışı açılamıyor.',{status:503});
      }
    })());
    return;
  }

  // Home-screen launches must never wait on a slow network. Show the cached
  // application shell immediately and refresh it in the background.
  if(event.request.mode==='navigate'){
    const network=fetch(event.request,{cache:'no-store'}).then(resp=>{
      if(resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});}
      return resp;
    });
    event.waitUntil(network.then(()=>{}).catch(()=>{}));
    event.respondWith(
      caches.match('./index.html').then(cached=>cached||network).catch(()=>network)
    );
    return;
  }

  // app.js still receives the compatibility patch, but cached code is used
  // immediately. Network revalidation never blocks the visible application.
  if(url.origin===self.location.origin && url.pathname.endsWith('/app.js')){
    const network=fetch(event.request,{cache:'no-store'}).then(async resp=>{
      if(!resp.ok)return resp;
      const out=responseFromText(resp,patchApp(await resp.text()));
      await cachePut(event.request,out);
      return out;
    });
    event.waitUntil(network.then(()=>{}).catch(()=>{}));
    event.respondWith((async()=>{
      // Honor the version in app.js?v=...; older base cache must not shadow new features.
      const cached=await caches.match(event.request,{ignoreSearch:!url.search});
      if(cached)return responseFromText(cached,patchApp(await cached.text()));
      try{return await network;}catch{const offline=await caches.match(new URL('./app.js',self.location).href);if(offline)return responseFromText(offline,patchApp(await offline.text()));return new Response('Hakuna core unavailable',{status:503,headers:{'Content-Type':'text/javascript'}});}
    })());
    return;
  }

  // Versioned scripts must not execute an older base-file cache entry.
  // Use an exact cached version, then network; base fallback is offline-only.
  if(url.origin===self.location.origin){
    const network=fetch(event.request,{cache:'no-store'}).then(async resp=>{
      await cachePut(event.request,resp);
      return resp;
    });
    event.waitUntil(network.then(()=>{}).catch(()=>{}));
    event.respondWith((async()=>{
      const versionedScript=event.request.destination==='script'&&url.search;
      const cached=await caches.match(event.request,{ignoreSearch:!versionedScript});
      if(cached)return cached;
      try{return await network;}catch{
        if(versionedScript){const offline=await caches.match(event.request,{ignoreSearch:true});if(offline)return offline;}
        const dest=event.request.destination;
        if(dest==='script')return new Response('',{status:503,headers:{'Content-Type':'text/javascript'}});
        if(dest==='style')return new Response('',{status:503,headers:{'Content-Type':'text/css'}});
        return new Response('',{status:503});
      }
    })());
    return;
  }

  event.respondWith(fetch(event.request));
});

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data?.json(); } catch { return; }
    if (!payload) return;
    const url = new URL('./', self.registration.scope);
    const icon = new URL('./icons/icon-192-v3.png', self.registration.scope).href;
    if (payload.kind === 'timer-finished') {
      await self.registration.showNotification('Süre bitti', {
        icon, tag: 'hakuna-timer-' + payload.endAt, silent: true, data: {url: url.href}
      });
      return;
    }
    if (/^[2-9A-HJ-NP-Z]{8}$/.test(payload.code || '')) url.searchParams.set('room', payload.code);
    await self.registration.showNotification('Çalışılıyor…', {
      icon,
      tag: 'hakuna-study-' + String(payload.roomId || 'room'),
      renotify: true,
      requireInteraction: true,
      data: {url: url.href, pauseToken: payload.pauseToken},
      actions: [{action: 'pause', title: 'Mola ver'}]
    });
  })());
});
self.addEventListener('notificationclick',event=>{const data=event.notification.data||{};event.notification.close();event.waitUntil((async()=>{if(event.action==='pause'&&data.pauseToken){try{const r=await fetch('https://zyrbbkbwrijnnykbgjvc.supabase.co/functions/v1/room-notifications',{method:'POST',headers:{'Content-Type':'application/json','apikey':'sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL'},body:JSON.stringify({action:'pause',token:data.pauseToken})});if(r.ok){for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:true}))c.postMessage({type:'hakuna-study-paused'});return;}}catch{}}const url=new URL(data.url||'./',self.registration.scope);if(url.origin!==self.location.origin)return;await self.clients.openWindow(url.href);})());});
