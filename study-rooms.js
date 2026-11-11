/* Hakuna Study Rooms: independent UI, authenticated server-side accounting. */
(() => {
  'use strict';
  let host=null,roomId=null,snapshot=null,unsubscribe=null,poll=null,clock=null;
  let loading=false,busy=false,epoch=0,skewMs=0,lastUser=null,realtimeDelay=null;
  let heartbeat=null,starting=false,countdownTimeout=null,countdownResolve=null;
  let multiStartPending=null;
  let lastRosterKey='',lastPersonalKey='';
  const E=(value='')=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let bootOwner=null,cacheRevision=0,refreshTask=null;
  const accountId=()=>window.HakunaAccount?.info?.().id||null;
  const id=()=>accountId()||bootOwner;
  function cachedRooms(owner){
    const cached=window.HakunaOffline?.roomLaunch?.();
    return cached?.user===owner?cached.entries:[];
  }
  function rememberRoom(owner,data){
    const self=data.members?.find(member=>member.user_id===owner);
    const room=data.room;
    const entries=cachedRooms(owner).filter(entry=>entry.room.id!==room.id);
    if(room.is_active&&self&&memberWorking(self,Date.parse(data.server_now)||Date.now())){
      entries.push({room:{...room,studying:true,member_count:data.members.length,
        today_seconds:self.today_seconds,total_seconds:self.seconds},snapshot:data});
    }
    window.HakunaOffline?.saveRoomLaunch?.(owner,entries);
  }
  async function rpc(name,args={}){
    const owner=accountId(),revision=cacheRevision;
    if(!owner||!window.HakunaAccount?.roomRpc)throw new Error('Hesap bağlantısı henüz hazır değil. Yeniden dene.');
    const data=await window.HakunaAccount.roomRpc(name,args);
    if(owner!==accountId())return data;
    if(name==='study_room_overview'&&revision===cacheRevision){
      const previous=new Map(cachedRooms(owner).map(entry=>[entry.room.id,entry.snapshot]));
      const entries=(data.rooms||[]).filter(room=>room.studying).map(room=>({room,snapshot:previous.get(room.id)}));
      window.HakunaOffline?.saveRoomLaunch?.(owner,entries);
    }else if(name==='study_room_snapshot'&&revision===cacheRevision){
      rememberRoom(owner,data);
    }else if(name==='study_room_start'&&snapshot?.room.id===args.p_room_id&&data.started_at){
      cacheRevision++;
      rememberRoom(owner,{...snapshot,server_now:data.server_now,members:snapshot.members.map(member=>
        member.user_id===owner?{...member,studying:true,active_started_at:data.started_at,active_end_at:data.planned_end_at}:member)});
    }else if(['study_room_stop','study_room_leave','study_room_close'].includes(name)){
      cacheRevision++;
      window.HakunaOffline?.saveRoomLaunch?.(owner,cachedRooms(owner).filter(entry=>entry.room.id!==args.p_room_id));
    }
    return data;
  }
  function refreshLaunch(){
    const owner=accountId();
    if(!owner||!navigator.onLine||refreshTask)return;
    refreshTask=(async()=>{
      await rpc('study_room_overview');
      const entries=cachedRooms(owner);
      if(owner===accountId()&&entries.length===1&&!entries[0].snapshot&&entries[0].room.id!==roomId){
        await rpc('study_room_snapshot',{p_room_id:entries[0].room.id});
      }
    })().catch(()=>{}).finally(()=>{refreshTask=null;});
  }
  const chairLevels=[[0,"Kök oturağı"],[10,"Demir rün"],[20,"Altın mühür"],[30,"Kadife kâhin"],[40,"Obsidyen muhafız"],[50,"Kral tahtı"],[65,"Yakut bekçi"],[85,"Zümrüt koruyucu"],[110,"Safir anıt"],[150,"Ay muhafızı"],[220,"Güneş tahtı"],[320,"İmparator tahtı"]];
  // Hand-drawn fantasy seats; no rectangular monitor-shaped backrests.
  // Distinct vector silhouettes stay behind avatars in the original 119px desk scene.
  const fantasySeats=[{"form":"M35 91 L31 68 Q29 62 34 57 L38 55 L40 44 L50 50 L59 43 L69 52 L77 55 Q83 63 79 70 L77 91 Z","wings":"M34 82 Q22 78 19 68 L27 65 L30 70 M77 82 Q89 78 92 68 L84 65 L80 70","crown":"M50 49 L56 41 L62 49 L56 53 Z","rune":"M47 62 L56 57 L64 63 L56 71 Z","colors":["#66513c","#947154","#dac29c","#ab8762"]},{"form":"M32 92 L31 54 L38 48 L43 48 L46 31 L55 43 L65 29 L69 48 L76 47 L83 55 L81 92 Z","wings":"M32 85 L23 76 L22 58 L30 64 M81 85 L89 76 L89 58 L82 64","crown":"M49 34 L55 20 L61 34 L55 40 Z","rune":"M55 56 L55 77 M46 66 L64 66","colors":["#465766","#7d8f9d","#c4d4dd","#7c9cac"]},{"form":"M31 93 L28 58 Q28 44 40 39 L46 37 L54 29 L64 37 Q81 40 83 57 L81 93 Z","wings":"M29 73 Q18 64 24 48 L34 55 M82 73 Q94 64 88 48 L78 55","crown":"M48 35 Q56 17 64 35 Q56 42 48 35 Z","rune":"M48 59 Q56 50 64 59 M56 53 L56 68","colors":["#89683c","#bfa16e","#f3d9a3","#cca976"]},{"form":"M29 93 Q23 74 28 51 Q32 41 42 40 Q46 29 55 29 Q66 29 70 40 Q80 41 84 52 Q88 74 81 93 Z","wings":"M31 77 C14 70 11 50 29 41 Q20 56 35 61 M80 77 C97 70 100 50 82 41 Q91 56 76 61","crown":"M46 35 Q55 21 64 35 Q55 43 46 35 Z","rune":"M47 58 Q55 49 63 58 Q55 65 47 58 Z","colors":["#724b68","#9f7892","#dbc7d7","#c7a2bb"]},{"form":"M29 94 L24 64 L34 44 L40 48 L51 25 L57 38 L68 20 L74 46 L83 38 L88 62 L83 94 Z","wings":"M31 77 L14 70 L22 51 L31 57 M81 77 L98 70 L90 51 L81 57","crown":"M47 31 L54 15 L60 31 L54 42 Z","rune":"M49 61 L56 51 L64 62 L55 75 Z","colors":["#3f3855","#6b6481","#aca5ca","#9284ba"]},{"form":"M27 93 L26 53 L34 46 L33 30 L45 39 L55 22 L66 39 L77 29 L77 46 L86 53 L85 93 Z","wings":"M29 78 Q13 68 19 43 L34 54 M83 78 Q99 68 93 43 L78 54","crown":"M42 36 L42 22 L49 28 L55 15 L61 28 L69 22 L69 36 Z","rune":"M48 57 L55 49 L62 57 L55 66 Z","colors":["#805345","#ab8065","#f7d7a2","#d49d78"]},{"form":"M25 95 L24 64 L32 45 L37 49 L43 27 L55 37 L66 19 L73 46 L82 39 L89 65 L86 95 Z","wings":"M31 83 L13 69 L21 39 L36 62 M81 83 L99 69 L91 39 L76 62","crown":"M47 34 L55 12 L63 34 L55 41 Z","rune":"M47 61 L55 48 L64 61 L55 75 Z","colors":["#723f55","#a85e78","#efb4b9","#d7789b"]},{"form":"M26 94 Q20 71 31 54 C23 44 33 32 45 39 Q55 16 66 38 C80 30 91 45 81 55 Q92 74 83 94 Z","wings":"M34 81 C12 76 9 54 20 41 Q28 48 35 62 M78 81 C100 76 103 54 92 41 Q84 48 77 62","crown":"M46 32 Q49 17 60 19 Q60 33 49 39 Z","rune":"M49 69 Q50 53 64 49 M53 62 L44 55 M58 56 L68 57","colors":["#315b51","#4c9072","#c0dfc0","#8dcab0"]},{"form":"M27 94 L25 61 L36 40 L43 44 L55 14 L67 44 L75 38 L87 61 L85 94 Z","wings":"M29 81 L13 69 L24 35 L36 61 M81 81 L97 69 L86 35 L74 61","crown":"M48 30 L55 9 L62 30 L55 39 Z","rune":"M46 61 L55 47 L64 61 L55 77 Z M55 47 L55 77","colors":["#355a84","#568ab4","#c5e3f1","#8bb9d7"]},{"form":"M26 95 Q17 70 30 45 C33 35 45 30 54 34 Q67 26 77 43 Q94 65 85 95 Z","wings":"M31 77 C12 65 14 38 30 27 Q23 51 39 58 M80 77 C99 65 97 38 81 27 Q88 51 72 58","crown":"M49 32 Q42 18 53 12 Q44 27 62 24 Q57 37 49 32 Z","rune":"M46 64 Q56 47 66 64 Q56 70 46 64 Z","colors":["#625a83","#9188b2","#e7ddf1","#bea8d8"]},{"form":"M26 96 L25 61 Q25 43 41 38 L45 30 L55 37 L66 30 L70 38 Q87 44 86 62 L85 96 Z","wings":"M28 80 L12 64 L19 49 L29 53 M82 80 L98 64 L91 49 L81 53","crown":"M37 36 L36 26 L46 28 L48 15 L56 25 L64 15 L66 28 L77 26 L75 36 Z","rune":"M48 58 Q55 51 62 58 Q66 66 55 69 Q44 65 48 58 Z","colors":["#986542","#d5a46b","#ffe6b5","#e4bd80"]},{"form":"M22 96 L21 60 L30 49 L33 29 L43 38 L48 21 L55 34 L62 20 L68 38 L78 29 L81 49 L91 60 L89 96 Z","wings":"M30 82 C13 77 8 57 13 36 L28 45 L36 67 M82 82 C99 77 104 57 99 36 L84 45 L76 67","crown":"M38 34 L35 18 L46 26 L55 9 L64 26 L76 18 L73 34 L64 31 L55 38 L46 31 Z","rune":"M55 47 L61 58 L72 60 L62 67 L59 78 L55 70 L51 78 L48 67 L38 60 L49 58 Z","colors":["#79567c","#b493ad","#f9dfaf","#d5acd5"]}];
  function fantasyChairArt(level){
    const model=fantasySeats[Math.min(11,Math.max(0,Number(level)||0))];
    const [dark,mid,light,gem]=model.colors;
    // Solid SVG fills instead of gradients with duplicate ids across 30 user desks.
    return '<svg class="sr-fantasy-seat-art" viewBox="0 0 110 112" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
      +'<ellipse cx="55" cy="105" rx="36" ry="4" fill="#0b1620" opacity=".24"/>'
      +'<path data-seat-part="wings" d="'+model.wings+'" fill="none" stroke="'+dark+'" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
      +'<path d="'+model.wings+'" fill="none" stroke="'+mid+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".94"/>'
      +'<path data-seat-part="back" d="'+model.form+'" fill="'+dark+'" stroke="'+light+'" stroke-width="2.7" stroke-linejoin="round"/>'
      +'<path d="'+model.form+'" fill="none" stroke="'+mid+'" stroke-width="6" stroke-linejoin="round" opacity=".58"/>'
      +'<path d="M38 88 Q32 65 41 53 Q55 47 69 53 Q78 66 72 88 Q55 97 38 88Z" fill="'+mid+'" opacity=".38"/>'
      +'<path d="M40 83 Q38 61 47 57 Q55 53 64 57 Q73 62 70 83" fill="none" stroke="'+light+'" stroke-width="1.4" opacity=".4"/>'
      +'<path data-seat-part="rune" d="'+model.rune+'" fill="none" stroke="'+gem+'" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" opacity=".95"/>'
      +'<path d="'+model.crown+'" data-seat-part="crest" fill="'+gem+'" stroke="'+light+'" stroke-width="1.5" stroke-linejoin="round"/>'
      +'<path d="M24 78 Q18 80 19 90 L27 91 Q32 78 38 77 M86 78 Q93 80 91 90 L83 91 Q79 78 72 77" fill="none" stroke="'+dark+'" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>'
      +'<path d="M24 79 Q18 81 19 87 M86 79 Q92 81 91 87" fill="none" stroke="'+light+'" stroke-width="2.4" opacity=".86" stroke-linecap="round"/>'
      +'<path data-seat-part="seat" d="M30 87 Q55 81 80 87 L85 96 Q55 103 25 96Z" fill="'+mid+'" stroke="'+dark+'" stroke-width="3" stroke-linejoin="round"/>'
      +'<path d="M34 89 Q55 84 76 89" fill="none" stroke="'+light+'" stroke-width="1.4" opacity=".75"/>'
      +'<path d="M35 99 L32 106 M75 99 L78 106" fill="none" stroke="'+dark+'" stroke-width="4" stroke-linecap="round"/>'
      +'</svg>';
  }

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
    clearLoops();epoch++;host=null;roomId=null;snapshot=null;busy=false;bootOwner=null;
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
  function showLobby(initial){
    document.body.classList.remove('sr-immersed');
    clearLoops();roomId=null;snapshot=null;epoch++;
    if(!active())return;
    host.innerHTML=lobbyMarkup();
    const code=(new URLSearchParams(location.search).get('room')||'').replace(/[\s-]/g,'').toUpperCase();
    if(code&&/^(?:[A-F0-9]{18}|[2-9A-HJ-NP-Z]{8})$/.test(code)){
      const inp=host.querySelector('[name=code]');if(inp){inp.value=code;showEntry('join',false);}
    }
    if(initial)paintLobby(initial);
    if(accountId())void loadLobby();
  }
  async function loadLobby(){
    if(!active()||roomId||loading)return;
    const ticket=epoch;loading=true;
    try{
      const data=await rpc('study_room_overview');
      if(ticket!==epoch||!active()||roomId)return;
      const items=Array.isArray(data.rooms)?data.rooms:[];
      window.HakunaRoomNotifications?.syncRooms?.(items);
      paintLobby(items);
      notice('');
      const url=new URL(location.href),target=items.find(r=>r.invite_code===url.searchParams.get('room'));
      if(target){url.searchParams.delete('room');history.replaceState(null,'',url);openRoom(target.id);}
    }catch(error){
      if(ticket===epoch&&active()){const list=host.querySelector('[data-sr-list]');if(list)list.textContent='Odalar alınamadı.';notice(error?.message||'Bağlantı hatası',true);}
    }finally{if(ticket===epoch)loading=false;}
  }
  function paintLobby(items){
    host.querySelector('[data-sr-list]').innerHTML=items.length?items.map(r=>
      '<div class="sr-room-list-row"><button class="sr-room-item" type="button" data-sr-action="open" data-id="'+E(r.id)+'">'
      +'<span class="sr-room-bubble">📚</span><span class="sr-room-info"><strong>'+E(r.name)+'</strong>'
      +'<small>'+Number(r.member_count)+' üye'+(r.studying?' · Çalışıyorsun':'')+'</small>'
      +'<span class="sr-room-times"><span>Bugün <b data-room-today>'+duration(r.today_seconds)+'</b></span>'
      +'<span>Toplam <b data-room-total>'+duration(r.total_seconds)+'</b></span></span></span>'
      +'<span class="sr-room-go">Giriş →</span></button>'+(r.owner_id===id()?'<button type="button" class="sr-link-danger" data-sr-action="delete-room" data-id="'+E(r.id)+'">Odayı sil</button>':'')+'</div>'
    ).join(''):'<div class="sr-empty">Henüz odan yok. Bir oda kur veya arkadaşının davet kodunu gir. 🌱</div>';
  }
  function roomMarkup(){
    return '<div class="sr-shell sr-room" data-atmosphere="night">'
      +'<header class="sr-room-header"><button type="button" class="secondary-btn" data-sr-action="back">← Odalar</button>'
      +'<button type="button" class="secondary-btn sr-room-new" data-sr-action="create-next" aria-label="Yeni oda oluştur">＋ Yeni oda</button>'
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
  function openRoom(next,initial){
    if(!active())return;
    clearLoops();roomId=next;snapshot=null;epoch++;host.innerHTML=roomMarkup();window.scrollTo(0,0);
    document.body.classList.add('sr-immersed');window.HakunaRoomWeather?.update(Date.now()+skewMs);
    if(initial){
      snapshot=initial;
      drawSnapshot();
    }
    if(accountId())connectRoom(next);
    clock=setInterval(tick,1000);
  }
  function connectRoom(next){
    void loadRoom();void touchRoom();
    heartbeat=setInterval(()=>{if(document.visibilityState==='visible')void touchRoom();},25000);
    unsubscribe=window.HakunaAccount?.roomListen?.(roomId,()=>{
      clearTimeout(realtimeDelay);
      realtimeDelay=setTimeout(()=>{if(active()&&roomId===next)void loadRoom();},300);
    })||null;
    poll=setInterval(()=>{if(document.visibilityState==='visible')void loadRoom();},12000);
  }
  async function touchRoom(){
    if(!active()||!roomId||!navigator.onLine||!accountId())return;
    try{await rpc('study_room_touch',{p_room_id:roomId});}catch(error){console.warn('Room presence',error);}
  }
  async function loadRoom(){
    if(!active()||!roomId||loading||!accountId())return;
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
      +'<div class="sr-scene-chair sr-fantasy-seat" data-chair-level="'+level+'">'+fantasyChairArt(level)+'</div>'
      +(online?window.HakunaRoomWardrobe.character(m.look):'')
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
    const {catalog,itemsFor,normalize,featuredHead}=window.HakunaRoomWardrobe;
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
      const {label}=catalog[slot];
      const fallback=slot==='skin'||slot==='hair'?'Varsayılan':slot==='top'?'Sade':'Yok';
      const entries=itemsFor(slot,owner);
      const special=slot==='head'?entries.find(([key])=>key===featuredHead):null;
      const option=([key,name])=>'<option value="'+E(key)+'"'+(selected[slot]===key?' selected':'')+'>'+E(name)+'</option>';
      const normal=entries.filter(([key])=>!special||key!==special[0]).map(option).join('');
      const exclusive=special?option(special):'';
      const select='<label'+(special?' class="sr-wardrobe-head-label"':'')+'>'+E(label)+
        '<select name="'+slot+'"><option value="">'+fallback+'</option>'+exclusive+normal+'</select></label>';
      if(!special)return select;
      return select+'<button type="button" class="sr-wardrobe-exclusive-card" data-wardrobe-featured-head="'+
        E(special[0])+'" aria-pressed="'+(selected[slot]===special[0])+'">'+
        '<span class="sr-wardrobe-exclusive-icon" aria-hidden="true">♡</span>'+
        '<span class="sr-wardrobe-exclusive-copy"><strong>'+E(special[1])+'</strong></span>'+
        '<span class="sr-wardrobe-exclusive-cta">Seç</span></button>';
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
    const featuredButton=dialog.querySelector('[data-wardrobe-featured-head]');
    const syncFeatured=()=>{
      if(!featuredButton)return;
      const isSelected=form.elements.namedItem('head')?.value===featuredHead;
      featuredButton.dataset.selected=String(isSelected);
      featuredButton.setAttribute('aria-pressed',String(isSelected));
      featuredButton.querySelector('.sr-wardrobe-exclusive-cta').textContent=isSelected?'Seçildi':'Seç';
    };
    if(featuredButton)featuredButton.addEventListener('click',()=>{
      const select=form.elements.namedItem('head');
      if(!select)return;
      select.value=featuredHead;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    });
    form.addEventListener('change',()=>{syncFeatured();preview();});
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
    syncFeatured();
    dialog.showModal();
  }

  function drawSnapshot(){
    if(!snapshot||!active()||!roomId)return;
    const r=snapshot.room,members=Array.isArray(snapshot.members)?snapshot.members:[];
    const owner=r.owner_id===id();
    const self=members.find(m=>m.user_id===id()),now=Date.now()+skewMs;
    const working=!!self&&memberWorking(self,now);
    const connected=!!accountId(),canStart=!!r.is_active&&!working&&connected;
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
        ?'<button class="sr-button-stop" type="button" data-sr-action="stop" '+(connected?'':'disabled')+'>☕ Mola ver</button>'
        :'<button class="primary-btn sr-cta" type="button" data-sr-action="start" '+(canStart?'':'disabled')+'>▶ Çalışmaya başla</button>'
          ;
    const personalKey=JSON.stringify([working,canStart,connected,r.is_active,r.mode,r.phase]);
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
        if(chair&&chair.dataset.chairLevel!==level){
          chair.dataset.chairLevel=level;
          chair.innerHTML=fantasyChairArt(Number(level));
        }
      }
    }
    window.HakunaRoomExperience?.update(snapshot,now);
    host.classList.remove('sr-timer-ended');
  }

  async function startInOtherRooms(primaryRoom,owner){
    if(!owner||!window.HakunaRoomPreferences?.startAll?.())return;
    let overview;
    try{
      overview=await rpc('study_room_overview');
    }catch(error){
      console.warn('Other room overview',error);
      if(owner===accountId()&&roomId===primaryRoom&&active())notice('Diğer odalar başlatılamadı.',true);
      return;
    }
    if(owner!==accountId()||!window.HakunaRoomPreferences?.startAll?.())return;
    const targets=(Array.isArray(overview.rooms)?overview.rooms:[])
      .filter(room=>room.id&&room.id!==primaryRoom&&room.is_active!==false&&!room.studying);
    let started=0,failed=0;
    for(const target of targets){
      // The preference and account can change while other rooms are starting.
      if(owner!==accountId()||!window.HakunaRoomPreferences?.startAll?.())break;
      try{
        await rpc('study_room_start',{p_room_id:target.id});
        started++;
      }catch(error){
        failed++;
        console.warn('Other room start',target.id,error);
      }
    }
    if(owner!==accountId())return;
    // The overview cache also feeds offline launch and room-switching state.
    if(started)refreshLaunch();
    if(roomId===primaryRoom&&active()){
      if(failed)notice(failed+' odada başlatılamadı. Diğer odalarını kontrol et.',true);
      else if(started)notice(started+' diğer odada da çalışman başladı ✓');
    }
  }

  async function stopInOtherRooms(primaryRoom,owner){
    if(!owner||!window.HakunaRoomPreferences?.startAll?.())return {stopped:0,failed:0};
    // A rapid stop after start must never leave a late-started room running.
    if(multiStartPending)await multiStartPending;
    if(owner!==accountId()||!window.HakunaRoomPreferences?.startAll?.())return {stopped:0,failed:0};
    let overview;
    try{overview=await rpc('study_room_overview');}
    catch(error){
      console.warn('Other room overview for stop',error);
      return {stopped:0,failed:1};
    }
    if(owner!==accountId()||!window.HakunaRoomPreferences?.startAll?.())return {stopped:0,failed:0};
    const targets=(Array.isArray(overview.rooms)?overview.rooms:[])
      .filter(room=>room.id&&room.id!==primaryRoom&&room.is_active!==false&&room.studying);
    let stopped=0,failed=0;
    for(const target of targets){
      if(owner!==accountId()||!window.HakunaRoomPreferences?.startAll?.())break;
      try{
        await rpc('study_room_stop',{p_room_id:target.id});
        stopped++;
      }catch(error){
        failed++;
        console.warn('Other room stop',target.id,error);
      }
    }
    if(owner===accountId()&&stopped)refreshLaunch();
    return {stopped,failed};
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
      // Start all joined rooms only on opt-in. Keep the fan-out promise so a
      // quick 'Mola ver' can wait for every start before stopping them all.
      if(user===accountId()&&window.HakunaRoomPreferences?.startAll?.()){
        const pending=startInOtherRooms(room,user).catch(error=>console.warn('Other room start',error));
        multiStartPending=pending;
        void pending.then(()=>{if(multiStartPending===pending)multiStartPending=null;});
      }
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
    if(bootOwner&&!accountId()&&!['back','create-next','open','copy','copy-code'].includes(action))return;
    if(action==='entry-create'||action==='entry-join'){showEntry(action.slice(6));return;}
    if(action==='wardrobe'){void openWardrobe(button);return;}
    if(action==='back'){showLobby();return;}
    if(action==='create-next'){
      // Leaving the view never stops active sessions in the current room.
      // Keep the creator in every room; open the new-room form directly.
      showLobby();showEntry('create',false);return;
    }
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
      const stopTogether=action==='stop'&&window.HakunaRoomPreferences?.startAll?.();
      const sourceRoom=roomId,sourceUser=accountId();
      await rpc(name,args);
      const otherStops=stopTogether&&sourceUser===accountId()
        ?await stopInOtherRooms(sourceRoom,sourceUser):null;
      if(action==='leave'||action==='close')showLobby();
      else {
        await loadRoom();
        if(action==='stop'){
          window.HakunaRoomExperience?.finish();
          if(otherStops?.failed)notice(otherStops.failed+' odada mola verilemedi. Odalarını kontrol et.',true);
          else if(otherStops?.stopped)notice(otherStops.stopped+' diğer odada da mola başladı ✓');
        }
      }
    }catch(error){notice(error?.message||'İşlem tamamlanamadı.',true);}
    finally{busy=false;if(button.isConnected)button.disabled=false;}
  }
  async function submit(form){
    if(busy||!accountId())return;
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
  function render(view,launch){
    if(active()&&host===view&&!host.querySelector('[data-online-required]'))return;
    leaveView();host=view;host.dataset.studyRooms='1';if(navigator.onLine===false){host.innerHTML='<section class="card" data-online-required><div class="card-body"><h2>İnternet bağlantısı gerekiyor</h2><p>Ortak odaları kullanmak için internete bağlan.</p></div></section>';return;}bootOwner=launch?.user||null;lastUser=id();
    host.onclick=e=>{
      const b=e.target.closest('[data-sr-action]');
      if(b&&host.contains(b))void act(b.dataset.srAction,b);
    };
    host.onsubmit=e=>{
      const form=e.target.closest('[data-sr-form]');
      if(form&&host.contains(form)){e.preventDefault();void submit(form);}
    };
    if(!lastUser){host.innerHTML=loginMarkup();return;}
    if(launch?.entries.length===1&&launch.entries[0].snapshot){
      const entry=launch.entries[0];
      openRoom(entry.room.id,entry.snapshot);
    }else showLobby(launch?.entries.map(entry=>entry.room));
  }
  window.addEventListener('hakuna-account-changed',()=>{
    if(!active()){refreshLaunch();return;}
    const user=accountId();
    if(bootOwner&&!user&&window.HakunaOffline?.roomLaunch?.()?.user===bootOwner)return;
    if(lastUser!==user){
      const view=host;
      leaveView();
      render(view);
    }else if(bootOwner&&user){
      bootOwner=null;
      if(roomId){drawSnapshot();connectRoom(roomId);refreshLaunch();}else void loadLobby();
    }
  });
  window.addEventListener('online',()=>{if(active()){if(host.querySelector('[data-online-required]'))render(host);else if(roomId)void loadRoom();else void loadLobby();}else refreshLaunch();});
  window.addEventListener('offline',()=>{if(active())render(host);});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible')return;
    if(active()){if(roomId){void touchRoom();void loadRoom();refreshLaunch();}else void loadLobby();tick();}
    else refreshLaunch();
  });
  window.navigator?.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='hakuna-study-paused'&&roomId)void loadRoom();});
  refreshLaunch();
  window.HakunaStudyRooms=Object.freeze({render,leaveView,
    utils:Object.freeze({duration,displayClock,phaseLeft,phaseEnd,chairLevel})});
})();
