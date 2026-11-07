/* Shared Elazig environment. No geolocation; weather is model-based current data. */
(()=>{'use strict';
 const URL='https://api.open-meteo.com/v1/forecast?latitude=38.6743&longitude=39.2220&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=Europe%2FIstanbul&timeformat=unixtime&forecast_days=3';
 const TTL=15*60*1000,MAX_AGE=90*60*1000;
 let host=null,cache=null,controller=null,timer=null,retryAt=0,epoch=0,lastPaint='';
 const dateKey=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(ms);
 const clock=ms=>new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'}).format(ms);
 // Sunrise equation fallback for Elazig; used offline, never invents weather.
 function solar(now,rise){
  const local=new Date(now+10800000),year=local.getUTCFullYear(),month=local.getUTCMonth(),day=local.getUTCDate();
  const start=Date.UTC(year,month,day),n=Math.floor((start-Date.UTC(year,0,0))/86400000),lng=39.222/15;
  const rad=Math.PI/180,deg=180/Math.PI,t=n+((rise?6:18)-lng)/24,M=.9856*t-3.289;
  const L=((M+1.916*Math.sin(M*rad)+.020*Math.sin(2*M*rad)+282.634)%360+360)%360;
  let RA=((Math.atan(.91764*Math.tan(L*rad))*deg)%360+360)%360;
  RA=(RA+Math.floor(L/90)*90-Math.floor(RA/90)*90)/15;
  const sinD=.39782*Math.sin(L*rad),cosD=Math.cos(Math.asin(sinD));
  const cosH=(Math.cos(90.833*rad)-sinD*Math.sin(38.6743*rad))/(cosD*Math.cos(38.6743*rad));
  let H=Math.acos(Math.max(-1,Math.min(1,cosH)))*deg;if(rise)H=360-H;
  const utc=((H/15+RA-.06571*t-6.622-lng)%24+24)%24;
  return start+utc*3600000;
 }
 function phase(now,rise=solar(now,true),set=solar(now,false)){
  const edge=30*60000;
  if(now>=rise-edge&&now<rise+edge)return 'dawn';
  if(now>=set-edge&&now<set+edge)return 'sunset';
  return now>=rise+edge&&now<set-edge?'day':'night';
 }
 function weather(code){
  if([95,96,97,99].includes(code))return 'thunder';
  if([71,73,75,77,85,86].includes(code))return 'snow';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return 'rain';
  if([45,48].includes(code))return 'fog';
  if([2,3].includes(code))return 'cloudy';
  return [0,1].includes(code)?'clear':'unknown';
 }
 function valid(data){return data&&Number.isFinite(data.current?.time)&&Number.isFinite(data.current?.temperature_2m)&&Number.isInteger(data.current?.weather_code)&&Array.isArray(data.daily?.time)&&Array.isArray(data.daily?.sunrise)&&Array.isArray(data.daily?.sunset)}
 function update(now=Date.now()){
  if(!host?.isConnected)return;
  const paintKey=Math.floor(now/60000)+':'+(cache?.fetched||0);if(paintKey===lastPaint)return;lastPaint=paintKey;
  const room=host.querySelector('.sr-room');if(!room)return;
  let rise=solar(now,true),set=solar(now,false);
  const daily=cache?.data.daily,index=daily?.time.findIndex(s=>dateKey(s*1000)===dateKey(now));
  if(index>=0&&Number.isFinite(daily.sunrise[index])&&Number.isFinite(daily.sunset[index])){rise=daily.sunrise[index]*1000;set=daily.sunset[index]*1000;}
  const p=phase(now,rise,set);room.dataset.dayphase=p;room.dataset.atmosphere=p==='night'?'night':'dawn';
  const current=cache?.data.current,age=current?now-current.time*1000:Infinity;
  const fresh=age>=-15*60000&&age<=MAX_AGE,kind=fresh?weather(current.weather_code):'unknown';
  room.dataset.weather=kind;room.dataset.cloudiness=fresh&&current.weather_code===3?'overcast':kind==='cloudy'?'partial':['rain','snow','fog','thunder'].includes(kind)?'overcast':'clear';
  const labels={clear:'Açık',cloudy:'Bulutlu',rain:'Yağmurlu',snow:'Karlı',fog:'Sisli',thunder:'Gök gürültülü yağmur',unknown:'Hava verisi bekleniyor'};
  const part={dawn:'Gün doğumu',day:'Gündüz',sunset:'Gün batımı',night:'Gece'};
  const badge=host.querySelector('[data-sx-weather]');
  if(badge){badge.textContent='Elazığ · '+clock(now)+' · '+part[p]+' · '+(fresh?Math.round(current.temperature_2m)+'° · '+labels[kind]+(Date.now()-cache.fetched>TTL?' · Son veri '+clock(current.time*1000):''):'Hava verisi alınamıyor');badge.title=fresh?'Open-Meteo · Model tabanlı güncel hava · Veri saati '+clock(current.time*1000)+(Date.now()-cache.fetched>TTL?' · Son alınan veri':''):'Saat ve gün döngüsü sürüyor; hava bağlantısı yeniden denenecek.';}
 }
 async function refresh(){
  if(!host||controller||document.hidden||Date.now()<retryAt)return;
  if(cache&&Date.now()-cache.fetched<TTL){update();return;}
  const token=epoch,request=new AbortController();controller=request;const timeout=setTimeout(()=>request.abort(),8000);
  try{const res=await fetch(URL,{signal:request.signal,cache:'no-store'});if(!res.ok)throw Error('weather');const data=await res.json();if(!valid(data))throw Error('weather format');if(token!==epoch)return;cache={data,fetched:Date.now()};try{localStorage.setItem('hakuna.elazigWeather.v1',JSON.stringify(cache))}catch{}retryAt=0;
  }catch{if(token===epoch)retryAt=Date.now()+60000;}finally{clearTimeout(timeout);if(controller===request)controller=null;if(token===epoch)update();}
 }
 function clear(){epoch++;clearInterval(timer);timer=null;controller?.abort();controller=null;host=null;lastPaint='';}
 function mount(node){if(host===node)return;clear();host=node;retryAt=0;
  try{const saved=JSON.parse(localStorage.getItem('hakuna.elazigWeather.v1'));if(valid(saved?.data)&&Number.isFinite(saved.fetched)&&saved.fetched<=Date.now())cache=saved;}catch{}
  update();void refresh();timer=setInterval(()=>{update();void refresh()},60000);
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&host){update();void refresh()}});
 window.addEventListener('online',()=>{retryAt=0;if(host)void refresh()});
 window.HakunaRoomWeather=Object.freeze({mount,update,clear,utils:{phase,weather,solar,dateKey}});
})();
