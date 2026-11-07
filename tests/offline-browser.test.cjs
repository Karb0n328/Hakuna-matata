const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const p=decodeURIComponent(req.url.split('?')[0]);const f=path.join(root,p==='/'?'index.html':p);if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const body=fs.readFileSync(f);res.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream','Cache-Control':'no-cache'});res.end(body);}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();const context=await browser.newContext();let page,resumeContext;
try{
 await context.route('https://**/*',r=>r.abort());
 page=await context.newPage();const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base);await page.waitForSelector('[data-nav=plan]');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.evaluate(async()=>{
  const today=new Date().toLocaleDateString('en-CA'),now=new Date().toISOString();
  function put(dbName,store,key,value){return new Promise((resolve,reject)=>{const req=indexedDB.open(dbName,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(store))req.result.createObjectStore(store)};req.onsuccess=()=>{const db=req.result,tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};req.onerror=()=>reject(req.error)});}
  await put('hakuna-matata-db','app','state',{version:3,selectedDate:today,blocks:[{id:'b1',date:today,start:'09:00',end:'09:50',subject:'Matematik',title:'Çevrimdışı program',status:'planned',createdAt:now}],tasks:[],debts:[],exams:[],questions:[{id:'q1',subject:'Matematik',topic:'Çevrimdışı soru',source:'Test',reference:'42',status:'open',hasPhoto:true,createdAt:now,photoAddedAt:now}],settings:{firstRun:false}});
  const canvas=document.createElement('canvas');canvas.width=50;canvas.height=50;canvas.getContext('2d').fillRect(0,0,50,50);const blob=await new Promise(r=>canvas.toBlob(r));await put('hakuna-question-image-cache','photos','q1',{v:2,bytes:await blob.arrayBuffer(),type:blob.type});
  // Reproduce an upgraded worker having only unversioned core cached.
  for(const k of await caches.keys()){const cache=await caches.open(k);for(const request of await cache.keys()){const url=new URL(request.url);if(url.pathname.endsWith('/app.js')&&url.search)await cache.delete(request);}}
 });
 await context.setOffline(true);await page.close();page=await context.newPage();
 await page.goto(base);await page.waitForSelector('[data-nav=plan]');
 assert(await page.evaluate(async()=>{const r=await fetch('./yks-programs.json?v=2026-3');return r.ok&&!!(await r.json())}),'local ranking data should be cached');
 await page.locator('#sidebarNav [data-nav=plan]').click();await page.locator('[data-plan-block=b1]').waitFor();
 await page.locator('#sidebarNav [data-nav=questions]').click();await page.getByText('Çevrimdışı soru',{exact:false}).first().waitFor();
 await page.locator('#sidebarNav [data-nav=books]').click();
 await page.waitForFunction(()=>{const img=document.querySelector('[data-book-preview=q1]');return img?.complete&&img.naturalWidth===50});
 await page.locator('#sidebarNav [data-nav=tasks]').click();await page.locator('[data-add-task]').click();await page.locator('#taskForm [name=title]').fill('İnternetsiz ekledim');await page.locator('#taskForm .primary-btn').click();
 await page.getByText('İnternetsiz ekledim',{exact:false}).first().waitFor();
 for(const tab of ['rooms','suggestions']){await page.locator('#sidebarNav [data-nav='+tab+']').click();await page.getByText('İnternet bağlantısı gerekiyor',{exact:true}).waitFor();}
 await page.reload();await page.locator('#sidebarNav [data-nav=tasks]').click();await page.getByText('İnternetsiz ekledim',{exact:false}).first().waitFor();
 // A cached student plan remains readable and is isolated from another account.
 await page.evaluate(async()=>{localStorage.setItem('sb-zyrbbkbwrijnnykbgjvc-auth-token',JSON.stringify({access_token:'test',user:{id:'test-student'}}));const k='hakuna.offline.read.v1.test-student.plan';localStorage.setItem(k,JSON.stringify({data:[{title:'Kayıtlı program'}]}));const data=await window.HakunaOffline.read('plan',()=>{throw Error('must not fetch')});if(data[0].title!=='Kayıtlı program')throw Error('missing offline plan');localStorage.setItem('sb-zyrbbkbwrijnnykbgjvc-auth-token',JSON.stringify({access_token:'test',user:{id:'another'}}));let blocked=false;try{await window.HakunaOffline.read('plan',()=>{})}catch{blocked=true}if(!blocked)throw Error('cache leaked across accounts');localStorage.removeItem('sb-zyrbbkbwrijnnykbgjvc-auth-token');});
 await context.setOffline(false);await page.reload();await page.locator('#sidebarNav [data-nav=tasks]').click();await page.getByText('İnternetsiz ekledim',{exact:false}).first().waitFor();
 await page.waitForFunction(()=>typeof window.HakunaRoomNotifications?.enable==='function');
 await page.locator('#sidebarNav [data-nav=settings]').click();
 await page.evaluate(()=>{window.HakunaRoomNotifications.enable=async()=>{window.__notificationsEnabled=true};});
 await page.locator('[data-enable-notifications]').click();
 await page.getByText('Bu cihazda bildirimler açık.',{exact:true}).waitFor();
 assert(await page.evaluate(()=>window.__notificationsEnabled));

 // Isolate startup from the real worker's cached auth dependencies.
 resumeContext=await browser.newContext({serviceWorkers:'block'});
 await resumeContext.route('https://**/*',r=>r.abort());
 await resumeContext.route('**/account-sync-v2.js?*',route=>route.fulfill({
  contentType:'text/javascript',body:"window.HakunaAccount={info:()=>({id:null})};window.dispatchEvent(new Event('hakuna-account-changed'));"
 }));
 page=await resumeContext.newPage();
 await page.goto(base);
 await page.waitForSelector('[data-nav=plan]');
 // An already active room must be the first real view even with the cloud blocked.
 await page.addInitScript(()=>{
  window.__launchTitles=[];
  new MutationObserver(()=>{
   const title=document.querySelector('#pageTitle')?.textContent;
   if(title&&window.__launchTitles.at(-1)!==title)window.__launchTitles.push(title);
  }).observe(document,{subtree:true,childList:true,characterData:true});
 });
 await page.evaluate(()=>{
  const user='resume-student',now=Date.now();
  const room={id:'active-room',name:'Doğrudan açılan oda',owner_id:user,invite_code:'K7MP4X9R',
   is_active:true,mode:'free',phase:'idle',focus_minutes:50,break_minutes:10,member_count:1,studying:true};
  const member={user_id:user,username:'Öğrenci',studying:true,active_started_at:new Date(now-125000).toISOString(),seconds:125};
  localStorage.setItem('sb-zyrbbkbwrijnnykbgjvc-auth-token',JSON.stringify({user:{id:user}}));
  window.HakunaOffline.saveRoomLaunch(user,[{room,snapshot:{room,members:[member],server_now:new Date(now).toISOString()}}]);
 });
 await page.reload();
 await page.getByRole('heading',{name:'Doğrudan açılan oda'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__launchTitles),['Odalar']);
 assert.match(await page.locator('[data-sr-clock]').textContent(),/^00:02:/);
 assert.equal(await page.locator('[data-hakuna-boot-placeholder],.sr-loading').count(),0);
 await page.evaluate(()=>{
  const {user,entries}=window.HakunaOffline.roomLaunch();
  window.HakunaOffline.saveRoomLaunch(user,[...entries,{room:{...entries[0].room,id:'another-room',name:'İkinci etüt'}}]);
 });
 await page.reload();
 await page.getByRole('button',{name:/İkinci etüt/}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__launchTitles),['Odalar']);
 assert.equal(await page.locator('.sr-room').count(),0);
 await page.evaluate(()=>localStorage.setItem('sb-zyrbbkbwrijnnykbgjvc-auth-token',JSON.stringify({user:{id:'another-account'}})));
 await page.reload();
 await page.getByRole('heading',{name:'Bugün',exact:true}).first().waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__launchTitles),['Bugün']);

 console.log('PASS real service worker installation, cold offline launch, unversioned core fallback, local photo, plan, task persistence, online-only tabs, account-scoped snapshots and reconnect');
}catch(e){fs.mkdirSync('test-results',{recursive:true});if(page&&!page.isClosed()){console.log('OFFLINE FAILURE VIEW',await page.locator('body').innerText());await page.screenshot({path:'test-results/offline-failure.png',fullPage:true});}throw e;}finally{await resumeContext?.close();await context.close();await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
