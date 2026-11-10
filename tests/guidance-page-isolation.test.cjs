const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.join(__dirname,'..');
const mentor='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
const student='b5cdb555-dd57-4d05-9c34-6ff720333874';
const html='<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/guidance-weekly-v4.css"></head><body><div class="app-shell"><aside class="sidebar">Hakuna Matata</aside><main class="main-area"><h1 id="pageTitle">Rehberlik</h1><section id="view" class="view"></section></main></div><script src="/guidance-weekly.js"></script><script src="/guidance-v1.js"></script></body></html>';
const server=http.createServer((req,res)=>{
 const p=req.url.split('?')[0].slice(1);
 if(!p||p==='index.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return;}
 if(!['guidance-weekly.js','guidance-v1.js','styles.css','guidance-weekly-v4.css'].includes(p)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':p.endsWith('.css')?'text/css':'application/javascript'});
 res.end(fs.readFileSync(path.join(root,p)));
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const planItem=id=>({id,week_start:'2026-11-09',weekday:1,sort_order:0,subject:'Matematik',title:'Çalışma '+id,target:'3 test',student_id:student});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 try{
  for(const [browserType,width,label] of [[chromium,1370,'desktop'],[webkit,768,'ipad'],[webkit,390,'iphone']]){
   const browser=await browserType.launch({headless:true});
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<1000,hasTouch:width<1000});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   let scenario='normal',planCount=0;
   await page.route('https://zyrbbkbwrijnnykbgjvc.supabase.co/rest/v1/**',async route=>{
    const url=route.request().url(),method=route.request().method();
    if(method!=='GET'){await route.fulfill({json:[]});return;}
    let result=[];
    if(url.includes('/guidance_homework?')){
      if(scenario==='late-homework'||scenario==='student-homework')await sleep(490);
    }else if(url.includes('/guidance_weekly_plan?')){
      if(scenario==='late-plan')await sleep(490);
      if(scenario==='late-done')result=[planItem('one')];
      if(scenario==='race'){
        planCount++;
        if(planCount===1){await sleep(650);result=[planItem('obsolete')];}
        else result=[planItem('latest')];
      }
    }else if(url.includes('/guidance_weekly_done?')){
      if(scenario==='late-done')await sleep(490);
    }
    await route.fulfill({json:result});
   });
   try{
    await page.goto(base,{waitUntil:'load'});
    await page.evaluate(mentorId=>{
      localStorage.setItem('sb-zyrbbkbwrijnnykbgjvc-auth-token',
        JSON.stringify({access_token:'fixture',user:{id:mentorId}}));
    },mentor);
    const showGuide=()=>page.evaluate(()=>window.HakunaGuidance.render(
      document.querySelector('#view'),'guidance'));
    const switchToSettings=()=>page.evaluate(()=>{
      document.querySelector('#pageTitle').textContent='Ayarlar';
      document.querySelector('#view').innerHTML='<section data-settings-page><h2>Ayarlar</h2><p>Kişisel ayarlar</p></section>';
    });
    const assertIsolated=async point=>{
      assert.equal(await page.locator('[data-settings-page]').count(),1,point+': settings screen stays mounted');
      assert.equal(await page.locator('.gw-shell,.gd-loading,.gw-mentor,.gd-mentor').count(),0,
        point+': Ayzos content must not overwrite Settings');
      assert.match(await page.locator('#view').textContent(),/Kişisel ayarlar/);
    };

    // 1. Navigation before the first homework query returns.
    scenario='late-homework';
    const homework=page.waitForRequest(req=>req.url().includes('/guidance_homework?'));
    await showGuide();await homework;
    await switchToSettings();await sleep(650);
    await assertIsolated('late homework');

    // 2. Navigation while the weekly plan query is pending.
    scenario='late-plan';
    const weekly=page.waitForRequest(req=>req.url().includes('/guidance_weekly_plan?'));
    await showGuide();await weekly;
    await switchToSettings();await sleep(650);
    await assertIsolated('late weekly plan');

    // 3. Navigation while the completion query is pending.
    scenario='late-done';
    const done=page.waitForRequest(req=>req.url().includes('/guidance_weekly_done?'));
    await showGuide();await done;
    await switchToSettings();await sleep(650);
    await assertIsolated('late completion rows');

    // 4. A deliberately invalid mentor render must not inject on other tabs.
    await page.evaluate(()=>window.HakunaGuidance.render(document.querySelector('#view'),'settings'));
    await assertIsolated('wrong mentor page');

    // 5. Genuine mentor view must still render after returning.
    scenario='normal';
    await page.evaluate(()=>{document.querySelector('#pageTitle').textContent='Rehberlik'});
    await showGuide();
    await page.locator('.gw-mentor .gw-grid').waitFor();
    assert.equal(await page.locator('.gd-route-scope').count(),1);
    assert.equal(await page.locator('.gw-mentor').count(),1);

    // 6. Older, slower weekly queries must not replace a newer result.
    scenario='race';planCount=0;
    await page.evaluate(()=>window.HakunaWeekly.render(document.querySelector('#view'),'guidance',[],true));
    await page.waitForRequest(req=>req.url().includes('/guidance_weekly_plan?'));
    await page.evaluate(()=>window.HakunaWeekly.render(document.querySelector('#view'),'guidance',[],true));
    await page.locator('[data-plan-id="latest"]').waitFor();
    await sleep(750);
    assert.equal(await page.locator('[data-plan-id="obsolete"]').count(),0,'old weekly response must be ignored');
    assert.equal(await page.locator('[data-plan-id="latest"]').count(),1);

    // 7. Student navigation has the same guard.
    await page.evaluate(studentId=>{
      localStorage.setItem('sb-zyrbbkbwrijnnykbgjvc-auth-token',
        JSON.stringify({access_token:'fixture',user:{id:studentId}}));
      document.querySelector('#pageTitle').textContent='Bugün';
    },student);
    scenario='student-homework';
    const studentReq=page.waitForRequest(req=>req.url().includes('/guidance_homework?'));
    await page.evaluate(()=>window.HakunaGuidance.render(document.querySelector('#view'),'today'));
    await studentReq;
    await switchToSettings();await sleep(650);
    await assertIsolated('student late homework');

    assert.deepEqual(errors,[],label+': browser page errors');
    console.log('PASS '+label+': no Ayzos planner leak into Settings on delayed homework, plan, completion, student navigation or concurrent refresh');
   }finally{await context.close();await browser.close();}
  }
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
