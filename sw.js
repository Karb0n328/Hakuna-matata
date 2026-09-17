const CACHE='hakuna-matata-v28-fast-start';
const ASSETS=['./','./index.html','./styles.css','./performance.css','./mata.css','./ui-fixes.css','./today-agenda.css','./fixed-sidebar.css','./main.js','./migration.js','./auto-debt.js','./debt-delete-guard.js','./performance-runtime.js','./app.js','./week-settings.js','./ui-fixes.js','./today-agenda.js','./today-marker-fix.js','./mata-fallback.js','./mata-loader.js','./mata-observer-guard.js','./mata-core-v2.js','./mata-nlu-v2.js','./mata-ui-v2.js','./plan-mode.js','./plan-mode-pure-cards.js','./immediate-debt-status.js','./manifest.webmanifest?v=final-logo-v2','./icons/hakuna-final.png?v=final-logo-v2','./icons/hakuna-brand-v3.png?v=brand-v3','./assets/mata.svg'];

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

  const oldQuestionItem="  function questionItemHTML(q) { return `<div class=\"list-item\"><button class=\"circle-check ${q.status==='solved'?'done':''}\" data-q-toggle=\"${q.id}\">${q.status==='solved'?'✓':'?'}</button><div class=\"list-item-main\"><div class=\"list-item-title\">${subjectEmoji(q.subject)} ${esc(q.source)} · ${esc(q.reference)}</div><div class=\"list-item-meta\">${esc(q.subject)}${q.topic?` · ${esc(q.topic)}`:''}${q.note?` · ${esc(q.note)}`:''}</div></div><button class=\"icon-button\" data-q-delete=\"${q.id}\">🗑</button></div>`; }";
  const newQuestionItem="  function questionItemHTML(q) { return `<div class=\"list-item\"><button class=\"circle-check ${q.status==='solved'?'done':''}\" data-q-toggle=\"${q.id}\">${q.status==='solved'?'✓':'?'}</button><div class=\"list-item-main\"><div class=\"list-item-title\">${subjectEmoji(q.subject)} ${esc(q.source)} · ${esc(q.reference)}</div><div class=\"list-item-meta\">${esc(q.subject)}${q.topic?` · ${esc(q.topic)}`:''}${q.note?` · ${esc(q.note)}`:''}</div></div><button class=\"pill-btn\" data-q-duplicate=\"${q.id}\" title=\"Soruyu çoğalt\">⧉ Çoğalt</button><button class=\"icon-button\" data-q-delete=\"${q.id}\">🗑</button></div>`; }";
  if(text.includes(oldQuestionItem))text=text.replace(oldQuestionItem,newQuestionItem);

  const oldQuestionDelete="    $$('[data-q-delete]').forEach(b=>b.onclick=async()=>{await mutate(s=>s.questions=s.questions.filter(x=>x.id!==b.dataset.qDelete));});";
  const newQuestionDelete="    $$('[data-q-delete]').forEach(b=>b.onclick=async()=>{await mutate(s=>s.questions=s.questions.filter(x=>x.id!==b.dataset.qDelete));});\n    $$('[data-q-duplicate]').forEach(b=>b.onclick=()=>openQuestionDuplicate(b.dataset.qDuplicate));";
  if(text.includes(oldQuestionDelete))text=text.replace(oldQuestionDelete,newQuestionDelete);

  const questionFormMarker="  function openQuestionForm() {";
  const questionDuplicateHelper="  function openQuestionDuplicate(id) {\n    const q=state.questions.find(x=>x.id===id); if(!q)return;\n    openQuestionForm();\n    const form=$('#questionForm'); if(!form)return;\n    form.elements.subject.value=q.subject||form.elements.subject.value;\n    form.elements.topic.value=q.topic||'';\n    form.elements.source.value=q.source||'';\n    form.elements.reference.value=q.reference||'';\n    form.elements.note.value=q.note||'';\n    const root=$('#modalRoot');\n    const title=$('.modal-title',root), eyebrow=$('.modal-eyebrow',root);\n    if(title) title.textContent='Soruyu çoğalt';\n    if(eyebrow) eyebrow.textContent='Kitap ve konu kopyalandı; sadece sayfa / test / soru bilgisini değiştir.';\n    const ref=form.elements.reference;\n    const label=ref?.closest('.field')?.querySelector('label');\n    if(label) label.textContent='Sayfa / test / soru — değiştir';\n    if(ref){\n      ref.focus({preventScroll:true});\n      const m=/sayfa\\s*(\\d+)/i.exec(ref.value||'');\n      if(m){\n        const start=m.index+m[0].lastIndexOf(m[1]);\n        ref.setSelectionRange(start,start+m[1].length);\n      } else ref.select();\n    }\n  }\n\n";
  if(!text.includes('function openQuestionDuplicate(id)') && text.includes(questionFormMarker)){
    text=text.replace(questionFormMarker,questionDuplicateHelper+questionFormMarker);
  }

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
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
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

  // Home-screen launches must never wait on a slow network. Show the cached
  // application shell immediately and refresh it in the background.
  if(event.request.mode==='navigate'){
    const network=fetch(event.request,{cache:'no-store'}).then(resp=>{
      if(resp.ok)caches.open(CACHE).then(c=>c.put('./index.html',resp.clone())).catch(()=>{});
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
      const cached=await caches.match(event.request,{ignoreSearch:true});
      if(cached)return responseFromText(cached,patchApp(await cached.text()));
      try{return await network;}catch{return new Response('Hakuna core unavailable',{status:503,headers:{'Content-Type':'text/javascript'}});}
    })());
    return;
  }

  // Same-origin static files use stale-while-revalidate. Query-string version
  // changes can still reuse the cached base file, which is important for iOS
  // standalone mode when the connection is slow or briefly unavailable.
  if(url.origin===self.location.origin){
    const network=fetch(event.request,{cache:'no-store'}).then(async resp=>{
      await cachePut(event.request,resp);
      return resp;
    });
    event.waitUntil(network.then(()=>{}).catch(()=>{}));
    event.respondWith((async()=>{
      const cached=await caches.match(event.request,{ignoreSearch:true});
      if(cached)return cached;
      try{return await network;}catch{
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
