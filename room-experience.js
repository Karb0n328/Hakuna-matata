/* Shared room companion and opt-in local ambience. Progress comes from server study totals. */
(()=>{'use strict';
 const plantHours=[12,48,95,150,215,290];
 const bloomDuration=24*60*60*1000;
 function reached(total,hours){
  const value=Number(total);
  return Number.isFinite(value)?hours.filter(hour=>value>=hour*3600).length:0;
 }
 function growth(total){return reached(total,plantHours)}
 function petStage(total,bloomStartedAt,now){
  const bloom=Date.parse(bloomStartedAt);
  if(!Number.isFinite(bloom))return {kind:'plant',stage:growth(total)};
  const secondsLeft=Math.min(bloomDuration/1000,Math.ceil((bloom+bloomDuration-now)/1000));
  if(secondsLeft<=0)return {kind:'dragon',stage:reached(total,[1400,1900])};
  return {kind:'bloom',stage:plantHours.length,secondsLeft};
 }
 function countdown(seconds){
  return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60]
   .map(part=>String(part).padStart(2,'0')).join(':');
 }
 let root=null,uid=null,scope='',desk=false,sound=null,audio=null,nodes=[],volume=.35,listen=null,change=null;
 function soundStop(){for(const n of nodes){try{n.stop?.();n.disconnect?.()}catch{}}nodes=[];sound=null;if(audio){const old=audio;audio=null;void old.close().catch(()=>{})}paintSound()}
 function paintSound(){root?.querySelectorAll('[data-sx-sound]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sxSound===sound)));const state=root?.querySelector('[data-sx-audio-state]');if(state)state.textContent=sound?'Ses açık':'Ses kapalı'}
 async function soundStart(kind){
  if(sound===kind){soundStop();return}
  soundStop();const C=window.AudioContext||window.webkitAudioContext;if(!C){message('Bu tarayıcı ses ortamını desteklemiyor.');return}
  try{
   audio=new C();const current=audio;await current.resume();if(audio!==current||!root?.isConnected)return;
   const length=current.sampleRate*4,buffer=current.createBuffer(1,length,current.sampleRate),values=buffer.getChannelData(0);let brown=0;
   for(let i=0;i<length;i++){const white=Math.random()*2-1;brown=(brown+.02*white)/1.02;values[i]=kind==='rain'?white:brown*3.5}
   const source=current.createBufferSource(),filter=current.createBiquadFilter(),gain=current.createGain();
   source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=kind==='rain'?1600:420;
   gain.gain.value=volume*.16;source.connect(filter);filter.connect(gain);gain.connect(current.destination);source.start();nodes=[source,filter,gain];sound=kind;paintSound();
  }catch{soundStop();message('Ses başlatılamadı. Yeniden dokunabilirsin.')}
 }
 function message(text){const el=root?.querySelector('[data-sx-status]');if(el)el.textContent=text}
 function companionMarkup(){
  return '<div class="sx-companion" data-sx-dragon hidden role="img" aria-label="Minik ejderha">'+
   '<svg viewBox="0 0 180 220" aria-hidden="true"><ellipse cx="91" cy="202" rx="59" ry="8" fill="#17203055"/>'+
   '<g class="sx-dragon-body" stroke="#4f746e" stroke-width="2" stroke-linejoin="round">'+
   '<path d="M111 174c25 4 35-14 24-23 11 1 18 8 16 18-2 14-21 22-38 19z" fill="#7fc2a7"/>'+
   '<path d="M107 153q15-31 34-31-9 8-8 16-11-3-16 18z" fill="#a699d5"/>'+
   '<path d="M74 155q-13-22-27-20 7 7 5 13 9-2 17 12z" fill="#b4a3d9"/>'+
   '<ellipse cx="91" cy="169" rx="33" ry="29" fill="#84c6ac"/><ellipse cx="92" cy="175" rx="19" ry="20" fill="#e5e8b6" stroke="none"/>'+
   '<ellipse cx="73" cy="193" rx="13" ry="7" fill="#79b79e"/><ellipse cx="111" cy="193" rx="13" ry="7" fill="#79b79e"/>'+
   '<path d="m66 120-7-17q10 1 17 11m35 6 8-17q-10 1-17 11" fill="#f0d9ad"/>'+
   '<path d="M54 137q0-26 34-26t36 26q0 22-35 22t-35-22z" fill="#9edbc0"/>'+
   '<path d="m64 123-13-7q0 10 8 15m60-8 13-7q0 10-8 15" fill="#9edbc0"/>'+
   '<ellipse cx="74" cy="134" rx="4" ry="6" fill="#203b3f" stroke="none"/><ellipse cx="105" cy="134" rx="4" ry="6" fill="#203b3f" stroke="none"/>'+
   '<circle cx="75" cy="132" r="1.4" fill="#fff" stroke="none"/><circle cx="106" cy="132" r="1.4" fill="#fff" stroke="none"/>'+
   '<ellipse cx="66" cy="143" rx="5" ry="3" fill="#efb6aa" stroke="none"/><ellipse cx="114" cy="143" rx="5" ry="3" fill="#efb6aa" stroke="none"/>'+
   '<path d="M84 144q5 6 11 0" fill="none" stroke-linecap="round"/>'+
   '</g></svg></div>';
 }
 function markup(){return '<section class="sx-horizon" aria-label="Odanın ortak gökyüzü">'
  +'<div class="sx-window" aria-hidden="true"><svg viewBox="0 0 1000 260" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sx-sky" x2="0" y2="1"><stop stop-color="#182a3a"/><stop offset="1" stop-color="#70818a"/></linearGradient></defs><rect width="1000" height="260" fill="url(#sx-sky)"/><circle class="sx-moon" cx="815" cy="58" r="24"/><g class="sx-night-stars"><circle cx="180" cy="50" r="1.5"/><circle cx="390" cy="90" r="2"/><circle cx="560" cy="42" r="1.5"/><circle cx="710" cy="110" r="2"/><circle cx="920" cy="30" r="1.5"/></g><path class="sx-ridge-back" d="M0 210Q150 120 280 190T540 170T800 180T1000 170V260H0Z"/><path class="sx-ridge" d="M0 225Q130 185 280 220T560 213T820 220T1000 206V260H0Z"/><g class="sx-city"><path d="M30 260v-38h22v38m70 0v-56h33v56m115 0v-30h20v30m430 0v-40h23v40m145 0v-62h35v62m95 0v-28h18v28"/></g></svg><div class="sx-rain-drops" aria-hidden="true">'+Array.from({length:26},(_,i)=>'<i style="--x:'+((i*37)%101)+';--speed:'+(1.1+(i%7)*.19)+';--delay:'+(-i*.37)+';--length:'+(9+i%5*4)+'"></i>').join('')+'</div><i class="sx-window-cross"></i></div>'
  +'<div class="sx-horizon-caption"><span>BİRLİKTE</span><strong data-sx-total>0 dk</strong><small data-sx-companion-label hidden></small></div>'
  +'<div class="sx-plant" data-sx-plant><span class="sx-bloom-timer" data-sx-bloom-timer role="timer" aria-label="Ejderhaya kalan süre" hidden></span><svg viewBox="0 0 180 220" role="img" aria-label="Çalıştıkça büyüyen ortak bitkiniz"><ellipse cx="90" cy="204" rx="65" ry="9" fill="#0003"/><g class="sx-plant-growth"><path class="sx-stem" d="M90 164Q85 125 94 88T89 30"/>'
  +Array.from({length:6},(_,i)=>'<path class="sx-leaf" data-leaf="'+(i+1)+'" style="--leaf:'+i+'" d="'+(i%2?'M91 '+(139-i*18)+'q-45 -5 -44 -31q35 -7 44 31Z':'M91 '+(139-i*18)+'q43 -5 44 -31q-35 -7 -44 31Z')+'"/>').join('')
  +'<g class="sx-flower" transform="translate(91 40)" fill="#f4b4bb"><ellipse cy="-6" rx="4.5" ry="7"/><ellipse cy="-6" rx="4.5" ry="7" transform="rotate(72)"/><ellipse cy="-6" rx="4.5" ry="7" transform="rotate(144)"/><ellipse cy="-6" rx="4.5" ry="7" transform="rotate(216)"/><ellipse cy="-6" rx="4.5" ry="7" transform="rotate(288)"/><circle r="4" fill="#ffe194"/></g>'
  +'<path class="sx-sprout" d="M90 160q-26 -2 -28 -20q23 -7 28 20m0 0q3 -24 25 -23q0 20 -25 23"/></g><path class="sx-pot" d="M56 163h68l-9 37q-25 9 -50 0Z"/><rect class="sx-pot-rim" x="51" y="157" width="78" height="12" rx="5"/></svg></div>'
  +companionMarkup()
  +'<div class="sx-horizon-foot"><span data-sx-together></span></div></section>'
  +'<div class="sx-toolbar"><button type="button" data-sx="desk" aria-pressed="false">Masama geç</button><details class="sx-sound"><summary>Ses ortamı <span data-sx-audio-state>Ses kapalı</span></summary><div><button type="button" data-sx-sound="rain" aria-pressed="false">Pencerede yağmur</button><button type="button" data-sx-sound="warm" aria-pressed="false">Derin uğultu</button><label>Ses seviyesi<input data-sx-volume type="range" min="0" max="100" value="35"></label></div></details></div>'
  +'<small class="sx-weather-credit">Hava: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></small><p class="sx-status" data-sx-status role="status"></p>';
 }
 function clear(){window.HakunaRoomWeather?.clear();soundStop();if(root&&listen)root.removeEventListener('click',listen);if(root&&change)root.removeEventListener('input',change);root?.querySelector('.sx-experience')?.remove();root?.querySelector('.sr-room')?.classList.remove('sx-my-desk');root=null;scope='';listen=null;change=null;desk=false;volume=.35;}
 function mount(host,data,user){
  const next=user+':'+data.room.id;if(scope===next&&root===host)return;
  clear();root=host;uid=user;scope=next;
  const box=document.createElement('div');box.className='sx-experience';box.innerHTML=markup();root.querySelector('.sr-room-header').after(box);
  root.querySelector('.sr-room').classList.add('sx-room');
  listen=e=>{
   const button=e.target.closest('[data-sx],[data-sx-sound]');if(!button||!root.contains(button))return;
   if(button.dataset.sxSound){void soundStart(button.dataset.sxSound);return}
   switch(button.dataset.sx){
    case 'desk':desk=!desk;root.querySelector('.sr-room').classList.toggle('sx-my-desk',desk);button.setAttribute('aria-pressed',String(desk));button.textContent=desk?'Ortak masaya dön':'Masama geç';break;
   }
  };
  change=e=>{if(e.target.matches('[data-sx-volume]')){volume=Number(e.target.value)/100;if(nodes[2]&&audio)nodes[2].gain.setTargetAtTime(volume*.16,audio.currentTime,.1)}};
  window.HakunaRoomWeather?.mount(root);root.addEventListener('click',listen);root.addEventListener('input',change);update(data,Date.parse(data.server_now)||Date.now());
 }
 function update(data,now){
  if(!root?.isConnected)return;window.HakunaRoomWeather?.update(now);
  const members=data.members||[];
  const total=Math.max(0,Number(data.room_total_seconds ??
    members.reduce((sum,member)=>sum+Math.max(0,Number(member.seconds)||0),0))||0);
  const {kind,stage,secondsLeft}=petStage(total,data.bloom_started_at,now);
  const plant=root.querySelector('[data-sx-plant]');
  const dragon=root.querySelector('[data-sx-dragon]');
  const label=root.querySelector('[data-sx-companion-label]');
  const timer=root.querySelector('[data-sx-bloom-timer]');
  plant.hidden=kind==='dragon';
  plant.classList.toggle('sx-blooming',kind==='bloom');
  timer.hidden=kind!=='bloom';
  if(!timer.hidden)timer.textContent=countdown(secondsLeft);
  dragon.hidden=kind!=='dragon';
  label.hidden=kind!=='dragon';
  if(!label.hidden&&label.textContent!=='Minik ejderha')label.textContent='Minik ejderha';
  if(!plant.hidden&&plant.dataset.stage!==String(stage)){
    plant.dataset.stage=String(stage);
    plant.querySelector('.sx-stem').setAttribute('d','M90 164Q86 130 91 '+(152-stage*18));
    plant.style.setProperty('--growth',String(.55+stage*.075));
    plant.querySelectorAll('.sx-leaf').forEach(leaf=>leaf.classList.toggle('is-grown',Number(leaf.dataset.leaf)<=stage));
  }else if(kind==='dragon'&&dragon.dataset.stage!==String(stage)){
    dragon.dataset.stage=String(stage);
    dragon.style.setProperty('--dragon-scale',String(.8+stage*.08));
  }
  root.querySelector('[data-sx-total]').textContent=total>=3600?Math.floor(total/3600)+' saat '+Math.floor(total%3600/60)+' dk':Math.floor(total/60)+' dakika';
  const working=members.filter(m=>m.studying&&(!m.active_end_at||Date.parse(m.active_end_at)>now));
  root.querySelector('[data-sx-together]').textContent=working.length?working.length+' kişi çalışıyor':'';
  root.querySelectorAll('.sr-person[data-sr-user]').forEach(p=>p.classList.toggle('sx-self',p.dataset.srUser===uid));
 }
 function finish(){if(!root?.isConnected)return;message('Çalışman kaydedildi.');}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(audio)void audio.suspend().catch(()=>{})}else if(audio&&sound){void audio.resume().catch(()=>{})}});
 window.HakunaRoomExperience=Object.freeze({mount,update,finish,clear,utils:{growth,petStage,countdown}});
})();
