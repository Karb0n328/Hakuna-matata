import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";

(() => {
  "use strict";
  const BATU="8f2cf782-f4f2-4c85-a9e9-a560c623e6d5";
  const URL="https://zyrbbkbwrijnnykbgjvc.supabase.co";
  const KEY="sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL";
  const client=createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const DB="hakuna-ai-teacher-journal",STORE="questions";
  const history=[];
  let root=null, button=null, pending=null, sending=false, statusBusy=false, lastUser=null;
  const el=(tag,cls,text)=>{
    const x=document.createElement(tag);
    if(cls)x.className=cls;
    if(text!=null)x.textContent=String(text);
    return x;
  };
  const isBatu=()=>window.HakunaAccount?.info?.()?.id===BATU;
  const $=(sel)=>root?.querySelector(sel);
  function loadCss(){
    if(document.querySelector("#hakunaTeacherCss"))return;
    const link=el("link");link.id="hakunaTeacherCss";link.rel="stylesheet";link.href="./ai-teacher.css?v=batu1";document.head.append(link);
  }
  function connectDb(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB,1);
      request.onupgradeneeded=()=>{
        if(!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE,{keyPath:"id"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function dbAll(){
    const db=await connectDb();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly"),r=tx.objectStore(STORE).getAll();
      r.onsuccess=()=>resolve(r.result||[]);
      r.onerror=()=>reject(r.error);
    });}finally{db.close();}
  }
  async function dbPut(item){
    const db=await connectDb();
    try{await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put(item);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });}finally{db.close();}
  }
  async function dbRemove(id){
    const db=await connectDb();
    try{await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });}finally{db.close();}
  }
  async function saveQuestion(source,solution,img){
    const id=crypto.randomUUID();
    await dbPut({id,date:new Date().toISOString(),question:source,solution,image:img||null});
    const all=await dbAll();
    if(all.length>40){
      all.sort((a,b)=>a.date.localeCompare(b.date));
      for(const old of all.slice(0,all.length-40))await dbRemove(old.id);
    }
    await updateArchive();
  }
  function addBubble(kind,text){
    const list=$("[data-ai-messages]");
    if(!list)return;
    const bubble=el("div","hakuna-ai-bubble "+kind);
    bubble.textContent=text;
    list.append(bubble);list.scrollTop=list.scrollHeight;
  }
  function addSolution(data){
    const list=$("[data-ai-messages]"),card=el("article","hakuna-ai-solution");
    if(!list)return;
    const title=el("h3","",data.subject+" · "+data.topic);
    card.append(title);
    const sub=el("p","hakuna-ai-meta",data.exam+" · "+data.difficulty);
    card.append(sub);
    const state=data.review;
    const acceptable=state==="tutarli"||state==="hesap_ve_model";
    const conflict=["celiski","hesap_celiski","kaynak_celiski"].includes(state);
    const badge=el("div","hakuna-ai-review "+(acceptable?"is-consistent":conflict?"is-conflict":""),(
      state==="hesap_ve_model"?"Hesap + ikinci model tutarlı (garanti değil)":
      state==="tutarli"?"İki model tutarlı (garanti değil)":
      state==="hesap_celiski"?"Hesap/birim/atom denetimi başarısız; cevap gizlendi":
      state==="kaynak_celiski"?"MEB kaynak notuyla olası çelişki; cevap gizlendi":
      state==="celiski"?"Çözümler çelişti; cevap gizlendi":
      state==="okunamadi"?"Fotoğrafı yeniden yükle":
      state==="ipucu"?"İpucu modu":"Sonuç doğrulanamadı"
    ));
    card.append(badge);
    if(data.answer){
      const answer=el("p","hakuna-ai-answer");answer.append(el("strong","", "CEVAP: "));answer.append(document.createTextNode(data.answer));card.append(answer);
    }
    const ol=el("ol","hakuna-ai-steps");
    for(const step of data.steps||[])ol.append(el("li","",step));
    card.append(ol);
    if(data.examTip)card.append(el("p","hakuna-ai-tip","SFT SINAV TAKTİĞİ: "+data.examTip));
    if(data.caution)card.append(el("p","hakuna-ai-warning",data.caution));
    if(data.checkNote)card.append(el("p","hakuna-ai-muted",data.checkNote));
    if(data.verification?.attempted){
      const attempted=Number(data.verification.attempted)||0;
      const passed=Number(data.verification.passed)||0;
      const failed=Number(data.verification.failed)||0;
      const skipped=Number(data.verification.skipped)||0;
      card.append(el("p","hakuna-ai-muted","Otomatik işlem kontrolleri: "+passed+"/"+attempted+" geçti · "+failed+" tutarsız · "+skipped+" değerlendirilemedi."));
    }
    if(Array.isArray(data.sources)&&data.sources.length){
      const refs=el("div","hakuna-ai-sources");
      refs.append(el("strong","","İlgili MEB/OGM kaynakları (konu referansı): "));
      data.sources.slice(0,3).forEach(src=>{
        if(typeof src?.url!=="string"||!src.url.startsWith("https://ogmmateryal.eba.gov.tr/"))return;
        const a=el("a","",src.title||"MEB/OGM");
        a.href=src.url;a.target="_blank";a.rel="noopener noreferrer";
        refs.append(a);
      });
      card.append(refs);
    }
    list.append(card);list.scrollTop=list.scrollHeight;
  }
  async function fileToImage(file){
    if(!file.type.startsWith("image/"))throw Error("Yalnızca fotoğraf yüklenebilir.");
    if(file.size>18*1024*1024)throw Error("Fotoğraf 18 MB sınırını aşıyor.");
    const bitmap=await createImageBitmap(file);
    try{
      const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);
      let quality=0.79,url="";
      do{url=canvas.toDataURL("image/jpeg",quality);quality-=0.09;}while(url.length>2700000&&quality>0.42);
      if(url.length>2700000)throw Error("Görsel çok büyük kaldı. Soruyu biraz kırpıp yeniden dene.");
      return url;
    }finally{bitmap.close();}
  }
  async function updateArchive(){
    const items=await dbAll();
    const count=$("[data-ai-count]");
    if(count)count.textContent=items.length+" soru kayıtlı (bu cihaz)";
    return items;
  }
  function build(){
    loadCss();
    button=el("button","hakuna-ai-fab","🎓 AI Öğretmen");
    button.type="button";
    button.setAttribute("aria-label","Yapay zekâ öğretmeni aç");
    button.onclick=()=>open();
    document.body.append(button);

    root=el("div","hakuna-ai-overlay");
    root.hidden=true;
    root.innerHTML=[
      '<div class="hakuna-ai-dialog" role="dialog" aria-modal="true" aria-label="Hakuna yapay zekâ öğretmen">',
        '<header class="hakuna-ai-header">',
          '<div><b>🎓 Hakuna AI Öğretmen</b><span>2027 YKS · 2018 MEB programı · Batu pilot</span></div>',
          '<button type="button" data-ai-close aria-label="Kapat">✕</button>',
        '</header>',
        '<div class="hakuna-ai-messages" data-ai-messages aria-live="polite"></div>',
        '<div class="hakuna-ai-controls">',
          '<div class="hakuna-ai-modes">',
            '<label for="hakuna-ai-mode">Öğretmen modu</label>',
            '<select id="hakuna-ai-mode" data-ai-mode>',
              '<option value="solve">Soruyu çöz</option>',
              '<option value="hint">Yalnızca ipucu ver</option>',
              '<option value="review">Çözümümdeki hatayı bul</option>',
              '<option value="explain">Konuyu mantığıyla anlat</option>',
            '</select>',
          '</div>',
          '<textarea data-ai-text rows="3" maxlength="2800" placeholder="Sorunu yaz veya çözümünün fotoğrafını yükle…"></textarea>',
          '<div class="hakuna-ai-fileline">',
            '<label class="hakuna-ai-upload">📷 Soru fotoğrafı <input type="file" data-ai-photo accept="image/*" hidden></label>',
            '<span data-ai-photoname>Fotoğraf seçilmedi</span>',
          '</div>',
          '<label class="hakuna-ai-consent"><input type="checkbox" data-ai-consent> Sorunun AI sağlayıcısına gönderilmesini kabul ediyorum. Kişisel bilgi içeren fotoğraf yüklemeyeceğim.</label>',
          '<div class="hakuna-ai-actions">',
            '<button type="button" class="hakuna-ai-submit" data-ai-send>Çöz / Açıkla</button>',
            '<span data-ai-remaining></span>',
          '</div>',
          '<div class="hakuna-ai-journal">',
            '<span data-ai-count>Defter yükleniyor…</span>',
            '<button type="button" data-ai-print>🖨️ Defter PDF</button>',
          '</div>',
          '<p class="hakuna-ai-privacy">Yapay zekâ yanılabilir. İki modelin aynı cevabı vermesi kesin doğrulama değildir. Ücretsiz sağlayıcı gönderilen içeriği hizmetini geliştirmek için kullanabilir. Kayıtlar yalnızca bu cihazdaki defterde saklanır.</p>',
        '</div>',
      '</div>'
    ].join("");
    root.querySelector("[data-ai-close]").onclick=close;
    root.addEventListener("click",e=>{if(e.target===root)close();});
    root.querySelector("[data-ai-photo]").addEventListener("change",async e=>{
      const f=e.target.files?.[0];
      if(!f){pending=null;return;}
      try{
        pending=await fileToImage(f);
        $("[data-ai-photoname]").textContent=f.name;
      }catch(err){
        pending=null;$("[data-ai-photoname]").textContent="Fotoğraf eklenemedi";
        addBubble("error",err.message||String(err));
      }
    });
    root.querySelector("[data-ai-send]").onclick=send;
    root.querySelector("[data-ai-print]").onclick=printJournal;
    document.body.append(root);
    addBubble("assistant","Merhaba Batu! Fotoğraf yükleyebilir, işlemlerini gönderebilir veya yalnızca ipucu isteyebilirsin. Okunamayan bilgileri tahmin etmeyeceğim.");
    void updateArchive().catch(()=>{});
  }
  function close(){if(root)root.hidden=true;}
  async function open(){
    if(!isBatu())return;
    root.hidden=false;
    $("[data-ai-text]").focus();
    void checkReady();
  }
  async function invoke(body){
    const {data:{session}}=await client.auth.getSession();
    if(!session?.access_token)throw Error("Önce Batu hesabında giriş yap.");
    const {data,error}=await client.functions.invoke("hakuna-teacher",{body});
    if(error){
      let msg="Öğretmen sunucusuna ulaşılamadı.";
      try{
        if(typeof error.context?.json==="function"){
          const result=await error.context.json();
          msg=result?.error||msg;
        }
      }catch{}
      throw Error(msg);
    }
    if(data?.error)throw Error(data.error);
    return data;
  }
  async function checkReady(){
    if(statusBusy)return;
    statusBusy=true;
    try{
      const info=await invoke({status:true});
      if(!info.ready)addBubble("error","AI sağlayıcısına henüz ulaşılamadı. Öğretmen arayüzü açık ama canlı çözümler kapalı.");
      if(Number.isFinite(info.remaining))$("[data-ai-remaining]").textContent="Bugün kalan: "+info.remaining+"/"+info.dailyLimit+" soru";
    }catch(err){addBubble("error",err.message||String(err));}
    finally{statusBusy=false;}
  }
  async function send(){
    if(sending)return;
    const question=$("[data-ai-text]").value.trim();
    const mode=$("[data-ai-mode]").value;
    const consent=$("[data-ai-consent]").checked;
    if(!question&&!pending){addBubble("error","Lütfen soru yaz veya fotoğraf yükle.");return;}
    if(!consent){addBubble("error","Yapay zekâ sağlayıcısına gönderim iznini işaretlemelisin.");return;}
    sending=true;
    const sendBtn=$("[data-ai-send]");sendBtn.disabled=true;sendBtn.textContent="Kontrol ediliyor…";
    const photo=pending;
    const prompt=question||"Yüklediğim fotoğraftaki soruyu çöz.";
    addBubble("user",prompt+(photo?" · 📷 Fotoğraf eklendi":""));
    try{
      const image=photo?{mime:"image/jpeg",data:photo.split(",")[1]}:null;
      const answer=await invoke({mode,text:question,image,consent:true,history:history.slice(-4)});
      addSolution(answer.solution);
      if(Number.isFinite(answer.remaining))$("[data-ai-remaining]").textContent=answer.remaining+" günlük yeni soru hakkı";
      history.push({role:"user",text:prompt},{role:"assistant",text:(answer.solution.steps||[]).join(" ").slice(0,650)});
      if(mode!=="hint"&&answer.solution?.readable&&["tutarli","hesap_ve_model"].includes(answer.solution.review))await saveQuestion(prompt,answer.solution,photo);
      $("[data-ai-text]").value="";
      $("[data-ai-photo]").value="";
      $("[data-ai-photoname]").textContent="Fotoğraf seçilmedi";
      pending=null;
    }catch(err){addBubble("error",err.message||String(err));}
    finally{sending=false;sendBtn.disabled=false;sendBtn.textContent="Çöz / Açıkla";}
  }
  async function printJournal(){
    let items;
    try{items=(await dbAll()).sort((a,b)=>a.date.localeCompare(b.date));}
    catch{addBubble("error","Yerel defter açılamadı.");return;}
    if(!items.length){addBubble("error","PDF için önce en az bir soru çözmelisin.");return;}
    document.querySelector("#hakunaTeacherPrint")?.remove();
    const printRoot=el("div");printRoot.id="hakunaTeacherPrint";
    const h=el("h1","","HAKUNA | DİJİTAL SORU DEFTERİ");printRoot.append(h);
    printRoot.append(el("p","","2027 YKS · TYT / AYT · Kişisel soru çözüm defteri"));
    printRoot.append(el("p","","Çıktı al veya yazdırma ekranında PDF olarak kaydet."));
    items.forEach((q,i)=>{
      const article=el("article","hakuna-ai-print-question");
      article.append(el("h2","","SORU "+String(i+1).padStart(3,"0")+" | "+q.solution.exam+" "+q.solution.subject));
      article.append(el("p","","Konu: "+q.solution.topic));
      if(q.image){const img=el("img");img.src=q.image;img.alt="Orijinal soru görseli";article.append(img);}
      else article.append(el("p","",q.question));
      if(q.solution.answer)article.append(el("p","","CEVAP: "+q.solution.answer));
      const list=el("ol");for(const step of q.solution.steps||[])list.append(el("li","",step));article.append(list);
      if(q.solution.examTip)article.append(el("p","","SFT SINAV TAKTİĞİ: "+q.solution.examTip));
      if(q.solution.checkNote)article.append(el("p","",q.solution.checkNote));
      if(Array.isArray(q.solution.sources)){
        for(const ref of q.solution.sources.slice(0,3)){
          if(typeof ref?.url!=="string"||!ref.url.startsWith("https://ogmmateryal.eba.gov.tr/"))continue;
          const link=el("a","",ref.title||"MEB/OGM kaynağı");
          link.href=ref.url;link.target="_blank";link.rel="noopener noreferrer";
          article.append(link,el("p","",""));
        }
      }
      article.append(el("div","hakuna-ai-note","ÖĞRENCİ NOTUM:"));
      printRoot.append(article);
    });
    document.body.append(printRoot);
    window.addEventListener("afterprint",()=>printRoot.remove(),{once:true});
    window.print();
  }
  function visible(){
    const granted=isBatu();
    if(granted&&!button)build();
    if(button)button.hidden=!granted;
    if(!granted&&root)close();
    lastUser=granted;
  }
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&root&&!root.hidden)close();});
  const timer=setInterval(visible,3000);
  visible();
  window.addEventListener("hakuna:account-changed",visible);
  window.addEventListener("focus",visible);
})();