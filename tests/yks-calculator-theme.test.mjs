import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';

const files=['styles.css','republic-day-2026.css','batu-dark-mode-v2.css',
 'yks-calculator.css','yks-calculator-theme.css','yks-calculator.js'];
const buffers={};
for(const file of files)buffers[file]=await readFile(new URL('../'+file,import.meta.url));
const html=['<!doctype html><html lang="tr"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
files.filter(x=>x.endsWith('.css')).map(x=>'<link rel="stylesheet" href="/'+x+'">').join('\n'),
'<style>.main-area{padding:20px;max-width:1200px;margin:auto}</style>',
'</head><body><div id="sidebarNav" class="nav-list"></div><div id="modalRoot"></div>',
'<main class="main-area"><header class="topbar"><div><div id="pageEyebrow"></div><h1 id="pageTitle"></h1></div><div id="topbarActions"></div></header>',
'<div id="view"></div></main>',
'<script>window.HAKUNA_YOK_PROGRAMS=[["Hemşirelik","Ankara Üniversitesi","Hemşirelik","",12000,14000,16000],["Hemşirelik","Ege Üniversitesi","Hemşirelik","",24000,28000,32000]];</script>',
'<script src="/yks-calculator.js"></script></body></html>'].join('\n');
const server=createServer((req,res)=>{
 const file=(req.url||'').split('?')[0].slice(1)||'index.html';
 if(file==='index.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return;}
 if(buffers[file]){res.writeHead(200,{'content-type':file.endsWith('.css')?'text/css':'text/javascript'});res.end(buffers[file]);return;}
 res.writeHead(404);res.end('Not found');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/index.html';

const pageStyle=()=>({
 hero:getComputedStyle(document.querySelector('.yks-hero')).backgroundImage,
 heroKicker:getComputedStyle(document.querySelector('.yks-hero .yks-kicker')).color,
 pill:getComputedStyle(document.querySelector('.yks-data-pill')).color,
 pillBg:getComputedStyle(document.querySelector('.yks-data-pill')).backgroundColor,
 netBg:getComputedStyle(document.querySelector('.yks-live-net strong')).backgroundColor,
 netFg:getComputedStyle(document.querySelector('.yks-live-net strong')).color,
 inputBorder:getComputedStyle(document.querySelector('.yks-answer-inputs input')).borderColor,
 intro:getComputedStyle(document.querySelector('.yks-university-intro')).backgroundImage,
 table:getComputedStyle(document.querySelector('.yks-program-table th')).backgroundColor,
 link:getComputedStyle(document.querySelector('.yks-data-note a')).color,
 current:getComputedStyle(document.querySelector('.yks-year-card.is-current')).backgroundImage,
 focusRing:getComputedStyle(document.querySelector('.yks-answer-inputs input')).boxShadow,
 checkbox:getComputedStyle(document.querySelector('.yks-check input')).accentColor
});
const rgb=(r,g,b)=>'rgb('+r+', '+g+', '+b+')';
async function test(browserType,view,label){
 const browser=await browserType.launch({headless:true});
 const ctx=await browser.newContext(view);
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('[data-yks-nav]').click();
  await page.locator('button.yks-submit').click();
  await page.locator('.yks-university-intro').waitFor();
  const capture=async palette=>{
   await page.evaluate(palette=>{
    const html=document.documentElement;
    html.dataset.hakunaPalette=palette;
    html.classList.toggle('republic-day-2026',palette==='republic');
    if(palette==='dark')html.dataset.batuTheme='dark';
    else delete html.dataset.batuTheme;
    document.querySelector('.yks-answer-inputs input').focus();
   },palette);
   return page.evaluate(pageStyle);
  };
  const blue=await capture('blue');
  assert(blue.hero.includes(rgb(11,24,45)),label+': default blue hero must be unchanged');
  assert.equal(blue.pill,rgb(40,101,159),label+': default data pill must stay blue');

  const red=await capture('republic');
  assert(red.hero.includes(rgb(121,11,28)),label+': Kırmızı hero stays blue');
  assert.equal(red.pill,rgb(150,19,41),label+': Kırmızı YÖK badge stays blue');
  assert.equal(red.netFg,rgb(167,17,43),label+': Kırmızı net badges stay blue');
  assert.equal(red.table,rgb(255,240,242),label+': Kırmızı table heading stays blue');
  assert.equal(red.link,rgb(178,20,48),label+': Kırmızı link stays blue');
  assert(red.intro.includes(rgb(255,233,237)),label+': Kırmızı university intro stays blue');
  assert(red.current.includes(rgb(255,240,242)),label+': Kırmızı current year stays blue');
  assert(red.focusRing.includes(rgb(255,227,233)),label+': red focus ring is missing');
  assert.equal(red.checkbox,rgb(186,23,49),label+': red checkbox should match palette');

  const dark=await capture('dark');
  assert(dark.hero.includes(rgb(17,21,27)),label+': Dark hero stays blue');
  assert.equal(dark.pill,rgb(232,236,240),label+': Dark data pill text not neutral');
  assert.equal(dark.netBg,rgb(48,54,62),label+': Dark net badge is light');
  assert.equal(dark.table,rgb(27,32,39),label+': Dark table header is light');
  assert(dark.intro.includes(rgb(24,29,36)),label+': Dark university intro is blue');
  assert(dark.current.includes(rgb(25,29,35)),label+': Dark current year is light/green');
  assert(dark.focusRing.includes('rgba(183, 192, 203, 0.15)'),
   label+': Dark focus ring retained bright blue');

  const backToBlue=await capture('blue');
  assert.deepEqual(backToBlue.hero,blue.hero,label+': returning to Mavi should restore original hero');
  assert.deepEqual(backToBlue.pill,blue.pill,label+': returning to Mavi should restore original pill');
  assert.equal(errors.length,0,label+' runtime errors: '+errors.join('; '));
  console.log('PASS '+label+': Mavi retained; Kırmızı and Dark hero, YÖK badge, focus, net, tables, current year update live');
 }finally{await ctx.close();await browser.close();}
}
let broken=false;
try{
 await test(chromium,{viewport:{width:1280,height:900}},'desktop Chromium');
 await test(webkit,{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true},'iPhone WebKit');
 await test(webkit,{viewport:{width:768,height:1024},deviceScaleFactor:2,isMobile:true,hasTouch:true},'iPad portrait WebKit');
}catch(e){broken=true;console.error(e?.stack||String(e));}
finally{await new Promise(resolve=>server.close(resolve));}
if(broken)process.exitCode=1;
