const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const files={};
for(const name of ['styles.css','study-rooms.css','study-rooms.js'])files[name]=fs.readFileSync(require('node:path').join(__dirname,'..',name),'utf8');
const fixture=[
  '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
  '<link href="/styles.css" rel="stylesheet"><link href="/study-rooms.css" rel="stylesheet">',
  '<main class="main-area"><h1 id="pageTitle">Odalar</h1><section id="view"></section></main>',
  '<script>',
  'window.__uid="user-1";',
  'window.__state={room:null,selfStudying:false,seconds:0,other:false};',
  'window.HakunaAccount={',
  'info:()=>({id:window.__uid}),open:()=>{window.__loginOpened=true},',
  'roomListen:()=>()=>{},',
  'roomRpc:async(name,args={})=>{',
  ' const s=window.__state,uid=window.__uid;',
  ' if(!uid)throw Error("Giriş gerekli");',
  ' if(name==="study_room_overview")return {rooms:s.room?.is_active?[{...s.room,member_count:s.other?2:1}]:[],total_seconds:s.seconds,today_seconds:s.seconds};',
  ' if(name==="study_room_create_v2"){s.room={id:"room-1",owner_id:"user-1",name:args.p_name,invite_code:"ABCDEF123456789012",focus_minutes:args.p_focus_minutes,break_minutes:args.p_break_minutes,mode:args.p_mode||"shared",phase:"idle",phase_started_at:null,is_active:true};return s.room.id;}',
  ' if(name==="study_room_join"){if(args.p_invite_code!==s.room?.invite_code)throw Error("Geçersiz kod");return s.room.id;}',
  ' if(name==="study_room_touch")return true;',
  ' if(name==="study_room_snapshot"){if(!s.room)throw Error("Oda yok");return {room:{...s.room},members:[{user_id:"user-1",username:"Batu",seconds:s.seconds,today_seconds:s.seconds,studying:s.selfStudying,last_seen_at:new Date().toISOString(),active_end_at:s.selfStudying?new Date(Date.now()+300000).toISOString():null,task_title:s.task||null},...(s.other?[{user_id:"user-2",username:"<img src=x onerror=alert(1)>",seconds:1200,today_seconds:1200,studying:true,last_seen_at:new Date(Date.now()-(s.away?120000:0)).toISOString(),active_end_at:new Date(Date.now()+300000).toISOString()}]:[])],server_now:new Date().toISOString()};}',
  ' if(name==="study_room_configure"){s.room.focus_minutes=args.p_focus_minutes;s.room.break_minutes=args.p_break_minutes;s.room.mode=args.p_mode;return true;}',
  ' if(name==="study_room_set_phase"){s.room.phase=args.p_phase;s.room.phase_started_at=args.p_phase==="idle"?null:new Date(Date.now()+(args.p_phase==="focus"?3100:0)).toISOString();if(args.p_phase!=="focus")s.selfStudying=false;return true;}',
  ' if(name==="study_room_start"){if(s.room.phase!=="focus")throw Error("Mola sayılmaz");s.selfStudying=true;s.task=args.p_task_title||null;return {server_now:new Date().toISOString()};}',
  ' if(name==="study_room_stop"){s.selfStudying=false;s.seconds+=12;return 12;}',
  ' if(name==="study_room_close"){s.room.is_active=false;s.selfStudying=false;return true;}',
  ' if(name==="study_room_leave"){s.room=null;return true;}',
  ' throw Error("Unknown RPC "+name);',
  '}};',
  '</script><script src="/study-rooms.js"></script>',
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
    await page.goto(base);
    await page.locator('[data-sr-form=create]').waitFor();
    await page.evaluate(()=>new Promise((resolve,reject)=>{
      const req=indexedDB.open('hakuna-matata-db',1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('app'))req.result.createObjectStore('app');};
      req.onerror=()=>reject(req.error);
      req.onsuccess=()=>{
        const db=req.result,tx=db.transaction('app','readwrite');
        tx.objectStore('app').put({tasks:[{id:'task-1',title:'Organik Kimya Testi',completed:false}]},'state');
        tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
      };
    }));
    await page.locator('[data-sr-form=create] [name=name]').fill('Kütüphane Ekibi');
    await page.locator('[data-sr-form=create] button[type=submit]').click();
    await page.locator('[data-sr-room-title]').getByText('Kütüphane Ekibi').waitFor();
    assert.equal(await page.locator('[data-sr-invite]').textContent(),'ABCDEF123456789012');
    assert.equal(await page.locator('.sr-person').count(),1);
    await page.locator('[data-sr-action=focus]').click();
    await page.locator('[data-sr-countdown]').waitFor({state:'visible'});
    await page.locator('[data-sr-action=start]').waitFor({state:'visible'});
    assert(await page.locator('[data-sr-action=start]').isDisabled(),'Start must be disabled before the synchronized countdown ends');
    await page.locator('[data-sr-countdown]').waitFor({state:'hidden',timeout:9000});
    await page.locator('[data-sr-task]').selectOption('Organik Kimya Testi');
    await page.locator('[data-sr-action=start]').click();
    await page.locator('.sr-person-working').waitFor();
    assert((await page.locator('[data-sr-own-status]').textContent()).includes('sayılıyor'));
    assert((await page.locator('.sr-person-task').textContent()).includes('Organik Kimya Testi'));
    await page.evaluate(()=>window.__state.other=true);
    await page.locator('[data-sr-action=idle]').click();
    await page.locator('[data-sr-action=focus]').click();
    await page.locator('.sr-person').first().waitFor();
    // Force a fresh server snapshot to check XSS escaping and animated study desks.
    await page.evaluate(()=>window.dispatchEvent(new Event('online')));
    await page.locator('.sr-person').nth(1).waitFor();
    assert.equal(await page.locator('.sr-roster img').count(),0,'username must never inject HTML');
    assert((await page.locator('.sr-roster').textContent()).includes('<img src=x onerror=alert(1)>'));
    await page.evaluate(()=>{window.__state.away=true;window.dispatchEvent(new Event('online'));});
    await page.locator('.sr-person-away').waitFor();
    assert(await page.locator('.sr-person-away .sr-vacant').count()===1,'Offline member should have an empty desk');
    await page.evaluate(()=>window.__state.away=false);
    await page.locator('[data-sr-action=break]').click();
    await page.locator('[data-sr-action=start]').waitFor();
    assert(await page.locator('[data-sr-action=start]').isDisabled(),'break must disable study start');
    await page.locator('[data-sr-action=idle]').click();
    await page.locator('[data-sr-form=settings] [name=focus]').fill('40');
    await page.locator('[data-sr-form=settings] [name=break]').fill('5');
    await page.locator('[data-sr-form=settings] button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('[data-sr-room-meta]')?.textContent.includes('40 dk'));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(overflow,false,'study room must not overflow viewport at '+width);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-sr-action=close]').click();
    // browser dialog may race the click above, so wait for room list after it resolves.
    await page.locator('[data-sr-form=create]').waitFor({timeout:10000});
    await page.locator('[data-sr-form=create] [name=name]').fill('Serbest Test');
    await page.locator('[data-sr-form=create] [name=mode]').selectOption('free');
    await page.locator('[data-sr-form=create] button[type=submit]').click();
    await page.locator('[data-sr-room-mode]').getByText('SERBEST ÇALIŞMA').waitFor();
    await page.locator('[data-sr-action=start]').click();
    await page.locator('.sr-person-working').waitFor();
    assert((await page.locator('[data-sr-room-mode]').textContent()).includes('SERBEST'));
    await page.locator('[data-sr-action=stop]').click();
    await page.locator('[data-sr-action=start]').waitFor();
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-sr-action=close]').click();
    await page.locator('[data-sr-form=create]').waitFor();
    assert.equal(errors.length,0,'Page errors: '+errors.join(', '));
    console.log('PASS '+label+': room creation, shared clock, timer, roster security, presets, close, responsive layout');
  }finally{await context.close();await browser.close();}
 }
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
