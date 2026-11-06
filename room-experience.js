/* Room experience: a shared windowsill plant derived from server study totals,
   private room notes, and opt-in local ambience. No extra time writes. */
(()=>{'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function growth(total){const value=Number(total);return Math.min(6,Math.floor(Math.sqrt(Math.max(0,Number.isFinite(value)?value:0)/3600)));}
 let root=null,snapshot=null,uid=null,scope='',desk=false,note='',sound=null,audio=null,nodes=[],volume=.35,listen=null,change=null;
 function key(){return 'hakuna.roomNote.v1.'+uid+'.'+snapshot.room.id}
 function readNote(){try{return localStorage.getItem(key())||''}catch{return ''}}
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
 function markup(){return '<section class="sx-horizon" aria-label="Odanın ortak gökyüzü">'
  +'<div class="sx-window" aria-hidden="true"><svg viewBox="0 0 1000 260" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sx-sky" x2="0" y2="1"><stop stop-color="#182a3a"/><stop offset="1" stop-color="#70818a"/></linearGradient></defs><rect width="1000" height="260" fill="url(#sx-sky)"/><circle class="sx-moon" cx="815" cy="58" r="24"/><g class="sx-night-stars"><circle cx="180" cy="50" r="1.5"/><circle cx="390" cy="90" r="2"/><circle cx="560" cy="42" r="1.5"/><circle cx="710" cy="110" r="2"/><circle cx="920" cy="30" r="1.5"/></g><path class="sx-ridge-back" d="M0 210Q150 120 280 190T540 170T800 180T1000 170V260H0Z"/><path class="sx-ridge" d="M0 225Q130 185 280 220T560 213T820 220T1000 206V260H0Z"/><g class="sx-city"><path d="M30 260v-38h22v38m70 0v-56h33v56m115 0v-30h20v30m430 0v-40h23v40m145 0v-62h35v62m95 0v-28h18v28"/></g></svg><div class="sx-rain-drops" aria-hidden="true">'+Array.from({length:26},(_,i)=>'<i style="--x:'+((i*37)%101)+';--speed:'+(1.1+(i%7)*.19)+';--delay:'+(-i*.37)+';--length:'+(9+i%5*4)+'"></i>').join('')+'</div><i class="sx-window-cross"></i></div>'
  +'<div class="sx-horizon-caption"><span>BİRLİKTE</span><strong data-sx-total>0 dk</strong></div>'
  +'<div class="sx-plant" data-sx-plant role="img" aria-label="Çalıştıkça büyüyen ortak bitkiniz"><svg viewBox="0 0 180 220" aria-hidden="true"><ellipse cx="90" cy="204" rx="65" ry="9" fill="#0003"/><g class="sx-plant-growth"><path class="sx-stem" d="M90 164Q85 125 94 88T89 30"/>'
  +Array.from({length:6},(_,i)=>'<path class="sx-leaf" data-leaf="'+(i+1)+'" style="--leaf:'+i+'" d="'+(i%2?'M91 '+(139-i*18)+'q-45 -5 -44 -31q35 -7 44 31Z':'M91 '+(139-i*18)+'q43 -5 44 -31q-35 -7 -44 31Z')+'"/>').join('')
  +'<path class="sx-sprout" d="M90 160q-26 -2 -28 -20q23 -7 28 20m0 0q3 -24 25 -23q0 20 -25 23"/></g><path class="sx-pot" d="M56 163h68l-9 37q-25 9 -50 0Z"/><rect class="sx-pot-rim" x="51" y="157" width="78" height="12" rx="5"/></svg></div>'
  +'<div class="sx-horizon-foot"><span data-sx-together></span></div></section>'
  +'<div class="sx-toolbar"><button type="button" data-sx="desk" aria-pressed="false">Masama geç</button><details class="sx-sound"><summary>Ses ortamı <span data-sx-audio-state>Ses kapalı</span></summary><div><button type="button" data-sx-sound="rain" aria-pressed="false">Pencerede yağmur</button><button type="button" data-sx-sound="warm" aria-pressed="false">Derin uğultu</button><label>Ses seviyesi<input data-sx-volume type="range" min="0" max="100" value="35"></label></div></details><button type="button" data-sx="note">Masamdaki not</button></div>'
  +'<section class="sx-note" data-sx-note hidden><div><span>SONRAKİ OTURUMA</span><button type="button" data-sx="close-note" aria-label="Notu kapat">×</button></div><h3>Buradan devam edeceğim.</h3><label class="sx-note-label" for="sx-next-note">Kendine bir not</label><textarea id="sx-next-note" maxlength="240" rows="3" placeholder="Örn. Organik kimya, 42. sayfadaki sorudan devam.">'+esc(note)+'</textarea><footer><small>Yalnızca sen, bu cihazda.</small><button type="button" data-sx="save-note">Notu sakla</button></footer></section>'
  +'<small class="sx-weather-credit">Hava: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></small><p class="sx-status" data-sx-status role="status"></p>';
 }
 function clear(){window.HakunaRoomWeather?.clear();soundStop();if(root&&listen)root.removeEventListener('click',listen);if(root&&change)root.removeEventListener('input',change);root?.querySelector('.sx-experience')?.remove();root?.querySelector('.sr-room')?.classList.remove('sx-my-desk');root=null;snapshot=null;scope='';listen=null;change=null;desk=false;volume=.35;}
 function mount(host,data,user){
  const next=user+':'+data.room.id;if(scope===next&&root===host)return;
  clear();root=host;snapshot=data;uid=user;scope=next;note=readNote();
  const box=document.createElement('div');box.className='sx-experience';box.innerHTML=markup();root.querySelector('.sr-room-header').after(box);
  root.querySelector('.sr-room').classList.add('sx-room');
  listen=e=>{
   const button=e.target.closest('[data-sx],[data-sx-sound]');if(!button||!root.contains(button))return;
   if(button.dataset.sxSound){void soundStart(button.dataset.sxSound);return}
   const panel=root.querySelector('[data-sx-note]');
   switch(button.dataset.sx){
    case 'desk':desk=!desk;root.querySelector('.sr-room').classList.toggle('sx-my-desk',desk);button.setAttribute('aria-pressed',String(desk));button.textContent=desk?'Ortak masaya dön':'Masama geç';break;
    case 'note':panel.hidden=false;root.querySelector('#sx-next-note').focus();break;
    case 'close-note':panel.hidden=true;break;
    case 'save-note':try{note=root.querySelector('#sx-next-note').value.trim();localStorage.setItem(key(),note);message('Notun masanda seni bekliyor.');panel.hidden=true}catch{message('Not kaydedilemedi; bu cihazın depolama alanını kontrol et.')}break;
   }
  };
  change=e=>{if(e.target.matches('[data-sx-volume]')){volume=Number(e.target.value)/100;if(nodes[2]&&audio)nodes[2].gain.setTargetAtTime(volume*.16,audio.currentTime,.1)}};
  window.HakunaRoomWeather?.mount(root);root.addEventListener('click',listen);root.addEventListener('input',change);update(data,Date.now());
 }
 function update(data,now){
  if(!root?.isConnected)return;snapshot=data;window.HakunaRoomWeather?.update(now);
  const members=data.members||[],total=members.reduce((n,m)=>n+Math.max(0,Number(m.seconds)||0),0),stage=growth(total);
  const plant=root.querySelector('[data-sx-plant]');
  plant.dataset.stage=String(stage);
  plant.style.setProperty('--growth',String(.55+stage*.075));
  plant.querySelectorAll('[data-leaf]').forEach(leaf=>leaf.classList.toggle('is-grown',Number(leaf.dataset.leaf)<=stage));
  root.querySelector('[data-sx-total]').textContent=total>=3600?Math.floor(total/3600)+' saat '+Math.floor(total%3600/60)+' dk':Math.floor(total/60)+' dakika';
  const working=members.filter(m=>m.studying&&(!m.active_end_at||Date.parse(m.active_end_at)>now));
  root.querySelector('[data-sx-together]').textContent=working.length?working.length+' kişi çalışıyor':'';
  root.querySelectorAll('.sr-person[data-sr-user]').forEach(p=>p.classList.toggle('sx-self',p.dataset.srUser===uid));
 }
 function finish(){if(!root?.isConnected)return;message('Çalışman kaydedildi.');}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(audio)void audio.suspend().catch(()=>{})}else if(audio&&sound){void audio.resume().catch(()=>{})}});
 window.HakunaRoomExperience=Object.freeze({mount,update,finish,clear,utils:{growth}});
})();
