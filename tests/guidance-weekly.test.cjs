const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chromium"});
 try{
 for(const width of [1600,1024,390]){
 const mobile=width<1200;
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:mobile,isMobile:mobile});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const plan=[{id:'a',weekday:0,sort_order:9,title:'Kesirler testi',subject:'Matematik',target:'20 soru',student_id:'student',week_start:'2026-11-02'},{id:'b',weekday:1,sort_order:12,title:'Okuma',subject:'Türkçe',target:'10 sayfa'}];
 let posts=0,patches=0,fail=false;
 await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div class="app-shell"><aside class="sidebar">Hakuna Matata</aside><main class="main-area"><section id="view" class="view"></section></main></div>'}));
 await page.route('https://zyrbbkbwrijnnykbgjvc.supabase.co/rest/v1/**',async r=>{
  const req=r.request(),url=new URL(req.url()),method=req.method();let body=[];
  if(url.pathname.endsWith('guidance_weekly_done'))body=[{plan_id:'a'}];
  else if(method==='GET')body=plan;
  else if(method==='POST'){posts++;const data=req.postDataJSON();assert.equal(data.sort_order,10);assert(!data.id);body=[{...data,id:'copy'}];plan.push(body[0]);}
  else if(method==='PATCH'){patches++;if(fail){await r.fulfill({status:500,json:{message:'Test kayıt hatası'}});return;}const item=plan.find(x=>x.id===url.searchParams.get('id').slice(3));Object.assign(item,req.postDataJSON());body=[item];}
  await r.fulfill({json:body});
 });
 await page.goto('https://fixture.test');
 await page.evaluate(()=>localStorage.setItem('sb-zyrbbkbwrijnnykbgjvc-auth-token',JSON.stringify({access_token:'test'})));
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 for(const match of html.matchAll(/<link rel="stylesheet" href="\.\/([^?"]+)/g))await page.addStyleTag({content:fs.readFileSync(require.resolve('../'+match[1]),'utf8')});
 await page.addScriptTag({content:fs.readFileSync(require.resolve('../guidance-weekly.js'),'utf8')});
 const render=()=>page.evaluate(()=>window.HakunaWeekly.render(document.querySelector('#view'),'guidance',[],true));
 await render();
 for(const theme of ['', 'republic-day-2026', 'batu-dark-mode']){
  await page.evaluate(theme=>{document.documentElement.className=theme;document.documentElement.dataset.batuTheme=theme==='batu-dark-mode'?'dark':''},theme);
  const layout=await page.locator('[data-plan-id="a"]').evaluate(card=>{const text=card.querySelector('.gw-item-info').getBoundingClientRect(),actions=card.querySelector('.gw-item-actions').getBoundingClientRect();return {width:text.width,below:actions.top>=text.bottom,overflow:card.scrollWidth>card.clientWidth}});
  assert(layout.width>=110,JSON.stringify({width,theme,layout}));assert(layout.below);assert(!layout.overflow);
 }
 await page.evaluate(()=>{document.documentElement.className='republic-day-2026';delete document.documentElement.dataset.batuTheme});
 await page.locator('[data-copy="a"]').click();await page.waitForFunction(()=>document.querySelector('[data-plan-id="copy"]'));
 assert.equal(posts,1);assert.equal(await page.locator('[data-plan-id="copy"]').evaluate(e=>e.classList.contains('gw-done')),false);
 await page.locator('[data-edit="copy"]').click();assert.equal(await page.locator('form [name=title]').inputValue(),'Kesirler testi');await page.locator('[data-cancel]').click();
 const h=page.locator('[data-drag="a"]');await h.focus();await h.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.gw-operation-status').textContent.includes('taşındı'));
 assert.equal(plan[0].weekday,1);assert.equal(plan[0].sort_order,13);assert(await page.locator('[data-weekday="1"] [data-plan-id="a"].gw-done').count());
 fail=true;await h.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.gw-operation-status').textContent.includes('Taşınamadı'));
 assert.equal(await page.locator('[data-weekday="1"] [data-plan-id="a"]').count(),1);fail=false;
 await render();
 // Actual pointer drag (touch on phone, mouse on desktop), from Monday to Tuesday.
 await page.locator('.gw-grid').evaluate(e=>e.scrollLeft=0);
 const source=await page.locator('[data-drag="copy"] .gw-item-info').boundingBox();
 const target=await page.locator('[data-weekday="1"]').boundingBox();
 const sx=source.x+source.width/2,sy=source.y+source.height/2,tx=Math.min(target.x+40,width-25),ty=target.y+100;
 const before=patches;
 if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});await page.waitForTimeout(500);assert.equal(await page.locator('.gw-pressing').count(),1);assert.equal(await page.locator('.gw-drag-ghost').count(),0);await page.waitForTimeout(1650);assert.equal(await page.locator('.gw-drag-ghost').count(),1);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty}]});await page.waitForTimeout(100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else {await page.mouse.move(sx,sy);await page.mouse.down();await page.waitForTimeout(500);assert.equal(await page.locator('.gw-pressing').count(),1);assert.equal(await page.locator('.gw-drag-ghost').count(),0);await page.waitForTimeout(1650);assert.equal(await page.locator('.gw-drag-ghost').count(),1);await page.mouse.move(tx,ty,{steps:12});await page.waitForTimeout(100);await page.mouse.up();}
 await page.waitForFunction(()=>document.querySelector('[data-weekday="1"] [data-plan-id="copy"]'));
 assert.equal(patches,before+1);assert.equal(await page.locator('.gw-drag-ghost').count(),0);
 // A short touch must not activate dragging.
 if(mobile){const cdp=await context.newCDPSession(page);const box=await page.locator('[data-plan-id="b"] .gw-item-info').boundingBox();const x=box.x+10,y=box.y+10;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(150);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(2100);assert.equal(await page.locator('.gw-drag-ghost,.gw-pressing').count(),0);}
 // Reload retains the day; student gets no mentor controls.
 await render();assert.equal(await page.locator('[data-weekday="1"] [data-plan-id="copy"]').count(),1);
 fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/guidance-'+width+'.png',fullPage:true});
 await page.evaluate(()=>window.HakunaWeekly.render(document.querySelector('#view'),'tasks',[],false));
 assert.equal(await page.locator('[data-copy],[data-drag]').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS '+width+' '+(mobile?'touch':'mouse')+': copy, edit, move, completion, rollback, persistence, role controls');await context.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
