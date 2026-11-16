const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const p=decodeURIComponent(req.url.split('?')[0]);const f=path.join(root,p==='/'?'index.html':p);if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const body=fs.readFileSync(f);res.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream','Cache-Control':'no-cache'});res.end(body);}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();const context=await browser.newContext();let page,resumeContext,restoreBrowser;
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

 // Settings > Odalar is a compact, persisted, opt-in room preference.
 const roomToggle=page.locator('#settingsRoomStartTogether');
 await roomToggle.waitFor();
 assert.equal(await roomToggle.isChecked(),false,'other rooms must not auto-start by default');
 assert.equal(await page.evaluate(()=>window.HakunaRoomPreferences.startAll()),false);
 await roomToggle.check();
 assert.equal(await page.evaluate(()=>window.HakunaRoomPreferences.startAll()),true);
 await page.locator('#sidebarNav [data-nav=tasks]').click();
 await page.locator('#sidebarNav [data-nav=settings]').click();
 assert.equal(await page.locator('#settingsRoomStartTogether').isChecked(),true,
   'settings switch remains on when navigating away');
 await page.reload();
 await page.locator('#sidebarNav [data-nav=settings]').click();
 assert.equal(await page.locator('#settingsRoomStartTogether').isChecked(),true,
   'settings preference persists across reload');
 await page.locator('#settingsRoomStartTogether').uncheck();
 assert.equal(await page.evaluate(()=>window.HakunaRoomPreferences.startAll()),false,
   'turning the setting off immediately restores independent rooms');

 // Group selection is saved through the real settings page and read back on reload.
 await page.evaluate(()=>{
  window.HakunaAccount={
   info:()=>({id:'group-settings-test'}),
   roomRpc:async()=>({rooms:[
    {id:'a',name:'Birinci oda'},{id:'b',name:'İkinci oda'},{id:'c',name:'Bağımsız oda'},
    {id:'old',name:'Kapanmış oda',is_active:false}
   ]})
  };
 });
 await page.locator('#settingsRoomStartTogether').check();
 await page.locator('[data-room-group] summary').click();
 const manual=page.getByRole('checkbox',{name:'Bağımsız oda',exact:true});
 await manual.uncheck();
 assert.equal(await page.getByRole('checkbox',{name:'Kapanmış oda',exact:true}).count(),0);
 await page.getByRole('button',{name:'Seçimi kaydet'}).click();
 await page.getByText('2 oda seçildi.',{exact:true}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.HakunaRoomPreferences.selectedIds()),['a','b']);
 await page.reload();
 await page.locator('#sidebarNav [data-nav=settings]').click();
 assert.deepEqual(await page.evaluate(()=>window.HakunaRoomPreferences.selectedIds()),['a','b']);
 await page.locator('#settingsRoomStartTogether').uncheck();

 // A failed crop upload must not starve the next photo, and retries skip confirmed files.
 const uploads=await page.evaluate(async()=>{
  const owner='photo-test';
  const key='hakuna.cloud.localOwner';
  localStorage.setItem(key,owner);
  const calls=[];
  let fails=true;
  window.HakunaAccount={info:()=>({id:owner}),photoUpload:async id=>{
   calls.push(id);
   if(id==='q1'&&fails)throw Error('Simulated upload failure');
  }};
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open('hakuna-question-image-cache',1);
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('photos','readwrite'),store=tx.objectStore('photos');
   const request=store.get('q1');
   request.onsuccess=()=>store.put(request.result,'q2');
   tx.oncomplete=resolve;
   tx.onabort=()=>reject(tx.error);
  });
  db.close();
  const state={questions:[{id:'q1',hasPhoto:true},{id:'q2',hasPhoto:true}]};
  await window.HakunaQuestionBooks.syncPending(state);
  const pending=await window.HakunaQuestionBooks.pendingLocalPhotos(state,owner);
  fails=false;
  await window.HakunaQuestionBooks.syncPending(state);
  localStorage.removeItem(key);
  return {calls,pending};
 });
 assert.deepEqual(uploads,{calls:['q1','q2','q1'],pending:1});

 // Store both renditions, simulate a failed original upload, then restore in fresh WebKit storage.
 const photos=await page.evaluate(async()=>{
  const owner='new-photo-test',id='q-compression';
  const canvas=document.createElement('canvas');
  canvas.width=4000;canvas.height=2500;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,4000,2500);
  const band=ctx.createImageData(4000,160);
  let seed=42;
  for(let i=0;i<band.data.length;i+=4){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   band.data[i]=seed>>>24;band.data[i+1]=(seed>>>16)&255;
   band.data[i+2]=(seed>>>8)&255;band.data[i+3]=255;
  }
  ctx.putImageData(band,0,0);
  ctx.fillStyle='#202020';ctx.font='44px sans-serif';
  for(let y=250;y<2400;y+=65)ctx.fillText('Matematik • 12. soru   x² + y² = 25',240,y);
  const input=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const file=new File([input],'test.png',{type:'image/png'});
  const editor={
   getSourceFile:()=>file,hasNewSource:()=>true,getImageOptions:()=>({left:10,right:10,top:12,bottom:12}),
   querySelector:()=>null
  };
  const books=window.HakunaQuestionBooks;
  const state={questions:[{id,hasPhoto:true}]};
  localStorage.setItem('hakuna.cloud.localOwner',owner);
  let failOriginal=true;
  const calls=[],objects={};
  window.HakunaAccount={info:()=>({id:owner}),photoUpload:async(key,blob)=>{
   calls.push(key);
   if(key.endsWith('__original')&&failOriginal)throw Error('Simulated original upload failure');
   const image=await createImageBitmap(blob);
   const data=await new Promise(resolve=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.readAsDataURL(blob);
   });
   objects[key]={data,width:image.width,height:image.height,size:blob.size,type:blob.type};
   image.close();
  }};
  await books.savePhoto({querySelector:()=>editor,dispatchEvent:()=>{}},id,false);
  await books.syncPending(state);
  const pending=await books.pendingLocalPhotos(state,owner);
  failOriginal=false;
  await books.syncPending(state);
  return {calls,objects,pending,remaining:await books.pendingLocalPhotos(state,owner),sourceSize:input.size};
 });
 assert.deepEqual(photos.calls,['q-compression','q-compression__original','q-compression__original']);
 assert.equal(photos.pending,1);
 assert.equal(photos.remaining,0);
 const crop=photos.objects['q-compression'],original=photos.objects['q-compression__original'];
 assert.equal(crop.type,'image/jpeg');
 assert.equal(original.type,'image/jpeg');
 assert.equal(original.width,3200);
 assert.equal(original.height,2000);
 assert(crop.width<original.width&&crop.height<original.height);
 assert(crop.size+original.size<1.5*1024*1024);
 assert(original.size<photos.sourceSize);

 restoreBrowser=await webkit.launch();
 const restoreContext=await restoreBrowser.newContext({serviceWorkers:'block'});
 await restoreContext.route('https://**/*',r=>r.abort());
 await restoreContext.route('**/account-sync-v2.js?*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 const restored=await restoreContext.newPage();
 await restored.goto(base);
 await restored.waitForFunction(()=>!!window.HakunaQuestionBooks);
 await restored.evaluate(({crop,original})=>{
  window.HakunaAccount={
   info:()=>({id:'new-photo-test'}),
   photoDownload:async key=>(await fetch(key.endsWith('__original')?original.data:crop.data)).blob()
  };
  const form=document.createElement('form');
  form.id='restore-photo-test';
  form.style.cssText='position:fixed;inset:0;z-index:100000;overflow:auto;background:white';
  document.body.append(form);
  window.HakunaQuestionBooks.mountQuestionForm(form,{id:'q-compression',hasPhoto:true});
 },{crop,original});
 await restored.waitForFunction(width=>document.querySelector('#restore-photo-test [data-book-existing]')?.naturalWidth===width,crop.width);
 await restored.locator('#restore-photo-test [data-book-restore-original]').click();
 await restored.waitForFunction(()=>document.querySelector('#restore-photo-test [data-crop-ready="1"]'));
 const recrop=await restored.evaluate(async()=>{
  const form=document.querySelector('#restore-photo-test');
  const editor=form.querySelector('[data-book-image-editor]');
  const recovered=editor.getSourceFile();
  const url=URL.createObjectURL(recovered),decoded=new Image();
  try{
   await new Promise((resolve,reject)=>{decoded.onload=resolve;decoded.onerror=reject;decoded.src=url;});
  }finally{URL.revokeObjectURL(url);}
  const result={newSource:editor.hasNewSource(),width:decoded.naturalWidth,height:decoded.naturalHeight};
  await window.HakunaQuestionBooks.savePhoto(form,'q-compression',true);
  return result;
 });
 assert.deepEqual(recrop,{newSource:false,width:3200,height:2000});

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
 let releaseRoomModule,roomModuleRequested;
 const roomModuleGate=new Promise(resolve=>{releaseRoomModule=resolve});
 const roomModuleIntercepted=new Promise(resolve=>{roomModuleRequested=resolve});
 await page.route('**/study-rooms.js?*',async route=>{
  roomModuleRequested();
  await roomModuleGate;
  await route.continue();
 },{times:1});
 await page.reload({waitUntil:'commit'});
 await roomModuleIntercepted;
 try{
  await page.locator('#app').waitFor({state:'attached'});
  assert.equal(await page.locator('#app').evaluate(app=>getComputedStyle(app).visibility),'hidden',
   'the default dashboard shell must not paint while the room UI loads');
  assert.equal(await page.locator('.ataturk-corner').count(),0);
 }finally{releaseRoomModule();}
 await page.getByRole('heading',{name:'Doğrudan açılan oda'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__launchTitles),['Odalar']);
 assert.match(await page.locator('[data-sr-clock]').textContent(),/^00:02:/);
 assert.equal(await page.locator('[data-hakuna-boot-placeholder],.sr-loading,.ataturk-corner').count(),0);
 const roomNode=await page.locator('.sr-room').elementHandle();
 await page.evaluate(()=>window.dispatchEvent(new Event('hakuna-local-state-updated')));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert(await roomNode.evaluate(room=>room.isConnected),'a background data refresh preserves the open room');
 assert.deepEqual(await page.evaluate(()=>window.__launchTitles),['Odalar']);
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
}catch(e){fs.mkdirSync('test-results',{recursive:true});if(page&&!page.isClosed()){console.log('OFFLINE FAILURE VIEW',await page.locator('body').innerText());await page.screenshot({path:'test-results/offline-failure.png',fullPage:true});}throw e;}finally{await restoreBrowser?.close();await resumeContext?.close();await context.close();await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
