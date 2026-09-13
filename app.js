(() => {
  'use strict';

  const SUBJECTS = ['Türkçe','Matematik','Geometri','Fizik','Kimya','Biyoloji','Tarih','Coğrafya','Felsefe','Din','Deneme','Diğer'];
  const SUBJECT_EMOJI = {
    'Türkçe':'📖','Matematik':'🧮','Geometri':'📐','Fizik':'⚡','Kimya':'🧪','Biyoloji':'🧬',
    'Tarih':'🏛️','Coğrafya':'🌍','Felsefe':'💭','Din':'☾','Deneme':'📝','Diğer':'✨'
  };
  const UNITS = ['dakika','test','soru','sayfa','bölüm'];
  const NAV = [
    ['today','🏠','Bugün'], ['plan','📅','Plan'], ['tasks','✓','Görevler'], ['exams','📊','Denemeler'],
    ['questions','❓','Sorular'], ['analytics','📈','Analiz'], ['settings','⚙️','Ayarlar']
  ];
  const MOBILE_NAV = [['today','🏠','Bugün'],['plan','📅','Plan'],['tasks','✓','Görevler'],['exams','📊','Deneme'],['more','•••','Daha']];
  const DB_NAME = 'hakuna-matata-db';
  const DB_VERSION = 1;
  const STATE_KEY = 'state';
  const HOUR_HEIGHT = 72;
  const DAY_START = 7 * 60;
  const DAY_END = 24 * 60;

  let db;
  let state;
  let currentPage = 'today';
  let taskTab = 'tasks';
  let questionFilter = 'Tümü';
  let bridgePreview = null;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const uid = (prefix='id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const clamp = (n,min,max) => Math.min(max, Math.max(min,n));

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function parseISODate(iso) {
    const [y,m,d] = iso.split('-').map(Number);
    return new Date(y,m-1,d);
  }
  function isoDate(d) {
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function addDaysISO(iso,n) { const d=parseISODate(iso); d.setDate(d.getDate()+n); return isoDate(d); }
  function startOfWeekISO(iso) {
    const d=parseISODate(iso); const wd=(d.getDay()+6)%7; d.setDate(d.getDate()-wd); return isoDate(d);
  }
  function formatDate(iso, opts={weekday:'long', day:'numeric', month:'long'}) {
    return new Intl.DateTimeFormat('tr-TR',opts).format(parseISODate(iso));
  }
  function minuteFromTime(t) { const [h,m]=String(t).split(':').map(Number); return h*60+m; }
  function timeFromMinute(total) { total=clamp(Math.round(total),0,24*60); const h=Math.floor(total/60), m=total%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
  function durationMinutes(start,end) { return Math.max(0, minuteFromTime(end)-minuteFromTime(start)); }
  function fmtDuration(mins) { if (mins < 60) return `${mins} dk`; const h=Math.floor(mins/60), m=mins%60; return m ? `${h} sa ${m} dk` : `${h} sa`; }
  function subjectEmoji(s) { return SUBJECT_EMOJI[s] || '✨'; }
  function netFrom(correct, wrong) { return Math.round((Number(correct||0) - Number(wrong||0)/4) * 100)/100; }

  function defaultState() {
    return {
      version: 2,
      selectedDate: todayISO(),
      blocks: [],
      tasks: [],
      debts: [],
      exams: [],
      questions: [],
      settings: { firstRun: true }
    };
  }

  function openDB() {
    return new Promise((resolve,reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d=req.result;
        if (!d.objectStoreNames.contains('app')) d.createObjectStore('app');
      };
      req.onsuccess = () => { db=req.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  }
  function dbGet(key) {
    return new Promise((resolve,reject) => {
      const tx=db.transaction('app','readonly');
      const req=tx.objectStore('app').get(key);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  function dbSet(key,value) {
    return new Promise((resolve,reject) => {
      const tx=db.transaction('app','readwrite');
      tx.objectStore('app').put(value,key);
      tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
    });
  }
  async function save() { await dbSet(STATE_KEY,state); }
  async function mutate(fn, rerender=true) { fn(state); await save(); if (rerender) render(); }

  function toast(text) {
    const el=document.createElement('div'); el.className='toast'; el.textContent=text; $('#toastRoot').append(el);
    setTimeout(()=>el.remove(),2600);
  }

  function navButtons(items) {
    return items.map(([id,icon,label]) => `<button class="nav-button ${currentPage===id?'active':''}" data-nav="${id}"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></button>`).join('');
  }

  function renderNavigation() {
    $('#sidebarNav').innerHTML=navButtons(NAV);
    $('#bottomNav').innerHTML=MOBILE_NAV.map(([id,icon,label]) => `<button class="${currentPage===id || (id==='more' && ['questions','analytics','settings'].includes(currentPage))?'active':''}" data-nav="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join('');
    $$('[data-nav]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.nav;
      if (id==='more') return openMoreMenu();
      currentPage=id; render();
    });
  }

  function pageMeta() {
    const map={
      today:['Günlük çalışma merkezi','Bugün'], plan:['Haftayı tek bakışta gör','Plan'], tasks:['Görev havuzu + haftalık borçlar','Görevler'],
      exams:['Netlerini ve gelişimini kaydet','Denemeler'], questions:['Çözdürülecek soruları kaybetme','Sorular'], analytics:['Gerçek çalışma verin','Analiz'], settings:['Cihaz, yedek ve ChatGPT köprüsü','Ayarlar']
    };
    return map[currentPage]||map.today;
  }

  function render() {
    renderNavigation();
    const [eye,title]=pageMeta(); $('#pageEyebrow').textContent=eye; $('#pageTitle').textContent=title;
    const view=$('#view'); const actions=$('#topbarActions'); actions.innerHTML='';
    if (currentPage==='today') renderToday(view,actions);
    else if (currentPage==='plan') renderPlan(view,actions);
    else if (currentPage==='tasks') renderTasks(view,actions);
    else if (currentPage==='exams') renderExams(view,actions);
    else if (currentPage==='questions') renderQuestions(view,actions);
    else if (currentPage==='analytics') renderAnalytics(view,actions);
    else if (currentPage==='settings') renderSettings(view,actions);
  }

  function dateControlHTML() {
    const d=state.selectedDate;
    return `<div class="date-strip">
      <button class="icon-button" data-date-step="-1">‹</button>
      <button class="date-chip ${d===todayISO()?'active':''}" data-go-today>${esc(formatDate(d,{weekday:'short',day:'numeric',month:'short'}))}</button>
      <button class="icon-button" data-date-step="1">›</button>
    </div>`;
  }
  function bindDateControls() {
    $$('[data-date-step]').forEach(b=>b.onclick=async()=>{state.selectedDate=addDaysISO(state.selectedDate,Number(b.dataset.dateStep)); await save(); render();});
    $$('[data-go-today]').forEach(b=>b.onclick=async()=>{state.selectedDate=todayISO(); await save(); render();});
  }

  function blocksFor(date) { return state.blocks.filter(b=>b.date===date).sort((a,b)=>a.start.localeCompare(b.start)); }
  function activeDebts() { return state.debts.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }
  function activeTasks() { return state.tasks.filter(t=>!t.completed).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }

  function timelineHTML(date, compact=false) {
    const blocks=blocksFor(date);
    const totalHeight=((DAY_END-DAY_START)/60)*HOUR_HEIGHT;
    let lines='';
    for (let m=DAY_START; m<=DAY_END; m+=30) {
      const top=(m-DAY_START)/60*HOUR_HEIGHT;
      if (m%60===0) lines += `<div class="hour-line" style="top:${top}px" data-label="${timeFromMinute(m)}"></div>`;
      else lines += `<div class="half-line" style="top:${top}px"></div>`;
    }
    const items=blocks.map(b=>{
      const start=minuteFromTime(b.start), end=minuteFromTime(b.end);
      const top=(start-DAY_START)/60*HOUR_HEIGHT;
      const height=Math.max(38,(end-start)/60*HOUR_HEIGHT-4);
      const metric=b.metricValue?`${b.metricValue} ${esc(b.metricUnit||'')}`:'';
      const dot=b.status==='complete'?'complete':b.status==='partial'?'partial':b.status==='incomplete'?'incomplete':'';
      return `<button class="time-block subject-${esc(b.subject||'Diğer')} ${b.status==='complete'?'is-complete':''}" data-block-id="${b.id}" style="top:${top}px;height:${height}px">
        <span class="status-dot ${dot}"></span><div class="block-time">${esc(b.start)}–${esc(b.end)}</div>
        <div class="block-title">${subjectEmoji(b.subject)} ${esc(b.title)}</div>
        <div class="block-meta">${metric}${metric&&b.note?' · ':''}${esc(b.note||'')}</div>
      </button>`;
    }).join('');
    return `<div class="timeline" data-timeline-date="${date}" style="height:${totalHeight}px"><div class="timeline-hit" data-timeline-hit></div>${lines}${items}</div>`;
  }

  function bindTimeline(root=document) {
    $$('[data-block-id]',root).forEach(el=>{
      el.onclick=(e)=>{e.stopPropagation(); openBlockDetail(el.dataset.blockId);};
    });
    $$('[data-timeline-hit]',root).forEach(hit=>{
      hit.onclick=(e)=>{
        const tl=e.currentTarget.parentElement; const rect=tl.getBoundingClientRect();
        const y=e.clientY-rect.top; const raw=DAY_START + y/HOUR_HEIGHT*60;
        const snapped=Math.round(raw/10)*10; const start=timeFromMinute(clamp(snapped,DAY_START,DAY_END-20));
        const end=timeFromMinute(clamp(snapped+50,DAY_START+20,DAY_END));
        openBlockForm({date:tl.dataset.timelineDate,start,end});
      };
    });
  }

  function renderToday(view,actions) {
    actions.innerHTML=`${dateControlHTML()}<button class="primary-btn" data-add-block>＋ Çalışma bloğu</button>`;
    const date=state.selectedDate; const blocks=blocksFor(date); const debts=activeDebts(); const tasks=activeTasks();
    const complete=blocks.filter(b=>b.status==='complete').length; const pct=blocks.length?Math.round(complete/blocks.length*100):0;
    const planned=blocks.reduce((s,b)=>s+durationMinutes(b.start,b.end),0);
    view.innerHTML=`<div class="dashboard-grid">
      <section class="card timeline-wrap">
        <div class="timeline-toolbar"><div><div class="card-title">${esc(formatDate(date))}</div><div class="card-subtitle">Boş bir saate dokunarak da blok ekleyebilirsin.</div></div><span class="subject-badge">${blocks.length} blok</span></div>
        <div class="timeline-scroll">${timelineHTML(date)}</div>
      </section>
      <aside class="dashboard-side">
        <section class="card"><div class="card-head"><div><div class="card-title">Bugünün özeti</div><div class="card-subtitle">Plan → gerçekleşme</div></div><span>☀️</span></div><div class="card-body">
          <div class="summary-grid"><div class="summary-box"><div class="summary-value">${blocks.length}</div><div class="summary-label">Blok</div></div><div class="summary-box"><div class="summary-value">${complete}</div><div class="summary-label">Biten</div></div><div class="summary-box"><div class="summary-value">${planned?Math.round(planned/60*10)/10:0}</div><div class="summary-label">Planlanan saat</div></div></div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="card-subtitle" style="margin-top:7px">%${pct} tamamlandı</div>
        </div></section>
        <section class="card"><div class="card-head"><div><div class="card-title">📥 Haftalık borçlar</div><div class="card-subtitle">Yarım veya yapılmayanlardan kalanlar</div></div><button class="pill-btn" data-open-debts>Tümü</button></div><div class="card-body">${debts.length?`<div class="list-stack">${debts.slice(0,4).map(debtItemHTML).join('')}</div>`:emptyHTML('✨','Borç yok','Şimdilik tertemiz.')}</div></section>
        <section class="card"><div class="card-head"><div><div class="card-title">✓ Görev havuzu</div><div class="card-subtitle">Saate koymadığın işler</div></div><button class="pill-btn" data-open-tasks>Tümü</button></div><div class="card-body">${tasks.length?`<div class="list-stack">${tasks.slice(0,4).map(taskItemHTML).join('')}</div>`:emptyHTML('🗂️','Havuz boş','Görev ekleyip sonra programa yerleştirebilirsin.')}</div></section>
      </aside>
    </div>`;
    bindDateControls(); bindTimeline(view); bindCommonListActions(view);
    $('[data-add-block]')?.addEventListener('click',()=>openBlockForm({date}));
    $('[data-open-debts]')?.addEventListener('click',()=>{currentPage='tasks';taskTab='debts';render();});
    $('[data-open-tasks]')?.addEventListener('click',()=>{currentPage='tasks';taskTab='tasks';render();});
  }

  function emptyHTML(emoji,title,desc) { return `<div class="empty-state"><div class="empty-emoji">${emoji}</div><div class="empty-title">${esc(title)}</div><div>${esc(desc)}</div></div>`; }

  function openBlockForm(prefill={}) {
    const editing=prefill.id?state.blocks.find(x=>x.id===prefill.id):null;
    const b=editing||{date:prefill.date||state.selectedDate,start:prefill.start||'09:00',end:prefill.end||'09:50',subject:prefill.subject||'Matematik',title:prefill.title||'',metricValue:prefill.metricValue||'',metricUnit:prefill.metricUnit||'test',note:prefill.note||''};
    openModal(editing?'Bloğu düzenle':'Yeni çalışma bloğu','Saat aralığı gerçek takvim bloğu olarak kaydedilir.',`
      <form id="blockForm">
        <div class="form-grid">
          <div class="field"><label>Tarih</label><input type="date" name="date" value="${esc(b.date)}" required></div>
          <div class="field"><label>Ders</label><select name="subject">${SUBJECTS.map(s=>`<option ${s===b.subject?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="field full"><label>Görev / çalışma adı</label><input name="title" value="${esc(b.title)}" placeholder="Örn. Orijinal Türev — 5 test" required></div>
          <div class="field"><label>Başlangıç</label><input type="time" name="start" value="${esc(b.start)}" required></div>
          <div class="field"><label>Bitiş</label><input type="time" name="end" value="${esc(b.end)}" required></div>
          <div class="field"><label>Miktar (isteğe bağlı)</label><input type="number" step="0.25" min="0" name="metricValue" value="${esc(b.metricValue)}" placeholder="5"></div>
          <div class="field"><label>Birim</label><select name="metricUnit">${UNITS.map(u=>`<option ${u===b.metricUnit?'selected':''}>${u}</option>`).join('')}</select></div>
          <div class="field full"><label>Not</label><textarea name="note" placeholder="Kısa not...">${esc(b.note||'')}</textarea></div>
        </div>
        <div class="form-actions">${editing?'<button type="button" class="danger-btn" data-delete-block>Sil</button>':''}<button type="button" class="secondary-btn" data-close-modal>Vazgeç</button><button class="primary-btn" type="submit">Kaydet</button></div>
      </form>`);
    $('#blockForm').onsubmit=async e=>{
      e.preventDefault(); const fd=new FormData(e.currentTarget); const start=fd.get('start'), end=fd.get('end');
      if (minuteFromTime(end)<=minuteFromTime(start)) return toast('Bitiş saati başlangıçtan sonra olmalı.');
      const obj={id:editing?.id||uid('block'),date:fd.get('date'),subject:fd.get('subject'),title:String(fd.get('title')).trim(),start,end,metricValue:Number(fd.get('metricValue'))||null,metricUnit:fd.get('metricUnit'),note:String(fd.get('note')||'').trim(),status:editing?.status||'pending',sourceDebtId:editing?.sourceDebtId||null,createdAt:editing?.createdAt||new Date().toISOString()};
      await mutate(s=>{ if(editing) s.blocks=s.blocks.map(x=>x.id===editing.id?obj:x); else s.blocks.push(obj); s.selectedDate=obj.date; },false); closeModal(); render(); toast(editing?'Blok güncellendi.':'Blok eklendi.');
    };
    $('[data-delete-block]')?.addEventListener('click',async()=>{ if(confirm('Bu bloğu silmek istiyor musun?')){await mutate(s=>s.blocks=s.blocks.filter(x=>x.id!==editing.id),false);closeModal();render();}});
  }

  function openBlockDetail(id) {
    const b=state.blocks.find(x=>x.id===id); if(!b)return;
    const statusLabel=b.status==='complete'?'✅ Tamamlandı':b.status==='partial'?'◑ Kısmen tamamlandı':b.status==='incomplete'?'○ Tamamlanmadı':'Henüz işaretlenmedi';
    openModal(b.title,`${b.start}–${b.end} · ${b.subject}`,`
      <div class="card" style="box-shadow:none"><div class="card-body"><div class="list-item-meta">${subjectEmoji(b.subject)} ${esc(b.subject)}${b.metricValue?` · ${b.metricValue} ${esc(b.metricUnit)}`:''}</div><div style="font-weight:800;margin-top:8px">${statusLabel}</div>${b.note?`<div class="card-subtitle" style="margin-top:7px">${esc(b.note)}</div>`:''}</div></div>
      <div style="height:12px"></div>
      <div class="status-options">
        <button class="status-option" data-status="complete"><div class="status-emoji">✅</div><div><strong>Tamamlandı</strong><span>Görev kapanır; varsa bu bloktan doğan borç temizlenir.</span></div></button>
        <button class="status-option" data-status="partial"><div class="status-emoji">◑</div><div><strong>Kısmen tamamlandı</strong><span>Kalan dakika / test / soru / sayfa borca gider.</span></div></button>
        <button class="status-option" data-status="incomplete"><div class="status-emoji">○</div><div><strong>Tamamlanmadı</strong><span>Görevin tamamı haftalık borçlara aktarılır.</span></div></button>
      </div>
      <div class="form-actions"><button class="secondary-btn" data-edit-block>Düzenle</button></div>`);
    $$('[data-status]').forEach(btn=>btn.onclick=()=>handleBlockStatus(b,btn.dataset.status));
    $('[data-edit-block]').onclick=()=>{closeModal();openBlockForm(b);};
  }

  async function handleBlockStatus(block,status) {
    if (status==='partial') return openPartialModal(block);
    await mutate(s=>{
      const b=s.blocks.find(x=>x.id===block.id); b.status=status;
      if (status==='complete') {
        s.debts=s.debts.filter(d=>d.sourceBlockId!==b.id && d.id!==b.sourceDebtId);
      } else if (status==='incomplete') {
        if (b.sourceDebtId) return;
        const existing=s.debts.find(d=>d.sourceBlockId===b.id);
        const value=b.metricValue || durationMinutes(b.start,b.end); const unit=b.metricValue?b.metricUnit:'dakika';
        if(existing){existing.value=value;existing.unit=unit;} else s.debts.push({id:uid('debt'),title:b.title,subject:b.subject,value,unit,sourceBlockId:b.id,sourceDate:b.date,createdAt:new Date().toISOString()});
      }
    },false);
    closeModal(); render(); toast(status==='complete'?'Tamamlandı ✓':'Tamamı borçlara aktarıldı.');
  }

  function openPartialModal(block) {
    const defVal=block.metricValue||Math.max(10,Math.round(durationMinutes(block.start,block.end)/2));
    const defUnit=block.metricValue?block.metricUnit:'dakika';
    openModal('Ne kadar kaldı?','Kalan miktar haftalık borçlara aktarılacak.',`
      <form id="partialForm"><div class="form-grid"><div class="field"><label>Kalan</label><input type="number" min="0.25" step="0.25" name="value" value="${defVal}" required></div><div class="field"><label>Birim</label><select name="unit">${UNITS.map(u=>`<option ${u===defUnit?'selected':''}>${u}</option>`).join('')}</select></div></div><div class="form-actions"><button type="button" class="secondary-btn" data-close-modal>Vazgeç</button><button class="primary-btn">Borca ekle</button></div></form>`);
    $('#partialForm').onsubmit=async e=>{
      e.preventDefault(); const fd=new FormData(e.currentTarget); const value=Number(fd.get('value')); const unit=fd.get('unit');
      await mutate(s=>{
        const b=s.blocks.find(x=>x.id===block.id); b.status='partial';
        if (b.sourceDebtId) {
          const d=s.debts.find(x=>x.id===b.sourceDebtId); if(d){d.value=value;d.unit=unit;d.title=b.title;d.subject=b.subject;}
        } else {
          const existing=s.debts.find(d=>d.sourceBlockId===b.id);
          if(existing){existing.value=value;existing.unit=unit;} else s.debts.push({id:uid('debt'),title:b.title,subject:b.subject,value,unit,sourceBlockId:b.id,sourceDate:b.date,createdAt:new Date().toISOString()});
        }
      },false); closeModal(); render(); toast(`${value} ${unit} borca eklendi.`);
    };
  }

  function renderPlan(view,actions) {
    actions.innerHTML=`${dateControlHTML()}<button class="primary-btn" data-add-block>＋ Blok</button>`;
    const week=startOfWeekISO(state.selectedDate); const days=Array.from({length:7},(_,i)=>addDaysISO(week,i));
    view.innerHTML=`<div class="card"><div class="card-head"><div><div class="card-title">Haftalık çizelge</div><div class="card-subtitle">Bir güne dokunup ayrıntılı saat çizelgesine geç.</div></div></div><div class="card-body"><div class="week-board">${days.map(day=>{
      const bs=blocksFor(day); return `<section class="week-day ${day===state.selectedDate?'selected':''}" data-week-day="${day}"><div class="week-day-head"><strong>${esc(formatDate(day,{weekday:'short'}))}</strong><span>${esc(formatDate(day,{day:'numeric',month:'short'}))}</span></div><div class="week-day-list">${bs.length?bs.map(b=>`<button class="week-block" data-plan-block="${b.id}"><span>${b.start}</span><strong>${subjectEmoji(b.subject)} ${esc(b.title)}</strong></button>`).join(''):`<div class="week-empty">Boş</div>`}</div></section>`;
    }).join('')}</div></div></div>`;
    bindDateControls(); $('[data-add-block]').onclick=()=>openBlockForm({date:state.selectedDate});
    $$('[data-week-day]').forEach(x=>x.onclick=async e=>{if(e.target.closest('[data-plan-block]'))return;state.selectedDate=x.dataset.weekDay;await save();currentPage='today';render();});
    $$('[data-plan-block]').forEach(x=>x.onclick=e=>{e.stopPropagation();openBlockDetail(x.dataset.planBlock);});
  }

  function taskItemHTML(t) {
    return `<div class="list-item"><button class="circle-check ${t.completed?'done':''}" data-task-check="${t.id}">${t.completed?'✓':'○'}</button><div class="list-item-main"><div class="list-item-title">${subjectEmoji(t.subject)} ${esc(t.title)}</div><div class="list-item-meta">${esc(t.subject)}${t.value?` · ${t.value} ${esc(t.unit)}`:''}${t.note?` · ${esc(t.note)}`:''}</div></div><div class="item-actions"><button class="icon-button" data-schedule-task="${t.id}" title="Programa ekle">📅</button><button class="icon-button" data-delete-task="${t.id}" title="Sil">🗑</button></div></div>`;
  }
  function debtItemHTML(d) {
    return `<div class="debt-wrap" data-debt-wrap="${d.id}"><div class="debt-delete-bg" data-delete-debt="${d.id}">🗑</div><div class="list-item debt-row" data-debt-row="${d.id}"><div class="subject-badge">${subjectEmoji(d.subject)}</div><div class="list-item-main"><div class="list-item-title">${esc(d.title)}</div><div class="list-item-meta">${d.value} ${esc(d.unit)} · ${esc(formatDate(d.sourceDate||todayISO(),{day:'numeric',month:'short'}))}'den kaldı</div></div><button class="icon-button" data-schedule-debt="${d.id}" title="Programa ekle">📅</button></div></div>`;
  }

  function renderTasks(view,actions) {
    actions.innerHTML=`<div class="segmented"><button class="${taskTab==='tasks'?'active':''}" data-task-tab="tasks">Görev havuzu</button><button class="${taskTab==='debts'?'active':''}" data-task-tab="debts">Haftalık borçlar</button></div><button class="primary-btn" data-add-${taskTab==='tasks'?'task':'debt'}>＋ Ekle</button>`;
    if(taskTab==='tasks') {
      const tasks=state.tasks.slice().sort((a,b)=>Number(a.completed)-Number(b.completed)||b.createdAt.localeCompare(a.createdAt));
      view.innerHTML=`<div class="card"><div class="card-head"><div><div class="card-title">Görev havuzu</div><div class="card-subtitle">Henüz belirli bir saate bağlamadığın çalışmalar.</div></div><span class="subject-badge">${activeTasks().length} aktif</span></div><div class="card-body">${tasks.length?`<div class="list-stack">${tasks.map(taskItemHTML).join('')}</div>`:emptyHTML('🗂️','Henüz görev yok','Bir görev ekle; istediğin zaman takvime yerleştir.')}</div></div>`;
    } else {
      const debts=activeDebts();
      view.innerHTML=`<div class="card"><div class="card-head"><div><div class="card-title">📥 Haftalık borçlar</div><div class="card-subtitle">Sağa kaydır → çöp kutusu ile silebilirsin.</div></div><span class="subject-badge">${debts.length} borç</span></div><div class="card-body">${debts.length?`<div class="list-stack">${debts.map(debtItemHTML).join('')}</div>`:emptyHTML('✨','Borç yok','Tamamlanan günlerin tadını çıkar.')}</div></div>`;
      bindDebtSwipe(view);
    }
    $$('[data-task-tab]').forEach(b=>b.onclick=()=>{taskTab=b.dataset.taskTab;render();});
    $('[data-add-task]')?.addEventListener('click',openTaskForm); $('[data-add-debt]')?.addEventListener('click',()=>openDebtForm());
    bindCommonListActions(view);
  }

  function bindCommonListActions(root=document) {
    $$('[data-task-check]',root).forEach(b=>b.onclick=async()=>{await mutate(s=>{const t=s.tasks.find(x=>x.id===b.dataset.taskCheck);if(t)t.completed=!t.completed;});});
    $$('[data-delete-task]',root).forEach(b=>b.onclick=async()=>{await mutate(s=>s.tasks=s.tasks.filter(x=>x.id!==b.dataset.deleteTask));toast('Görev silindi.');});
    $$('[data-schedule-task]',root).forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id===b.dataset.scheduleTask);openBlockForm({date:state.selectedDate,title:t.title,subject:t.subject,metricValue:t.value,metricUnit:t.unit,note:t.note});});
    $$('[data-schedule-debt]',root).forEach(b=>b.onclick=()=>scheduleDebt(b.dataset.scheduleDebt));
    $$('[data-delete-debt]',root).forEach(b=>b.onclick=async()=>{await mutate(s=>s.debts=s.debts.filter(x=>x.id!==b.dataset.deleteDebt));toast('Borç silindi.');});
  }

  function bindDebtSwipe(root) {
    $$('[data-debt-row]',root).forEach(row=>{
      let startX=0,current=0,drag=false;
      row.addEventListener('pointerdown',e=>{startX=e.clientX;drag=true;row.setPointerCapture?.(e.pointerId);});
      row.addEventListener('pointermove',e=>{if(!drag)return; current=clamp(e.clientX-startX,0,86); row.style.transform=`translateX(${current}px)`;});
      row.addEventListener('pointerup',()=>{drag=false; row.style.transform=current>45?'translateX(86px)':'translateX(0)'; current=current>45?86:0;});
      row.addEventListener('pointercancel',()=>{drag=false;row.style.transform='translateX(0)';current=0;});
    });
  }

  function openTaskForm() {
    openModal('Yeni görev','Saate bağlamadan görev havuzuna ekle.',`<form id="taskForm"><div class="form-grid"><div class="field"><label>Ders</label><select name="subject">${SUBJECTS.filter(x=>x!=='Deneme').map(s=>`<option>${s}</option>`).join('')}</select></div><div class="field"><label>Miktar</label><div class="inline-fields"><input type="number" step="0.25" name="value" placeholder="5"><select name="unit">${UNITS.map(u=>`<option>${u}</option>`).join('')}</select></div></div><div class="field full"><label>Görev</label><input name="title" placeholder="Örn. Apotemi Türev" required></div><div class="field full"><label>Not</label><textarea name="note"></textarea></div></div><div class="form-actions"><button type="button" class="secondary-btn" data-close-modal>Vazgeç</button><button class="primary-btn">Ekle</button></div></form>`);
    $('#taskForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await mutate(s=>s.tasks.push({id:uid('task'),title:String(fd.get('title')).trim(),subject:fd.get('subject'),value:Number(fd.get('value'))||null,unit:fd.get('unit'),note:String(fd.get('note')||'').trim(),completed:false,createdAt:new Date().toISOString()}),false);closeModal();render();toast('Görev eklendi.');};
  }
  function openDebtForm(pref={}) {
    openModal('Borç ekle','Elle de haftalık borç oluşturabilirsin.',`<form id="debtForm"><div class="form-grid"><div class="field"><label>Ders</label><select name="subject">${SUBJECTS.filter(x=>x!=='Deneme').map(s=>`<option ${pref.subject===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="field"><label>Kalan</label><div class="inline-fields"><input type="number" min="0.25" step="0.25" name="value" value="${pref.value||''}" required><select name="unit">${UNITS.map(u=>`<option ${pref.unit===u?'selected':''}>${u}</option>`).join('')}</select></div></div><div class="field full"><label>Görev</label><input name="title" value="${esc(pref.title||'')}" required></div></div><div class="form-actions"><button type="button" class="secondary-btn" data-close-modal>Vazgeç</button><button class="primary-btn">Borca ekle</button></div></form>`);
    $('#debtForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await mutate(s=>s.debts.push({id:uid('debt'),title:String(fd.get('title')).trim(),subject:fd.get('subject'),value:Number(fd.get('value')),unit:fd.get('unit'),sourceBlockId:null,sourceDate:state.selectedDate,createdAt:new Date().toISOString()}),false);closeModal();render();};
  }
  function scheduleDebt(id) {
    const d=state.debts.find(x=>x.id===id); if(!d)return;
    openModal('Borcu programa koy',`${d.value} ${d.unit} · ${d.title}`,`<form id="scheduleDebtForm"><div class="form-grid"><div class="field"><label>Tarih</label><input type="date" name="date" value="${state.selectedDate}"></div><div class="field"><label>Başlangıç</label><input type="time" name="start" value="09:00"></div><div class="field"><label>Bitiş</label><input type="time" name="end" value="${d.unit==='dakika'?timeFromMinute(9*60+Number(d.value)):'09:50'}"></div></div><div class="form-actions"><button type="button" class="secondary-btn" data-close-modal>Vazgeç</button><button class="primary-btn">Programa ekle</button></div></form>`);
    $('#scheduleDebtForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);if(minuteFromTime(fd.get('end'))<=minuteFromTime(fd.get('start')))return toast('Saat aralığını kontrol et.');await mutate(s=>{s.blocks.push({id:uid('block'),date:fd.get('date'),subject:d.subject,title:d.title,start:fd.get('start'),end:fd.get('end'),metricValue:d.value,metricUnit:d.unit,note:'Haftalık borç',status:'pending',sourceDebtId:d.id,createdAt:new Date().toISOString()});s.selectedDate=fd.get('date');},false);closeModal();currentPage='today';render();toast('Borç programa eklendi.');};
  }

  function renderExams(view,actions) {
    actions.innerHTML='<button class="primary-btn" data-add-exam>＋ Deneme ekle</button>';
    const exams=state.exams.slice().sort((a,b)=>b.date.localeCompare(a.date));
    view.innerHTML=exams.length?`<div class="exam-grid">${exams.map(examCardHTML).join('')}</div>`:`<div class="card"><div class="card-body">${emptyHTML('📊','Henüz deneme yok','İlk denemeni eklediğinde karnen ve grafiklerin burada oluşacak.')}</div></div>`;
    $('[data-add-exam]').onclick=openExamForm;
    $$('[data-exam-id]').forEach(x=>x.onclick=()=>openExamDetail(x.dataset.examId));
  }
  function examTotal(e) { return Math.round(e.rows.reduce((s,r)=>s+netFrom(r.correct,r.wrong),0)*100)/100; }
  function maxBySubjectName(subject,type) {
    const maps={TYT:{Türkçe:40,Sosyal:20,Matematik:40,Fen:20},AYT:{Matematik:40,Fizik:14,Kimya:13,Biyoloji:13}};
    if(type==='TYT'){ if(subject==='Türkçe')return 40;if(['Tarih','Coğrafya','Felsefe','Din','Sosyal'].includes(subject))return 20;if(subject==='Matematik')return 40;return 20; }
    if(type==='AYT'){return subject==='Matematik'?40:subject==='Fizik'?14:subject==='Kimya'||subject==='Biyoloji'?13:40;}
    return Math.max(10, Number(state.exams.find(()=>false))||40);
  }
  function examCardHTML(e) {
    const total=examTotal(e); return `<button class="card exam-card" data-exam-id="${e.id}" style="text-align:left"><div class="exam-top"><div><div class="exam-name">${esc(e.name)}</div><div class="exam-meta">${esc(formatDate(e.date,{day:'numeric',month:'long',year:'numeric'}))}</div></div><span class="exam-type">${esc(e.type)}</span></div><div class="exam-net">${total}<span> net</span></div><div class="exam-meta">${e.duration?`${e.duration} dk`:''}${e.ranking?` · ${esc(e.ranking)}`:''}</div><div class="exam-bars">${e.rows.slice(0,4).map(r=>{const n=netFrom(r.correct,r.wrong), max=maxBySubjectName(r.subject,e.type);return `<div class="mini-bar-row"><span>${esc(r.subject)}</span><div class="mini-bar"><i style="width:${clamp(n/max*100,0,100)}%"></i></div><strong>${n}</strong></div>`}).join('')}</div></button>`;
  }
  function defaultExamSubjects(type) { return type==='TYT'?['Türkçe','Sosyal','Matematik','Fen']:type==='AYT'?['Matematik','Fizik','Kimya','Biyoloji']:['Matematik']; }
  function examRowsHTML(subjects) { return subjects.map((s,i)=>`<div class="exam-entry-row" data-exam-row><select name="subject_${i}">${SUBJECTS.filter(x=>x!=='Deneme'&&x!=='Diğer').concat(['Sosyal','Fen']).filter((x,idx,a)=>a.indexOf(x)===idx).map(x=>`<option ${x===s?'selected':''}>${x}</option>`).join('')}</select><input type="number" min="0" step="1" name="correct_${i}" placeholder="D"><input type="number" min="0" step="1" name="wrong_${i}" placeholder="Y"><input type="number" min="0" step="1" name="blank_${i}" placeholder="B"></div>`).join(''); }
  function openExamForm() {
    openModal('Deneme karnesi','Doğru / yanlış / boş gir; net otomatik hesaplanır.',`<form id="examForm"><div class="form-grid"><div class="field"><label>Tür</label><select name="type" id="examType"><option>TYT</option><option>AYT</option><option>Branş</option></select></div><div class="field"><label>Tarih</label><input type="date" name="date" value="${todayISO()}" required></div><div class="field full"><label>Deneme adı</label><input name="name" placeholder="Örn. 345 TYT-4" required></div><div class="field"><label>Süre (dk)</label><input type="number" min="0" name="duration"></div><div class="field"><label>Sıralama / not</label><input name="ranking" placeholder="18 / 124"></div></div><div style="height:16px"></div><div class="card-title">Ders sonuçları</div><div class="exam-entry-head"><span>Ders</span><span>D</span><span>Y</span><span>B</span></div><div id="examRows">${examRowsHTML(defaultExamSubjects('TYT'))}</div><div class="form-actions"><button type="button" class="secondary-btn" data-close-modal>Vazgeç</button><button class="primary-btn">Kaydet</button></div></form>`);
    $('#examType').onchange=e=>{$('#examRows').innerHTML=examRowsHTML(defaultExamSubjects(e.target.value));};
    $('#examForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const rows=$$('[data-exam-row]',e.currentTarget).map((row,i)=>({subject:fd.get(`subject_${i}`),correct:Number(fd.get(`correct_${i}`))||0,wrong:Number(fd.get(`wrong_${i}`))||0,blank:Number(fd.get(`blank_${i}`))||0}));await mutate(s=>s.exams.push({id:uid('exam'),type:fd.get('type'),date:fd.get('date'),name:String(fd.get('name')).trim(),duration:Number(fd.get('duration'))||null,ranking:String(fd.get('ranking')||'').trim(),rows,createdAt:new Date().toISOString()}),false);closeModal();render();toast('Deneme kaydedildi.');};
  }
  function openExamDetail(id) {
    const e=state.exams.find(x=>x.id===id); if(!e)return; const total=examTotal(e);
    openModal(e.name,`${e.type} · ${formatDate(e.date)}`,`<div class="summary-grid"><div class="summary-box"><div class="summary-value">${total}</div><div class="summary-label">Toplam net</div></div><div class="summary-box"><div class="summary-value">${e.duration||'—'}</div><div class="summary-label">Dakika</div></div><div class="summary-box"><div class="summary-value" style="font-size:17px">${esc(e.ranking||'—')}</div><div class="summary-label">Sıralama / not</div></div></div><div style="height:16px"></div><div class="list-stack">${e.rows.map(r=>`<div class="list-item"><div class="list-item-main"><div class="list-item-title">${esc(r.subject)}</div><div class="list-item-meta">${r.correct} doğru · ${r.wrong} yanlış · ${r.blank} boş</div></div><strong>${netFrom(r.correct,r.wrong)} net</strong></div>`).join('')}</div><div class="form-actions"><button class="danger-btn" data-delete-exam>Denemeyi sil</button></div>`);
    $('[data-delete-exam]').onclick=async()=>{if(confirm('Denemeyi silmek istiyor musun?')){await mutate(s=>s.exams=s.exams.filter(x=>x.id!==id),false);closeModal();render();}};
  }

  function renderQuestions(view,actions) {
    actions.innerHTML='<button class="primary-btn" data-add-question>＋ Soru ekle</button>';
    const filters=['Tümü',...SUBJECTS.filter(x=>!['Deneme','Diğer'].includes(x))];
    const qs=state.questions.filter(q=>questionFilter==='Tümü'||q.subject===questionFilter).sort((a,b)=>Number(a.status==='solved')-Number(b.status==='solved')||b.createdAt.localeCompare(a.createdAt));
    view.innerHTML=`<div class="tabs-row">${filters.map(f=>`<button class="chip ${questionFilter===f?'active':''}" data-q-filter="${f}">${f}</button>`).join('')}</div><div style="height:12px"></div><div class="card"><div class="card-head"><div><div class="card-title">Sorulacak sorular</div><div class="card-subtitle">Kaynak + soru numarası yeter; çözdüğünde kapat.</div></div><span class="subject-badge">${state.questions.filter(q=>q.status!=='solved').length} açık</span></div><div class="card-body">${qs.length?`<div class="list-stack">${qs.map(questionItemHTML).join('')}</div>`:emptyHTML('❓','Bu filtrede soru yok','Takıldığın soruyu + ile ekle.')}</div></div>`;
    $('[data-add-question]').onclick=openQuestionForm;
    $$('[data-q-filter]').forEach(b=>b.onclick=()=>{questionFilter=b.dataset.qFilter;render();});
    $$('[data-q-toggle]').forEach(b=>b.onclick=async()=>{await mutate(s=>{const q=s.questions.find(x=>x.id===b.dataset.qToggle);q.status=q.status==='solved'?'open':'solved';});});
    $$('[data-q-delete]').forEach(b=>b.onclick=async()=>{await mutate(s=>s.questions=s.questions.filter(x=>x.id!==b.dataset.qDelete));});
  }
  function questionItemHTML(q) { return `<div class="list-item"><button class="circle-check ${q.status==='solved'?'done':''}" data-q-toggle="${q.id}">${q.status==='solved'?'✓':'?'}</button><div class="list-item-main"><div class="list-item-title">${subjectEmoji(q.subject)} ${esc(q.source)} · ${esc(q.reference)}</div><div class="list-item-meta">${esc(q.subject)}${q.topic?` · ${esc(q.topic)}`:''}${q.note?` · ${esc(q.note)}`:''}</div></div><button class="icon-button" data-q-delete="${q.id}">🗑</button></div>`; }
  function openQuestionForm() {
    openModal('Soru ekle','Çözdürülecek soruyu hızlıca kaydet.',`<form id="questionForm"><div class="form-grid"><div class="field"><label>Ders</label><select name="subject">${SUBJECTS.filter(x=>!['Deneme','Diğer'].includes(x)).map(s=>`<option>${s}</option>`).join('')}</select></div><div class="field"><label>Konu</label><input name="topic" placeholder="Türev"></div><div class="field"><label>Kaynak</label><input name="source" placeholder="Orijinal" required></div><div class="field"><label>Sayfa / test / soru</label><input name="reference" placeholder="Test 7 / Soru 4" required></div><div class="field full"><label>Not</label><textarea name="note" placeholder="Nerede takıldım?"></textarea></div></div><div class="form-actions"><button type="button" class="secondary-btn" data-close-modal>Vazgeç</button><button class="primary-btn">Ekle</button></div></form>`);
    $('#questionForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await mutate(s=>s.questions.push({id:uid('q'),subject:fd.get('subject'),topic:String(fd.get('topic')||'').trim(),source:String(fd.get('source')).trim(),reference:String(fd.get('reference')).trim(),note:String(fd.get('note')||'').trim(),status:'open',createdAt:new Date().toISOString()}),false);closeModal();render();};
  }

  function renderAnalytics(view,actions) {
    const completed=state.blocks.filter(b=>b.status==='complete');
    const totalMinutes=completed.reduce((s,b)=>s+durationMinutes(b.start,b.end),0);
    const last7=Array.from({length:7},(_,i)=>addDaysISO(todayISO(),i-6));
    const completed7=last7.map(d=>({d,min:state.blocks.filter(b=>b.date===d&&b.status==='complete').reduce((s,b)=>s+durationMinutes(b.start,b.end),0)}));
    const avg=completed7.reduce((s,x)=>s+x.min,0)/7;
    const examSeries=state.exams.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-10).map(e=>({label:formatDate(e.date,{day:'numeric',month:'short'}),value:examTotal(e)}));
    view.innerHTML=`<div class="analytics-grid"><section class="card metric-card"><div class="metric-value">${Math.round(totalMinutes/60*10)/10}</div><div class="metric-label">Toplam tamamlanan saat</div></section><section class="card metric-card"><div class="metric-value">${Math.round(avg/60*10)/10}</div><div class="metric-label">Son 7 gün günlük ortalama</div></section><section class="card metric-card"><div class="metric-value">${state.debts.length}</div><div class="metric-label">Aktif haftalık borç</div></section><section class="card chart-card"><div class="card-title">📊 Son denemeler</div><div class="card-subtitle">Toplam net eğrisi</div><div class="chart-wrap">${lineChartSVG(examSeries)}</div></section><section class="card chart-card"><div class="card-title">⏱ Son 7 gün tamamlanan çalışma</div><div class="card-subtitle">Saat bazında</div><div class="chart-wrap">${barChartSVG(completed7.map(x=>({label:formatDate(x.d,{weekday:'short'}),value:Math.round(x.min/60*10)/10})))}</div></section></div>`;
  }
  function lineChartSVG(data) {
    if(!data.length)return `<div class="empty-state" style="margin-top:20px">Deneme ekledikçe grafik oluşacak.</div>`;
    const w=800,h=240,p=32; const vals=data.map(x=>x.value); const min=Math.min(...vals,0), max=Math.max(...vals,1); const range=Math.max(1,max-min); const pts=data.map((x,i)=>{const px=p+(w-2*p)*(data.length===1?.5:i/(data.length-1));const py=h-p-(x.value-min)/range*(h-2*p);return [px,py];});
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b8fe6" stop-opacity=".28"/><stop offset="1" stop-color="#4b8fe6" stop-opacity="0"/></linearGradient></defs>${[0,.25,.5,.75,1].map(t=>`<line x1="${p}" x2="${w-p}" y1="${p+t*(h-2*p)}" y2="${p+t*(h-2*p)}" stroke="#e4e9f0"/>`).join('')}<path d="M ${pts.map(x=>x.join(' ')).join(' L ')}" fill="none" stroke="#397fdc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M ${pts[0][0]} ${h-p} L ${pts.map(x=>x.join(' ')).join(' L ')} L ${pts.at(-1)[0]} ${h-p} Z" fill="url(#g)"/>${pts.map((x,i)=>`<circle cx="${x[0]}" cy="${x[1]}" r="5" fill="#fff" stroke="#397fdc" stroke-width="3"/><text x="${x[0]}" y="${h-8}" text-anchor="middle" font-size="10" fill="#778397">${esc(data[i].label)}</text>`).join('')}</svg>`;
  }
  function barChartSVG(data) {
    const w=800,h=240,p=34;const max=Math.max(...data.map(x=>x.value),1);const bw=(w-2*p)/data.length*.56;return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${[0,.25,.5,.75,1].map(t=>`<line x1="${p}" x2="${w-p}" y1="${p+t*(h-2*p)}" y2="${p+t*(h-2*p)}" stroke="#e4e9f0"/>`).join('')}${data.map((x,i)=>{const cx=p+(w-2*p)*(i+.5)/data.length;const bh=x.value/max*(h-2*p);return `<rect x="${cx-bw/2}" y="${h-p-bh}" width="${bw}" height="${bh}" rx="8" fill="#6da6e8"/><text x="${cx}" y="${h-8}" text-anchor="middle" font-size="10" fill="#778397">${esc(x.label)}</text><text x="${cx}" y="${Math.max(15,h-p-bh-7)}" text-anchor="middle" font-size="10" fill="#4d6581">${x.value}</text>`}).join('')}</svg>`;
  }

  function renderSettings(view,actions) {
    const ctx=makeBridgeContext(state.selectedDate);
    const guide=bridgeGuideText();
    view.innerHTML=`<div class="settings-grid"><section class="card settings-section"><div class="card-title">⚙️ Genel</div><div class="settings-row"><div><div class="settings-row-title">Ana ekrana ekle</div><div class="settings-row-desc">Safari → Paylaş → Ana Ekrana Ekle. Sonra tam ekran uygulama gibi açılır.</div></div><span>📲</span></div><div class="settings-row"><div><div class="settings-row-title">Yerel veri</div><div class="settings-row-desc">Program, denemeler ve sorular bu cihazın tarayıcı depolamasında tutulur.</div></div><span>🔒</span></div><div class="settings-row"><div><div class="settings-row-title">Veri yedeği</div><div class="settings-row-desc">Bulut yok; bu yüzden ara sıra JSON yedeği almak iyi fikir.</div></div><div style="display:flex;gap:6px"><button class="secondary-btn" data-backup>Yedekle</button><button class="secondary-btn" data-restore>Geri yükle</button><input id="restoreFile" type="file" accept="application/json" hidden></div></div><div class="settings-row"><div><div class="settings-row-title">Tüm veriyi sıfırla</div><div class="settings-row-desc">Cihazdaki Hakuna Matata kayıtlarını temizler.</div></div><button class="danger-btn" data-reset>Sil</button></div></section>
      <div class="bridge-stack">
        <section class="terminal terminal-guide"><div class="terminal-title">🤖 YENİ CHATGPT’YE HAKUNA’YI ÖĞRET</div><div class="terminal-help">Başka bir ChatGPT’ye geçtiğinde bu metni bir kez gönder. Hakuna Bridge’in nasıl çalıştığını, hangi JSON’u okuyacağını ve sana hangi komutu geri vermesi gerektiğini anlatır.</div><textarea id="bridgeGuide" readonly></textarea><div class="terminal-actions"><button class="secondary-btn" data-copy-guide>📋 Tanıtım metnini kopyala</button><button class="secondary-btn" data-copy-guide-context>📦 Tanıtım + bugünkü kod</button></div></section>
        <section class="terminal"><div class="terminal-title">🧩 HAKUNA BRIDGE / ChatGPT Köprüsü</div><div class="terminal-help">Mevcut gününü kopyala → ChatGPT’ye gönder → gelen <code>hakuna.command.v1</code> JSON’unu aşağıya yapıştır.</div><div class="terminal-actions"><button class="secondary-btn" data-copy-context>📋 Günün kodunu kopyala</button><button class="secondary-btn" data-share-context>↗︎ Paylaş</button></div><div style="height:10px"></div><textarea id="bridgeInput" placeholder='ChatGPT’den gelen { "schema": "hakuna.command.v1", ... } kodunu buraya yapıştır'></textarea><div class="terminal-actions"><button class="secondary-btn" data-paste-bridge>Panodan yapıştır</button><button class="primary-btn" data-preview-bridge>Önizle</button></div></section>
      </div></div>`;
    $('#bridgeGuide').value=guide;
    $('[data-copy-guide]').onclick=()=>copyText(guide,'Hakuna tanıtım metni kopyalandı.');
    $('[data-copy-guide-context]').onclick=()=>copyText(`${guide}\n\n--- HAKUNA MATATA GÜNCEL GÜN KODU ---\n${JSON.stringify(ctx,null,2)}`,'Tanıtım + günün kodu kopyalandı.');
    $('[data-copy-context]').onclick=()=>copyText(JSON.stringify(ctx,null,2),'Günün kodu kopyalandı.');
    $('[data-share-context]').onclick=()=>shareText('Hakuna Matata — Günlük bağlam',JSON.stringify(ctx,null,2));
    $('[data-paste-bridge]').onclick=async()=>{try{$('#bridgeInput').value=await navigator.clipboard.readText();}catch{toast('Panoya erişemedim; uzun basıp Yapıştır kullan.');}};
    $('[data-preview-bridge]').onclick=()=>previewBridge($('#bridgeInput').value);
    $('[data-backup]').onclick=backupData; $('[data-restore]').onclick=()=>$('#restoreFile').click(); $('#restoreFile').onchange=restoreData;
    $('[data-reset]').onclick=async()=>{if(confirm('Hakuna Matata içindeki tüm yerel veriler silinsin mi?')){state=defaultState();await save();render();toast('Veriler sıfırlandı.');}};
  }

  function bridgeGuideText() {
    return `HAKUNA MATATA — CHATGPT KÖPRÜ TALİMATI (v1)

Ben Hakuna Matata adlı kişisel ders planlama uygulamasını kullanıyorum. Uygulamaya doğrudan erişimin yok. Uygulamayla yalnızca kopyala-yapıştır JSON köprüsü üzerinden çalışacaksın.

NASIL ÇALIŞIR
1. Ben uygulamadan sana "schema": "hakuna.context.v1" olan bir JSON göndereceğim. Bu, seçtiğim günün mevcut programını, aktif borçlarımı ve görev havuzumu içerir.
2. Ben senden o günü planlamanı, düzenlemeni veya yeni blok eklemeni isteyeceğim.
3. Uygulamaya aktarılacak cevap olarak geçerli bir "hakuna.command.v1" JSON üret. Ben bu JSON’u Hakuna Bridge’e yapıştırıp Önizle → Programa uygula diyeceğim.
4. Uygulamaya doğrudan bağlandığını veya veriyi kendin değiştirdiğini söyleme; değişiklik ancak benim JSON’u uygulamaya yapıştırmamla gerçekleşir.

GELEN CONTEXT ALANLARI
- date: YYYY-MM-DD biçiminde seçili gün.
- blocks: o günün mevcut zaman blokları. id, start, end, title, subject, status, metric, note ve varsa source_debt_id içerebilir.
- debts: aktif borçlar. Bir borcu programa koyarsan onun id değerini değiştirmeden debt_id olarak geri gönder. Borç ID’si uydurma.
- task_pool: henüz saate yerleştirilmemiş aktif görevler.

UYGULAMANIN KABUL ETTİĞİ KOMUT
{
  "schema": "hakuna.command.v1",
  "date": "2026-09-14",
  "mode": "replace_day",
  "blocks": [
    {
      "start": "09:00",
      "end": "09:50",
      "title": "Paragraf Denemesi",
      "subject": "Türkçe",
      "metric": {"value": 1, "unit": "test"},
      "note": "İsteğe bağlı not"
    }
  ]
}

MODE
- "replace_day": O günün mevcut zaman çizelgesini tamamen gelen blocks listesiyle değiştirir. Korunması gereken mevcut blokları da yeni JSON’a tekrar koy.
- "add_blocks": Mevcut programı korur, yalnızca verdiğin yeni blokları ekler.

BLOCK KURALLARI
- start ve end 24 saat HH:MM formatında olmalı.
- end, start’tan sonra olmalı.
- title zorunlu.
- subject için mümkünse şunlardan birini kullan: Türkçe, Matematik, Geometri, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Felsefe, Din, Deneme, Diğer.
- metric isteğe bağlıdır. unit için: dakika, test, soru, sayfa, bölüm.
- Bir aktif borcu programa yerleştiriyorsan blokta "debt_id": context içindeki gerçek borç ID’si bulunmalı.
- Saat çakışması yaratma; kullanıcı özellikle istemedikçe mevcut sabit etkinlikleri koru.
- Context’te olmayan borç ID’si veya kayıt ID’si uydurma.

İSTEĞE BAĞLI EKLEME
Aynı komutta yeni görev veya borç da ekleyebilirsin:
"tasks": [{"title":"...","subject":"Matematik","amount":{"value":3,"unit":"test"},"note":"..."}]
"debts": [{"title":"...","subject":"Fizik","remaining":{"value":25,"unit":"dakika"}}]

YANIT KURALI
- Uygulamaya aktarılacak komut gerektiğinde SONUNDA tek bir JSON kod bloğu ver.
- JSON’un içine açıklama, yorum veya Markdown koyma.
- Kullanıcının isteği belirsizse önce soru sor; emin olmadığın saatleri uydurma.
- Kullanıcı yalnız analiz istiyorsa komut üretmek zorunda değilsin. Programda değişiklik istiyorsa komut üret.
- Kullanıcının verdiği öncelikleri ve sabit saatleri, ardından context’teki aktif borçları ve görev havuzunu dikkate al.`;
  }

  function makeBridgeContext(date) {
    return {
      schema:'hakuna.context.v1',
      date,
      day_label:formatDate(date),
      blocks:blocksFor(date).map(b=>({id:b.id,start:b.start,end:b.end,title:b.title,subject:b.subject,status:b.status,metric:b.metricValue?{value:b.metricValue,unit:b.metricUnit}:null,note:b.note||undefined,source_debt_id:b.sourceDebtId||undefined})),
      debts:activeDebts().map(d=>({id:d.id,title:d.title,subject:d.subject,remaining:{value:d.value,unit:d.unit},source_date:d.sourceDate})),
      task_pool:activeTasks().map(t=>({id:t.id,title:t.title,subject:t.subject,amount:t.value?{value:t.value,unit:t.unit}:null,note:t.note||undefined})),
      reply_rule:'Yanıtının sonunda yalnızca geçerli JSON olarak schema=hakuna.command.v1 üret. mode add_blocks veya replace_day olabilir. Her blok start/end/title/subject içersin. Açıklama metnini JSON bloğunun içine yazma.',
      reply_example:{schema:'hakuna.command.v1',date,mode:'add_blocks',blocks:[{start:'09:00',end:'09:50',title:'Paragraf Denemesi',subject:'Türkçe'}]}
    };
  }
  function cleanJsonText(text) { const t=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,''); const a=t.indexOf('{'),b=t.lastIndexOf('}'); return a>=0&&b>a?t.slice(a,b+1):t; }
  function validateBridgeCommand(cmd) {
    if(!cmd||cmd.schema!=='hakuna.command.v1') throw new Error('schema "hakuna.command.v1" olmalı.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(cmd.date||'')) throw new Error('Geçerli bir date gerekli.');
    if(!['add_blocks','replace_day'].includes(cmd.mode)) throw new Error('mode add_blocks veya replace_day olmalı.');
    if(!Array.isArray(cmd.blocks)) throw new Error('blocks bir dizi olmalı.');
    cmd.blocks.forEach((b,i)=>{
      if(!/^\d{2}:\d{2}$/.test(b.start||'')||!/^\d{2}:\d{2}$/.test(b.end||'')) throw new Error(`${i+1}. blokta saat hatalı.`);
      if(minuteFromTime(b.end)<=minuteFromTime(b.start)) throw new Error(`${i+1}. blokta bitiş başlangıçtan önce.`);
      if(!b.title) throw new Error(`${i+1}. blokta title yok.`);
    });
    return cmd;
  }
  function previewBridge(text) {
    try {
      const cmd=validateBridgeCommand(JSON.parse(cleanJsonText(text))); bridgePreview=cmd;
      openModal('ChatGPT planı önizleme',`${formatDate(cmd.date)} · ${cmd.mode==='replace_day'?'Günün çizelgesi değişecek':'Mevcut güne eklenecek'}`,`<div class="list-stack">${cmd.blocks.map(b=>`<div class="list-item"><div class="subject-badge">${subjectEmoji(b.subject||'Diğer')}</div><div class="list-item-main"><div class="list-item-title">${esc(b.start)}–${esc(b.end)} · ${esc(b.title)}</div><div class="list-item-meta">${esc(b.subject||'Diğer')}${b.metric?` · ${esc(b.metric.value)} ${esc(b.metric.unit)}`:''}${b.debt_id?' · borç bağlantılı':''}</div></div></div>`).join('')}</div>${cmd.blocks.length?'' : emptyHTML('🫥','Blok yok','Komut boş bir program içeriyor.')}<div class="form-actions"><button class="secondary-btn" data-close-modal>Vazgeç</button><button class="primary-btn" data-apply-bridge>Programa uygula</button></div>`);
      $('[data-apply-bridge]').onclick=applyBridge;
    } catch(err) { toast(`Kod okunamadı: ${err.message}`); }
  }
  async function applyBridge() {
    const cmd=bridgePreview; if(!cmd)return;
    await mutate(s=>{
      if(cmd.mode==='replace_day') s.blocks=s.blocks.filter(b=>b.date!==cmd.date);
      for(const b of cmd.blocks) {
        const debtId=b.debt_id||b.source_debt_id||null;
        s.blocks.push({id:uid('block'),date:cmd.date,start:b.start,end:b.end,title:String(b.title),subject:SUBJECTS.includes(b.subject)?b.subject:(b.subject||'Diğer'),metricValue:b.metric?.value??b.metricValue??null,metricUnit:b.metric?.unit??b.metricUnit??'test',note:b.note||'',status:'pending',sourceDebtId:debtId,createdAt:new Date().toISOString()});
      }
      if(Array.isArray(cmd.tasks)) cmd.tasks.forEach(t=>s.tasks.push({id:uid('task'),title:t.title,subject:t.subject||'Diğer',value:t.amount?.value??null,unit:t.amount?.unit??'test',note:t.note||'',completed:false,createdAt:new Date().toISOString()}));
      if(Array.isArray(cmd.debts)) cmd.debts.forEach(d=>s.debts.push({id:uid('debt'),title:d.title,subject:d.subject||'Diğer',value:d.remaining?.value??d.value??1,unit:d.remaining?.unit??d.unit??'test',sourceBlockId:null,sourceDate:cmd.date,createdAt:new Date().toISOString()}));
      s.selectedDate=cmd.date;
    },false);
    bridgePreview=null; closeModal(); currentPage='today'; render(); toast('ChatGPT planı uygulandı ✓');
  }

  function copyText(text,msg='Kopyalandı.') {
    if(navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(()=>toast(msg)).catch(()=>fallbackCopy(text,msg)); else fallbackCopy(text,msg);
  }
  function fallbackCopy(text,msg) { const ta=document.createElement('textarea');ta.value=text;document.body.append(ta);ta.select();document.execCommand('copy');ta.remove();toast(msg); }
  async function shareText(title,text) { try{if(navigator.share) await navigator.share({title,text}); else copyText(text);}catch(e){if(e.name!=='AbortError')copyText(text);} }

  async function backupData() {
    const payload=JSON.stringify({schema:'hakuna.backup.v1',exported_at:new Date().toISOString(),state},null,2);
    const file=new File([payload],`Hakuna-Matata-Yedek-${todayISO()}.json`,{type:'application/json'});
    try { if(navigator.canShare?.({files:[file]})) return await navigator.share({files:[file],title:'Hakuna Matata yedeği'}); } catch {}
    const url=URL.createObjectURL(file); const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); toast('Yedek indirildi.');
  }
  async function restoreData(e) {
    const f=e.target.files?.[0]; if(!f)return;
    try { const obj=JSON.parse(await f.text()); if(obj.schema!=='hakuna.backup.v1'||!obj.state)throw new Error(); if(!confirm('Mevcut verilerin yedekle değiştirilecek. Devam?'))return; state=obj.state; await save(); render(); toast('Yedek geri yüklendi.'); } catch { toast('Bu dosya geçerli bir Hakuna yedeği değil.'); }
    e.target.value='';
  }

  function openModal(title,eyebrow,html) {
    const tpl=$('#modalTemplate').content.cloneNode(true); $('.modal-title',tpl).textContent=title; $('.modal-eyebrow',tpl).textContent=eyebrow; $('.modal-body',tpl).innerHTML=html; const root=$('#modalRoot');root.innerHTML='';root.append(tpl); $$('[data-close-modal]',root).forEach(x=>x.onclick=closeModal); }
  function closeModal() { $('#modalRoot').innerHTML=''; }
  function openMoreMenu() {
    openModal('Daha fazla','Hakuna Matata',`<div class="status-options"><button class="status-option" data-more-nav="questions"><div class="status-emoji">❓</div><div><strong>Sorular</strong><span>Çözdürülecek soru havuzu</span></div></button><button class="status-option" data-more-nav="analytics"><div class="status-emoji">📈</div><div><strong>Analiz</strong><span>Çalışma ve deneme gelişimi</span></div></button><button class="status-option" data-more-nav="settings"><div class="status-emoji">⚙️</div><div><strong>Ayarlar</strong><span>Hakuna Bridge ve yedek</span></div></button></div>`);
    $$('[data-more-nav]').forEach(b=>b.onclick=()=>{currentPage=b.dataset.moreNav;closeModal();render();});
  }

  function injectExtraStyles() {
    const st=document.createElement('style');st.textContent=`
      .week-board{display:grid;grid-template-columns:repeat(7,minmax(125px,1fr));gap:10px;overflow-x:auto;padding-bottom:4px}.week-day{min-width:125px;border:1px solid var(--line);border-radius:17px;padding:10px;background:#fbfcfe;min-height:390px}.week-day.selected{border-color:#9bc1ef;box-shadow:0 0 0 2px #eaf3ff inset}.week-day-head{display:flex;justify-content:space-between;gap:6px;align-items:center;padding:3px 2px 10px;color:#687587;font-size:11px}.week-day-head strong{font-size:13px;color:var(--ink)}.week-day-list{display:grid;gap:7px}.week-block{border:0;border-radius:11px;padding:9px;background:#eef4fc;text-align:left;color:var(--ink)}.week-block span{display:block;font-size:9px;color:#6d7c90}.week-block strong{display:block;font-size:11px;margin-top:2px}.week-empty{font-size:10px;color:#9aa4b1;text-align:center;padding-top:24px}.exam-entry-head,.exam-entry-row{display:grid;grid-template-columns:minmax(110px,1.5fr) repeat(3,minmax(50px,.5fr));gap:7px;align-items:center}.exam-entry-head{color:var(--muted);font-size:10px;font-weight:800;padding:9px 3px 4px}.exam-entry-row{margin-top:7px}.exam-entry-row input,.exam-entry-row select{min-width:0;width:100%;border:1px solid #d9e0e9;border-radius:10px;padding:9px;background:#fff}.week-board button{font:inherit}@media(max-width:720px){.week-board{grid-template-columns:repeat(7,150px)}.week-day{min-height:300px}.exam-entry-head,.exam-entry-row{grid-template-columns:minmax(88px,1.4fr) repeat(3,48px)}}`;
    document.head.append(st);
  }

  async function init() {
    injectExtraStyles();
    try { await openDB(); state=(await dbGet(STATE_KEY))||defaultState(); }
    catch { state=defaultState(); toast('Yerel veritabanı açılamadı; bu oturum geçici olabilir.'); }
    if(!state.selectedDate)state.selectedDate=todayISO();
    render();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
    setTimeout(()=>{
      if(state.settings?.firstRun){ state.settings.firstRun=false; save(); toast('Hazır ✓ Boş bir saate dokunup ilk bloğunu ekleyebilirsin.'); }
    },700);
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  init();
})();
