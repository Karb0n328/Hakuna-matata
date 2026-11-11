const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const batuId='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
async function checkCoffeeOnTable(page,label){
  const g=await page.locator('.sr-roster .sr-desk-scene').first().evaluate(scene=>{
    const cup=scene.querySelector('.sr-scene-coffee').getBoundingClientRect();
    const table=scene.querySelector('.sr-scene-table').getBoundingClientRect();
    return {cupLeft:cup.left,cupRight:cup.right,cupBottom:cup.bottom,
      tableLeft:table.left,tableRight:table.right,tableTop:table.top};
  });
  assert(g.cupLeft>=g.tableLeft+1 && g.cupRight<=g.tableRight-1,
    label+': the cup must be entirely over the tabletop: '+JSON.stringify(g));
  assert(Math.abs(g.cupBottom-g.tableTop)<=3,
    label+': the cup must rest on the tabletop, not float: '+JSON.stringify(g));
}
async function verifyFantasyThrone(page,label,level){
  const value=await page.locator('[data-sr-user="user-1"] .sr-scene-chair').evaluate(chair=>{
    const scene=chair.closest('.sr-desk-scene');
    const svg=chair.querySelector('svg.sr-fantasy-seat-art');
    const avatar=scene.querySelector('.sr-avatar');
    const shape=svg?.querySelector('[data-seat-part="back"]');
    const wings=svg?.querySelector('[data-seat-part="wings"]');
    const crest=svg?.querySelector('[data-seat-part="crest"]');
    const seat=svg?.querySelector('[data-seat-part="seat"]');
    const rune=svg?.querySelector('[data-seat-part="rune"]');
    const rect=svg?.getBoundingClientRect(),sceneRect=scene.getBoundingClientRect();
    return {
      level:Number(chair.dataset.chairLevel),hasSvg:!!svg,hasShapes:!!(shape&&wings&&crest&&seat&&rune),
      back:shape?.getAttribute('d'),wings:wings?.getAttribute('d'),crest:crest?.getAttribute('d'),
      fill:shape?.getAttribute('fill'),
      art:rect?{l:rect.left,r:rect.right,t:rect.top,b:rect.bottom}:null,
      scene:{l:sceneRect.left,r:sceneRect.right,t:sceneRect.top,b:sceneRect.bottom},
      bg:getComputedStyle(chair).backgroundImage,
      border:getComputedStyle(chair).borderTopStyle,
      avatarZ:Number(getComputedStyle(avatar).zIndex),
      chairZ:Number(getComputedStyle(chair).zIndex),
      tableExists:!!scene.querySelector('.sr-scene-table'),
      mugExists:!!scene.querySelector('.sr-scene-coffee')
    };
  });
  assert.equal(value.level,level,label+' progression is still driven by study hours');
  assert(value.hasSvg&&value.hasShapes,label+' level '+level+' has complete fantasy vector art');
  assert(value.back?.startsWith('M')&&(value.back.match(/[LQC]/g)||[]).length>=6,
    label+' level '+level+' has a detailed angular or curved throne outline');
  assert.equal(value.bg,'none',label+' no TV-style chair background');
  assert.equal(value.border,'none',label+' no TV-style outline');
  assert(value.avatarZ>value.chairZ,label+' throne stays behind avatar and wardrobe');
  assert(value.tableExists&&value.mugExists,label+' desk and coffee are unchanged');
  assert(value.art.l>=value.scene.l-2&&value.art.r<=value.scene.r+2,
    label+' level '+level+' stays inside mobile scene horizontally');
  assert(value.art.t>=value.scene.t-2&&value.art.b<=value.scene.b+2,
    label+' level '+level+' stays inside scene vertically');
  return {back:value.back,crest:value.crest,wings:value.wings,fill:value.fill};
}
const files={};
for(const name of ['offline-support.js','styles.css','study-rooms.css','study-rooms-immersive.css','room-experience.css','room-experience.js','room-weather.js','room-wardrobe.js','study-rooms.js','room-chairs.css'])files[name]=fs.readFileSync(require('node:path').join(__dirname,'..',name),'utf8');
const fixture=[
  '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
  '<link href="/styles.css" rel="stylesheet"><link href="/study-rooms.css" rel="stylesheet"><link href="/study-rooms-immersive.css" rel="stylesheet"><link href="/room-experience.css" rel="stylesheet"><link href="/room-chairs.css" rel="stylesheet">',
  '<main class="main-area"><h1 id="pageTitle">Odalar</h1><section class="ataturk-corner" aria-label="Atatürk Köşesi">Atatürk Köşesi</section><section class="republic-hero">Cumhuriyet</section><section id="view"></section></main>',
  '<script>',
  'window.__batuId='+JSON.stringify(batuId)+';window.__uid="user-1";localStorage.setItem("sb-zyrbbkbwrijnnykbgjvc-auth-token",JSON.stringify({user:{id:window.__uid}}));',
  'window.__state={room:null,rooms:[],nextRoomId:1,studyingByRoom:{},startedByRoom:{},startCalls:{},stopCalls:{},selfStudying:false,seconds:12,other:false};window.__multiStart=false;window.HakunaRoomPreferences={startAll:()=>window.__multiStart};',
  'window.HakunaAccount={',
  'info:()=>({id:window.__uid}),open:()=>{window.__loginOpened=true},',
  'roomListen:()=>()=>{},roomLoadLook:async()=> (window.__uid===window.__batuId?window.__state.batuLook:window.__state.look)||{},roomSaveLook:async look=>{window.__state[window.__uid===window.__batuId?"batuLook":"look"]=look},',
  'roomRpc:async(name,args={})=>{',
  ' const s=window.__state,uid=window.__uid;',
  ' if(!uid)throw Error("Giriş gerekli");',
  ' if(name==="study_room_overview")return {rooms:s.rooms.filter(r=>r.is_active).map(r=>({...r,member_count:s.other?2:1,today_seconds:0,total_seconds:0,studying:!!s.studyingByRoom[r.id]})),total_seconds:s.seconds,today_seconds:s.seconds};',
  ' if(name==="study_room_create_v2"){const n=s.nextRoomId++;s.room={id:"room-"+n,owner_id:"user-1",name:args.p_name,invite_code:n===1?"K7MP4X9R":"K7MP4X"+String(n+70).slice(-2),focus_minutes:args.p_focus_minutes,break_minutes:args.p_break_minutes,mode:args.p_mode||"shared",phase:"idle",phase_started_at:null,is_active:true};s.rooms.push(s.room);s.selfStudying=false;s.startedAt=null;return s.room.id;}',
  ' if(name==="study_room_join"){const found=s.rooms.find(r=>r.invite_code===args.p_invite_code&&r.is_active);if(!found)throw Error("Geçersiz kod");s.room=found;return s.room.id;}',
  ' if(name==="study_room_touch")return true;',
  ' if(name==="study_room_snapshot"){const requested=s.rooms.find(r=>r.id===args.p_room_id);if(!requested)throw Error("Oda yok");s.room=requested;s.selfStudying=!!s.studyingByRoom[requested.id];s.startedAt=s.startedByRoom[requested.id]||null;return {room:{...s.room},members:[{user_id:"user-1",username:"Batu",look:s.look,seconds:s.seconds,today_seconds:s.seconds,studying:s.selfStudying,last_seen_at:new Date().toISOString(),active_started_at:s.startedAt||null,active_end_at:null,task_title:s.task||null},...(s.showBatu?[{user_id:window.__batuId,username:"Batu",look:s.batuLook,studying:true,seconds:40}]:[]),...(s.other?[{user_id:"user-2",username:"<img src=x onerror=alert(1)>",look:{top:"coogi",head:"headphones",face:"hoops",neck:"pendant",hand:"watch"},seconds:1200,today_seconds:1200,studying:!s.away,last_seen_at:new Date(Date.now()-120000).toISOString(),active_end_at:new Date(Date.now()+300000).toISOString()}]:[])],room_total_seconds:s.roomTotal,bloom_started_at:s.bloomStartedAt,server_now:new Date().toISOString()};}',
  ' if(name==="study_room_rename"){if(uid!==s.room.owner_id)throw Error("Not owner");s.room.name=args.p_name;return true;}',
  ' if(name==="study_room_configure"){s.room.focus_minutes=args.p_focus_minutes;s.room.break_minutes=args.p_break_minutes;s.room.mode=args.p_mode;return true;}',
  ' if(name==="study_room_set_phase"){s.room.phase=args.p_phase;s.room.phase_started_at=args.p_phase==="idle"?null:new Date(Date.now()+(args.p_phase==="focus"?3100:0)).toISOString();return true;}',
  ' if(name==="study_room_start"){const target=args.p_room_id; if(!s.rooms.some(r=>r.id===target&&r.is_active))throw Error("Oda yok");s.startCalls[target]=(s.startCalls[target]||0)+1;s.studyingByRoom[target]=true;const began=s.startedByRoom[target]||new Date().toISOString();s.startedByRoom[target]=began;if(s.room?.id===target){s.selfStudying=true;s.startedAt=began;s.task=args.p_task_title||null;}return {started_at:began,server_now:new Date().toISOString()};}',
  ' if(name==="study_room_stop"){const target=args.p_room_id;s.stopCalls[target]=(s.stopCalls[target]||0)+1;s.studyingByRoom[target]=false;delete s.startedByRoom[target];if(s.room?.id===target){s.selfStudying=false;s.startedAt=null;}s.seconds+=12;return 12;}',
  ' if(name==="study_room_close"){s.room.is_active=false;s.selfStudying=false;s.studyingByRoom[s.room.id]=false;delete s.startedByRoom[s.room.id];return true;}',
  ' if(name==="study_room_leave"){s.rooms=s.rooms.filter(r=>r.id!==s.room?.id);s.room=null;return true;}',
  ' throw Error("Unknown RPC "+name);',
  '}};',
  '</script><script src="/offline-support.js"></script><script src="/room-weather.js"></script><script src="/room-experience.js"></script><script src="/room-wardrobe.js"></script><script src="/study-rooms.js"></script>',
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
    assert.equal(await wardrobe.locator('[name=head] option[value=batu_thorn_crown]').count(),0);
    await wardrobe.getByRole('button',{name:'Vazgeç'}).click();
    await wardrobe.waitFor({state:'detached'});
    await page.evaluate(()=>{window.__uid=window.__batuId;window.dispatchEvent(new Event('hakuna-account-changed'));});
    await page.locator('[data-sr-action=wardrobe]').click();
    await wardrobe.locator('[name=top]').selectOption('palm');
    await wardrobe.getByRole('button',{name:'Aksesuar'}).click();
    await wardrobe.locator('[name=head]').selectOption('batu_thorn_crown');
    const crown=wardrobe.locator('[data-accessory=batu_thorn_crown]');
    await crown.waitFor();
    assert.equal(await crown.locator('linearGradient').count(),2);
    await wardrobe.getByRole('button',{name:'Kaydet'}).click();
    await wardrobe.waitFor({state:'detached'});
    await page.evaluate(()=>{window.__uid='user-1';window.dispatchEvent(new Event('hakuna-account-changed'));});
    await page.locator('[data-sr-action=wardrobe]').click();
    await wardrobe.locator('[name=top]').selectOption('velour');
    await wardrobe.getByRole('button',{name:'Aksesuar'}).click();
    await wardrobe.locator('[name=head]').selectOption('headphones');
    await wardrobe.locator('[name=hand]').selectOption('watch');
    await wardrobe.locator('[name=face]').selectOption('hoops');
    await wardrobe.locator('[name=neck]').selectOption('pendant');
    await wardrobe.getByRole('button',{name:'Karakter'}).click();
    await wardrobe.locator('[name=hair]').selectOption('buns');
    await wardrobe.locator('[name=skin]').selectOption('deep');
    const preview=wardrobe.locator('.sr-wardrobe-preview');
    const accessories=['headphones','hoops','pendant','watch'];
    for(const name of accessories)assert.equal(await preview.locator('[data-accessory='+name+']').count(),1);
    assert.equal(await preview.locator('.sr-avatar[data-hair=buns] .sr-accessory-art').count(),1);
    fs.mkdirSync('test-results',{recursive:true});
    await wardrobe.screenshot({path:'test-results/wardrobe-'+width+'.png'});
    await wardrobe.getByRole('button',{name:'Kaydet'}).click();
    await wardrobe.waitFor({state:'detached'});
    await page.locator('[data-sr-action=entry-create]').click();
    await page.locator('[data-sr-form=create] [name=name]').fill('Kütüphane Ekibi');
    await page.locator('[data-sr-form=create] button[type=submit]').click();
    await page.locator('[data-sr-room-title]').getByText('Kütüphane Ekibi').waitFor();
    assert.equal(await page.locator('[data-sr-invite]').textContent(),'K7MP-4X9R');
    await checkCoffeeOnTable(page,label+' shared room');
    for(const name of accessories)assert.equal(await page.locator('.sr-roster [data-accessory='+name+']').count(),1);
    assert.equal(await page.locator('[data-sr-action=wardrobe]').count(),0);
    await page.evaluate(()=>{window.__state.showBatu=true;window.dispatchEvent(new Event('online'));});
    const batuDesk=page.locator('[data-sr-user="'+batuId+'"] .sr-desk-scene');
    await batuDesk.locator('[data-accessory=batu_thorn_crown]').waitFor();
    assert.equal(await page.evaluate(()=>window.__uid),'user-1');
    await batuDesk.screenshot({path:'test-results/thorn-crown-'+width+'.png'});
    await page.evaluate(()=>{window.__state.showBatu=false;window.dispatchEvent(new Event('online'));});
    await batuDesk.waitFor({state:'detached'});

    const chair=page.locator('[data-sr-user="user-1"] [data-chair-level]');
    assert.equal(await chair.getAttribute('data-chair-level'),'0');
    const initialBack=await chair.locator('[data-seat-part="back"]').getAttribute('d');
    // Every milestone must change the actual chair silhouette, not only its colour.
    const chairHours=[0,10,20,30,40,50,65,85,110,150,220,320];
    const visualProfiles=[];
    for(let level=0;level<chairHours.length;level++){
      await page.evaluate(hours=>{window.__state.seconds=hours*3600;window.dispatchEvent(new Event('online'));},chairHours[level]);
      await page.waitForFunction(expected=>
        document.querySelector('[data-sr-user="user-1"] [data-chair-level]')?.dataset.chairLevel===String(expected),
        level);
      // Wait for width/height/armrest CSS transitions before checking final geometry.
      await page.waitForTimeout(500);
      visualProfiles.push(await verifyFantasyThrone(page,label,level));
      if([0,3,5,8,11].includes(level)){
        await page.locator('[data-sr-user="user-1"] .sr-desk-scene')
          .screenshot({path:'test-results/sculpted-chair-'+level+'-'+width+'.png'});
      }
    }
    assert.equal(new Set(visualProfiles.map(p=>p.back)).size,12,
      label+': all twelve throne silhouettes have distinct contour paths');
    assert.equal(new Set(visualProfiles.map(p=>p.crest)).size,12,
      label+': all twelve throne levels also have unique rune or crown ornaments');
    // Restore the entry-level chair before the older scene/clock regressions.
    await page.evaluate(()=>{window.__state.seconds=12;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>
      document.querySelector('[data-sr-user="user-1"] [data-chair-level]')?.dataset.chairLevel==='0');
    await page.locator('.sr-chair-guide summary').click();
    await page.getByText('320 sa ve üzeri',{exact:true}).waitFor();
    await page.locator('.sr-chair-guide summary').click();
    await page.evaluate(()=>{window.__state.seconds=180000;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.querySelector('[data-sr-user="user-1"] [data-chair-level]')?.dataset.chairLevel==='5');
    await page.waitForFunction(first=>document.querySelector('[data-sr-user="user-1"] [data-seat-part="back"]')?.getAttribute('d')!==first,initialBack);
    await page.locator('[data-sr-user="user-1"] .sr-desk-scene').screenshot({path:'test-results/throne-'+width+'.png'});
    await page.evaluate(()=>{window.__state.seconds=320*3600;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.querySelector('[data-sr-user="user-1"] [data-chair-level]')?.dataset.chairLevel==='11');
    await page.locator('[data-sr-user="user-1"] .sr-desk-scene').screenshot({path:'test-results/imperial-'+width+'.png'});
    await page.evaluate(()=>{window.__state.roomTotal=400*3600;window.__state.bloomStartedAt=new Date().toISOString();window.dispatchEvent(new Event('online'));});
    const bloomTimer=page.locator('[data-sx-bloom-timer]');
    await bloomTimer.waitFor();
    assert.match(await bloomTimer.textContent(),/^(24:00:00|23:59:[0-5][0-9])$/);
    const fits=await page.locator('.sx-horizon').evaluate(panel=>{
      const outer=panel.getBoundingClientRect();
      const flower=panel.querySelector('.sx-flower').getBoundingClientRect();
      const timer=panel.querySelector('[data-sx-bloom-timer]').getBoundingClientRect();
      return timer.top>=outer.top&&timer.bottom<=flower.top&&flower.right<=outer.right;
    });
    assert(fits,'flower and countdown fit without overlapping');
    await page.locator('.sx-horizon').screenshot({path:'test-results/bloom-'+width+'.png'});
    await page.evaluate(()=>{window.__state.bloomStartedAt=new Date(Date.now()-86401000).toISOString();window.dispatchEvent(new Event('online'));});
    await page.locator('[data-sx-dragon]').waitFor();
    await bloomTimer.waitFor({state:'hidden'});
    await page.locator('.sx-horizon').screenshot({path:'test-results/dragon-'+width+'.png'});
    await page.evaluate(()=>{window.__state.seconds=12;delete window.__state.roomTotal;delete window.__state.bloomStartedAt;window.dispatchEvent(new Event('online'));});
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
    assert.equal(await page.evaluate(()=>window.HakunaOffline.roomLaunch().entries[0]?.room.id),'room-1');
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
    assert.equal(await friend.locator('.sr-desk-away .sr-scene-chair').count(),1,'away peer keeps their chair');
    assert.equal(await friend.locator('.sr-desk-away .sr-vacant').count(),0,'no second chair icon');
    assert.equal(await friend.locator('.sr-avatar').count(),0);
    await page.evaluate(()=>window.__state.away=false);
    await page.locator('[data-sr-action=stop]').click();
    assert(await page.locator('[data-sr-action=start]').isEnabled(),'resume after a personal break');
    assert.equal(await page.evaluate(()=>window.HakunaOffline.roomLaunch().entries.length),0);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(overflow,false,'study room must not overflow viewport at '+width);
    await page.evaluate(()=>{window.__state.seconds=12*3600;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.querySelector('[data-sx-plant]')?.dataset.stage==='1');
    assert.equal(await page.locator('.sx-leaf.is-grown').count(),1);
    assert.equal(await page.locator('.sr-person').first().getAttribute('data-sr-user'),'user-1','ranks update when a member takes the lead');
    await page.locator('[data-sx=desk]').click();
    assert.equal(await page.locator('.sx-my-desk .sx-self').count(),1);
    await checkCoffeeOnTable(page,label+' zoomed desk');
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
    assert.equal(await page.locator('.sr-roster .sr-avatar[data-hair=buns]').count(),1,'saved look persists on room re-entry');
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
    // A user can create two rooms, run a focus session in both, and switch
    // between their rooms without cancelling the other room's session.
    await page.locator('[data-sr-action=start]').click();
    await page.locator('[data-sr-action=stop]').waitFor();
    const firstMultiRoom=await page.evaluate(()=>window.__state.room.id);
    await page.locator('[data-sr-action=create-next]').click();
    await page.locator('[data-sr-form=create]:visible').waitFor();
    assert((await page.locator('[data-sr-list]').textContent()).includes('Çevrimdışı hava'));
    assert((await page.locator('[data-sr-list]').textContent()).includes('Çalışıyorsun'));
    await page.locator('[data-sr-form=create] [name=name]').fill('İkinci Kütüphane');
    await page.locator('[data-sr-form=create] button[type=submit]').click();
    await page.locator('[data-sr-room-title]').getByText('İkinci Kütüphane').waitFor();
    const secondMultiRoom=await page.evaluate(()=>window.__state.room.id);
    assert.notEqual(firstMultiRoom,secondMultiRoom,'second room must be independent');
    await page.locator('[data-sr-action=start]').click();
    await page.locator('[data-sr-action=stop]').waitFor();
    assert.deepEqual(await page.evaluate(()=>Object.entries(window.__state.studyingByRoom)
      .filter(([id,active])=>active).map(([id])=>id).sort()),[firstMultiRoom,secondMultiRoom].sort(),
      'both independent room sessions must remain active');
    await page.locator('[data-sr-action=back]').click();
    await page.locator('[data-sr-action=open]').first().waitFor();
    assert.equal(await page.locator('[data-sr-action=open]').count(),2,'both rooms are retained in the lobby');
    await page.locator('[data-sr-action=open]').filter({hasText:'Çevrimdışı hava'}).click();
    await page.locator('[data-sr-room-title]').getByText('Çevrimdışı hava').waitFor();
    await page.locator('[data-sr-action=stop]').waitFor();
    await page.locator('[data-sr-action=stop]').click();
    assert.equal(await page.evaluate(id=>window.__state.studyingByRoom[id],secondMultiRoom),true,
      'stopping one room must leave the other running');
    await page.locator('[data-sr-action=back]').click();
    await page.locator('[data-sr-action=open]').filter({hasText:'İkinci Kütüphane'}).click();
    await page.locator('[data-sr-action=stop]').waitFor();
    await page.locator('[data-sr-action=stop]').click();
    assert.equal(await page.evaluate(()=>window.__state.rooms.filter(r=>r.is_active).length),2,
      'two simultaneously joined rooms must remain active');
    // OFF by default: starting a room must never start another.
    const initialStartCounts=await page.evaluate(()=>({...window.__state.startCalls}));
    await page.locator('[data-sr-action=start]').click();
    await page.locator('[data-sr-action=stop]').waitFor();
    assert.equal(await page.evaluate(id=>!!window.__state.studyingByRoom[id],firstMultiRoom),false,
      'OFF preference must keep the other room stopped');
    assert.equal(await page.evaluate(id=>window.__state.startCalls[id]||0,firstMultiRoom),
      initialStartCounts[firstMultiRoom]||0,'OFF must not invoke a secondary room start');
    await page.locator('[data-sr-action=stop]').click();
    await page.locator('[data-sr-action=start]').waitFor();

    // ON: a start in one room begins all joined rooms.
    await page.evaluate(()=>{window.__multiStart=true;});
    await page.locator('[data-sr-action=start]').click();
    await page.waitForFunction(([a,b])=>
      window.__state.studyingByRoom[a]&&window.__state.studyingByRoom[b],
      [firstMultiRoom,secondMultiRoom]);

    // ON: pausing one must stop both active sessions, including the other room.
    await page.locator('[data-sr-action=stop]').click();
    await page.waitForFunction(([a,b])=>
      window.__state.studyingByRoom[a]===false&&window.__state.studyingByRoom[b]===false,
      [firstMultiRoom,secondMultiRoom]);

    // Already-running rooms must never be restarted on group start.
    await page.evaluate(id=>{
      window.__state.studyingByRoom[id]=true;
      window.__state.startedByRoom[id]=new Date().toISOString();
    },firstMultiRoom);
    const firstCountBefore=await page.evaluate(id=>window.__state.startCalls[id],firstMultiRoom);
    await page.locator('[data-sr-action=start]').waitFor();
    await page.locator('[data-sr-action=start]').click();
    await page.locator('[data-sr-action=stop]').waitFor();
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(id=>window.__state.startCalls[id],firstMultiRoom),firstCountBefore,
      'group start must not restart already working rooms');
    await page.locator('[data-sr-action=stop]').click();
    await page.waitForFunction(([a,b])=>
      window.__state.studyingByRoom[a]===false&&window.__state.studyingByRoom[b]===false,
      [firstMultiRoom,secondMultiRoom]);

    // A rapid pause immediately after starting must not leave late-started rooms running.
    await page.locator('[data-sr-action=start]').waitFor();
    await page.locator('[data-sr-action=start]').click();
    await page.locator('[data-sr-action=stop]').waitFor();
    await page.locator('[data-sr-action=stop]').click();
    await page.waitForFunction(([a,b])=>
      window.__state.studyingByRoom[a]===false&&window.__state.studyingByRoom[b]===false,
      [firstMultiRoom,secondMultiRoom]);

    // Turning the switch off restores independent start AND stop.
    await page.locator('[data-sr-action=start]').waitFor();
    await page.locator('[data-sr-action=start]').click();
    await page.waitForFunction(([a,b])=>
      window.__state.studyingByRoom[a]&&window.__state.studyingByRoom[b],
      [firstMultiRoom,secondMultiRoom]);
    await page.evaluate(()=>{window.__multiStart=false;});
    await page.locator('[data-sr-action=stop]').click();
    await page.locator('[data-sr-action=start]').waitFor();
    assert.equal(await page.evaluate(id=>window.__state.studyingByRoom[id],firstMultiRoom),true,
      'with the setting OFF, pausing the current room leaves the other running');
    await page.locator('[data-sr-action=back]').click();
    await page.locator('[data-sr-action=open]').filter({hasText:'Çevrimdışı hava'}).click();
    await page.locator('[data-sr-action=stop]').waitFor();
    await page.locator('[data-sr-action=stop]').click();
    await page.locator('[data-sr-action=start]').waitFor();
    assert.equal(await page.evaluate(id=>window.__state.studyingByRoom[id],secondMultiRoom),false,
      'the second room remains stopped with the switch OFF');

    assert.equal(errors.length,0,'Page errors: '+errors.join(', '));
    console.log('PASS '+label+': room creation, shared clock, timer, roster security, presets, close, responsive layout');
  }finally{await context.close();await browser.close();}
 }
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
