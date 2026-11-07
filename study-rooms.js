/* Hakuna Study Rooms: independent UI, authenticated server-side accounting. */
(() => {
  'use strict';
  let host=null,roomId=null,snapshot=null,unsubscribe=null,poll=null,clock=null;
  let loading=false,busy=false,epoch=0,skewMs=0,lastUser=null,realtimeDelay=null;
  let heartbeat=null,starting=false,countdownTimeout=null,countdownResolve=null;
  let lastRosterKey='',lastPersonalKey='';
  const E=(value='')=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const id=()=>window.HakunaAccount?.info?.().id||null;
  const rpc=(name,args={})=>{
    if(!window.HakunaAccount?.roomRpc)throw new Error('Hesap bağlantısı henüz hazır değil. Yeniden dene.');
    return window.HakunaAccount.roomRpc(name,args);
  };
  const chairLevels=[
    [0,'Ahşap sandalye'],[10,'Demir koltuk'],[20,'Altın koltuk'],[30,'Kadife koltuk'],
    [40,'Obsidyen taht'],[50,'Kral tahtı'],[65,'Yakut taht'],[85,'Zümrüt taht'],
    [110,'Safir taht'],[150,'Ay tahtı'],[220,'Güneş tahtı'],[320,'İmparator tahtı']
  ];
  function chairLevel(value){
    const hours=seconds(value)/3600;
    let level=0;
    while(level+1<chairLevels.length&&hours>=chairLevels[level+1][0])level++;
    return level;
  }
  function chairGuide(){
    const rows=chairLevels.map(([hours,label],index)=>{
      const next=chairLevels[index+1];
      const range=next?hours+'–'+next[0]+' sa':hours+' sa ve üzeri';
      return '<li><span>'+label+'</span><span>'+range+'</span></li>';
    }).join('');
    return '<details class="sr-chair-guide"><summary aria-label="Sandalye seviyeleri"><span aria-hidden="true">?</span></summary><div><strong>Sandalye seviyeleri</strong><p>Bu odadaki toplam çalışma süren</p><ul>'+rows+'</ul></div></details>';
  }
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
    clearLoops();epoch++;host=null;roomId=null;snapshot=null;busy=false;
  }
  function notice(message,isError=false){
    const n=host?.querySelector('[data-sr-notice]');
    if(!n)return;
    n.textContent=message||'';
    n.classList.toggle('sr-error',!!isError);
    n.hidden=!message;
  }
  async function copy(value,label='Bağlantı'){
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
      else{
        const input=document.createElement('textarea');
        input.value=value;input.style.position='fixed';input.style.opacity='0';
        document.body.append(input);input.select();
        if(!document.execCommand('copy'))throw new Error('Kopyalanamadı');
        input.remove();
      }
      notice(label+' kopyalandı ✓');
    }catch{notice('Kopyalanamadı. Davet kodunu elle paylaşabilirsin.',true);}
  }
  function inviteUrl(code){
    const url=new URL(location.pathname,location.origin);
    url.searchParams.set('room',code);
    return url.toString();
  }
  function lobbyMarkup(){
    return '<div class="sr-shell sr-lobby">'
      +'<div class="sr-lobby-entry"><button type="button" class="primary-btn" data-sr-action="entry-create">Oda aç</button><button type="button" class="secondary-btn" data-sr-action="entry-join">Koda katıl</button></div>'
      +'<form hidden class="sr-panel sr-lobby-form" data-sr-form="create">'
      +'<label>Oda adı<input name="name" type="text" maxlength="60" minlength="3" placeholder="Örn. Kütüphane Ekibi" autocomplete="off" required></label>'
      +'<button type="submit" class="primary-btn">Aç</button></form>'
      +'<form hidden class="sr-panel sr-lobby-form" data-sr-form="join">'
      +'<label>Davet kodu<input name="code" type="text" maxlength="32" placeholder="K7MP-4X9R" autocapitalize="characters" autocomplete="off" spellcheck="false" required></label>'
      +'<button type="submit" class="primary-btn">Katıl</button></form>'
      +'<button type="button" class="sr-wardrobe-entry" data-sr-action="wardrobe"><span class="sr-wardrobe-icon" aria-hidden="true">✦</span><span><strong>Gardırop</strong><small>Karakterini düzenle</small></span><span aria-hidden="true">→</span></button>'
      +'<div class="sr-section-head"><h3>Odalarım</h3></div>'
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
  function showEntry(type, focus=true){
    for(const form of host.querySelectorAll('.sr-lobby-form')){
      form.hidden=form.dataset.srForm!==type;
      if(!form.hidden&&focus)form.querySelector('input').focus();
    }
  }
  function showLobby(){
    document.body.classList.remove('sr-immersed');
    clearLoops();roomId=null;snapshot=null;epoch++;
    if(!active())return;
    host.innerHTML=lobbyMarkup();
    const code=(new URLSearchParams(location.search).get('room')||'').replace(/[\s-]/g,'').toUpperCase();
    if(code&&/^(?:[A-F0-9]{18}|[2-9A-HJ-NP-Z]{8})$/.test(code)){
      const inp=host.querySelector('[name=code]');if(inp){inp.value=code;showEntry('join',false);}
    }
    void loadLobby();
  }
  async function loadLobby(){
    if(!active()||roomId||loading)return;
    const ticket=epoch;loading=true;
    try{
      const data=await rpc('study_room_overview');
      if(ticket!==epoch||!active()||roomId)return;
      const items=Array.isArray(data.rooms)?data.rooms:[];
      window.HakunaRoomNotifications?.syncRooms?.(items);
      host.querySelector('[data-sr-list]').innerHTML=items.length?items.map(r=>
        '<div class="sr-room-list-row"><button class="sr-room-item" type="button" data-sr-action="open" data-id="'+E(r.id)+'">'
        +'<span class="sr-room-bubble">📚</span><span class="sr-room-info"><strong>'+E(r.name)+'</strong>'
        +'<small>'+Number(r.member_count)+' üye'+(r.studying?' · Çalışıyorsun':'')+'</small>'
        +'<span class="sr-room-times"><span>Bugün <b data-room-today>'+duration(r.today_seconds)+'</b></span>'
        +'<span>Toplam <b data-room-total>'+duration(r.total_seconds)+'</b></span></span></span>'
        +'<span class="sr-room-go">Giriş →</span></button>'+(r.owner_id===id()?'<button type="button" class="sr-link-danger" data-sr-action="delete-room" data-id="'+E(r.id)+'">Odayı sil</button>':'')+'</div>'
      ).join(''):'<div class="sr-empty">Henüz odan yok. Bir oda kur veya arkadaşının davet kodunu gir. 🌱</div>';
      notice('');
      const url=new URL(location.href),target=items.find(r=>r.invite_code===url.searchParams.get('room'));
      if(target){url.searchParams.delete('room');history.replaceState(null,'',url);openRoom(target.id);}
    }catch(error){
      if(ticket===epoch&&active()){const list=host.querySelector('[data-sr-list]');if(list)list.textContent='Odalar alınamadı.';notice(error?.message||'Bağlantı hatası',true);}
    }finally{if(ticket===epoch)loading=false;}
  }
  function roomMarkup(){
    return '<div class="sr-shell sr-room" data-atmosphere="night">'
      +'<header class="sr-room-header"><button type="button" class="secondary-btn" data-sr-action="back">← Odalar</button>'
      +'<div class="sr-room-heading"><span class="sr-kicker" data-sr-room-mode>SESSİZ ODA</span><h2 data-sr-room-title>Oda açılıyor…</h2>'
      +'<div class="sr-room-sub" data-sr-room-meta></div></div>'
      +'<div class="sr-space-tools"><span class="sx-weather" data-sx-weather>Elazığ · Hava yükleniyor</span>'
      +'</div>'
      +'<details class="sr-invite"><summary>+ Davet</summary><span data-sr-invite>••••••••</span><button type="button" data-sr-action="copy-code" class="secondary-btn">Kodu kopyala</button><button type="button" data-sr-action="copy" class="secondary-btn">Bağlantıyı kopyala</button></details></header>'
      +'<div class="sr-room-grid"><section class="sr-session-card">'
      +'<div class="sr-phase-label" data-sr-phase>Hazırlanıyor</div>'
      +'<div class="sr-focus-ring" data-sr-ring><div class="sr-ring-core"><span class="sr-ring-icon" data-sr-ring-icon>☾</span>'
      +'<strong data-sr-clock>00:00:00</strong><small data-sr-clock-note></small></div></div>'
      +'<div data-sr-own-status class="sr-own-status"></div>'
      +'<div data-sr-personal-actions class="sr-action-area"></div>'
      +'<div data-sr-owner-actions class="sr-owner-area"></div></section>'
      +'<section class="sr-friends"><div class="sr-section-head"><h3>Masalar <span data-sr-member-count></span></h3></div>'
      +'<div class="sr-roster" data-sr-roster><div class="sr-loading">Yükleniyor…</div></div></section></div>'
      +'<div class="sr-room-footer" data-sr-footer></div>'+chairGuide()
      +'<div class="sr-countdown" data-sr-countdown hidden aria-live="assertive"><div class="sr-countdown-inner"><div>ETÜT BAŞLIYOR</div><strong data-sr-countdown-num>3</strong></div></div>'
      +'<p class="sr-note" data-sr-notice hidden role="status"></p></div>';
  }
  function openRoom(next){
    if(!active())return;
    clearLoops();roomId=next;snapshot=null;epoch++;host.innerHTML=roomMarkup();window.scrollTo(0,0);
    document.body.classList.add('sr-immersed');window.HakunaRoomWeather?.update(Date.now()+skewMs);
    void loadRoom();void touchRoom();
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
      if(!data.members?.some(member=>member.user_id===id()&&member.studying)) {
        void window.HakunaRoomNotifications?.closeAndroidRoom?.(roomId);
      }
      const serverMs=Date.parse(data.server_now);
      if(Number.isFinite(serverMs))skewMs=serverMs-Date.now();
      drawSnapshot();notice('');
    }catch(error){
      if(ticket===epoch&&active())notice(error?.message||'Oda bilgileri alınamadı.',true);
    }finally{if(ticket===epoch)loading=false;}
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
  function deskMarkup(m,working,online,level=0){
    const avatar=(m.user_id||m.username||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%5;
    const state=online?(working?'working':'resting'):'away';
    return '<div class="sr-desk-scene sr-desk-'+state+' sr-outfit-'+avatar+'" aria-hidden="true">'
      +'<span class="sr-scene-stars">✦</span><div class="sr-scene-window"><span></span><span></span></div>'
      +'<div class="sr-scene-chair" data-chair-level="'+level+'"></div>'
      +(online?window.HakunaRoomWardrobe.character(m.look):'<span class="sr-vacant">🪑</span>')
      +'<div class="sr-scene-table"></div><div class="sr-scene-notebook"><i></i><i></i><i></i></div>'
      +'<div class="sr-scene-coffee"><span></span></div>'
      +'<div class="sr-scene-lamp"><i></i></div>'
      +'</div>';
  }

  async function openWardrobe(trigger){
    if(roomId||trigger.disabled||host.querySelector('.sr-wardrobe'))return;
    const owner=id(),ticket=epoch;
    trigger.disabled=true;
    try{
      const look=await window.HakunaAccount.roomLoadLook();
      if(owner!==id()||ticket!==epoch||!active()||roomId)return;
      showWardrobe(look,owner,ticket);
    }catch(error){
      if(ticket===epoch)notice(error?.message||'Gardırop yüklenemedi.',true);
    }finally{
      trigger.disabled=false;
    }
  }

  function showWardrobe(look,owner,ticket){
    const {catalog,normalize}=window.HakunaRoomWardrobe;
    const selected=normalize(look);
    const groups=[
      {label:'Kıyafet',slots:['top']},
      {label:'Aksesuar',slots:['head','face','neck','hand']},
      {label:'Karakter',slots:['hair','skin']}
    ];
    const dialog=document.createElement('dialog');
    dialog.className='sr-wardrobe';
    dialog.setAttribute('aria-label','Gardırop');
    const choice=slot=>{
      const {label,items}=catalog[slot];
      const fallback=slot==='skin'||slot==='hair'?'Varsayılan':slot==='top'?'Sade':'Yok';
      return '<label>'+E(label)+'<select name="'+slot+'"><option value="">'+fallback+'</option>'+
        Object.entries(items).map(([key,name])=>
          '<option value="'+key+'"'+(selected[slot]===key?' selected':'')+'>'+E(name)+'</option>'
        ).join('')+'</select></label>';
    };
    const tabs=groups.map(({label},i)=>'<button type="button" data-wardrobe-tab="'+i+'" aria-pressed="'+(i===0)+'">'+label+'</button>').join('');
    const panels=groups.map(({slots},i)=>'<div class="sr-wardrobe-fields" data-wardrobe-panel="'+i+'"'+(i?' hidden':'')+'>'+slots.map(choice).join('')+'</div>').join('');
    dialog.innerHTML='<form><h2>Gardırop</h2><div class="sr-wardrobe-preview"></div>'+
      '<div class="sr-wardrobe-tabs" role="group" aria-label="Gardırop kategorileri">'+tabs+'</div>'+
      panels+'<p role="alert"></p>'+
      '<div class="sr-wardrobe-actions"><button type="button" class="secondary-btn" data-wardrobe-close>Vazgeç</button>'+
      '<button type="submit" class="primary-btn">Kaydet</button></div></form>';
    const form=dialog.querySelector('form');
    const readLook=()=>normalize(Object.fromEntries(new FormData(form)));
    const preview=()=>{dialog.querySelector('.sr-wardrobe-preview').innerHTML=deskMarkup(
      {user_id:owner,look:readLook()},true,true
    );};
    form.addEventListener('change',preview);
    for(const tab of dialog.querySelectorAll('[data-wardrobe-tab]')){
      tab.addEventListener('click',()=>{
        for(const other of dialog.querySelectorAll('[data-wardrobe-tab]'))other.setAttribute('aria-pressed',String(other===tab));
        for(const panel of dialog.querySelectorAll('[data-wardrobe-panel]'))panel.hidden=panel.dataset.wardrobePanel!==tab.dataset.wardrobeTab;
      });
    }
    dialog.querySelector('[data-wardrobe-close]').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const button=form.querySelector('[type=submit]');
      if(button.disabled)return;
      button.disabled=true;
      try{
        await window.HakunaAccount.roomSaveLook(readLook());
        if(owner===id()&&ticket===epoch)notice('Kombin kaydedildi.');
        if(dialog.open)dialog.close();
      }catch(error){
        dialog.querySelector('[role=alert]').textContent=error?.message||'Kombin kaydedilemedi.';
        button.disabled=false;
      }
    });
    host.append(dialog);
    preview();
    dialog.showModal();
  }

  function drawSnapshot(){
    if(!snapshot||!active()||!roomId)return;
    const r=snapshot.room,members=Array.isArray(snapshot.members)?snapshot.members:[];
    const owner=r.owner_id===id();
    const self=members.find(m=>m.user_id===id()),now=Date.now()+skewMs;
    const working=!!self&&memberWorking(self,now);
    const canStart=!!r.is_active&&!working;
    host.querySelector('[data-sr-room-title]').textContent=r.name;
    host.querySelector('[data-sr-room-mode]').textContent='ÇALIŞMA ODASI';
    const total=members.reduce((sum,m)=>sum+seconds(m.seconds),0);
    host.querySelector('[data-sr-room-meta]').textContent='Ortak etüt'
      +' · '+members.length+' kişi · '+r.focus_minutes+' dk / '+r.break_minutes+' dk'
      +' · '+duration(total)+' toplam';
    host.querySelector('[data-sr-invite]').textContent=r.invite_code.length===8?r.invite_code.slice(0,4)+'-'+r.invite_code.slice(4):r.invite_code;
    host.querySelector('[data-sr-member-count]').textContent='('+members.length+'/30)';
    const personalHtml=!r.is_active
      ?'<div class="sr-muted">Bu oda kapatıldı. Önceki sürelerin kayıtlı.</div>'
      :working
        ?'<button class="sr-button-stop" type="button" data-sr-action="stop">☕ Mola ver</button>'
        :'<button class="primary-btn sr-cta" type="button" data-sr-action="start" '+(canStart?'':'disabled')+'>▶ Çalışmaya başla</button>'
          ;
    const personalKey=JSON.stringify([working,canStart,r.is_active,r.mode,r.phase]);
    if(personalKey!==lastPersonalKey){
      lastPersonalKey=personalKey;
      host.querySelector('[data-sr-personal-actions]').innerHTML=personalHtml;
    }
    let actions='';
    if(owner&&r.is_active){
      actions+='<details class="sx-room-settings"><summary>Oda ayarları</summary><form data-sr-form="rename" class="sr-settings"><label class="sr-settings-mode">Oda adı<input name="name" minlength="3" maxlength="60" value="'+E(r.name)+'" required></label><button type="submit" class="secondary-btn">Adı kaydet</button></form>';
      actions+='</details>';
      
    }
    const ownerArea=host.querySelector('[data-sr-owner-actions]');
    if(ownerArea.dataset.renderKey!==actions){const wasOpen=ownerArea.querySelector('details')?.open;ownerArea.innerHTML=actions;ownerArea.dataset.renderKey=actions;if(wasOpen&&ownerArea.querySelector('details'))ownerArea.querySelector('details').open=true;}ownerArea.hidden=!actions;
    // Rank by the same room total shown on each desk. Ties keep join order.
    const roster=members.slice().sort((a,b)=>liveSeconds(b,now)-liveSeconds(a,now));
    // Avoid re-creating animated characters on every 12-second sync.
    const rosterKey=JSON.stringify({mode:r.mode,phase:r.phase,
      friends:roster.map(m=>[m.user_id,m.username,
        memberWorking(m,now),isAtDesk(m,now),m.look])});
    if(rosterKey!==lastRosterKey){
      lastRosterKey=rosterKey;
      host.querySelector('[data-sr-roster]').innerHTML=roster.map(m=>{
      // Backgrounded phones can keep a valid focus session while WebKit suspends presence pings.
      const inClass=memberWorking(m,now)||isAtDesk(m,now),atWork=inClass&&memberWorking(m,now);
      const label=!inClass?'Uzakta':atWork?'Çalışıyor':'Molada';
      return '<article data-sr-user="'+E(m.user_id)+'" class="sr-person '+(atWork?'sr-person-working ':'')+(inClass?'':'sr-person-away')+'">'
        +deskMarkup(m,atWork,inClass,chairLevel(liveSeconds(m,now)))
        +'<div class="sr-person-info"><strong>'+E(m.username)+(m.user_id===id()?' <span class="sr-me">sen</span>':'')+'</strong>'
        +'<small>'+label+'</small>'
        +'<span data-sr-member-time="'+E(m.user_id)+'">'+duration(liveSeconds(m,now))+'</span></div></article>';
      }).join('');
    }
    host.querySelector('[data-sr-footer]').innerHTML=r.is_active
      ?owner?'<button type="button" class="sr-link-danger" data-sr-action="close">Odayı sil</button>'
        :'<button type="button" class="sr-link-danger" data-sr-action="leave">Odadan ayrıl</button>'
      :'<span class="sr-muted">Oda kapatıldı.</span>';
    window.HakunaRoomExperience?.mount(host,snapshot,id());
    window.HakunaRoomExperience?.update(snapshot,now);
    tick();
  }
  function tick(){
    if(!snapshot||!active()||!roomId)return;
    const r=snapshot.room,now=Date.now()+skewMs;
    const self=snapshot.members?.find(m=>m.user_id===id()),working=!!self&&memberWorking(self,now);
    const began=Date.parse(self?.active_started_at||'');
    const elapsed=self?liveSeconds(self,now):0;
    const left=phaseLeft(r,now),startAt=Date.parse(r.phase_started_at||'');
    const countdown=r.phase==='focus'&&Number.isFinite(startAt)&&now<startAt;
    const ring=host.querySelector('[data-sr-ring]');
    if(ring){ring.style.setProperty('--sr-degrees',(working?360:0)+'deg');ring.classList.toggle('sr-ring-active',working);}
    const timer=host.querySelector('[data-sr-clock]'),icon=host.querySelector('[data-sr-ring-icon]');
    if(timer)timer.textContent=displayClock(elapsed);
    if(icon)icon.textContent=working?'✎':'☾';
    const own=host.querySelector('[data-sr-own-status]');
    if(own)own.textContent=working?'Çalışılıyor · Süren sayılıyor':'Molada';
    for(const m of snapshot.members||[]){
      const node=host.querySelector('[data-sr-member-time="'+m.user_id+'"]');
      const total=liveSeconds(m,now);
      if(node){
        node.textContent=duration(total);
        const chair=node.closest('[data-sr-user]')?.querySelector('[data-chair-level]');
        const level=String(chairLevel(total));
        if(chair&&chair.dataset.chairLevel!==level)chair.dataset.chairLevel=level;
      }
    }
    window.HakunaRoomExperience?.update(snapshot,now);
    host.classList.remove('sr-timer-ended');
  }

  async function startWithCountdown(button){
    if(starting||busy||!snapshot||!roomId)return;
    const ticket=epoch,room=roomId;
    starting=true;busy=true;button.disabled=true;
    const panel=host.querySelector('[data-sr-countdown]');
    if(panel)panel.hidden=false;
    try{
      if(ticket!==epoch||room!==roomId||!active())return;
      if(panel)panel.hidden=true;
      notice('Etüdün başlatılıyor…');
      const code=snapshot.room.invite_code;
      const user=id();
      await rpc('study_room_start',{p_room_id:room});
      if(user===id())window.HakunaRoomNotifications?.started?.(room,code);
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
    if(busy)return;
    if(action==='entry-create'||action==='entry-join'){showEntry(action.slice(6));return;}
    if(action==='wardrobe'){void openWardrobe(button);return;}
    if(action==='back'){showLobby();return;}
    if(action==='refresh'){void loadLobby();return;}
    if(action==='login'){window.HakunaAccount?.open?.('login');return;}
    if(action==='delete-room'){
      if(!confirm('Oda herkes için kapatılıp listeden kaldırılacak. Devam eden etütler bitecek; geçmiş çalışma süreleri korunacak. Odayı silmek istiyor musun?'))return;
      busy=true;button.disabled=true;
      try{await rpc('study_room_close',{p_room_id:button.dataset.id});await loadLobby();}
      catch(error){notice(error?.message||'Oda silinemedi.',true);}
      finally{busy=false;if(button.isConnected)button.disabled=false;}return;
    }
    if(action==='open'){openRoom(button.dataset.id);return;}
    if(action==='copy-code'){if(snapshot)void copy(snapshot.room.invite_code,'Kod');return;}
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
      args={p_name:String(fd.get('name')||'').trim(),p_focus_minutes:50,p_break_minutes:10,p_mode:String(fd.get('mode')||'shared')};
    }else if(type==='join'){
      name='study_room_join';args={p_invite_code:String(fd.get('code')||'').replace(/[\s-]/g,'').toUpperCase()};
    }else if(type==='rename'&&roomId){
      name='study_room_rename';args={p_room_id:roomId,p_name:String(fd.get('name')||'').trim()};
    }else if(type==='settings'&&roomId){
      name='study_room_configure';args={p_room_id:roomId,p_focus_minutes:50,p_break_minutes:10,p_mode:String(fd.get('mode')||'shared')};
    }else return;
    const btn=form.querySelector('[type=submit]');busy=true;if(btn)btn.disabled=true;notice('Kaydediliyor…');
    try{
      const result=await rpc(name,args);
      if(type==='settings'||type==='rename')await loadRoom();
      else openRoom(result);
    }catch(error){notice(error?.message||'Kaydetme işlemi başarısız.',true);}
    finally{busy=false;if(btn?.isConnected)btn.disabled=false;}
  }
  function render(view){
    leaveView();host=view;host.dataset.studyRooms='1';if(navigator.onLine===false){host.innerHTML='<section class="card" data-online-required><div class="card-body"><h2>İnternet bağlantısı gerekiyor</h2><p>Ortak odaları kullanmak için internete bağlan.</p></div></section>';return;}lastUser=id();
    host.onclick=e=>{
      const b=e.target.closest('[data-sr-action]');
      if(b&&host.contains(b))void act(b.dataset.srAction,b);
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
  window.addEventListener('online',()=>{if(active()){if(host.querySelector('[data-online-required]'))render(host);else if(roomId)void loadRoom();else void loadLobby();}});
  window.addEventListener('offline',()=>{if(active())render(host);});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&active()){if(roomId){void touchRoom();void loadRoom();}else void loadLobby();tick();}
  });
  window.navigator?.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='hakuna-study-paused'&&roomId)void loadRoom();});
  window.HakunaStudyRooms=Object.freeze({render,leaveView,
    utils:Object.freeze({duration,displayClock,phaseLeft,phaseEnd,chairLevel})});
})();
