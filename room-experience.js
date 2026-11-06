/* Room experience: a shared sky derived only from persisted study totals,
   private room notes, and opt-in local ambience. No extra time writes. */
(()=>{'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const STEP=1800;
 function sky(total,seed=''){
  const value=Math.max(0,Number(total)||0),lights=Math.floor(value/STEP);
  let hash=Array.from(seed).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,17);
  const random=()=>{hash=(Math.imul(hash,1664525)+1013904223)>>>0;return hash/4294967296};
  const points=Array.from({length:Math.min(lights,64)},()=>({x:Math.round(50+random()*900),y:Math.round(22+random()*170),r:1.4+random()*1.5}));
  return {lights,remaining:STEP-value%STEP,progress:(value%STEP)/STEP,points};
 }
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
  +'<div class="sx-window" aria-hidden="true"><svg viewBox="0 0 1000 260" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sx-sky" x2="0" y2="1"><stop stop-color="#182a3a"/><stop offset="1" stop-color="#70818a"/></linearGradient></defs><rect width="1000" height="260" fill="url(#sx-sky)"/><circle class="sx-moon" cx="815" cy="58" r="24"/><g data-sx-stars></g><path class="sx-ridge-back" d="M0 210Q150 120 280 190T540 170T800 180T1000 170V260H0Z"/><path class="sx-ridge" d="M0 225Q130 185 280 220T560 213T820 220T1000 206V260H0Z"/><g class="sx-city"><path d="M30 260v-38h22v38m70 0v-56h33v56m115 0v-30h20v30m430 0v-40h23v40m145 0v-62h35v62m95 0v-28h18v28"/></g></svg><i class="sx-window-cross"></i></div>'
  +'<div class="sx-horizon-caption"><span>BU ODADA BİRİKEN</span><strong data-sx-total>0 dk</strong><small data-sx-light-label>İlk ışığa doğru</small></div>'
  +'<div class="sx-horizon-foot"><span data-sx-together>Masalar hazır</span><details class="sx-sky-info"><summary>Odanın izi</summary><p>Bu odada kaydedilen her 30 dakika, ortak gökyüzüne bir ışık ekler. Sayacın durduğunda da izin kalır.</p><div class="sx-light-track"><i data-sx-light-fill></i></div><small data-sx-next></small></details></div></section>'
  +'<div class="sx-toolbar"><button type="button" data-sx="desk" aria-pressed="false">Masama geç</button><details class="sx-sound"><summary>Ses ortamı <span data-sx-audio-state>Ses kapalı</span></summary><div><button type="button" data-sx-sound="rain" aria-pressed="false">Pencerede yağmur</button><button type="button" data-sx-sound="warm" aria-pressed="false">Derin uğultu</button><label>Ses seviyesi<input data-sx-volume type="range" min="0" max="100" value="35"></label></div></details><button type="button" data-sx="note">Masamdaki not</button></div>'
  +'<section class="sx-note" data-sx-note hidden><div><span>SONRAKİ OTURUMA</span><button type="button" data-sx="close-note" aria-label="Notu kapat">×</button></div><h3>Buradan devam edeceğim.</h3><label class="sx-note-label" for="sx-next-note">Kendine bir not</label><textarea id="sx-next-note" maxlength="240" rows="3" placeholder="Örn. Organik kimya, 42. sayfadaki sorudan devam.">'+esc(note)+'</textarea><footer><small>Yalnızca sen, bu cihazda.</small><button type="button" data-sx="save-note">Notu sakla</button></footer></section>'
  +'<p class="sx-status" data-sx-status role="status"></p>';
 }
 function clear(){soundStop();if(root&&listen)root.removeEventListener('click',listen);if(root&&change)root.removeEventListener('input',change);root=null;snapshot=null;scope='';listen=null;change=null;desk=false;starKey='';volume=.35;}
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
  root.addEventListener('click',listen);root.addEventListener('input',change);update(data,Date.now());
 }
 let starKey='';
 function update(data,now){
  if(!root?.isConnected)return;snapshot=data;
  const members=data.members||[],total=members.reduce((n,m)=>n+Math.max(0,Number(m.seconds)||0),0),state=sky(total,data.room.id);
  const skyKey=scope+':'+state.lights;
  if(starKey!==skyKey){starKey=skyKey;root.querySelector('[data-sx-stars]').innerHTML=state.points.map((p,i)=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="'+p.r.toFixed(2)+'" style="--star-delay:'+i*.03+'s"/>').join('')}
  root.querySelector('[data-sx-total]').textContent=total>=3600?Math.floor(total/3600)+' saat '+Math.floor(total%3600/60)+' dk':Math.floor(total/60)+' dakika';
  root.querySelector('[data-sx-light-label]').textContent=state.lights?state.lights+' ışık · ortak emeğiniz':'İlk ışığa doğru';
  root.querySelector('[data-sx-next]').textContent='Sonraki ışığa '+Math.ceil(state.remaining/60)+' dakika';
  root.querySelector('[data-sx-light-fill]').style.width=state.progress*100+'%';
  const working=members.filter(m=>m.studying&&(!m.active_end_at||Date.parse(m.active_end_at)>now));
  root.querySelector('[data-sx-together]').textContent=working.length?working.length+' masa ışığı yanıyor':'Birlikte başlayacağınız an.';
  root.querySelectorAll('.sr-person[data-sr-user]').forEach(p=>p.classList.toggle('sx-self',p.dataset.srUser===uid));
 }
 function finish(){if(!root?.isConnected)return;const panel=root.querySelector('[data-sx-note]');panel.hidden=false;message('Çalışman kaydedildi. Sonraki adımını masanda bırakabilirsin.');}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(audio)void audio.suspend().catch(()=>{})}else if(audio&&sound){void audio.resume().catch(()=>{})}});
 window.HakunaRoomExperience=Object.freeze({mount,update,finish,clear,utils:{sky}});
})();
