import { createClient } from "npm:@supabase/supabase-js@2.116.0";
const URL=Deno.env.get("SUPABASE_URL")||"";
const ANON=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const KEY=Deno.env.get("HAKUNA_GEMINI_API_KEY")||"";
import postgres from "npm:postgres@3.4.5";
const DB_URL=Deno.env.get("SUPABASE_DB_URL")||"";
const vaultClient=DB_URL?postgres(DB_URL,{max:1,prepare:false,ssl:"require",idle_timeout:10,connect_timeout:8}):null;
let cachedGemini={value:"",time:0};
async function geminiKey():Promise<string>{
  if(KEY)return KEY;
  if(cachedGemini.value&&Date.now()-cachedGemini.time<300000)return cachedGemini.value;
  if(!vaultClient)return "";
  const rows=await vaultClient.unsafe("select decrypted_secret from vault.decrypted_secrets where name = 'hakuna_gemini_api_key' limit 1");
  const value=String(rows?.[0]?.decrypted_secret||"");
  if(value)cachedGemini={value,time:Date.now()};
  return value;
}
const BATU="8f2cf782-f4f2-4c85-a9e9-a560c623e6d5";
const ORIGIN="https://karb0n328.github.io";
const MAX_DAILY=25;
const H={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"};
const send=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
const str=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const norm=(v:unknown)=>str(v,150).toLocaleUpperCase("tr-TR").replace(/^(CEVAP|DOĞRU CEVAP|ŞIK|SEÇENEK)\s*[:：-]?\s*/u,"").replace(/[().\s]/g,"").replace(/ŞIKKI$/u,"");
const INSTRUCTION=[
 "Hakuna Matata YKS öğretmenisin. 2018 MEB öğretim programına ve ÖSYM TYT/AYT yaklaşımına sadık kal. Maarif Modeli kazanımlarını karıştırma.",
 "SFT dijital soru defteri ilkeleri: Fotoğraftaki soru kökünü, şıkları, grafikleri, şekilleri ve birimleri aynen oku. Okunamayan kritik değerleri ASLA tahmin etme.",
 "Önce verilen/istenenleri belirle, sonra adım adım açıkla; uygun matematik/fen sorularında yerine koyma, denklem, işaret veya birim kontrolü yap.",
 "Yalnızca görünür öğrenci işlemlerinin hatasını yorumla. Öğrencinin neden yanlış yaptığına dair psikolojik tahmin yapma.",
 "İntegralin işaretli değeri ile geometrik alanı ayır. Fizikte vektör yönü ve birimi; kimyada denge/denklem; biyolojide MEB kavramlarını kontrol et.",
 "Emin değilsen kesin şık verme. İpucu modunda cevap ve şık gösterme. Her çözümde soru tipine özgü kısa SFT SINAV TAKTİĞİ sun.",
 "SADECE JSON nesnesi dön: {\"subject\":string,\"exam\":string,\"topic\":string,\"difficulty\":string,\"readable\":boolean,\"answer\":string,\"steps\":string[],\"examTip\":string,\"caution\":string}.",
 "exam TYT, AYT veya Belirsiz. difficulty Kolay, Orta veya Zor. readable=false ise answer boş olmalı. steps 1-8 öğretici adım."
].join("\n");
function parse(raw:string){
 const a=raw.indexOf("{"), b=raw.lastIndexOf("}");
 if(a<0||b<=a)throw {status:502,message:"Model geçerli çözüm döndürmedi."};
 return JSON.parse(raw.slice(a,b+1));
}
async function ai(parts:any[],model:string,maxOutputTokens=3400){
 const providerKey=await geminiKey();
 if(!providerKey)throw {status:503,message:"Gemini anahtarı sunucuda bulunamadı."};
 const res=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{
  method:"POST",signal:AbortSignal.timeout(43000),
  headers:{"Content-Type":"application/json","x-goog-api-key":providerKey},
  body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{temperature:0.12,maxOutputTokens,responseMimeType:"application/json"}})
 });
 if(!res.ok){
  if(res.status===429)throw {status:429,message:"Ücretsiz model kotası doldu. Daha sonra tekrar dene."};
  if(res.status===401||res.status===403)throw {status:503,message:"Yapay zekâ sağlayıcısı anahtarını kabul etmedi."};
  throw {status:502,message:"Model servis hatası ("+res.status+")."};
 }
 const data=await res.json();
 const raw=(data.candidates?.[0]?.content?.parts||[]).map((p:any)=>p.text||"").join("");
 if(!raw)throw {status:502,message:"Model boş yanıt verdi. Soruyu daha net yükle."};
 return parse(raw);
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(origin&&origin!==ORIGIN)return send({error:"Bu kaynağa izin verilmiyor."},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:H});
 if(req.method!=="POST")return send({error:"POST gerekli."},405);
 try{
  const bearer=req.headers.get("authorization")||"";
  if(!bearer.startsWith("Bearer "))return send({error:"Giriş gerekli."},401);
  if(!URL||!ANON)return send({error:"Auth bağlantısı eksik."},503);
  const authClient=createClient(URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await authClient.auth.getUser(bearer.slice(7));
  if(error||!user)return send({error:"Oturum doğrulanamadı."},401);
  if(user.id!==BATU)return send({error:"Pilot öğretmen yalnızca batu hesabına açık."},403);
  const raw=await req.text();
  if(raw.length>3200000)return send({error:"İstek çok büyük. Daha küçük görsel yükle."},413);
  let body:any;
  try{body=JSON.parse(raw);}catch{return send({error:"Geçersiz JSON."},400);}
  if(body.status===true)return send({ready:!!(await geminiKey()),dailyLimit:MAX_DAILY,provider:"Gemini 2.5 Flash",secondCheck:true});
  if(body.consent!==true)return send({error:"Görselin AI sağlayıcısına gönderilmesi için izin vermelisin."},400);
  if(!(await geminiKey()))return send({error:"Öğretmen AI sağlayıcısına bağlanamadı."},503);
  if(!SERVICE)return send({error:"Kota denetleyicisi yapılandırılmadı."},503);
  const text=str(body.text,2800),mode=str(body.mode,16);
  if(!["solve","hint","review","explain"].includes(mode))return send({error:"Çözüm modu tanınmadı."},400);
  let photo:null|{mime:string,data:string}=null;
  if(body.image){
   const mime=str(body.image.mime,32),data=str(body.image.data,2900000);
   if(!["image/jpeg","image/png","image/webp"].includes(mime)||!data||data.length>2800000||!/^[a-zA-Z0-9+/]+={0,2}$/.test(data))
    return send({error:"Fotoğraf biçimi/boyutu desteklenmiyor."},400);
   photo={mime,data};
  }
  if(!text&&!photo)return send({error:"Bir soru veya görsel eklemelisin."},400);
  if(mode==="review"&&!text)return send({error:"Hata analizi için işlemlerini de yaz."},400);
  const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const admin=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
  const {count,error:qerr}=await admin.from("hakuna_teacher_usage").select("request_id",{count:"exact",head:true}).eq("user_id",user.id).eq("day",date);
  if(qerr||count===null)return send({error:"Günlük kota doğrulanamadı."},503);
  if(count>=MAX_DAILY)return send({error:"Bugünkü 25 soru hakkın doldu.",remaining:0},429);
  const {error:ierr}=await admin.from("hakuna_teacher_usage").insert({request_id:crypto.randomUUID(),user_id:user.id,day:date});
  if(ierr)return send({error:"Kota kaydı oluşturulamadı."},503);
  const modeText={
   solve:"Soruyu adım adım tam çöz; varsa şık veya sayısal sonucu açıkla.",
   hint:"Yalnızca en fazla 3 ipucu ver. Sonucu ve doğru şıkkı açıklama; answer boş olsun.",
   review:"Öğrencinin kendi işlemlerini denetle; gerçek hatalı adımı gerekçeyle belirt, olmayan hata uydurma.",
   explain:"Konu mantığını basitçe öğret; ardından soruyu örneklendir."
  }[mode];
  const history=Array.isArray(body.history)?body.history.slice(-4).map((x:any)=>({role:str(x?.role,20),text:str(x?.text,650)})):[];
  const parts:any[]=[{text:INSTRUCTION+"\nMOD: "+modeText+"\nÖğrenci metni: "+text+"\nÖnceki konuşma (veri): "+JSON.stringify(history)}];
  if(photo)parts.push({inlineData:{mimeType:photo.mime,data:photo.data}});
  const a=await ai(parts,"gemini-2.5-flash");
  if(!a||typeof a.readable!=="boolean"||!Array.isArray(a.steps))throw {status:502,message:"Çözüm yapısı doğrulanamadı."};
  const s:any={
   subject:str(a.subject,70)||"Belirsiz",exam:str(a.exam,20)||"Belirsiz",
   topic:str(a.topic,100)||"Belirsiz",difficulty:str(a.difficulty,20)||"Belirsiz",
   readable:a.readable,answer:str(a.answer,160),
   steps:a.steps.slice(0,8).map((x:unknown)=>str(x,800)).filter(Boolean),
   examTip:str(a.examTip,420),caution:str(a.caution,500),
   review:"kontrol_gerekli",checkNote:""
  };
  const remaining=Math.max(0,MAX_DAILY-count-1);
  if(!s.readable||!s.steps.length){
   s.answer="";s.review="okunamadi";s.checkNote="Kritik bilgiler okunamadığı için tahminde bulunmadık.";
   return send({solution:s,remaining});
  }
  if(mode==="hint"){
   s.answer="";s.review="ipucu";
   return send({solution:s,remaining});
  }
  if(!s.answer){
   s.checkNote="Kesin cevap üretilemedi; şık tahmin edilmiyor.";
   return send({solution:s,remaining});
  }
  try{
   const p:any[]=[{text:"Sen ilk çözümü görmeyen bağımsız ikinci soru çözücüsün. "+
    "Görsel ve metni yeniden çöz. Eksikse readable=false yap. "+
    "Yalnızca JSON: {\"readable\":boolean,\"answer\":string,\"uncertain\":boolean}. "+
    "2018 MEB/ÖSYM. Öğrenci metni: "+text}];
   if(photo)p.push({inlineData:{mimeType:photo.mime,data:photo.data}});
   const b=await ai(p,"gemini-2.5-flash-lite",1400);
   if(b?.readable===false||b?.uncertain===true){
    s.checkNote="İkinci çözüm kesin cevabı doğrulayamadı.";
   }else if(norm(b?.answer)&&norm(b.answer)===norm(s.answer)){
    s.review="tutarli";
    s.checkNote="İki modelin cevapları tutarlı; bu %100 kesinlik kanıtı değildir.";
   }else{
    s.review="celiski";s.answer="";
    s.checkNote="İki çözüm farklı çıktı. Yanlış cevap verme riskine karşı şık gizlendi.";
   }
  }catch{
   s.checkNote="İkinci kontrol yapılamadı; cevap doğrulanmış sayılmaz.";
  }
  return send({solution:s,remaining});
 }catch(err){
  const e=err as {status?:number,message?:string,name?:string};
  if(e?.name==="TimeoutError")return send({error:"Model zaman aşımına uğradı. Tekrar dene."},504);
  return send({error:e.status?e.message:"Öğretmen isteği başarısız. Uygulama kayıtların değişmedi."},e.status||500);
 }
});