const CACHE='hakuna-matata-v31-performance';
const ASSETS=[
  './','./index.html','./styles.css','./performance.css','./mata.css','./ui-fixes.css','./today-agenda.css','./fixed-sidebar.css',
  './main.js','./migration.js','./auto-debt.js','./app.js','./performance-runtime.js','./week-settings.js','./ui-fixes.js','./today-agenda.js','./today-marker-fix.js',
  './account-sync-v2.js','./account-auth-hotfix.js','./settings-copy-fix.js','./debt-edit.js','./sidebar-welcome.js','./question-tools.js','./question-delete-fix.js',
  './mata-fallback.js','./mata-loader.js','./mata-observer-guard.js','./mata-core-v2.js','./mata-nlu-v2.js','./mata-insights-v1.js','./mata-brain-v3.js','./mata-ui-v2.js',
  './plan-mode.js','./plan-mode-pure-cards.js','./immediate-debt-status.js',
  './manifest.webmanifest?v=final-logo-v2','./icons/hakuna-final.png?v=final-logo-v2','./icons/hakuna-brand-v3.png?v=brand-v3','./assets/mata.svg'
];

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

  const oldCore="  async function save() { await dbSet(STATE_KEY,state); }\n  async function mutate(fn, rerender=true) { fn(state); await save(); if (rerender) render(); }";
  const newCore=oldCore+"\n  window.HakunaCore={\n    getState:()=>state,\n    mutate:(fn,rerender=true)=>mutate(fn,rerender),\n    render:()=>render(),\n    navigate:(page)=>{currentPage=page;render();},\n    refreshFromDB:async(page=null)=>{state=await dbGet(STATE_KEY)||defaultState();if(page)currentPage=page;render();return state;},\n    replaceState:async(next,rerender=true)=>{state=next||defaultState();await save();if(rerender)render();return state;}\n  };";
  if(text.includes(oldCore)&&!text.includes('window.HakunaCore='))text=text.replace(oldCore,newCore);

  const oldNav="  function renderNavigation() {\n    $('#sidebarNav').innerHTML=navButtons(NAV);\n    $('#bottomNav').innerHTML=MOBILE_NAV.map(([id,icon,label]) => `<button class=\"${currentPage===id || (id==='more' && ['questions','analytics','settings'].includes(currentPage))?'active':''}\" data-nav=\"${id}\"><span class=\"nav-icon\">${icon}</span><span>${label}</span></button>`).join('');\n    $$('[data-nav]').forEach(b=>b.onclick=()=>{\n      const id=b.dataset.nav;\n      if (id==='more') return openMoreMenu();\n      currentPage=id; render();\n    });\n  }";
  const newNav="  function renderNavigation() {\n    const side=$('#sidebarNav'), bottom=$('#bottomNav');\n    if(!side.dataset.hmBuilt){side.innerHTML=navButtons(NAV);side.dataset.hmBuilt='1';}\n    if(!bottom.dataset.hmBuilt){bottom.innerHTML=MOBILE_NAV.map(([id,icon,label]) => `<button class=\"${currentPage===id || (id==='more' && ['questions','analytics','settings'].includes(currentPage))?'active':''}\" data-nav=\"${id}\"><span class=\"nav-icon\">${icon}</span><span>${label}</span></button>`).join('');bottom.dataset.hmBuilt='1';}\n    $$('[data-nav]',side).forEach(b=>b.classList.toggle('active',b.dataset.nav===currentPage));\n    $$('[data-nav]',bottom).forEach(b=>{const id=b.dataset.nav;b.classList.toggle('active',currentPage===id||(id==='more'&&['questions','analytics','settings'].includes(currentPage)));});\n    $$('[data-mata-nav]').forEach(b=>b.classList.remove('active'));\n    const bind=root=>{if(root.dataset.hmNavBound==='1')return;root.dataset.hmNavBound='1';root.addEventListener('click',e=>{const b=e.target.closest?.('[data-nav]');if(!b||!root.contains(b))return;const id=b.dataset.nav;if(id==='more')return openMoreMenu();currentPage=id;render();});};\n    bind(side);bind(bottom);\n  }";
  if(text.includes(oldNav))text=text.replace(oldNav,newNav);

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
    if(scroll){scroll.innerHTML=timelineHTML(date);bindTimeline(scroll);}
    const badge=$('.timeline-toolbar .subject-badge',view);if(badge)badge.textContent=blocks.length+' blok';
    const cards=$$('.dashboard-side > .card',view);
    if(cards[0]){const vals=$$('.summary-value',cards[0]);if(vals[0])vals[0].textContent=String(blocks.length);if(vals[1])vals[1].textContent=String(complete);if(vals[2])vals[2].textContent=String(planned?Math.round(planned/60*10)/10:0);const fill=$('.progress-fill',cards[0]);if(fill)fill.style.width=pct+'%';const sub=$('.card-body > .card-subtitle',cards[0]);if(sub)sub.textContent='%'+pct+' tamamlandı';}
    if(cards[1]){const body=$('.card-body',cards[1]);if(body)body.innerHTML=debts.length?'<div class="list-stack">'+debts.slice(0,4).map(debtItemHTML).join('')+'</div>':emptyHTML('✨','Borç yok','Şimdilik tertemiz.');}
    if(cards[2]){const body=$('.card-body',cards[2]);if(body)body.innerHTML=tasks.length?'<div class="list-stack">'+tasks.slice(0,4).map(taskItemHTML).join('')+'</div>':emptyHTML('🗂️','Havuz boş','Görev ekleyip sonra programa yerleştirebilirsin.');}
    bindCommonListActions(view);
  }

`;
  if(!text.includes('function refreshTodaySurface()')&&text.includes(todayMarker))text=text.replace(todayMarker,smoothTodayHelper+todayMarker);
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

async function cacheStatic(request,event){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  const network=fetch(request).then(async resp=>{
    if(resp&&resp.ok)await cache.put(request,resp.clone());
    return resp;
  });
  if(cached){event.waitUntil(network.catch(()=>{}));return cached;}
  try{return await network;}catch{return new Response('',{status:503,statusText:'Offline'});}
}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(ASSETS.map(asset=>cache.add(asset).catch(()=>null)))));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(url.pathname.endsWith('/migration-v2.html')||url.pathname.includes('/v2-migration/')){
    event.respondWith(fetch(event.request,{cache:'no-store'}));return;
  }

  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'reload'}).then(async resp=>{const cache=await caches.open(CACHE);await cache.put('./index.html',resp.clone());return resp;}).catch(()=>caches.match('./index.html')));
    return;
  }

  if(url.pathname.endsWith('/app.js')){
    event.respondWith((async()=>{
      try{
        const resp=await fetch(event.request);
        const out=responseFromText(resp,patchApp(await resp.text()));
        const cache=await caches.open(CACHE);await cache.put(event.request,out.clone());
        return out;
      }catch{
        const cached=(await caches.match(event.request))||(await caches.match('./app.js'));
        if(cached)return responseFromText(cached,patchApp(await cached.text()));
        return new Response('',{status:503,statusText:'Offline'});
      }
    })());
    return;
  }

  if(/\.(?:js|css|png|jpg|jpeg|webp|svg|webmanifest)$/i.test(url.pathname)){
    event.respondWith(cacheStatic(event.request,event));return;
  }

  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
