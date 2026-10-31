import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';

const assetNames=['styles.css','app.js'];
const assets={};
for(const filename of assetNames){
  assets[filename]=await readFile(new URL('../'+filename,import.meta.url));
}
const fixture=[
 '<!doctype html><html lang="tr"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1">',
 '<link rel="stylesheet" href="/styles.css">',
 '<style>html,body{min-height:100%;margin:0}</style>',
 '</head><body>',
 '<div class="app-shell">',
 '<aside class="sidebar"><nav id="sidebarNav" class="nav-list"></nav></aside>',
 '<main class="main-area"><header class="topbar"><div><div id="pageEyebrow"></div><h1 id="pageTitle"></h1></div>',
 '<div id="topbarActions"></div></header><div id="view"></div></main>',
 '<nav id="bottomNav" class="bottom-nav"></nav>',
 '</div>',
 '<div id="modalRoot"></div><div id="toastRoot" class="toast-root"></div>',
 '<template id="modalTemplate"><div class="modal-backdrop" data-close-modal>',
 '<section class="modal-card" role="dialog" aria-modal="true">',
 '<header class="modal-head"><div class="eyebrow modal-eyebrow"></div><h2 class="modal-title"></h2>',
 '<button type="button" class="icon-button" data-close-modal>✕</button></header>',
 '<div class="modal-body"></div></section></div></template>',
 '<script>',
 'window.__role=location.search.includes("mentor")?"mentor":location.search.includes("student")?"student":null;',
 'window.HakunaGuidance={role:()=>window.__role, render:(view,page)=>{view.textContent="Rehberlik "+page;}};',
 'window.HakunaQuestionBooks={render:(view)=>{view.textContent="Soru kitaplığı";}};',
 '</script>',
 '<script src="/app.js"></script></body></html>'
].join('\n');
const server=createServer((req,res)=>{
 const path=(req.url||'/').split('?')[0].slice(1)||'fixture.html';
 if(path==='fixture.html'){
   res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(fixture);return;
 }
 if(assets[path]){
   res.writeHead(200,{'content-type':path.endsWith('.css')?'text/css':'text/javascript'});
   res.end(assets[path]);return;
 }
 res.writeHead(404);res.end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/fixture.html';

async function scenario(browserType,contextProps,label,role){
 const browser=await browserType.launch({headless:true});
 const context=await browser.newContext(contextProps);
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
   await page.goto(base+(role?'?'+role:''),{waitUntil:'domcontentloaded'});
   await page.locator('#bottomNav [data-nav="more"]').waitFor({timeout:10000});
   const nav=page.locator('#bottomNav [data-nav="more"]');
   assert(await nav.isVisible(),'The More tab must be visible in '+label);
   const extras=['questions','books','analytics','suggestions','settings'];
   if(role==='mentor')extras.splice(3,0,'guidance');
   const names={
     questions:'Sorular',books:'Soru Kitaplığım',analytics:'Analiz',
     guidance:'Rehberlik',suggestions:'Öneriler',settings:'Ayarlar'
   };
   const open=async()=>{
     await nav.click();
     await page.locator('#modalRoot [data-more-nav]').first().waitFor();
     const options=await page.locator('#modalRoot [data-more-nav]').evaluateAll(
       elements=>elements.map(e=>e.dataset.moreNav)
     );
     assert.deepEqual(options,extras,'All permitted navigation items appear in More');
   };
   for(const target of extras){
     await open();
     const button=page.locator('#modalRoot [data-more-nav="'+target+'"]');
     assert(await button.isVisible(),target+' menu item must be visible');
     await button.click();
     assert.equal(await page.locator('#modalRoot [data-more-nav]').count(),0,
       'More modal should close after choosing '+target);
     assert.equal((await page.locator('#pageTitle').textContent()).trim(),names[target],
       target+' should render its own page');
     assert((await nav.getAttribute('class')).includes('active'),
       'More nav must stay highlighted on '+target);
   }
   // Switching back to a primary tab must still work after several More links.
   await page.locator('#bottomNav [data-nav="today"]').click();
   assert.equal((await page.locator('#pageTitle').textContent()).trim(),'Bugün');
   assert(!(await nav.getAttribute('class')).includes('active'),
     'More must lose its active state after returning to Today');
   assert.equal(errors.length,0,'No JavaScript page errors: '+errors.join('; '));
   console.log('PASS '+label+' / '+(role||'normal')+': every More destination opens and navigation remains usable');
 }finally{await context.close();await browser.close();}
}
let failed=false;
try{
 await scenario(chromium,{viewport:{width:390,height:844},deviceScaleFactor:2,
   isMobile:true,hasTouch:true},'Android-like mobile','');
 await scenario(webkit,{viewport:{width:390,height:844},deviceScaleFactor:3,
   isMobile:true,hasTouch:true},'iPhone WebKit','');
 await scenario(webkit,{viewport:{width:700,height:960},deviceScaleFactor:2,
   isMobile:true,hasTouch:true},'iPad portrait compact WebKit','mentor');
}catch(err){failed=true;console.error(err?.stack||String(err));}
finally{await new Promise(resolve=>server.close(resolve));}
if(failed)process.exitCode=1;
