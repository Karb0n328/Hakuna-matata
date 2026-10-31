import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';

const styles=['styles.css','ui-fixes.css','question-books.css'];
const files={};
for(const p of [...styles,'question-books.js'])files[p]=await readFile(new URL('../'+p,import.meta.url));
const html=['<!doctype html><html lang="tr"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
styles.map(p=>'<link rel="stylesheet" href="/'+p+'">').join('\n'),
'<style>body{margin:0;background:#e8ecf3;font-family:system-ui}',
'#modalRoot{display:flex;justify-content:center;padding:18px}',
'form{box-sizing:border-box;width:min(740px,100%);padding:16px;border-radius:12px;background:#fff}',
'</style></head><body>',
'<div id="modalRoot"><form id="questionForm"><div class="form-actions"><button type="button">İptal</button></div></form></div>',
'<div id="toastRoot"></div>',
'<script src="/question-books.js"></script>',
'<script>window.HakunaQuestionBooks.mountQuestionForm(document.querySelector("#questionForm"));</script>',
'</body></html>'].join('\n');
const server=createServer((req,res)=>{
 const file=(req.url||'').slice(1).split('?')[0];
 if(file===''||file==='fixture.html'){
   res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return;
 }
 if(files[file]){
   res.writeHead(200,{'content-type':file.endsWith('.css')?'text/css':'text/javascript'});
   res.end(files[file]);return;
 }
 res.writeHead(404);res.end('not found');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/fixture.html';
let failed=false;
async function checkBrowser(browserType,label,mobile=false){
 const browser=await browserType.launch({headless:true});
 const context=await browser.newContext(mobile?
   {viewport:{width:1024,height:768},deviceScaleFactor:2,isMobile:true,hasTouch:true}:
   {viewport:{width:1200,height:900},deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('[data-book-canvas]').count(),1,'A single visible crop canvas is mounted');
   await page.evaluate(async()=>{
     const source=document.createElement('canvas');
     source.width=1000;source.height=600;
     const ctx=source.getContext('2d');
     ctx.fillStyle='#e83c3c';ctx.fillRect(0,0,500,600);
     ctx.fillStyle='#315bdb';ctx.fillRect(500,0,500,600);
     ctx.fillStyle='#fff';ctx.fillRect(0,0,1000,25);
     const blob=await new Promise(r=>source.toBlob(r,'image/jpeg',.98));
     const file=new File([blob],'ipad-crop-regression.jpg',{type:'image/jpeg'});
     const input=document.querySelector('input[name="questionPhoto"]');
     const transfer=new DataTransfer();transfer.items.add(file);
     input.files=transfer.files;
     input.dispatchEvent(new Event('change',{bubbles:true}));
   });
   await page.waitForSelector('.book-crop-stage[data-crop-ready="1"]',{timeout:10000});
   const initial=await page.evaluate(()=>{
     const stage=document.querySelector('.book-crop-stage');
     const canvas=document.querySelector('[data-book-canvas]');
     const ctx=canvas.getContext('2d');
     const w=canvas.width,h=canvas.height;
     const r=stage.getBoundingClientRect();
     const left=Array.from(ctx.getImageData(Math.floor(w*.25),Math.floor(h*.5),1,1).data);
     const right=Array.from(ctx.getImageData(Math.floor(w*.75),Math.floor(h*.5),1,1).data);
     const box=document.querySelector('[data-book-selection]');
     return {w,h,stageW:r.width,stageH:r.height,left,right,selectionHidden:box.hidden};
   });
   assert(initial.w>150&&initial.h>100,'Photo preview must have nonzero visible dimensions');
   assert(initial.h<=440&&initial.w<=600,'Photo preview is bounded inside iPad modal');
   assert(Math.abs(initial.w-initial.stageW)<2&&Math.abs(initial.h-initial.stageH)<2,
     'Image and selection use the same pixel bounds');
   assert(initial.left[0]>initial.left[2]+60,'Red side visibly rendered');
   assert(initial.right[2]>initial.right[0]+60,'Blue side visibly rendered');
   assert.equal(initial.selectionHidden,false,'Initial crop frame is visible');
   const getBox=()=>page.locator('.book-crop-stage').boundingBox();
   const drag=async (ax,ay,bx,by)=>{
     const r=await getBox();assert(r,'Crop stage missing');
     await page.mouse.move(r.x+ax*r.width,r.y+ay*r.height);
     await page.mouse.down();await page.mouse.move(r.x+bx*r.width,r.y+by*r.height,{steps:8});await page.mouse.up();
   };
   const frame=()=>page.evaluate(()=>{
     const box=document.querySelector('[data-book-selection]');
     return {x:parseFloat(box.style.left),y:parseFloat(box.style.top),
       w:parseFloat(box.style.width),h:parseFloat(box.style.height),hidden:box.hidden};
   });
   await drag(.25,.22,.76,.83);
   const created=await frame();
   assert(created.x>15&&created.x<32&&created.w>40&&created.w<62,
     'Freeform new area selection from a full crop frame');
   await drag(created.x/100,created.y/100,.12,.09);
   const expanded=await frame();
   assert(expanded.x<created.x-4&&expanded.y<created.y-4,'Corner handles must resize');
   await drag(.45,.42,.49,.46);
   const moved=await frame();
   assert(moved.x>expanded.x+2,'Dragging within the crop must move it');
   await page.locator('[data-book-rotate]').click();
   const rotated=await page.evaluate(()=>{
     const c=document.querySelector('[data-book-canvas]');
     const b=document.querySelector('[data-book-selection]');
     return {w:c.width,h:c.height,selected:parseFloat(b.style.width)};
   });
   assert(rotated.h>rotated.w,'Quarter turn displays portrait without distortion');
   assert(rotated.selected>99,'Rotation resets frame without clipping original');
   await drag(.19,.18,.80,.78);
   const saved=await page.evaluate(async()=>{
     const form=document.querySelector('#questionForm');
     const exists=await window.HakunaQuestionBooks.savePhoto(form,'ipad-test-question',false);
     const blob=await window.HakunaQuestionBooks.getPhoto('ipad-test-question');
     const img=new Image();
     const u=URL.createObjectURL(blob);
     await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=u;});
     const size={exists,w:img.naturalWidth,h:img.naturalHeight};
     URL.revokeObjectURL(u);return size;
   });
   assert(saved.exists,'Saved question has image');
   assert(saved.w>300&&saved.w<470&&saved.h>450&&saved.h<700,
     'Saved JPEG contains selected rotated pixels');
   await page.evaluate(()=>{
     document.querySelector('#modalRoot').innerHTML='<form id="questionForm"><div class="form-actions"><button type="button">Kaydet</button></div></form>';
     window.HakunaQuestionBooks.mountQuestionForm(document.querySelector('#questionForm'),
       {id:'ipad-test-question',hasPhoto:true});
   });
   await page.locator('[data-book-restore-original]').click();
   await page.waitForSelector('.book-crop-stage[data-crop-ready="1"]',{timeout:10000});
   const restored=await page.evaluate(()=>{
     const c=document.querySelector('[data-book-canvas]');
     return {w:c.width,h:c.height,file:!!document.querySelector('[data-book-image-editor]').getSourceFile()};
   });
   assert(restored.w>restored.h&&restored.file,'Original landscape photo restored on edit');
   await drag(.22,.20,.80,.85);
   await page.evaluate(()=>window.HakunaQuestionBooks.savePhoto(document.querySelector('#questionForm'),
     'ipad-test-question',true));
   const afterReedit=await page.evaluate(async()=>{
     const db=await new Promise((resolve,reject)=>{
       const req=indexedDB.open('hakuna-question-image-cache',1);
       req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
     });
     const get=id=>new Promise((resolve,reject)=>{
       const tx=db.transaction('photos','readonly'),r=tx.objectStore('photos').get(id);
       r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
     });
     const original=await get('ipad-test-question.original');
     const processed=await get('ipad-test-question');
     db.close();return {originalSize:original?.size||0,processedSize:processed?.size||0};
   });
   assert(afterReedit.originalSize>0&&afterReedit.processedSize>0,
     'Editing preserves original backup and updates cropped question');
   assert(errors.length===0,'Unexpected page errors: '+errors.join('; '));
   console.log('PASS '+label+': visible canvas, bounded preview, selection, corner resize, move, rotation, crop save and re-edit');
 }finally{await context.close();await browser.close();}
}
try{
 await checkBrowser(chromium,'Chromium desktop');
 await checkBrowser(webkit,'iPad WebKit',true);
}catch(e){failed=true;console.error(e?.stack||String(e));}
finally{await new Promise(resolve=>server.close(resolve));}
if(failed)process.exitCode=1;
