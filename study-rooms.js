/* Hakuna Study Rooms: independent UI, authenticated server-side accounting. */
(() => {
  'use strict';
  let host=null,roomId=null,snapshot=null,unsubscribe=null,poll=null,clock=null;
  let loading=false,busy=false,epoch=0,skewMs=0,lastUser=null,realtimeDelay=null;
  let heartbeat=null,personalTasks=[],selectedTask='',starting=false,countdownTimeout=null,countdownResolve=null;
  let lastRosterKey='',lastPersonalKey='';
  let spaceTheme='night',spaceZen=false;
  const THEMES=new Set(['night','rain','dawn']);
  function loadPersonalSpace(){
    try{const choice=localStorage.getItem('hakuna.studyRooms.atmosphere');spaceTheme=THEMES.has(choice)?choice:'night';spaceZen=localStorage.getItem('hakuna.studyRooms.quiet')==='1';}
    catch{spaceTheme='night';spaceZen=false;}
  }
  function applyPersonalSpace(){
    if(!host||!roomId)return;
    const room=host.querySelector('.sr-room');if(!room)return;
    room.setAttribute('data-atmosphere',spaceTheme);
    room.classList.toggle('sr-zen',spaceZen);
    room.querySelectorAll('[data-sr-action="atmosphere"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===spaceTheme)));
    const button=room.querySelector('[data-sr-action="zen"]');
    if(button){button.setAttribute('aria-pressed',String(spaceZen));button.textContent=spaceZen?'Ayrıntıları göster':'Sade görünüm';}
  }
  const E=(value='')=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const id=()=>window.HakunaAccount?.info?.().id||null;
  const rpc=(name,args={})=>{
    if(!window.HakunaAccount?.roomRpc)throw new Error('Hesap bağlantısı henüz hazır değil. Yeniden dene.');
    return window.HakunaAccount.roomRpc(name,args);
  };
  const seconds=value=>Math.max(0,Math.floor(Number(value)||0));
  function duration(value){
    const s=seconds(value),hours=Math.floor(s/3600),minutes=Math.floor(s%3600/60),secs=s%60;
    return hours?hours+' sa '+String(minutes).padStart(2,'0')+' dk':minutes+' dk '+String(secs).padStart(2,'0')+' sn';
  }
  function displayClock(value){
    let s=seconds(value);
    return String(Math.floor(s/3600)).padStart(2,'0')+':'
      +String(Math.floor(s%3600/60)).padStart(2,'0')+':'
      +String(s%60).padStart(2,'0');
  }
  function phaseEnd(r){
    const start=Date.parse(r?.phase_started_at||'');
    if(!Number.isFinite(start))return 0;
    return start+60000*(r.phase==='focus'?Number(r.focus_minutes):Number(r.break_minutes));
  }
  function phaseLeft(r,now){
    return r?.phase==='idle'?0:Math.max(0,Math.ceil((phaseEnd(r)-now)/1000));
  }
  function active(){return !!host&&host.isConnected&&host.dataset.studyRooms==='1';}
  function clearLoops(){
    window.HakunaRoomExperience?.clear();
    if(unsubscribe){unsubscribe();unsubscribe=null;}
    clearInterval(poll);clearInterval(clock);clearTimeout(realtimeDelay);
    clearInterval(heartbeat);clearTimeout(countdownTimeout);
    if(countdownResolve){const resolve=countdownResolve;countdownResolve=null;resolve();}
    poll=null;clock=null;heartbeat=null;realtimeDelay=null;countdownTimeout=null;starting=false;loading=false;
    lastRosterKey='';lastPersonalKey='';
  }
  function leaveView(){
    document.body.classList.remove('sr-immersed');
    clearLoops();epoch++;host=null;roomId=null;snapshot=null;busy=false;personalTasks=[];selectedTask='';
  }
  function notice(message,isError=false){
    const n=host?.querySelector('[data-sr-notice]');
    if(!n)return;
    n.textContent=message||'';
    n.classList.toggle('sr-error',!!isError);
    n.hidden=!message;
  }
  async function copy(value){
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
      else{
        const input=document.createElement('textarea');
        input.value=value;input.style.position='fixed';input.style.opacity='0';
        document.body.append(input);input.select();
        if(!document.execCommand('copy'))throw new Error('Kopyalanamadı');
        input.remove();
      }
      notice('Bağlantı kopyalandı ✓');
    }catch{notice('Kopyalanamadı. Davet kodunu elle paylaşabilirsin.',true);}
  }
  function inviteUrl(code){
    const url=new URL(location.pathname,location.origin);
    url.searchParams.set('room',code);
    return url.toString();
  }
  function lobbyMarkup(){
    return '<div class="sr-shell sr-lobby">'
      +'<header class="sr-intro"><div class="sr-kicker">HAKUNA · BİRLİKTE ODAKLAN</div>'
      +'<h2>Çalışma odaları <span>✦</span></h2><p>Arkadaşlarınla aynı masada, herkes kendi hedefine odaklansın.</p></header>'
      +'<div class="sr-stats"><div><small>Bugün çalıştın</small><strong data-sr-today>—</strong></div>'
      +'<div><small>Toplam çalışman</small><strong data-sr-total>—</strong></div></div>'
      +'<div class="sr-forms"><form class="sr-panel" data-sr-form="create">'
      +'<div class="sr-panel-title">✨ Yeni oda oluştur</div>'
      +'<label>Odanın adı<input name="name" type="text" maxlength="60" minlength="3" placeholder="Örn. Kütüphane Ekibi" autocomplete="off" required></label>'
      +'<label>Oda düzeni<select name="mode" class="sr-mode-select"><option value="shared">⏳ Ortak etüt · birlikte başla</option><option value="free">🌿 Serbest etüt · herkes kendi hızında</option></select></label>'
      +'<div class="sr-form-row"><label>Etüt (dk)<input name="focus" type="number" min="5" max="180" value="50" required></label>'
      +'<label>Mola (dk)<input name="break" type="number" min="1" max="60" value="10" required></label></div>'
      +'<button type="submit" class="primary-btn sr-cta">Odayı oluştur</button></form>'
      +'<form class="sr-panel" data-sr-form="join"><div class="sr-panel-title">🔑 Arkadaşının odasına katıl</div>'
      +'<p>Davet bağlantısı veya koduyla özel odaya gir.</p>'
      +'<label>Davet kodu<input name="code" type="text" maxlength="18" placeholder="18 haneli davet kodu" autocapitalize="characters" autocomplete="off" spellcheck="false" required></label>'
      +'<button type="submit" class="secondary-btn sr-cta">Odaya katıl</button></form></div>'
      +'<div class="sr-section-head"><h3>Odalarım</h3><button type="button" class="secondary-btn" data-sr-action="refresh">Yenile</button></div>'
      +'<div class="sr-room-list" data-sr-list><div class="sr-loading">Odalar yükleniyor…</div></div>'
      +'<p class="sr-note" data-sr-notice hidden role="status"></p>'
      +'</div>';
  }
  function loginMarkup(){
    return '<div class="sr-shell sr-login"><div class="sr-login-icon">📚</div><h2>Arkadaşlarla çalışmaya hazır mısın?</h2>'
      +'<p>Ortak odalarda arkadaşlarını görebilmek ve çalışma süreni güvenle kaydetmek için Hakuna hesabınla giriş yap.</p>'
      +'<button class="primary-btn" data-sr-action="login" type="button">Hesap aç / Giriş yap</button>'
      +'<p data-sr-notice hidden role="status"></p></div>';
  }
  function showLobby(){
    document.body.classList.remove('sr-immersed');
    clearLoops();roomId=null;snapshot=null;epoch++;personalTasks=[];selectedTask='';
    if(!active())return;
    host.innerHTML=lobbyMarkup();
    const code=new URLSearchParams(location.search).get('room');
    if(code&&/^[A-Fa-f0-9]{18}$/.test(code)){
      const inp=host.querySelector('[name=code]');if(inp)inp.value=code.toUpperCase();
    }
    void loadLobby();
  }
  async function loadLobby(){
    if(!active()||roomId||loading)return;
    const ticket=epoch;loading=true;
    try{
      const data=await rpc('study_room_overview');
      if(ticket!==epoch||!active()||roomId)return;
      host.querySelector('[data-sr-today]').textContent=duration(data.today_seconds);
      host.querySelector('[data-sr-total]').textContent=duration(data.total_seconds);
      const items=Array.isArray(data.rooms)?data.rooms:[];
      host.querySelector('[data-sr-list]').innerHTML=items.length?items.map(r=>
        '<button class="sr-room-item" type="button" data-sr-action="open" data-id="'+E(r.id)+'">'
        +'<span class="sr-room-bubble">📚</span><span class="sr-room-info"><strong>'+E(r.name)+'</strong>'
        +'<small>'+(r.mode==='free'?'🌿 Serbest':'⏳ Ortak')+' · '+Number(r.member_count)+' üye · '+Number(r.focus_minutes)+'/'+Number(r.break_minutes)+' dk</small></span>'
        +'<span class="sr-room-go">Giriş →</span></button>'
      ).join(''):'<div class="sr-empty">Henüz odan yok. Bir oda kur veya arkadaşının davet kodunu gir. 🌱</div>';
      notice('');
    }catch(error){
      if(ticket===epoch&&active()){const list=host.querySelector('[data-sr-list]');if(list)list.textContent='Odalar alınamadı.';notice(error?.message||'Bağlantı hatası',true);}
    }finally{if(ticket===epoch)loading=false;}
  }
  function roomMarkup(){
    return '<div class="sr-shell sr-room" data-atmosphere="night">'
      +'<header class="sr-room-header"><button type="button" class="secondary-btn" data-sr-action="back">← Odalar</button>'
      +'<div class="sr-room-heading"><span class="sr-kicker" data-sr-room-mode>SESSİZ ODA</span><h2 data-sr-room-title>Oda açılıyor…</h2>'
      +'<div class="sr-room-sub" data-sr-room-meta></div></div>'
      +'<div class="sr-space-tools"><div class="sr-scene-picker" role="group" aria-label="Çalışma ortamı">'
      +'<button type="button" data-sr-action="atmosphere" data-theme="night" aria-pressed="true">Gece</button>'
      +'<button type="button" data-sr-action="atmosphere" data-theme="rain" aria-pressed="false">Yağmur</button>'
      +'<button type="button" data-sr-action="atmosphere" data-theme="dawn" aria-pressed="false">Sabah</button></div>'
      +'<button type="button" class="sr-zen-toggle" data-sr-action="zen" aria-pressed="false">Sade görünüm</button></div>'
      +'<details class="sr-invite"><summary>+ Davet</summary><span data-sr-invite>••••••••</span><button type="button" data-sr-action="copy" class="secondary-btn">Bağlantıyı kopyala</button></details></header>'
      +'<div class="sr-room-grid"><section class="sr-session-card">'
      +'<div class="sr-phase-label" data-sr-phase>Hazırlanıyor</div>'
      +'<div class="sr-focus-ring" data-sr-ring><div class="sr-ring-core"><span class="sr-ring-icon" data-sr-ring-icon>☾</span>'
      +'<strong data-sr-clock>00:00:00</strong><small data-sr-clock-note></small></div></div>'
      +'<div data-sr-own-status class="sr-own-status"></div>'
      +'<div data-sr-personal-actions class="sr-action-area"></div>'
      +'<div data-sr-owner-actions class="sr-owner-area"></div></section>'
      +'<section class="sr-friends"><div class="sr-section-head"><h3>Masalar <span data-sr-member-count></span></h3></div>'
      +'<div class="sr-roster" data-sr-roster><div class="sr-loading">Yükleniyor…</div></div></section></div>'
      +'<div class="sr-room-footer" data-sr-footer></div>'
      +'<div class="sr-countdown" data-sr-countdown hidden aria-live="assertive"><div class="sr-countdown-inner"><div>ETÜT BAŞLIYOR</div><strong data-sr-countdown-num>3</strong></div></div>'
      +'<p class="sr-note" data-sr-notice hidden role="status"></p></div>';
  }
  function openRoom(next){
    if(!active())return;
    clearLoops();roomId=next;snapshot=null;epoch++;personalTasks=[];selectedTask='';host.innerHTML=roomMarkup();
    document.body.classList.add('sr-immersed');applyPersonalSpace();
    void loadRoom();void loadPersonalTasks();void touchRoom();
    heartbeat=setInterval(()=>{if(document.visibilityState==='visible')void touchRoom();},25000);
    unsubscribe=window.HakunaAccount?.roomListen?.(roomId,()=>{
      clearTimeout(realtimeDelay);
      realtimeDelay=setTimeout(()=>{if(active()&&roomId===next)void loadRoom();},300);
    })||null;
    poll=setInterval(()=>{if(document.visibilityState==='visible')void loadRoom();},12000);
    clock=setInterval(tick,1000);
  }
  async function touchRoom(){
    if(!active()||!roomId||!navigator.onLine)return;
    try{await rpc('study_room_touch',{p_room_id:roomId});}catch(error){console.warn('Room presence',error);}
  }
  async function loadRoom(){
    if(!active()||!roomId||loading)return;
    const ticket=epoch,requested=roomId;loading=true;
    try{
      const data=await rpc('study_room_snapshot',{p_room_id:requested});
      if(ticket!==epoch||requested!==roomId||!active())return;
      snapshot=data;
      const serverMs=Date.parse(data.server_now);
      if(Number.isFinite(serverMs))skewMs=serverMs-Date.now();
      drawSnapshot();notice('');
    }catch(error){
      if(ticket===epoch&&active())notice(error?.message||'Oda bilgileri alınamadı.',true);
    }finally{if(ticket===epoch)loading=false;}
  }

  function currentISO(){
    const d=new Date(),y=d.getFullYear();
    return y+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  async function loadPersonalTasks(){
    const ticket=epoch;
    try{
      const state=await new Promise((resolve,reject)=>{
        if(!indexedDB?.open){resolve(null);return;}
        const req=indexedDB.open('hakuna-matata-db',1);
        req.onerror=()=>reject(req.error||new Error('Local state unavailable'));
        req.onsuccess=()=>{
          const db=req.result;
          if(!db.objectStoreNames.contains('app')){db.close();resolve(null);return;}
          const tx=db.transaction('app','readonly');
          const read=tx.objectStore('app').get('state');
          read.onsuccess=()=>{db.close();resolve(read.result||null);};
          read.onerror=()=>{db.close();reject(read.error);};
        };
      });
      if(ticket!==epoch||!active()||!roomId)return;
      const today=currentISO();
      const entries=[
        ...(state?.blocks||[]).filter(b=>b.date===today).map(b=>b.title),
        ...(state?.tasks||[]).filter(t=>!t.completed).map(t=>t.title)
      ].map(v=>String(v||'').trim()).filter(v=>v&&v.length<=90);
      personalTasks=[...new Set(entries)].slice(0,40);
      if(snapshot)drawSnapshot();
    }catch{personalTasks=[];}
  }

  function liveSeconds(m,now){
    let value=seconds(m.seconds);
    if(m.studying){
      const updated=Date.parse(snapshot?.server_now||'');
      const end=Date.parse(m.active_end_at||'');
      const until=Math.min(now,Number.isFinite(end)?end:now);
      if(Number.isFinite(updated)&&until>updated)value+=Math.floor((until-updated)/1000);
    }
    return value;
  }
  function isAtDesk(m,now){
    const last=Date.parse(m.last_seen_at||'');
    return !Number.isFinite(last)||now-last<75000;
  }
  function memberWorking(m,now){
    const end=Date.parse(m.active_end_at||'');
    return !!m.studying&&(!Number.isFinite(end)||now<end);
  }
  function deskMarkup(m,index,working,online){
    const avatar=(m.user_id||m.username||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%5;
    const state=online?(working?'working':'resting'):'away';
    return '<div class="sr-desk-scene sr-desk-'+state+' sr-outfit-'+avatar+'" aria-hidden="true">'
      +'<span class="sr-scene-stars">✦</span><div class="sr-scene-window"><span></span><span></span></div>'
      +'<div class="sr-scene-chair"></div>'
      +(online?'<div class="sr-avatar"><div class="sr-avatar-hair"></div><div class="sr-avatar-head"><i></i><b></b></div>'
      +'<div class="sr-avatar-body"></div><div class="sr-avatar-arm"></div></div>':'<span class="sr-vacant">🪑</span>')
      +'<div class="sr-scene-table"></div><div class="sr-scene-notebook"><i></i><i></i><i></i></div>'
      +'<div class="sr-scene-coffee"><span></span></div>'
      +'<div class="sr-scene-lamp"><i></i></div>'
      +'</div>';
  }

  function drawSnapshot(){
    if(!snapshot||!active()||!roomId)return;
    const r=snapshot.room,members=Array.isArray(snapshot.members)?snapshot.members:[];
    const free=(r.mode||'shared')==='free',owner=r.owner_id===id();
    const self=members.find(m=>m.user_id===id()),now=Date.now()+skewMs;
    const working=!!self&&memberWorking(self,now);
    const started=free||(r.phase==='focus'&&Date.parse(r.phase_started_at||'')<=now);
    const canStart=!!r.is_active&&!working&&(free||(started&&r.phase==='focus'&&phaseLeft(r,now)>0));
    host.querySelector('[data-sr-room-title]').textContent=r.name;
    host.querySelector('[data-sr-room-mode]').textContent=free?'🌿 SERBEST ÇALIŞMA':'⏳ ORTAK ETÜT';
    const total=members.reduce((sum,m)=>sum+seconds(m.seconds),0);
    host.querySelector('[data-sr-room-meta]').textContent=(free?'Serbest odak':'Ortak etüt')
      +' · '+members.length+' kişi · '+r.focus_minutes+' dk / '+r.break_minutes+' dk'
      +' · '+duration(total)+' toplam';
    host.querySelector('[data-sr-invite]').textContent=r.invite_code;
    host.querySelector('[data-sr-member-count]').textContent='('+members.length+'/30)';
    const taskOptions=personalTasks.map(t=>'<option value="'+E(t)+'">'+E(t)+'</option>').join('');
    const taskPicker='<label class="sr-task-pick">Bu oturumda tek hedefim<input class="sx-intent" data-sx-intent maxlength="90" placeholder="Örn. Dinamikten iki test" value="'+E(selectedTask)+'"></label><label class="sr-task-pick sx-task-select">Planımdan seç'
      +'<select data-sr-task><option value="">Görev seçmeden çalış</option>'+taskOptions+'</select>'
      +'</label>';
    const hint=free
      ?'Kendi '+r.focus_minutes+' dakikalık etüdünü istediğin zaman başlat.'
      :r.phase==='break'?'Moladasınız · süre sayılmaz'
      :r.phase==='idle'?'Oda sahibinin etüdü başlatmasını bekle'
      :!started?'Ortak etüt için geri sayım başladı'
      :phaseLeft(r,now)===0?'Ortak etüt süresi tamamlandı.':'Kendi etüdünü başlat; süre kaldığı yerden sayılır.';
    const personalHtml=!r.is_active
      ?'<div class="sr-muted">Bu oda kapatıldı. Önceki sürelerin kayıtlı.</div>'
      :working
        ?'<div class="sr-working-chip">✦ Etütte</div>'
          +'<button class="sr-button-stop" type="button" data-sr-action="stop">⏹ Etüdü bitir</button>'
        :taskPicker
          +'<button class="primary-btn sr-cta" type="button" data-sr-action="start" '+(canStart?'':'disabled')+'>▶ Çalışmaya başla</button>'
          +'<small class="sr-action-hint">'+hint+'</small>';
    const personalKey=JSON.stringify([working,canStart,r.is_active,r.mode,r.phase,personalTasks]);
    if(personalKey!==lastPersonalKey){
      lastPersonalKey=personalKey;
      host.querySelector('[data-sr-personal-actions]').innerHTML=personalHtml;
    }
    const picker=host.querySelector('[data-sr-task]');
    if(picker)picker.value=selectedTask;
    let actions='';
    if(owner&&r.is_active){
      actions='<div class="sr-owner-title">Oda kontrolleri</div>';
      if(!free)actions+='<div class="sr-owner-buttons">'
        +'<button type="button" class="secondary-btn" data-sr-action="focus">📖 Yeni etüt</button>'
        +'<button type="button" class="secondary-btn" data-sr-action="break">☕ Mola ver</button>'
        +'<button type="button" class="secondary-btn" data-sr-action="idle">⏸ Turu durdur</button></div>';
      if(r.phase==='idle')actions+='<form data-sr-form="settings" class="sr-settings">'
        +'<label>Etüt (dk)<input name="focus" type="number" min="5" max="180" value="'+Number(r.focus_minutes)+'" required></label>'
        +'<label>Mola (dk)<input name="break" type="number" min="1" max="60" value="'+Number(r.break_minutes)+'" required></label>'
        +'<label class="sr-settings-mode">Çalışma biçimi<select name="mode" class="sr-mode-select">'
        +'<option value="shared" '+(free?'':'selected')+'>⏳ Ortak etüt</option>'
        +'<option value="free" '+(free?'selected':'')+'>🌿 Serbest çalışma</option>'
        +'</select></label>'
        +'<button type="submit" class="secondary-btn">Ayarları kaydet</button></form>';
      
    }
    const ownerArea=host.querySelector('[data-sr-owner-actions]');
    ownerArea.innerHTML=actions;ownerArea.hidden=!actions;
    const roster=members.slice().sort((a,b)=>Number(memberWorking(b,now))-Number(memberWorking(a,now))||a.username.localeCompare(b.username,'tr'));
    // Avoid re-creating animated characters on every 12-second sync.
    const rosterKey=JSON.stringify({mode:r.mode,phase:r.phase,
      friends:roster.map(m=>[m.user_id,m.username,
        memberWorking(m,now),isAtDesk(m,now),m.task_title])});
    if(rosterKey!==lastRosterKey){
      lastRosterKey=rosterKey;
      host.querySelector('[data-sr-roster]').innerHTML=roster.map((m,i)=>{
      // Backgrounded phones can keep a valid focus session while WebKit suspends presence pings.
      const inClass=memberWorking(m,now)||isAtDesk(m,now),atWork=inClass&&memberWorking(m,now);
      const label=!inClass?'Uzakta':atWork?'Etütte':!free&&r.phase==='break'?'Molada':'Masada';
      const task=atWork&&m.task_title?'<small class="sr-person-task">✎ '+E(m.task_title)+'</small>':'';
      return '<article data-sr-user="'+E(m.user_id)+'" class="sr-person '+(atWork?'sr-person-working ':'')+(inClass?'':'sr-person-away')+'">'
        +deskMarkup(m,i,atWork,inClass)
        +'<div class="sr-person-info"><strong>'+E(m.username)+(m.user_id===id()?' <span class="sr-me">sen</span>':'')+'</strong>'
        +'<small>'+label+'</small>'
        +task+'<span data-sr-member-time="'+E(m.user_id)+'">'+duration(liveSeconds(m,now))+'</span></div></article>';
      }).join('');
    }
    host.querySelector('[data-sr-footer]').innerHTML=r.is_active
      ?owner?'<button type="button" class="sr-link-danger" data-sr-action="close">Odayı kapat</button>'
        :'<button type="button" class="sr-link-danger" data-sr-action="leave">Odadan ayrıl</button>'
      :'<span class="sr-muted">Oda kapatıldı.</span>';
    window.HakunaRoomExperience?.mount(host,snapshot,id());
    window.HakunaRoomExperience?.update(snapshot,now);
    tick();
  }
  function tick(){
    if(!snapshot||!active()||!roomId)return;
    const r=snapshot.room,now=Date.now()+skewMs,free=(r.mode||'shared')==='free';
    const self=snapshot.members?.find(m=>m.user_id===id()),working=!!self&&memberWorking(self,now);
    const end=Date.parse(self?.active_end_at||'');
    const left=free
      ?working&&Number.isFinite(end)?Math.max(0,Math.ceil((end-now)/1000)):Number(r.focus_minutes)*60
      :phaseLeft(r,now);
    const full=seconds(r.focus_minutes*60);
    const phaseTotal=free?full:seconds((r.phase==='break'?r.break_minutes:r.focus_minutes)*60);
    const pct=free&&!working?0:free?100*(1-left/Math.max(1,full)):
      r.phase==='idle'?0:100*(1-left/Math.max(1,phaseTotal));
    const ring=host.querySelector('[data-sr-ring]');
    if(ring)ring.style.setProperty('--sr-degrees',Math.max(0,Math.min(360,pct*3.6))+'deg');
    const label=host.querySelector('[data-sr-phase]'),timer=host.querySelector('[data-sr-clock]');
    const note=host.querySelector('[data-sr-clock-note]'),icon=host.querySelector('[data-sr-ring-icon]');
    const startAt=Date.parse(r.phase_started_at||'');
    const countdown=!free&&r.phase==='focus'&&Number.isFinite(startAt)&&now<startAt;
    if(label)label.textContent=!r.is_active?'Oda kapalı':free?working?'Odak':'Hazır':countdown?'Başlıyor':r.phase==='idle'?'Hazır':left===0?'Tamamlandı':r.phase==='focus'?'Odak':'Mola';
    if(timer)timer.textContent=displayClock(left);
    if(note)note.textContent=free?'Kendi ritminde':r.phase==='idle'?'Tur bekleniyor':countdown?'3 · 2 · 1':left===0?'Tur tamamlandı':r.phase==='focus'?'Sessizce devam':'Dinlen';
    if(icon)icon.textContent=(free?working:r.phase==='focus'&&left>0)?'✎':r.phase==='break'&&!free?'☕':'☾';
    if(ring)ring.classList.toggle('sr-ring-active',free?working:r.phase==='focus'&&left>0);
    const own=host.querySelector('[data-sr-own-status]');
    if(own)own.textContent=(working?'Süren sayılıyor · ':'Çalışman · ')
      +duration(self?liveSeconds(self,now):0);
    for(const m of snapshot.members||[]){
      const node=host.querySelector('[data-sr-member-time="'+m.user_id+'"]');
      if(node)node.textContent=duration(liveSeconds(m,now));
    }
    const countdownNode=host.querySelector('[data-sr-countdown]');
    if(countdownNode&&!starting){
      countdownNode.hidden=!countdown;
      if(countdown){const num=countdownNode.querySelector('[data-sr-countdown-num]');if(num)num.textContent=Math.max(1,Math.ceil((startAt-now)/1000));}
    }
    window.HakunaRoomExperience?.update(snapshot,now);
    host.classList.toggle('sr-timer-ended',!free&&r.phase!=='idle'&&left===0);
  }

  async function startWithCountdown(button){
    if(starting||busy||!snapshot||!roomId)return;
    const ticket=epoch,room=roomId;
    starting=true;busy=true;button.disabled=true;
    const panel=host.querySelector('[data-sr-countdown]');
    if(panel)panel.hidden=false;
    try{
      for(let n=3;n>=1;n--){
        if(ticket!==epoch||!active()||room!==roomId)return;
        const number=panel?.querySelector('[data-sr-countdown-num]');
        if(number){number.textContent=String(n);number.classList.remove('sr-countdown-beat');void number.offsetWidth;number.classList.add('sr-countdown-beat');}
        await new Promise(resolve=>{
          countdownResolve=resolve;
          countdownTimeout=setTimeout(()=>{countdownResolve=null;resolve();},880);
        });
      }
      if(ticket!==epoch||room!==roomId||!active())return;
      if(panel)panel.hidden=true;
      notice('Etüdün başlatılıyor…');
      await rpc('study_room_start',{p_room_id:room,p_task_title:selectedTask||null});
      if(ticket===epoch&&room===roomId&&active())await loadRoom();
    }catch(error){
      if(ticket===epoch&&room===roomId&&active())notice(error?.message||'Etüt başlatılamadı.',true);
    }finally{
      if(ticket===epoch&&room===roomId&&active()){
        if(panel)panel.hidden=true;
        starting=false;busy=false;
        if(button.isConnected)button.disabled=false;
      }
    }
  }
  async function act(action,button){
    if(action==='atmosphere'){
      if(!THEMES.has(button.dataset.theme)||!roomId)return;
      spaceTheme=button.dataset.theme;
      try{localStorage.setItem('hakuna.studyRooms.atmosphere',spaceTheme);}catch{}
      applyPersonalSpace();return;
    }
    if(action==='zen'){
      if(!roomId)return;
      spaceZen=!spaceZen;
      try{localStorage.setItem('hakuna.studyRooms.quiet',spaceZen?'1':'0');}catch{}
      applyPersonalSpace();return;
    }
    if(busy)return;
    if(action==='back'){showLobby();return;}
    if(action==='refresh'){void loadLobby();return;}
    if(action==='login'){window.HakunaAccount?.open?.('login');return;}
    if(action==='open'){openRoom(button.dataset.id);return;}
    if(action==='copy'){if(snapshot)void copy(inviteUrl(snapshot.room.invite_code));return;}
    if(!roomId)return;
    if(action==='start'){void startWithCountdown(button);return;}
    let name=null,args={p_room_id:roomId};
    if(action==='stop')name='study_room_stop';
    else if(['focus','break','idle'].includes(action)){name='study_room_set_phase';args.p_phase=action;}
    else if(action==='leave'){
      if(!confirm('Bu odadan ayrılmak istiyor musun?'))return;
      name='study_room_leave';
    }else if(action==='close'){
      if(!confirm('Odayı kapatırsan devam eden etütler biter ve kimse yeni etüt başlatamaz. Emin misin?'))return;
      name='study_room_close';
    }
    if(!name)return;
    busy=true;button.disabled=true;notice('İşlem kaydediliyor…');
    try{
      await rpc(name,args);
      if(action==='leave'||action==='close')showLobby();
      else {await loadRoom();if(action==='stop')window.HakunaRoomExperience?.finish();}
    }catch(error){notice(error?.message||'İşlem tamamlanamadı.',true);}
    finally{busy=false;if(button.isConnected)button.disabled=false;}
  }
  async function submit(form){
    if(busy)return;
    const type=form.dataset.srForm,fd=new FormData(form);
    let name,args;
    if(type==='create'){
      name='study_room_create_v2';
      args={p_name:String(fd.get('name')||'').trim(),p_focus_minutes:Number(fd.get('focus')),p_break_minutes:Number(fd.get('break')),p_mode:String(fd.get('mode')||'shared')};
    }else if(type==='join'){
      name='study_room_join';args={p_invite_code:String(fd.get('code')||'').trim().toUpperCase()};
    }else if(type==='settings'&&roomId){
      name='study_room_configure';args={p_room_id:roomId,p_focus_minutes:Number(fd.get('focus')),p_break_minutes:Number(fd.get('break')),p_mode:String(fd.get('mode')||'shared')};
    }else return;
    const btn=form.querySelector('[type=submit]');busy=true;if(btn)btn.disabled=true;notice('Kaydediliyor…');
    try{
      const result=await rpc(name,args);
      if(type==='settings')await loadRoom();
      else openRoom(result);
    }catch(error){notice(error?.message||'Kaydetme işlemi başarısız.',true);}
    finally{busy=false;if(btn?.isConnected)btn.disabled=false;}
  }
  function render(view){
    leaveView();host=view;host.dataset.studyRooms='1';lastUser=id();loadPersonalSpace();
    host.onclick=e=>{
      const b=e.target.closest('[data-sr-action]');
      if(b&&host.contains(b))void act(b.dataset.srAction,b);
    };
    host.oninput=e=>{if(e.target?.matches?.('[data-sx-intent]'))selectedTask=String(e.target.value||'').slice(0,90);};
    host.onchange=e=>{
      if(e.target?.matches?.('[data-sr-task]')){selectedTask=String(e.target.value||'');const input=host.querySelector('[data-sx-intent]');if(input)input.value=selectedTask;}
    };
    host.onsubmit=e=>{
      const form=e.target.closest('[data-sr-form]');
      if(form&&host.contains(form)){e.preventDefault();void submit(form);}
    };
    if(!lastUser){host.innerHTML=loginMarkup();return;}
    showLobby();
  }
  window.addEventListener('hakuna-account-changed',()=>{
    if(active()&&lastUser!==id())render(host);
  });
  window.addEventListener('online',()=>{if(active()){if(roomId)void loadRoom();else void loadLobby();}});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&active()){if(roomId){void touchRoom();void loadRoom();}else void loadLobby();tick();}
  });
  window.HakunaStudyRooms=Object.freeze({render,leaveView,
    utils:Object.freeze({duration,displayClock,phaseLeft,phaseEnd})});
})();
