(() => {
  'use strict';
  const DB='hakuna-question-image-cache',STORE='photos';
  const SUBJECTS=['Türkçe','Matematik','Geometri','Fizik','Kimya','Biyoloji','Tarih','Coğrafya','Felsefe','Din'];
  let currentSubject='Matematik',period='all',search='',syncing=false;
  const previewUrls=new Set(),loading=new Map();

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

    if(options.trim){
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
        <img class="book-image-preview" alt="Yüklenecek soru fotoğrafı önizlemesi">
        <div class="book-image-actions">
          <button type="button" data-book-rotate>↻ 90° çevir</button>
          <label><input type="checkbox" data-book-trim checked> Beyaz kenarları kırp</label>
          <label><input type="checkbox" data-book-gray> Siyah-beyaz netleştir</label>
        </div>
        <details><summary>Kırpmayı elle ayarla</summary>
          <div class="book-crop-grid">${['Sol','Sağ','Üst','Alt'].map((label,i)=>`<label>${label}<input type="range" data-book-crop="${['left','right','top','bottom'][i]}" min="0" max="35" value="0"><output>0%</output></label>`).join('')}</div>
          <p class="book-helper">Birden fazla soru fotoğraftaysa sadece istediğin soruyu bırakacak şekilde kenarları kırp.</p>
        </details>
      </div>
      ${editing?.hasPhoto?'<label class="book-remove-photo"><input type="checkbox" data-book-remove> Fotoğrafı kaldır</label><p class="book-helper">Mevcut fotoğraf korunacak; kaldırmak için kutuyu işaretle.</p>':''}
    `;
    const actions=form.querySelector('.form-actions');
    if(actions)actions.before(wrap);else form.append(wrap);
    const input=wrap.querySelector('input[type=file]'), controls=wrap.querySelector('.book-image-controls');
    let rotated=0,url=null;
    input.addEventListener('change',()=>{
      if(url)URL.revokeObjectURL(url);
      const f=input.files?.[0];
      if(!f){controls.hidden=true;return;}
      url=URL.createObjectURL(f);
      wrap.querySelector('img').src=url;
      controls.hidden=false;
      wrap.querySelector('[data-book-remove]')?.removeAttribute('checked');
    });
    wrap.querySelector('[data-book-rotate]').onclick=()=>{
      rotated=(rotated+90)%360;
      wrap.querySelector('img').style.transform='rotate('+rotated+'deg)';
    };
    wrap.querySelectorAll('[data-book-crop]').forEach(slider=>slider.addEventListener('input',()=>{
      slider.nextElementSibling.textContent=slider.value+'%';
    }));
    wrap.getImageOptions=()=>({
      rotate:rotated,
      trim:wrap.querySelector('[data-book-trim]').checked,
      grayscale:wrap.querySelector('[data-book-gray]').checked,
      ...Object.fromEntries([...wrap.querySelectorAll('[data-book-crop]')].map(el=>[el.dataset.bookCrop,el.value]))
    });
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
    const file=editor.querySelector('input[type=file]')?.files?.[0];
    const remove=!!editor.querySelector('[data-book-remove]')?.checked;
    if(file){
      const blob=await processPhoto(file,editor.getImageOptions());
      await store(id,blob);
      const uid=accountId();
      if(uid)localStorage.removeItem(uploadedKey(uid,id));
      void syncPending(await readState()).catch(()=>{});
      form.dispatchEvent(new Event('book-cleanup'));
      return true;
    }
    if(remove){
      await erase(id);
      void account()?.photoDelete?.(id).catch(e=>console.warn('Photo cleanup',e));
      form.dispatchEvent(new Event('book-cleanup'));
      return false;
    }
    form.dispatchEvent(new Event('book-cleanup'));
    return !!previous;
  }

  async function forgetPhoto(id){
    try{await erase(id);}catch{}
    try{await account()?.photoDelete?.(id);}catch{}
  }

  function releasePreviews(){
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

  function pageSubjects(questions){
    return SUBJECTS.map(subject=>({subject,count:questions.filter(q=>q.subject===subject&&q.hasPhoto).length}));
  }

  function render(view,actions,state){
    const questions=(state.questions||[]).filter(q=>q.hasPhoto);
    const stats=pageSubjects(questions);
    if(!stats.some(x=>x.subject===currentSubject&&x.count)&&stats.some(x=>x.count))currentSubject=stats.find(x=>x.count).subject;
    const months=[...new Set(questions.filter(q=>q.subject===currentSubject).map(q=>String(q.createdAt||'').slice(0,7)).filter(Boolean))].sort().reverse();
    if(period!=='all'&&!months.includes(period))period='all';
    const visible=questions.filter(q=>q.subject===currentSubject&&(period==='all'||String(q.createdAt||'').startsWith(period)))
      .filter(q=>[q.topic,q.source,q.reference,q.note].join(' ').toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')))
      .sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    actions.innerHTML=`<button class="primary-btn" type="button" data-book-export ${visible.length?'':'disabled'}>↓ PDF kitapçık indir</button>`;
    view.innerHTML=`<section class="book-intro card"><div class="card-body">
        <div class="book-kicker">KİŞİSEL SORU BANKAN</div><div class="book-title">Soru Kitaplığım</div>
        <p>Fotoğraflı sorular kaydedildikleri anda derslerine göre otomatik eklenir. Kitapçık her zaman güncel kalır.</p>
      </div></section>
      <div class="book-subjects">${stats.map(x=>`<button class="book-subject ${x.subject===currentSubject?'selected':''}" type="button" data-book-subject="${esc(x.subject)}">${esc(x.subject)} <strong>${x.count}</strong></button>`).join('')}</div>
      <section class="card"><div class="card-head"><div><div class="card-title">${esc(currentSubject)} • ${visible.length} soru</div><div class="card-subtitle">Canlı kitapçık · PDF oluşturduğunda güncel sorular kullanılır</div></div></div>
        <div class="card-body">
          <div class="book-filters"><label>Dönem<select data-book-period><option value="all">Tüm zamanlar</option>${months.map(m=>`<option value="${m}" ${period===m?'selected':''}>${m}</option>`).join('')}</select></label>
          <label>Sorularda ara<input type="search" data-book-search value="${esc(search)}" placeholder="Kaynak, konu, soru…"></label></div>
          ${visible.length?`<div class="book-grid">${visible.map((q,i)=>`<article class="book-question" data-book-card="${esc(q.id)}"><div class="book-question-head"><strong>${i+1}. ${esc(q.topic||q.subject)}</strong><span>${esc(q.reference||'')}</span></div><div class="book-thumb-wrap"><img data-book-preview="${esc(q.id)}" alt="Soru fotoğrafı" loading="lazy"></div><div class="book-question-foot">${esc(q.source||'Kaynak belirtilmedi')}</div></article>`).join('')}</div>`:'<div class="empty-state">Bu ders ve filtre için fotoğraflı soru yok. Sorular bölümünden fotoğraf ekle.</div>'}
        </div></section>`;
    view.querySelectorAll('[data-book-subject]').forEach(btn=>btn.onclick=()=>{currentSubject=btn.dataset.bookSubject;period='all';search='';releasePreviews();render(view,actions,state);});
    view.querySelector('[data-book-period]').onchange=e=>{period=e.target.value;releasePreviews();render(view,actions,state);};
    view.querySelector('[data-book-search]').onchange=e=>{search=e.target.value;releasePreviews();render(view,actions,state);};
    view.querySelectorAll('[data-book-preview]').forEach(img=>void showPhoto(img,img.dataset.bookPreview));

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