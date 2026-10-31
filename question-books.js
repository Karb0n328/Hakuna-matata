(() => {
  'use strict';
  const DB='hakuna-question-image-cache',STORE='photos';
  const SUBJECTS=['Türkçe','Matematik','Geometri','Fizik','Kimya','Biyoloji','Tarih','Coğrafya','Felsefe','Din'];
  let currentSubject='Matematik',period='all',bookStatus='all',search='',syncing=false;
  const previewUrls=new Set(),loading=new Map();
  let bookImageObserver=null;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function notify(s){
    const host=document.getElementById('toastRoot');
    if(!host){console.log(s);return;}
    const el=document.createElement('div');el.className='toast';el.textContent=s;host.append(el);
    setTimeout(()=>el.remove(),3500);
  }

  function openDb(){return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });}
  async function store(id,blob){
    const db=await openDb();
    try{await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,String(id));
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });}finally{db.close();}
  }
  async function lookup(id){
    const db=await openDb();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(String(id));
      r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
    });}finally{db.close();}
  }
  async function erase(id){
    const db=await openDb();
    try{await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(String(id));
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });}finally{db.close();}
  }

  function account(){return window.HakunaAccount||null;}
  function accountId(){return account()?.info?.()?.id||null;}
  const uploadedKey=(uid,id)=>'hakuna.photo.synced.'+uid+'.'+id;

  async function getPhoto(id){
    const local=await lookup(id).catch(()=>null);
    if(local)return local;
    if(!accountId()||!account()?.photoDownload)return null;
    if(loading.has(id))return loading.get(id);
    const job=(async()=>{
      const blob=await account().photoDownload(id);
      await store(id,blob).catch(()=>{});
      try{localStorage.setItem(uploadedKey(accountId(),id),'1');}catch{}
      return blob;
    })().catch(()=>null).finally(()=>loading.delete(id));
    loading.set(id,job);return job;
  }

  async function syncPending(state){
    if(syncing||!accountId()||!account()?.photoUpload||!navigator.onLine)return;
    syncing=true;const uid=accountId();
    try{
      for(const q of (state?.questions||[]).filter(q=>q.hasPhoto)){
        if(!q?.id||localStorage.getItem(uploadedKey(uid,q.id))==='1')continue;
        const blob=await lookup(q.id);
        if(!blob)continue;
        await account().photoUpload(q.id,blob);
        localStorage.setItem(uploadedKey(uid,q.id),'1');
      }
    }catch(e){console.warn('Fotoğraf bulut senkronu bekliyor',e);}
    finally{syncing=false;}
  }

  async function readState(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open('hakuna-matata-db',1);
      req.onsuccess=()=>{
        const db=req.result,tx=db.transaction('app','readonly'),r=tx.objectStore('app').get('state');
        r.onsuccess=()=>{resolve(r.result||{});db.close();};
        r.onerror=()=>{reject(r.error);db.close();};
      };req.onerror=()=>reject(req.error);
    });
  }

  async function imageFromFile(file){
    if(file.size>15*1024*1024)throw new Error('Fotoğraf en fazla 15 MB olabilir.');
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
      return img;
    }finally{URL.revokeObjectURL(url);}
  }

  async function processPhoto(file,options){
    const img=await imageFromFile(file);
    const rotation=Number(options.rotate||0);
    const dims=rotation%180===0?[img.width,img.height]:[img.height,img.width];
    const scale=Math.min(1,2300/Math.max(...dims));
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(dims[0]*scale);canvas.height=Math.round(dims[1]*scale);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(rotation*Math.PI/180);
    ctx.drawImage(img,-img.width*scale/2,-img.height*scale/2,img.width*scale,img.height*scale);
    ctx.setTransform(1,0,0,1,0,0);

    let sx=Math.round(canvas.width*Number(options.left||0)/100),
        sy=Math.round(canvas.height*Number(options.top||0)/100);
    let ex=Math.round(canvas.width*(1-Number(options.right||0)/100)),
        ey=Math.round(canvas.height*(1-Number(options.bottom||0)/100));
    if(ex-sx<40||ey-sy<40)throw new Error('Kırpma alanı çok küçük.');

    if(options.trim && !options.manualCrop && !['left','right','top','bottom'].some(side=>Number(options[side]||0)>0)){
      // Trim only almost-white outer paper margins; never regenerate a question.
      const data=ctx.getImageData(sx,sy,ex-sx,ey-sy);
      const {width:w,height:h}=data,px=data.data;
      const ink=(x,y)=>{
        const k=(y*w+x)*4;
        return (px[k]+px[k+1]+px[k+2])/3<235;
      };
      const step=Math.max(2,Math.round(Math.max(w,h)/700));
      let minX=w,maxX=0,minY=h,maxY=0,n=0;
      for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
        if(ink(x,y)){n++;minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}
      }
      // Conservative threshold: only trim if a substantial text/graphic region was found.
      if(n>100&&maxX>minX&&maxY>minY){
        const pad=Math.round(Math.min(w,h)*.025);
        const nx=Math.max(0,minX-pad),ny=Math.max(0,minY-pad);
        const nr=Math.min(w,maxX+pad),nb=Math.min(h,maxY+pad);
        if((nr-nx)*(nb-ny)>w*h*.23){
          sx+=nx;sy+=ny;ex=sx+(nr-nx);ey=sy+(nb-ny);
        }
      }
    }

    const out=document.createElement('canvas');
    out.width=ex-sx;out.height=ey-sy;
    const o=out.getContext('2d',{willReadFrequently:!!options.grayscale});
    o.drawImage(canvas,sx,sy,ex-sx,ey-sy,0,0,out.width,out.height);
    if(options.grayscale){
      const frame=o.getImageData(0,0,out.width,out.height),p=frame.data;
      for(let i=0;i<p.length;i+=4){
        const lum=.299*p[i]+.587*p[i+1]+.114*p[i+2];
        const val=Math.min(255,Math.max(0,(lum-128)*1.17+144));
        p[i]=p[i+1]=p[i+2]=val;
      }
      o.putImageData(frame,0,0);
    }
    const blob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('Fotoğraf hazırlanamadı.')),'image/jpeg',.9));
    return blob;
  }

  function mountQuestionForm(form,editing=null){
    if(!form||form.querySelector('[data-book-image-editor]'))return;
    const wrap=document.createElement('section');
    wrap.className='book-image-editor';
    wrap.dataset.bookImageEditor='1';
    wrap.innerHTML=`<div class="card-title">📷 Soru fotoğrafı <span class="book-optional">(isteğe bağlı)</span></div>
      <p class="book-helper">Fotoğraf eklersen otomatik olarak ilgili dersin canlı kitapçığına girer.</p>
      <label class="book-file-label">Fotoğraf çek / galeriden seç <input type="file" name="questionPhoto" accept="image/*"></label>
      ${editing?.hasPhoto?'<div class="book-existing-photo"><p class="book-helper">Kaydedilmiş soru fotoğrafı</p><img data-book-existing alt="Mevcut soru fotoğrafı"></div>':''}
      <div class="book-image-controls" hidden>
        <div class="book-image-actions">
          <button type="button" data-book-rotate>↻ 90° çevir</button>
          <button type="button" data-book-reset-crop>Seçimi sıfırla</button>
          <label><input type="checkbox" data-book-gray> Siyah-beyaz netleştir</label>
        </div>
        <div class="book-crop-stage" role="group" aria-label="Fotoğrafı kırpmak için seçim alanı"><canvas data-book-canvas aria-label="Kırpılacak fotoğraf" role="img"></canvas><div data-book-selection class="book-crop-selection" hidden><i class="book-crop-handle tl"></i><i class="book-crop-handle tr"></i><i class="book-crop-handle bl"></i><i class="book-crop-handle br"></i></div></div>
        <p class="book-helper">Kırpma çerçevesinin köşelerini sürükle; yeni bir alan çizmek için fotoğrafın ortasından kaydır. Kaydedilen fotoğraf yalnızca çerçevedeki kısımdır.</p>

      </div>
      ${editing?.hasPhoto?'<button type="button" class="secondary-btn" data-book-restore-original>Orijinal fotoğraftan yeniden kırp</button><label class="book-remove-photo"><input type="checkbox" data-book-remove> Fotoğrafı kaldır</label><p class="book-helper">Mevcut fotoğraf korunacak; kaldırmak için kutuyu işaretle.</p>':''}
    `;
    const actions=form.querySelector('.form-actions');
    if(actions)actions.before(wrap);else form.append(wrap);
    const input=wrap.querySelector('input[type=file]'), controls=wrap.querySelector('.book-image-controls');
    // One visible canvas is the source of truth for the crop preview.
    // No offscreen data URLs, CSS object-fit, or async image preview races.
    let rotated=0,url=null,sourceImage=null,sourceFile=null,selection=null;
    let dragStart=null,dragMode='new',initialSelection=null,originalFromBackup=false;
    let lastWidth=0,paintScheduled=false,closed=false;
    const canvas=wrap.querySelector('[data-book-canvas]');
    const stage=wrap.querySelector('.book-crop-stage');
    const selectionBox=wrap.querySelector('[data-book-selection]');
    const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
    const fullSelection=()=>({x:0,y:0,w:1,h:1});
    const renderSelection=()=>{
      if(!selection||!sourceImage){selectionBox.hidden=true;return;}
      selectionBox.hidden=false;
      selectionBox.style.left=(selection.x*100)+'%';
      selectionBox.style.top=(selection.y*100)+'%';
      selectionBox.style.width=(selection.w*100)+'%';
      selectionBox.style.height=(selection.h*100)+'%';
    };
    const draw=()=>{
      if(!sourceImage||closed)return;
      const naturalWidth=sourceImage.naturalWidth;
      const naturalHeight=sourceImage.naturalHeight;
      if(!naturalWidth||!naturalHeight){notify('Fotoğraf boyutları okunamadı.');return;}
      const swapped=rotated%180!==0;
      const imageWidth=swapped?naturalHeight:naturalWidth;
      const imageHeight=swapped?naturalWidth:naturalHeight;
      const measured=wrap.getBoundingClientRect().width||wrap.clientWidth;
      const availableWidth=Math.max(180,Math.min(600,Math.floor((measured||330)-34)));
      const availableHeight=Math.max(180,Math.min(440,Math.floor((window.innerHeight||800)*.46)));
      const factor=Math.min(availableWidth/imageWidth,availableHeight/imageHeight);
      const displayWidth=Math.max(1,Math.round(imageWidth*factor));
      const displayHeight=Math.max(1,Math.round(imageHeight*factor));
      // Stage, visible canvas, and selection use the EXACT same dimensions.
      // CSS cannot stretch the photo independently of its crop coordinates.
      stage.style.setProperty('width',displayWidth+'px','important');
      stage.style.setProperty('height',displayHeight+'px','important');
      canvas.width=displayWidth;
      canvas.height=displayHeight;
      const ctx=canvas.getContext('2d',{alpha:false});
      if(!ctx){notify('Fotoğraf önizlemesi açılamadı.');return;}
      ctx.setTransform(1,0,0,1,0,0);
      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,displayWidth,displayHeight);
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.translate(displayWidth/2,displayHeight/2);
      ctx.rotate(rotated*Math.PI/180);
      // This is also the exact transform used when processing the saved image.
      ctx.drawImage(sourceImage,-naturalWidth*factor/2,-naturalHeight*factor/2,
        naturalWidth*factor,naturalHeight*factor);
      ctx.setTransform(1,0,0,1,0,0);
      stage.dataset.cropReady='1';
      renderSelection();
    };
    const scheduleDraw=()=>{
      if(paintScheduled||closed)return;
      paintScheduled=true;
      requestAnimationFrame(()=>{paintScheduled=false;draw();});
    };
    const point=e=>{
      const rect=stage.getBoundingClientRect();
      if(!rect.width||!rect.height)return null;
      const rawX=(e.clientX-rect.left)/rect.width;
      const rawY=(e.clientY-rect.top)/rect.height;
      return {x:clamp(rawX),y:clamp(rawY),inside:rawX>=0&&rawX<=1&&rawY>=0&&rawY<=1};
    };
    stage.addEventListener('pointerdown',e=>{
      if(!sourceImage||stage.dataset.cropReady!=='1'||dragStart)return;
      const p=point(e);
      if(!p||!p.inside)return;
      e.preventDefault();
      dragStart=p;
      initialSelection=selection?{...selection}:null;
      dragMode='new';
      if(selection){
        const {x,y,w,h}=selection;
        const rect=stage.getBoundingClientRect();
        const near=(px,py)=>Math.abs((p.x-px)*rect.width)<=24&&
          Math.abs((p.y-py)*rect.height)<=24;
        if(near(x,y))dragMode='tl';
        else if(near(x+w,y))dragMode='tr';
        else if(near(x,y+h))dragMode='bl';
        else if(near(x+w,y+h))dragMode='br';
        else if(w<.995&&h<.995&&p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h)dragMode='move';
      }
      if(dragMode==='new')selection=null;
      stage.setPointerCapture?.(e.pointerId);
    });
    const updateDrag=e=>{
      if(!dragStart)return;
      const p=point(e);
      if(!p)return;
      if(dragMode==='move'&&initialSelection){
        const old=initialSelection;
        selection={...old,x:clamp(old.x+p.x-dragStart.x,0,1-old.w),
          y:clamp(old.y+p.y-dragStart.y,0,1-old.h)};
      }else{
        let x1=dragStart.x,y1=dragStart.y,x2=p.x,y2=p.y;
        if(initialSelection&&dragMode!=='new'){
          const old=initialSelection;
          x1=dragMode.includes('l')?p.x:old.x;
          x2=dragMode.includes('r')?p.x:old.x+old.w;
          y1=dragMode.includes('t')?p.y:old.y;
          y2=dragMode.includes('b')?p.y:old.y+old.h;
        }
        selection={x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1)};
      }
      renderSelection();
    };
    const endDrag=e=>{
      if(!dragStart)return;
      updateDrag(e);
      const w=rotated%180===0?sourceImage.naturalWidth:sourceImage.naturalHeight;
      const h=rotated%180===0?sourceImage.naturalHeight:sourceImage.naturalWidth;
      const minW=Math.min(1,Math.max(.02,40/w));
      const minH=Math.min(1,Math.max(.02,40/h));
      if(selection&&(selection.w<minW||selection.h<minH)){
        selection=initialSelection||fullSelection();
        notify('Kırpma alanı çok küçük; önceki seçim korundu.');
      }
      dragStart=null;initialSelection=null;
      if(stage.hasPointerCapture?.(e.pointerId))stage.releasePointerCapture(e.pointerId);
      renderSelection();
    };
    stage.addEventListener('pointermove',updateDrag);
    stage.addEventListener('pointerup',endDrag);
    stage.addEventListener('pointercancel',e=>{
      if(!dragStart)return;
      selection=initialSelection||fullSelection();
      dragStart=null;initialSelection=null;
      if(stage.hasPointerCapture?.(e.pointerId))stage.releasePointerCapture(e.pointerId);
      renderSelection();
    });
    const loadSelectedFile=(file,fromOriginalBackup=false)=>{
      if(url){URL.revokeObjectURL(url);url=null;}
      sourceFile=file||null;
      originalFromBackup=!!fromOriginalBackup;
      sourceImage=null;selection=null;dragStart=null;rotated=0;
      stage.dataset.cropReady='0';
      controls.hidden=true;
      if(!file){renderSelection();return;}
      if(file.size>15*1024*1024){
        sourceFile=null;notify('Fotoğraf en fazla 15 MB olabilir.');return;
      }
      url=URL.createObjectURL(file);
      const img=new Image();
      sourceImage=img;
      img.onload=()=>{
        if(closed||sourceImage!==img)return;
        controls.hidden=false;
        selection=fullSelection();
        draw();
        scheduleDraw();
      };
      img.onerror=()=>{
        if(sourceImage!==img)return;
        sourceImage=null;sourceFile=null;controls.hidden=true;
        notify('Fotoğraf açılamadı. Başka bir görsel dene.');
      };
      img.src=url;
      const previous=wrap.querySelector('.book-existing-photo');
      if(previous)previous.hidden=true;
      const remove=wrap.querySelector('[data-book-remove]');
      if(remove)remove.checked=false;
    };
    input.addEventListener('change',()=>loadSelectedFile(input.files?.[0]||null,false));
    wrap.querySelector('[data-book-rotate]').addEventListener('click',()=>{
      if(!sourceImage)return;
      rotated=(rotated+90)%360;
      selection=fullSelection();
      draw();
    });
    wrap.querySelector('[data-book-reset-crop]').addEventListener('click',()=>{
      selection=fullSelection();
      renderSelection();
    });
    wrap.getSourceFile=()=>sourceFile;
    wrap.isUsingOriginalBackup=()=>originalFromBackup;
    wrap.getImageOptions=()=>({
      rotate:rotated,trim:false,grayscale:wrap.querySelector('[data-book-gray]').checked,
      manualCrop:!!selection,
      left:selection?selection.x*100:0,
      top:selection?selection.y*100:0,
      right:selection?(1-selection.x-selection.w)*100:0,
      bottom:selection?(1-selection.y-selection.h)*100:0
    });
    wrap.querySelector('[data-book-restore-original]')?.addEventListener('click',async()=>{
      const original=await lookup(editing.id+'.original').catch(()=>null);
      let blob=original;
      if(!blob){
        blob=await getPhoto(editing.id);
        if(!blob){notify('Fotoğrafın bu cihazda veya hesabında yedeği bulunamadı.');return;}
      }
      const file=new File([blob],original?'orijinal-soru.jpg':'kayitli-soru.jpg',
        {type:blob.type||'image/jpeg'});
      // WebKit may reject programmatic input.files assignment. The photo is
      // kept separately as sourceFile, so Save still works in that case.
      try{
        const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;
      }catch{input.value='';}
      loadSelectedFile(file,!!original);
      notify(original?'Orijinal fotoğraf açıldı. Köşelerinden kırpıp kaydet.':
        'Orijinal yedek bulunamadı; kayıtlı fotoğrafı yeniden kırpabilirsin. Önceden kesilmiş alan geri getirilemez.');
    });
    const onResize=()=>scheduleDraw();
    window.addEventListener('resize',onResize,{passive:true});
    let observedWidth=0;
    const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{
      const w=entries[0]?.contentRect?.width||0;
      if(w&&Math.abs(w-observedWidth)>2){observedWidth=w;scheduleDraw();}
    }):null;
    resizeObserver?.observe(wrap);
    let existingUrl=null;
    if(editing?.hasPhoto){
      void getPhoto(editing.id).then(blob=>{
        if(!blob||!wrap.isConnected)return;
        existingUrl=URL.createObjectURL(blob);
        const img=wrap.querySelector('[data-book-existing]');
        if(img)img.src=existingUrl;
      });
    }
    const cleanup=()=>{
      if(url)URL.revokeObjectURL(url);
      if(existingUrl)URL.revokeObjectURL(existingUrl);
      closed=true;
      window.removeEventListener('resize',onResize);
      resizeObserver?.disconnect();
      watch.disconnect();
    };
    const root=document.getElementById('modalRoot');
    const watch=new MutationObserver(()=>{if(!form.isConnected)cleanup();});
    if(root)watch.observe(root,{childList:true,subtree:true});
    form.addEventListener('book-cleanup',cleanup,{once:true});
  }

  async function savePhoto(form,id,previous){
    const editor=form.querySelector('[data-book-image-editor]');
    if(!editor)return !!previous;
    const file=editor.getSourceFile?.()||editor.querySelector('input[type=file]')?.files?.[0];
    const remove=!!editor.querySelector('[data-book-remove]')?.checked;
    if(file){
      const blob=await processPhoto(file,editor.getImageOptions());
      if(!editor.isUsingOriginalBackup?.())await store(id+'.original',file).catch(e=>console.warn('Orijinal fotoğraf yedeklenemedi',e));
      await store(id,blob);
      const uid=accountId();
      if(uid)localStorage.removeItem(uploadedKey(uid,id));
      void syncPending(await readState()).catch(()=>{});
      form.dispatchEvent(new Event('book-cleanup'));
      return true;
    }
    if(remove){
      await erase(id);
      await erase(id+'.original').catch(()=>{});
      void account()?.photoDelete?.(id).catch(e=>console.warn('Photo cleanup',e));
      form.dispatchEvent(new Event('book-cleanup'));
      return false;
    }
    form.dispatchEvent(new Event('book-cleanup'));
    return !!previous;
  }

  async function forgetPhoto(id){
    try{await erase(id);await erase(id+'.original');}catch{}
    try{await account()?.photoDelete?.(id);}catch{}
  }

  function releasePreviews(){
    bookImageObserver?.disconnect();
    bookImageObserver=null;
    for(const url of previewUrls)URL.revokeObjectURL(url);
    previewUrls.clear();
  }
  async function showPhoto(img,id){
    const blob=await getPhoto(id);
    if(!blob||!img.isConnected)return;
    const url=URL.createObjectURL(blob);
    previewUrls.add(url);img.src=url;
    img.onload=()=>{if(img.isConnected)return;URL.revokeObjectURL(url);previewUrls.delete(url);};
  }

  function isSolved(question){
    return question?.status==='solved'||question?.status==='complete'||question?.status==='completed';
  }

  function pageSubjects(questions){
    return SUBJECTS.map(subject=>({subject,count:questions.filter(q=>q.subject===subject&&q.hasPhoto).length}));
  }

  function render(view,actions,state){
    releasePreviews();
    const questions=(state.questions||[]).filter(q=>q.hasPhoto);
    const stats=pageSubjects(questions);
    if(!stats.some(x=>x.subject===currentSubject&&x.count)&&stats.some(x=>x.count))currentSubject=stats.find(x=>x.count).subject;
    const months=[...new Set(questions.filter(q=>q.subject===currentSubject).map(q=>String(q.photoAddedAt||q.createdAt||'').slice(0,7)).filter(Boolean))].sort().reverse();
    if(period!=='all'&&!months.includes(period))period='all';
    const visible=questions.filter(q=>q.subject===currentSubject&&(period==='all'||String(q.photoAddedAt||q.createdAt||'').startsWith(period)))
      .filter(q=>bookStatus==='all'||(bookStatus==='solved' ? isSolved(q):!isSolved(q)))
      .filter(q=>[q.topic,q.source,q.reference,q.note].join(' ').toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')))
      .sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    actions.innerHTML=`<button class="primary-btn" type="button" data-book-export ${visible.length?'':'disabled'}>↓ PDF kitapçık indir</button>`;
    view.innerHTML=`<section class="book-intro card"><div class="card-body">
        <div class="book-kicker">KİŞİSEL SORU BANKAN</div><div class="book-title">Soru Kitaplığım</div>
        <p>Fotoğraflı sorular derslerine göre otomatik eklenir. Çözdürülenler ✓ işaretlenerek kitapçıkta kalır; yalnızca silinen sorular çıkar.</p><p class="book-storage-note">${accountId()?"☁️ Fotoğraflar hesabına özel alanda yedeklenir.":"📱 Hesap bağlanmadıysa fotoğraflar bu cihazda saklanır; cihaz değiştirirken hesabına bağlan."}</p>
      </div></section>
      <div class="book-subjects">${stats.map(x=>`<button class="book-subject ${x.subject===currentSubject?'selected':''}" type="button" data-book-subject="${esc(x.subject)}">${esc(x.subject)} <strong>${x.count}</strong></button>`).join('')}</div>
      <section class="card"><div class="card-head"><div><div class="card-title">${esc(currentSubject)} • ${visible.length} soru</div><div class="card-subtitle">Canlı kitapçık · Cevaplar kendi sorularına bağlı kalır · PDF günceldir</div></div></div>
        <div class="card-body">
          <div class="book-filters"><label>Dönem<select data-book-period><option value="all">Tüm zamanlar</option>${months.map(m=>`<option value="${m}" ${period===m?'selected':''}>${m}</option>`).join('')}</select></label>
          <label>Durum<select data-book-status>
            <option value="all" ${bookStatus==='all'?'selected':''}>Tümü</option>
            <option value="open" ${bookStatus==='open'?'selected':''}>Henüz çözdürülmedi</option>
            <option value="solved" ${bookStatus==='solved'?'selected':''}>✓ Çözdürüldü</option>
          </select></label>
          <label>Sorularda ara<input type="search" data-book-search value="${esc(search)}" placeholder="Kaynak, konu, soru…"></label></div>
          ${visible.length?`<div class="book-grid">${visible.map((q,i)=>`<article class="book-question" data-book-card="${esc(q.id)}"><div class="book-question-head"><strong>${i+1}. ${esc(q.topic||q.subject)}</strong><span>${esc(q.reference||'')}</span></div><div class="book-thumb-wrap"><img data-book-preview="${esc(q.id)}" alt="Soru fotoğrafı" loading="lazy"></div><div class="book-question-foot"><span>${esc(q.source||'Kaynak belirtilmedi')}</span>${isSolved(q)?'<span class="book-solved-badge">✓ Çözdürüldü</span>':'<span class="book-unsolved-badge">Henüz çözdürülmedi</span>'}</div>${/^[A-E]$/.test(String(q.correctAnswer||'').toUpperCase())?`<div class="book-question-answer">Doğru cevap: <strong>${esc(q.correctAnswer.toUpperCase())}</strong></div>`:''}</article>`).join('')}</div>`:'<div class="empty-state">Bu ders ve filtre için fotoğraflı soru yok. Sorular bölümünden fotoğraf ekle.</div>'}
        </div></section>`;
    view.querySelectorAll('[data-book-subject]').forEach(btn=>btn.onclick=()=>{currentSubject=btn.dataset.bookSubject;period='all';search='';releasePreviews();render(view,actions,state);});
    view.querySelector('[data-book-period]').onchange=e=>{period=e.target.value;releasePreviews();render(view,actions,state);};
    view.querySelector('[data-book-status]').onchange=e=>{bookStatus=e.target.value;releasePreviews();render(view,actions,state);};
    view.querySelector('[data-book-search]').onchange=e=>{search=e.target.value;releasePreviews();render(view,actions,state);};
    const thumbnails=[...view.querySelectorAll('[data-book-preview]')];
    if('IntersectionObserver' in window){
      bookImageObserver?.disconnect();
      bookImageObserver=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting)continue;
          bookImageObserver?.unobserve(entry.target);
          void showPhoto(entry.target,entry.target.dataset.bookPreview);
        }
      },{rootMargin:'350px'});
      thumbnails.forEach(img=>bookImageObserver.observe(img));
    }else{
      thumbnails.slice(0,32).forEach(img=>void showPhoto(img,img.dataset.bookPreview));
    }

    actions.querySelector('[data-book-export]').onclick=async event=>{
      const btn=event.currentTarget;btn.disabled=true;const initial=btn.textContent;
      btn.textContent='PDF hazırlanıyor…';
      try{
        if(!window.HakunaBookPDF)throw new Error('PDF modülü henüz yüklenmedi.');
        const current=[...visible];
        const pdf=await window.HakunaBookPDF.build(current.map(q=>({...q,getPhoto:()=>getPhoto(q.id)})),{
          subject:currentSubject,period:period==='all'?'Tüm zamanlar':period
        });
        const name='Hakuna-'+currentSubject.replace(/\s+/g,'-')+'-Soru-Kitapcigi-'+new Date().toISOString().slice(0,10)+'.pdf';
        const file=new File([pdf],name,{type:'application/pdf'});
        let handled=false;
        if(navigator.share&&navigator.canShare?.({files:[file]})){
          try{
            await navigator.share({files:[file],title:currentSubject+' Soru Kitapçığı'});
            handled=true;
          }catch(err){
            if(err.name==='AbortError')handled=true;
            else console.warn('PDF paylaşımı yerine indirme deneniyor',err);
          }
        }
        if(!handled){
          const url=URL.createObjectURL(pdf),a=document.createElement('a');
          a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
          setTimeout(()=>URL.revokeObjectURL(url),60000);
        }
        notify('PDF kitapçığı hazır.');
      }catch(e){console.error(e);notify('PDF oluşturulamadı: '+e.message);}
      finally{btn.textContent=initial;btn.disabled=false;}
    };
    void syncPending(state);
  }

  let poll=0;
  function start(){
    if(poll)return;
    poll=setInterval(async()=>{
      if(!navigator.onLine||document.hidden)return;
      const state=await readState().catch(()=>null);
      if(state)void syncPending(state);
    },25000);
    window.addEventListener('online',async()=>{
      const state=await readState().catch(()=>null);
      if(state)void syncPending(state);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.HakunaQuestionBooks=Object.freeze({render,mountQuestionForm,savePhoto,getPhoto,forgetPhoto,syncPending});
})();