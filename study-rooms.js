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
  // Compact fantasy seats: engraved stone, antique alloys, muted gemstones.
  // Each tier changes the silhouette, but never obscures a desk or avatar.
  // A restrained, illustrated fantasy seat — not a luminous wireframe behind the user.
  // The twelve solid silhouettes share the app's muted nighttime palette.
  // Cozy-fantasy progression: a genuine stool becomes a cushioned royal throne.
  // Only tiny, matte magical details on later tiers; art stays behind the avatar.
  const fantasySeats=[{"form":"M17 76 Q50 71 83 76 L83 82 Q50 79 17 82 Z","panel":"M38 85 Q50 83 62 85","crown":"M47 84 L53 84","orn":"M48 85 L52 85","wings":"M19 78 L19 93 M81 78 L81 93","colors":["#755a49","#a98568","#cba486","#aa8164"],"arms":0,"padded":0,"tuft":0,"gem":0,"halo":0},{"form":"M26 84 L26 47 Q50 40 74 47 L74 84 L67 83 L67 53 Q50 48 33 53 L33 83 Z","panel":"M40 55 L40 78 M50 51 L50 78 M60 55 L60 78","crown":"M46 48 Q50 45 54 48","orn":"M48 47 L52 47","wings":"M32 78 L29 82 M68 78 L71 82","colors":["#776053","#a78c74","#d3ad8f","#ad8970"],"arms":0,"padded":0,"tuft":0,"gem":0,"halo":0},{"form":"M27 85 L26 49 Q27 36 50 38 Q73 36 74 49 L73 85 Z","panel":"M37 81 L36 53 Q37 45 50 46 Q63 45 64 53 L63 81 Z","crown":"M47 42 Q50 38 53 42","orn":"M46 58 Q47 52 55 53 Q54 59 46 58 Z","wings":"M29 75 L26 83 M71 75 L74 83","colors":["#785b4b","#8f7585","#cda98d","#a38371"],"arms":0,"padded":1,"tuft":0,"gem":0,"halo":0},{"form":"M26 86 L26 49 Q28 36 38 37 Q50 31 62 37 Q72 36 74 49 L74 86 Z","panel":"M34 81 L33 50 Q34 42 50 42 Q66 42 67 50 L66 81 Z","crown":"M46 39 Q50 35 54 39","orn":"M50 50 L54 55 L50 60 L46 55 Z","wings":"M27 69 Q20 69 20 77 L24 85 M73 69 Q80 69 80 77 L76 85","colors":["#735648","#927986","#d2b28d","#b18c70"],"arms":1,"padded":1,"tuft":0,"gem":0,"halo":0},{"form":"M25 87 L25 48 Q25 31 50 32 Q75 31 75 48 L75 87 Z","panel":"M33 81 L32 48 Q34 39 50 39 Q66 39 68 48 L67 81 Z","crown":"M45 36 Q50 32 55 36","orn":"M46 54 L54 54 M50 49 L50 59","wings":"M26 68 Q17 67 19 77 L24 84 M74 68 Q83 67 81 77 L76 84","colors":["#74564f","#80667c","#c6a38e","#aa8173"],"arms":1,"padded":1,"tuft":1,"gem":0,"halo":0},{"form":"M24 87 L24 45 Q28 31 40 29 Q50 24 60 29 Q72 31 76 45 L76 87 Z","panel":"M33 81 L32 48 Q34 37 50 34 Q66 37 68 48 L67 81 Z","crown":"M46 31 Q50 26 54 31","orn":"M46 51 L50 45 L54 51 L50 57 Z","wings":"M24 68 Q15 65 19 77 L24 84 M76 68 Q85 65 81 77 L76 84","colors":["#765b53","#78657b","#c7ae91","#a98c79"],"arms":1,"padded":1,"tuft":1,"gem":0,"halo":0},{"form":"M23 87 L23 47 Q27 34 38 33 L50 23 L62 33 Q73 34 77 47 L77 87 Z","panel":"M32 81 L31 48 Q32 39 50 32 Q68 39 69 48 L68 81 Z","crown":"M46 29 L50 24 L54 29 L50 32 Z","orn":"M54 45 Q45 47 50 55 Q45 51 47 45","wings":"M23 64 Q14 65 19 78 L24 85 M77 64 Q86 65 81 78 L76 85","colors":["#675267","#75657f","#c7b2aa","#a18c96"],"arms":1,"padded":1,"tuft":1,"gem":0,"halo":0},{"form":"M22 87 L22 45 Q25 33 35 31 Q43 23 50 30 Q57 23 65 31 Q75 33 78 45 L78 87 Z","panel":"M32 81 L31 47 Q34 36 50 35 Q66 36 69 47 L68 81 Z","crown":"M45 31 Q50 25 55 31","orn":"M45 58 Q43 49 53 45 Q57 53 45 58 Z","wings":"M23 65 Q12 63 17 79 Q21 85 27 83 M77 65 Q88 63 83 79 Q79 85 73 83","colors":["#655957","#7b7284","#c8b5a0","#9b8d85"],"arms":1,"padded":1,"tuft":1,"gem":0,"halo":0},{"form":"M21 87 L21 46 Q24 34 36 30 Q44 26 50 18 Q56 26 64 30 Q76 34 79 46 L79 87 Z","panel":"M32 81 L31 47 Q32 35 50 28 Q68 35 69 47 L68 81 Z","crown":"M45 25 L50 18 L55 25 L50 30 Z","orn":"M45 52 L50 45 L55 52 L50 60 Z","wings":"M22 79 Q14 72 15 56 Q17 42 23 35 M78 79 Q86 72 85 56 Q83 42 77 35","colors":["#59616b","#6c788a","#b2c0c6","#879ba7"],"arms":1,"padded":1,"tuft":1,"gem":1,"halo":0},{"form":"M20 87 L20 44 Q23 30 37 27 Q50 16 63 27 Q77 30 80 44 L80 87 Z","panel":"M31 81 L30 45 Q34 32 50 26 Q66 32 70 45 L69 81 Z","crown":"M48 22 Q45 17 52 14 Q48 20 55 22 Q52 27 48 22 Z","orn":"M54 45 Q44 49 50 56 Q44 52 48 44","wings":"M21 82 Q11 78 12 57 L15 32 Q18 28 22 32 M79 82 Q89 78 88 57 L85 32 Q82 28 78 32","colors":["#625c69","#81748d","#d1bbba","#af9aab"],"arms":1,"padded":1,"tuft":1,"gem":1,"halo":0},{"form":"M19 88 L19 44 Q24 29 35 27 Q44 20 50 14 Q56 20 65 27 Q76 29 81 44 L81 88 Z","panel":"M30 82 L29 45 Q34 33 50 25 Q66 33 71 45 L70 82 Z","crown":"M45 19 L50 12 L55 19 L50 24 Z","orn":"M50 43 L52 49 L58 51 L52 53 L50 59 L48 53 L42 51 L48 49 Z","wings":"M20 83 Q9 75 12 53 Q14 35 21 31 M80 83 Q91 75 88 53 Q86 35 79 31","colors":["#766255","#827381","#d8be9e","#b8a38d"],"arms":1,"padded":1,"tuft":1,"gem":1,"halo":1},{"form":"M17 88 L17 43 Q22 28 35 25 L40 20 L46 23 L50 10 L54 23 L60 20 L65 25 Q78 28 83 43 L83 88 Z","panel":"M29 82 L28 45 Q33 31 50 23 Q67 31 72 45 L71 82 Z","crown":"M44 21 L43 15 L48 18 L50 9 L52 18 L57 15 L56 21 Z","orn":"M46 48 Q49 39 54 45 Q49 44 50 52 M47 59 L50 55 L53 59","wings":"M18 85 Q8 78 10 52 Q12 32 22 23 M82 85 Q92 78 90 52 Q88 32 78 23","colors":["#755d68","#85768f","#dfc6ac","#bca1ad"],"arms":1,"padded":1,"tuft":1,"gem":1,"halo":1}];
  function fantasyChairArt(level){
    const model=fantasySeats[Math.min(11,Math.max(0,Number(level)||0))];
    const [wood,velvet,trim,metal]=model.colors;
    const tier=Math.min(11,Math.max(0,Number(level)||0));
    const padded=model.padded;
    const arms=model.arms;
    const quilt=model.tuft;
    const gems=model.gem;
    const halo=model.halo;
    // Tiny details stay visible at normal room scale; do not use glowing gradients.
    return '<svg class="sr-fantasy-seat-art" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
      +'<ellipse cx="50" cy="98" rx="32" ry="2" fill="#14202b" opacity=".22"/>'
      +(halo?'<path d="M26 27 Q50 -2 74 27" stroke="'+trim+'" opacity=".57" stroke-width="1.8" fill="none" stroke-linecap="round"/>':'')
      +'<path d="M32 84 L30 97 M68 84 L70 97" fill="none" stroke="'+wood+'" stroke-width="5" stroke-linecap="round"/>'
      +'<path data-seat-part="wings" d="'+model.wings+'" fill="none" stroke="'+(arms?wood:metal)+'" stroke-width="'+(arms?5:2)+'" opacity="'+(arms?'.92':tier===0?'.68':tier===1?'.55':'.25')+'" stroke-linecap="round" stroke-linejoin="round"/>'
      +(tier>=5?'<path d="'+model.wings+'" fill="none" stroke="'+trim+'" stroke-width="1.1" opacity=".56" stroke-linecap="round"/>':'')
      +'<path data-seat-part="back" d="'+model.form+'" fill="'+wood+'" stroke="#2d3037" stroke-width="2.7" stroke-linejoin="round"/>'
      +'<path d="'+model.form+'" fill="none" stroke="'+trim+'" stroke-width="1.2" stroke-linejoin="round" opacity=".57"/>'
      +(padded?'<path d="'+model.panel+'" fill="'+velvet+'" stroke="'+metal+'" stroke-width="1.25" stroke-linejoin="round"/>'
        +'<path d="'+model.panel+'" fill="none" stroke="'+trim+'" stroke-width=".8" opacity=".32"/>'
        :'<path d="'+model.panel+'" fill="none" stroke="'+trim+'" stroke-width="'+(tier===1?3.2:1)+'" opacity=".58" stroke-linecap="round"/>')
      +(quilt?'<path d="M38 60 L50 69 L62 60 M38 73 L50 62 L62 73" fill="none" stroke="'+trim+'" stroke-width=".65" opacity=".25"/>'
        +'<circle cx="50" cy="67" r="1.4" fill="'+metal+'" opacity=".9"/>':'')
      +'<path data-seat-part="rune" d="'+model.orn+'" fill="none" stroke="'+trim+'" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" opacity="'+(tier<2?'.35':'.86')+'"/>'
      +'<path data-seat-part="crest" d="'+model.crown+'" fill="'+(tier>=8?metal:'none')+'" stroke="'+trim+'" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" opacity="'+(tier<2?'.3':'.85')+'"/>'
      +(gems?'<path d="M16 40 L20 34 L24 40 L20 45 Z M76 40 L80 34 L84 40 L80 45 Z" fill="'+(tier>=10?'#d0b6ca':'#a4b5c6')+'" stroke="'+metal+'" stroke-width="1" opacity=".82"/>':'')
      +(tier===11?'<path d="M50 8 C45 8 44 2 49 1 Q47 5 54 5 Q52 9 50 8 Z" fill="'+trim+'" opacity=".88"/>':'')
      +(arms?'<path d="M28 70 Q22 68 19 74 L19 81 L29 82 L35 77 M72 70 Q78 68 81 74 L81 81 L71 82 L65 77" fill="'+wood+'" stroke="'+metal+'" stroke-width="1.8" stroke-linejoin="round"/>'
        +'<path d="M20 75 L30 75 M70 75 L80 75" fill="none" stroke="'+trim+'" stroke-width="1" opacity=".6"/>':'')
      +'<path data-seat-part="seat" d="M29 83 Q50 79 71 83 Q76 85 74 90 Q50 94 26 90 Q24 85 29 83 Z" fill="'+(padded?velvet:wood)+'" stroke="'+metal+'" stroke-width="1.8" stroke-linejoin="round"/>'
      +'<path d="M32 85 Q50 82 68 85" fill="none" stroke="'+trim+'" stroke-width="1.2" opacity=".65"/>'
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
