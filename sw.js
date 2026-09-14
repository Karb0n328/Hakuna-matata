const CACHE='hakuna-matata-v26-brand-logo';
const ASSETS=['./','./index.html','./styles.css','./mata.css','./ui-fixes.css','./today-agenda.css','./main.js','./migration.js','./auto-debt.js','./app.js','./week-settings.js','./ui-fixes.js','./today-agenda.js','./today-marker-fix.js','./mata-fallback.js','./mata-loader.js','./mata-observer-guard.js','./mata-core-v2.js','./mata-nlu-v2.js','./mata-ui-v2.js','./manifest.webmanifest?v=final-logo-v2','./icons/hakuna-final.png?v=final-logo-v2','./icons/hakuna-brand-v3.png?v=brand-v3','./assets/mata.svg'];

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
  return text;
}

function responseFromText(resp,text){
  const headers=new Headers(resp.headers);headers.delete('content-length');
  return new Response(text,{status:resp.status,statusText:resp.statusText,headers});
}

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'reload'}).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return resp;}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(url.pathname.endsWith('/app.js')){
    event.respondWith((async()=>{
      try{
        const resp=await fetch(event.request);
        const out=responseFromText(resp,patchApp(await resp.text()));
        caches.open(CACHE).then(c=>c.put(event.request,out.clone()));
        return out;
      }catch{
        const cached=(await caches.match(event.request))||(await caches.match('./app.js'));
        if(cached)return responseFromText(cached,patchApp(await cached.text()));
        return caches.match('./index.html');
      }
    })());
    return;
  }
  event.respondWith(fetch(event.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return resp;}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});
