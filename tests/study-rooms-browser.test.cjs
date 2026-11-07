const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const files={};
for(const name of ['styles.css','study-rooms.css','study-rooms-immersive.css','room-experience.css','room-experience.js','room-weather.js','room-wardrobe.js','study-rooms.js'])files[name]=fs.readFileSync(require('node:path').join(__dirname,'..',name),'utf8');
const fixture=[
  '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
  '<link href="/styles.css" rel="stylesheet"><link href="/study-rooms.css" rel="stylesheet"><link href="/study-rooms-immersive.css" rel="stylesheet"><link href="/room-experience.css" rel="stylesheet">',
  '<main class="main-area"><h1 id="pageTitle">Odalar</h1><section class="ataturk-corner" aria-label="Atatürk Köşesi">Atatürk Köşesi</section><section class="republic-hero">Cumhuriyet</section><section id="view"></section></main>',
  '<script>',
  'window.__uid="user-1";',
  'window.__state={room:null,selfStudying:false,seconds:12,other:false};',
  'window.HakunaAccount={',
  'info:()=>({id:window.__uid}),open:()=>{window.__loginOpened=true},',
  'roomListen:()=>()=>{},roomLoadLook:async()=>window.__state.look||{},roomSaveLook:async look=>{window.__state.look=look},',
  'roomRpc:async(name,args={})=>{',
  ' const s=window.__state,uid=window.__uid;',
  ' if(!uid)throw Error("Giriş gerekli");',
  ' if(name==="study_room_overview")return {rooms:s.room?.is_active?[{...s.room,member_count:s.other?2:1,today_seconds:0,total_seconds:0,studying:s.selfStudying}]:[],total_seconds:s.seconds,today_seconds:s.seconds};',
  ' if(name==="study_room_create_v2"){s.room={id:"room-1",owner_id:"user-1",name:args.p_name,invite_code:"K7MP4X9R",focus_minutes:args.p_focus_minutes,break_minutes:args.p_break_minutes,mode:args.p_mode||"shared",phase:"idle",phase_started_at:null,is_active:true};return s.room.id;}',
  ' if(name==="study_room_join"){if(args.p_invite_code!==s.room?.invite_code)throw Error("Geçersiz kod");return s.room.id;}',
  ' if(name==="study_room_touch")return true;',
  ' if(name==="study_room_snapshot"){if(!s.room)throw Error("Oda yok");return {room:{...s.room},members:[{user_id:"user-1",username:"Batu",look:s.look,seconds:s.seconds,today_seconds:s.seconds,studying:s.selfStudying,last_seen_at:new Date().toISOString(),active_started_at:s.startedAt||null,active_end_at:null,task_title:s.task||null},...(s.other?[{user_id:"user-2",username:"<img src=x onerror=alert(1)>",look:{top:"coogi",head:"headphones",face:"aviators",neck:"pendant",hand:"watch"},seconds:1200,today_seconds:1200,studying:!s.away,last_seen_at:new Date(Date.now()-120000).toISOString(),active_end_at:new Date(Date.now()+300000).toISOString()}]:[])],room_total_seconds:s.roomTotal,server_now:new Date().toISOString()};}',
  ' if(name==="study_room_rename"){if(uid!==s.room.owner_id)throw Error("Not owner");s.room.name=args.p_name;return true;}',
  ' if(name==="study_room_configure"){s.room.focus_minutes=args.p_focus_minutes;s.room.break_minutes=args.p_break_minutes;s.room.mode=args.p_mode;return true;}',
  ' if(name==="study_room_set_phase"){s.room.phase=args.p_phase;s.room.phase_started_at=args.p_phase==="idle"?null:new Date(Date.now()+(args.p_phase==="focus"?3100:0)).toISOString();return true;}',
  ' if(name==="study_room_start"){s.selfStudying=true;s.startedAt=s.startedAt||new Date().toISOString();s.task=args.p_task_title||null;return {server_now:new Date().toISOString()};}',
  ' if(name==="study_room_stop"){s.selfStudying=false;s.startedAt=null;s.seconds+=12;return 12;}',
  ' if(name==="study_room_close"){s.room.is_active=false;s.selfStudying=false;return true;}',
  ' if(name==="study_room_leave"){s.room=null;return true;}',
  ' throw Error("Unknown RPC "+name);',
  '}};',
  '</script><script src="/room-weather.js"></script><script src="/room-experience.js"></script><script src="/room-wardrobe.js"></script><script src="/study-rooms.js"></script>',
  '<script>window.HakunaStudyRooms.render(document.querySelector("#view"));</script></html>'
].join('');
const server=createServer((req,res)=>{
 const path=(req.url||'/').split('?')[0].slice(1);
 if(!path||path==='fixture.html'){
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(fixture);return;
 }
 if(files[path]){
  res.writeHead(200,{'content-type':path.endsWith('.css')?'text/css':'text/javascript'});
  res.end(files[path]);return;
 }
 res.writeHead(404);res.end();
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/fixture.html';
 try{
 for(const [browserType,width,label] of [[chromium,1280,'desktop Chromium'],[webkit,390,'iPhone WebKit'],[webkit,700,'iPad portrait WebKit']]){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<1000,hasTouch:width<1000});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.route('https://api.open-meteo.com/**',route=>{
      const now=Date.now(),day=Math.floor((now+10800000)/86400000)*86400000-10800000;
      return route.fulfill({json:{current:{time:Math.floor(now/1000),temperature_2m:10,weather_code:63},daily:{time:[day/1000],sunrise:[(day+7*3600000)/1000],sunset:[(day+17*3600000)/1000]}}});
    });
    await page.goto(base+'?room=k7mp-4x9r');
    await page.locator('[data-sr-action=entry-create]').waitFor();
    assert.equal(await page.locator('[name=code]').inputValue(),'K7MP4X9R');
    await page.locator('.sr-empty').waitFor();
    assert.equal(await page.locator('[data-room-total]').count(),0,'past study does not show stats in an empty lobby');
    await page.locator('[data-sr-action=wardrobe]').click();
    const wardrobe=page.locator('.sr-wardrobe');
    await wardrobe.waitFor();
    await wardrobe.locator('[name=top]').selectOption('les');
    await wardrobe.getByRole('button',{name:'Aksesuar'}).click();
    await wardrobe.locator('[name=head]').selectOption('headphones');
    await wardrobe.locator('[name=hand]').selectOption('watch');
    await wardrobe.locator('[name=face]').selectOption('aviators');
    await wardrobe.locator('[name=neck]').selectOption('pendant');
    await wardrobe.getByRole('button',{name:'Karakter'}).click();
    await wardrobe.locator('[name=hair]').selectOption('braids');
    await wardrobe.locator('[name=skin]').selectOption('deep');
    const preview=wardrobe.locator('.sr-wardrobe-preview');
    const accessories=['headphones','aviators','pendant','watch'];
    for(const name of accessories)assert.equal(await preview.locator('[data-accessory='+name+']').count(),1);
    assert.equal(await preview.locator('.sr-avatar[data-hair=braids] .sr-accessory-art').count(),1);
    fs.mkdirSync('test-results',{recursive:true});
    await wardrobe.screenshot({path:'test-results/wardrobe-'+width+'.png'});
    await wardrobe.getByRole('button',{name:'Kaydet'}).click();
    await wardrobe.waitFor({state:'detached'});
    await page.locator('[data-sr-action=entry-create]').click();
    await page.locator('[data-sr-form=create] [name=name]').fill('Kütüphane Ekibi');
    await page.locator('[data-sr-form=create] button[type=submit]').click();
    await page.locator('[data-sr-room-title]').getByText('Kütüphane Ekibi').waitFor();
    assert.equal(await page.locator('[data-sr-invite]').textContent(),'K7MP-4X9R');
    for(const name of accessories)assert.equal(await page.locator('.sr-roster [data-accessory='+name+']').count(),1);
    assert.equal(await page.locator('[data-sr-action=wardrobe]').count(),0);
    const chair=page.locator('[data-sr-user="user-1"] [data-chair-level]');
    assert.equal(await chair.getAttribute('data-chair-level'),'0');
    const initialHeight=(await chair.boundingBox()).height;
    await page.locator('.sr-chair-guide summary').click();
    await page.getByText('320 sa ve üzeri',{exact:true}).waitFor();
    await page.locator('.sr-chair-guide summary').click();
    await page.evaluate(()=>{window.__state.seconds=180000;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.querySelector('[data-sr-user="user-1"] [data-chair-level]')?.dataset.chairLevel==='5');
    await page.waitForFunction(height=>document.querySelector('[data-sr-user="user-1"] [data-chair-level]').getBoundingClientRect().height>height,initialHeight);
    await page.locator('[data-sr-user="user-1"] .sr-desk-scene').screenshot({path:'test-results/throne-'+width+'.png'});
    await page.evaluate(()=>{window.__state.seconds=320*3600;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.querySelector('[data-sr-user="user-1"] [data-chair-level]')?.dataset.chairLevel==='11');
    await page.locator('[data-sr-user="user-1"] .sr-desk-scene').screenshot({path:'test-results/imperial-'+width+'.png'});
    await page.evaluate(()=>{window.__state.roomTotal=900*3600;window.dispatchEvent(new Event('online'));});
    await page.locator('[data-sx-egg][data-stage="3"]:visible').waitFor();
    assert.equal(await page.locator('[data-sx-plant]').isVisible(),false);
    await page.locator('.sx-horizon').screenshot({path:'test-results/egg-'+width+'.png'});
    await page.evaluate(()=>{window.__state.roomTotal=1000*3600;window.dispatchEvent(new Event('online'));});
    await page.locator('[data-sx-dragon][data-stage="0"]:visible').waitFor();
    assert.equal(await page.locator('[data-sx-egg]').isVisible(),false);
    await page.locator('.sx-horizon').screenshot({path:'test-results/dragon-'+width+'.png'});

    await page.evaluate(()=>{window.__state.seconds=12;delete window.__state.roomTotal;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.querySelector('[data-sr-user="user-1"] [data-chair-level]')?.dataset.chairLevel==='0');

    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value}}}));
    await page.locator('.sr-invite summary').click();
    await page.locator('[data-sr-action=copy-code]').click();
    assert.equal(await page.evaluate(()=>window.__copied),'K7MP4X9R');
    await page.locator('[data-sr-action=copy]').click();
    assert.equal(new URL(await page.evaluate(()=>window.__copied)).searchParams.get('room'),'K7MP4X9R');
    await page.locator('.sr-invite summary').click();

    assert.equal(await page.locator('.ataturk-corner').isVisible(),false,'Atatürk Köşesi must not appear in immersive room');
    assert.equal(await page.locator('.republic-hero').isVisible(),false,'holiday banners must not appear in immersive room');
    assert.equal(await page.locator('#pageTitle').isVisible(),false,'only room view should remain on screen');
    assert.equal(await page.locator('.sr-person').count(),1);
    await page.locator('.sx-room-settings summary').click();
    await page.locator('[data-sr-form=rename] [name=name]').fill('Yeni oda adı');
    await page.locator('[data-sr-form=rename] button[type=submit]').click();
    await page.locator('[data-sr-room-title]').getByText('Yeni oda adı',{exact:true}).waitFor();
    assert.equal(await page.locator('[data-sr-invite]').textContent(),'K7MP-4X9R','rename keeps invitation');
    await page.locator('.sx-room-settings summary').click();

    assert(await page.locator('[data-sr-action=start]').isEnabled(),'personal work starts without a shared session');
    assert.equal(await page.locator('[data-sr-task],[data-sx-intent],[data-sx=note]').count(),0);
    await page.locator('[data-sr-action=start]').click();
    await page.locator('.sr-person-working').waitFor();
    assert((await page.locator('[data-sr-own-status]').textContent()).includes('sayılıyor'));
    assert.equal(await page.locator('[data-sr-action=focus],[data-sr-action=break],[data-sr-action=idle],[data-sr-shared]').count(),0);
    await page.evaluate(()=>window.__state.other=true);
    // Force a fresh server snapshot to check XSS escaping and animated study desks.
    await page.evaluate(()=>window.dispatchEvent(new Event('online')));
    await page.locator('.sr-person').nth(1).waitFor();
    assert.deepEqual(await page.locator('.sr-person').evaluateAll(nodes=>nodes.map(n=>n.dataset.srUser)),['user-2','user-1'],'the highest room study total comes first');
    assert.equal(await page.locator('.sr-roster img').count(),0,'username must never inject HTML');
    assert((await page.locator('.sr-roster').textContent()).includes('<img src=x onerror=alert(1)>'));
    const friend=page.locator('[data-sr-user="user-2"]');
    assert.equal(await friend.locator('.sr-desk-working .sr-clothes-art').count(),1,'working peer outfit survives stale presence');
    for(const name of accessories)assert.equal(await friend.locator('.sr-desk-working [data-accessory='+name+']').count(),1);
    await page.evaluate(()=>{window.__state.away=true;window.dispatchEvent(new Event('online'));});
    await page.locator('.sr-person-away').waitFor();
    assert.equal(await friend.locator('.sr-desk-away .sr-vacant').count(),1,'away peer has an empty desk');
    assert.equal(await friend.locator('.sr-avatar').count(),0);
    await page.evaluate(()=>window.__state.away=false);
    await page.locator('[data-sr-action=stop]').click();
    assert(await page.locator('[data-sr-action=start]').isEnabled(),'resume after a personal break');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(overflow,false,'study room must not overflow viewport at '+width);
    await page.evaluate(()=>{window.__state.seconds=12*3600;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.querySelector('[data-sx-plant]')?.dataset.stage==='1');
    assert.equal(await page.locator('.sx-leaf.is-grown').count(),1);
    assert.equal(await page.locator('.sr-person').first().getAttribute('data-sr-user'),'user-1','ranks update when a member takes the lead');
    await page.locator('[data-sx=desk]').click();
    assert.equal(await page.locator('.sx-my-desk .sx-self').count(),1);
    fs.mkdirSync('test-results',{recursive:true});
    await page.screenshot({path:'test-results/desk-'+width+'.png',fullPage:true});
    await page.locator('[data-sx=desk]').click();
    await page.locator('.sx-sound summary').click();
    await page.locator('[data-sx-sound=rain]').click();
    await page.waitForFunction(()=>document.querySelector('[data-sx-sound=rain]')?.getAttribute('aria-pressed')==='true');
    await page.locator('.sx-sound summary').click();
    fs.mkdirSync('test-results',{recursive:true});
    await page.screenshot({path:'test-results/room-'+width+'.png',fullPage:true});
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-sr-action=close]').click();
    // browser dialog may race the click above, so wait for room list after it resolves.
    await page.locator('[data-sr-action=entry-create]').waitFor({timeout:10000});
    assert.equal(await page.locator('.ataturk-corner').isVisible(),true,'Atatürk Köşesi should be visible again in lobby');
    assert.equal(await page.locator('.republic-hero').isVisible(),true,'holiday banner should be restored outside room');
    await page.evaluate(()=>{window.__state.other=false;window.__state.away=false;});
    await page.locator('[data-sr-action=entry-create]').click();
    await page.locator('[data-sr-form=create] [name=name]').fill('Serbest Test');
    await page.locator('[data-sr-form=create] button[type=submit]').click();
    await page.locator('[data-sr-room-mode]').getByText('ÇALIŞMA ODASI').waitFor();
    assert.equal(await page.locator('.sr-roster .sr-avatar[data-hair=braids]').count(),1,'saved look persists on room re-entry');
    assert.equal(await page.locator('.sx-leaf.is-grown').count(),1,'plant must render after remount');
    assert.equal(await page.locator('[data-sx-audio-state]').textContent(),'Ses kapalı');
    assert(await page.locator('body').evaluate(el=>el.classList.contains('sr-immersed')),'room should enter isolated screen');
    await page.waitForFunction(()=>document.querySelector('.sr-room')?.dataset.weather==='rain');
    assert((await page.locator('[data-sx-weather]').textContent()).includes('Elazığ'));
    assert.equal(await page.locator('[data-theme]').count(),0,'everyone follows Elazig instead of personal themes');
    assert.equal(await page.locator('[data-sr-action=zen]').count(),0,'room is simple by default');
    await page.evaluate(()=>window.scrollTo(0,0));
    assert(await page.locator('.sr-room').evaluate(el=>parseFloat(getComputedStyle(el).paddingTop)>=48),'tablet controls clear the top safe area');
    await page.locator('[data-sr-action=start]').click();
    await page.locator('[data-sr-action=stop]').waitFor({timeout:10000});
    assert((await page.locator('[data-sr-room-mode]').textContent()).includes('ÇALIŞMA ODASI'));
    await page.locator('[data-sr-action=stop]').click();
    await page.locator('[data-sr-action=start]').waitFor();
    assert.equal(await page.locator('[data-sx-note]').isVisible(),false);
    await page.screenshot({path:'test-results/rain-'+width+'.png',fullPage:true});
    await page.evaluate(()=>{window.__weatherOriginal=window.HakunaRoomWeather;window.HakunaRoomWeather={...window.HakunaRoomWeather,update:()=>{}};});
    for(const [phase,hour,code,weather] of [['dawn',7,0,'clear'],['day',12,63,'rain'],['day',12,3,'cloudy'],['sunset',17,75,'snow'],['night',23,45,'fog']]){
      await page.evaluate(({hour,code})=>{
        const env=window.__weatherOriginal,day=Date.parse('2026-11-06T00:00:00+03:00'),now=day+hour*3600000;
        env.clear();localStorage.setItem('hakuna.elazigWeather.v1',JSON.stringify({fetched:Date.now(),data:{current:{time:now/1000,temperature_2m:10,weather_code:code},daily:{time:[day/1000],sunrise:[(day+7*3600000)/1000],sunset:[(day+17*3600000)/1000]}}}));
        env.mount(document.querySelector('#view'));env.update(now);
      },{hour,code});
      assert.equal(await page.locator('.sr-room').getAttribute('data-dayphase'),phase);
      assert.equal(await page.locator('.sr-room').getAttribute('data-weather'),weather);
      if(weather==='cloudy')assert.equal(await page.locator('.sr-room').getAttribute('data-cloudiness'),'overcast');
      await page.screenshot({path:'test-results/'+phase+'-'+weather+'-'+width+'.png',fullPage:true});
    }
    await page.evaluate(()=>{window.HakunaRoomWeather=window.__weatherOriginal;});

    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-sr-action=close]').click();
    await page.locator('[data-sr-action=entry-create]').waitFor();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('sr-immersed')),false,'lobby should restore regular shell');
    await page.locator('[data-sr-action=entry-create]').click();
    await page.locator('[data-sr-form=create] [name=name]').fill('Silme testi');
    await page.locator('[data-sr-form=create] button[type=submit]').click();
    await page.locator('[data-sr-action=back]').click();
    await page.locator('[data-sr-action=delete-room]').waitFor();
    assert.equal(await page.locator('[data-room-today]').textContent(),'0 dk 00 sn');
    assert.equal(await page.locator('[data-room-total]').textContent(),'0 dk 00 sn','new room excludes past study from other rooms');
    page.once('dialog',d=>d.dismiss());await page.locator('[data-sr-action=delete-room]').click();
    assert.equal(await page.locator('[data-sr-action=delete-room]').count(),1);
    const before=await page.evaluate(()=>window.__state.seconds);
    page.once('dialog',d=>d.accept());await page.locator('[data-sr-action=delete-room]').click();
    await page.waitForFunction(()=>!document.querySelector('[data-sr-action=delete-room]'));
    assert.equal(await page.evaluate(()=>window.__state.seconds),before,'deleting a room preserves study totals');
    await page.evaluate(()=>localStorage.removeItem('hakuna.elazigWeather.v1'));
    await page.unroute('https://api.open-meteo.com/**');
    await page.route('https://api.open-meteo.com/**',route=>route.abort());
    await page.reload();
    await page.locator('[data-sr-action=entry-create]').click();
    await page.locator('[data-sr-form=create] [name=name]').fill('Çevrimdışı hava');
    await page.locator('[data-sr-form=create] button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('.sr-room')?.dataset.weather==='unknown');
    assert(['dawn','day','sunset','night'].includes(await page.locator('.sr-room').getAttribute('data-dayphase')));
    assert((await page.locator('[data-sx-weather]').textContent()).includes('alınamıyor'));
    assert.equal(errors.length,0,'Page errors: '+errors.join(', '));
    console.log('PASS '+label+': room creation, shared clock, timer, roster security, presets, close, responsive layout');
  }finally{await context.close();await browser.close();}
 }
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
