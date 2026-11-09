const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {chromium, webkit} = require('playwright');

const root = path.join(__dirname,'..');
const files = {
  '/styles.css': fs.readFileSync(path.join(root,'styles.css')),
  '/ten-kasim-2026.css': fs.readFileSync(path.join(root,'ten-kasim-2026.css')),
  '/ten-kasim-2026.js': fs.readFileSync(path.join(root,'ten-kasim-2026.js'))
};
const fixture = [
  '<!doctype html><html lang="tr"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<link rel="stylesheet" href="/styles.css">',
  '<link rel="stylesheet" href="/ten-kasim-2026.css"></head>',
  '<body><div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-title">Hakuna Matata</div></div>',
  '<nav class="nav-list"><button class="nav-button active">Bugün</button></nav></aside>',
  '<main class="main-area"><header class="topbar"><h1 id="pageTitle">Bugün</h1></header>',
  '<section class="ataturk-corner">Mevcut Atatürk Köşesi</section><section id="view" class="view">Günlük çalışma ekranı</section></main>',
  '<nav class="bottom-nav"><button class="active">Bugün</button></nav></div>',
  '<script>(function(){const NativeDate=Date;class ControlledDate extends NativeDate{',
  'static currentMs=NativeDate.parse("2026-11-10T07:00:00Z");',
  'constructor(...args){super(...(args.length?args:[ControlledDate.currentMs]));}',
  'static now(){return ControlledDate.currentMs;}}window.Date=ControlledDate;})();</script>',
  '<script src="/ten-kasim-2026.js"></script></body></html>'
].join('');
const server=createServer((req,res)=>{
  const url=(req.url||'/').split('?')[0];
  if(url==='/'||url==='/index.html'){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    res.end(fixture);return;
  }
  if(files[url]){
    res.writeHead(200,{'content-type':url.endsWith('.css')?'text/css':'application/javascript'});
    res.end(files[url]);return;
  }
  res.writeHead(404);res.end();
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/';
  fs.mkdirSync('test-results',{recursive:true});
  try{
    for(const [type,width,label] of [[chromium,1366,'desktop'],[webkit,768,'ipad'],[webkit,390,'iphone']]){
      const browser=await type.launch({headless:true});
      const context=await browser.newContext({viewport:{width,height:880},isMobile:width<1000,hasTouch:width<1000});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      // Serve one portrait-oriented archive-photo fixture; ensure photos fit instead
      // of overflowing or cropping regardless of the remote source's aspect ratio.
      await page.route('https://commons.wikimedia.org/**',route=>route.fulfill({
        status:200, contentType:'image/svg+xml',
        body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="600" height="900" fill="#444"/><ellipse cx="300" cy="290" rx="145" ry="185" fill="#ccc"/><rect x="130" y="460" width="340" height="500" rx="120" fill="#8a8a8a"/></svg>'
      }));
      try{
        await page.goto(base,{waitUntil:'domcontentloaded'});
        const tribute=page.locator('.tk10-tribute');
        await tribute.waitFor();
        assert.equal(await tribute.count(),1);
        assert.match(await tribute.textContent(),/ATATÜRK/);
        assert.match(await tribute.textContent(),/09:05/);
        assert(await page.locator('body').evaluate(el=>el.classList.contains('tk10-active')));
        assert.equal(await page.locator('.ataturk-corner').isVisible(),false);
        const geometry=await page.evaluate(()=>{
          const hero=document.querySelector('.tk10-tribute').getBoundingClientRect();
          const main=document.querySelector('.main-area').getBoundingClientRect();
          return {heroLeft:hero.left,heroRight:hero.right,mainLeft:main.left,mainRight:main.right,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};
        });
        assert(geometry.heroLeft>=geometry.mainLeft-2, label+' banner starts in the main area');
        assert(geometry.heroRight<=geometry.mainRight+2, label+' banner stays within the main area');
        assert(geometry.documentWidth<=geometry.viewport+2, label+' no horizontal overflow '+JSON.stringify(geometry));
        await tribute.screenshot({path:'test-results/ten-kasim-'+label+'.png',timeout:20000});

        // The home page retains its large general memorial and a contained portrait.
        assert.equal(await page.locator('.tk10-home .tk10-photo').evaluate(el=>getComputedStyle(el).objectFit),'contain');
        // The Rooms landing/lobby shows its chronological chapter, not the generic hero.
        await page.evaluate(()=>{
          document.getElementById('pageTitle').textContent='Odalar';
          document.getElementById('view').innerHTML='<div class="sr-shell sr-lobby">Odalarım</div>';
        });
        await page.locator('.tk10-story[data-chapter="6"]').waitFor();
        assert.equal(await page.locator('.tk10-story-title').textContent(),'Dostumu Kaybettim');
        assert.equal(await page.locator('.ataturk-corner').isVisible(),false);
        assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('tk10-active')),true);

        // Open a study room without changing the 'Odalar' title.
        await page.evaluate(()=>{
          document.getElementById('view').innerHTML='<div class="sr-shell sr-room"><h2>Çalışma odası</h2></div>';
          document.body.classList.add('sr-immersed');
        });
        await page.waitForFunction(()=>!document.querySelector('.tk10-tribute'));
        assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('tk10-active')),false);
        assert.equal(await page.locator('.sr-room').count(),1,'opened room remains intact');

        // Defensive guard even if CSS immersion is removed while room markup is still present.
        await page.evaluate(()=>document.body.classList.remove('sr-immersed'));
        await page.evaluate(()=>window.HakunaTenKasim2026.refresh());
        assert.equal(await page.locator('.tk10-tribute').count(),0);

        // Return to the lobby with the same page title: observer restores tribute automatically.
        await page.evaluate(()=>{
          document.getElementById('view').innerHTML='<div class="sr-shell sr-lobby">Odalarım</div>';
          document.body.classList.add('sr-immersed');
          document.body.classList.remove('sr-immersed');
        });
        await page.locator('.tk10-story[data-chapter="6"]').waitFor();
        assert.equal(await page.locator('.sr-lobby').count(),1);
        assert.equal(await page.locator('.ataturk-corner').isVisible(),false);

        // The story connects in fixed navigation order and each chapter has
        // its own named archival photograph with an unclipped, contain-fitted face.
        const chapterPages=[
          'Plan','Görevler','Denemeler','Sorular','Soru Kitaplığım',
          'Odalar','Analiz','Rehberlik','Öneriler','Ayarlar'
        ];
        const photoNames=new Set();
        for(let i=0;i<chapterPages.length;i++){
          await page.evaluate(name=>{document.getElementById('pageTitle').textContent=name;},chapterPages[i]);
          const card=page.locator('.tk10-story[data-chapter="'+(i+1)+'"]');
          await card.waitFor();
          const title=await card.locator('.tk10-story-title').textContent();
          assert(title?.trim().length>3,chapterPages[i]+' has a story title');
          assert.match(await card.locator('.tk10-story-method').textContent(),/edebî uyarlamadır/);
          const photo=card.locator('.tk10-story-image-main');
          await photo.waitFor();
          const fit=await photo.evaluate(el=>({
            fit:getComputedStyle(el).objectFit,
            position:getComputedStyle(el).objectPosition,
            complete:el.complete,
            naturalWidth:el.naturalWidth,
            width:el.getBoundingClientRect().width,
            container:el.parentElement.getBoundingClientRect().width,
            src:el.getAttribute('src')
          }));
          assert.equal(fit.fit,'contain',chapterPages[i]+' preserves the photo without cropping');
          assert(fit.width<=fit.container+2,chapterPages[i]+' photo remains inside its frame');
          assert(fit.complete&&fit.naturalWidth>0,chapterPages[i]+' photo decodes');
          photoNames.add(fit.src);
          if([0,5,9].includes(i)) await card.screenshot({
            path:'test-results/ten-kasim-story-'+String(i+1).padStart(2,'0')+'-'+label+'.png',
            timeout:20000
          });
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,
            chapterPages[i]+' has no horizontal overflow at '+width);
        }
        assert.equal(photoNames.size,10,'every story chapter uses a distinct archival photo');

        // A phone left running through Istanbul midnight loses the tribute.
        await page.evaluate(()=>{
          Date.currentMs=Date.parse('2026-11-10T21:00:00Z');
          window.HakunaTenKasim2026.refresh();
        });
        await page.waitForFunction(()=>!document.querySelector('.tk10-tribute'));
        assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('tk10-active')),false);
        assert.equal(errors.length,0,label+' browser errors: '+errors.join(', '));
        console.log('PASS '+label+' general memorial, ten Bozok chapters, photo fitting, Rooms lobby isolation and midnight removal');
      } finally{
        await context.close();await browser.close();
      }
    }
  } finally{
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1});
