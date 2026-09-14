(() => {
  'use strict';
  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  const SUBJECTS=['Türkçe','Matematik','Geometri','Fizik','Kimya','Biyoloji','Tarih','Coğrafya','Felsefe','Din','Deneme','Diğer'];
  const UNITS=['dakika','test','soru','sayfa','bölüm'];
  const EMOJI={'Türkçe':'📖','Matematik':'🧮','Geometri':'📐','Fizik':'⚡','Kimya':'🧪','Biyoloji':'🧬','Tarih':'🏛️','Coğrafya':'🌍','Felsefe':'💭','Din':'☾','Deneme':'📝','Diğer':'✨'};
  const SUBJECT_ALIASES={
    'Türkçe':['turkce','turkçe','edebiyat'], 'Matematik':['matematik','mat','mat dersi'], 'Geometri':['geometri','geo'],
    'Fizik':['fizik','fiz'], 'Kimya':['kimya'], 'Biyoloji':['biyoloji','bio'], 'Tarih':['tarih'],
    'Coğrafya':['cografya','coğrafya','cog'], 'Felsefe':['felsefe'], 'Din':['din','din kulturu','din kültürü'],
    'Deneme':['deneme','tyt deneme','ayt deneme','brans deneme','branş deneme']
  };
  const TOPICS=[
    ['Türkçe','Paragraf',['paragraf','paragraf denemesi']],['Türkçe','Dil Bilgisi',['dil bilgisi','dilbilgisi']],
    ['Matematik','Problem',['problem','problemler']],['Matematik','Türev',['turev','türev']],['Matematik','Limit',['limit']],
    ['Matematik','Fonksiyon',['fonksiyon','fonk']],['Matematik','İntegral',['integral']],['Geometri','Geometri',['geometri','geo']],
    ['Fizik','Fizik',['fizik','fiz']],['Kimya','Kimya',['kimya']],['Biyoloji','Biyoloji',['biyoloji','bio']],
    ['Deneme','TYT Denemesi',['tyt deneme','tyt denemesi']],['Deneme','AYT Denemesi',['ayt deneme','ayt denemesi']]
  ];
  const NUMBER_WORDS={sifir:0,bir:1,iki:2,uc:3,dort:4,bes:5,alti:6,yedi:7,sekiz:8,dokuz:9,on:10,onbir:11,'on bir':11,oniki:12,'on iki':12,onuc:13,'on uc':13,ondort:14,'on dort':14,onbes:15,'on bes':15,onalti:16,'on alti':16,onyedi:17,'on yedi':17,onsekiz:18,'on sekiz':18,ondokuz:19,'on dokuz':19,yirmi:20,yirmibir:21,'yirmi bir':21,yirmiiki:22,'yirmi iki':22,yirmiuc:23,'yirmi uc':23,yirmidort:24,'yirmi dort':24};
  const WEEKDAYS={pazartesi:1,sali:2,carsamba:3,persembe:4,cuma:5,cumartesi:6,pazar:0};
  const MONTHS={ocak:0,subat:1,mart:2,nisan:3,mayis:4,haziran:5,temmuz:6,agustos:7,eylul:8,ekim:9,kasim:10,aralik:11};

  let db=null;
  const uid=(p='id')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=(v='')=>String(v).toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[’']/g,"'").replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

  function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function parseISO(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d);}
  function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function addDays(s,n){const d=parseISO(s);d.setDate(d.getDate()+n);return iso(d);}
  function fmtDate(s){return new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long'}).format(parseISO(s));}
  function minute(t){const [h,m]=String(t).split(':').map(Number);return h*60+m;}
  function time(m){m=clamp(Math.round(m),0,1439);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
  function duration(start,end){return Math.max(0,minute(end)-minute(start));}
  function fmtDuration(m){return m<60?`${m} dk`:`${Math.floor(m/60)} sa${m%60?` ${m%60} dk`:''}`;}
  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('app'))req.result.createObjectStore('app');};req.onsuccess=()=>{db=req.result;resolve(db)};req.onerror=()=>reject(req.error);});}
  function readState(){return new Promise((resolve,reject)=>{const tx=db.transaction('app','readonly');const req=tx.objectStore('app').get(STATE_KEY);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
  function writeState(state){return new Promise((resolve,reject)=>{const tx=db.transaction('app','readwrite');tx.objectStore('app').put(state,STATE_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}

  function levenshtein(a,b){const m=a.length,n=b.length,dp=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=n;j++){const old=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return dp[n];}
  function fuzzyContains(text,needle){const n=fold(text),a=fold(needle);if(!a)return false;if(n.includes(a))return true;if(a.length<4)return false;return n.split(/[^a-z0-9]+/).filter(Boolean).some(t=>Math.abs(t.length-a.length)<=2&&levenshtein(t,a)<=Math.max(1,Math.floor(a.length/5)));}
  function normalizeNumbers(text){let n=fold(text);const inflected={birden:'1den',birde:'1de',bire:'1e',ikiden:'2den',ikide:'2de',ikiye:'2ye',ucten:'3ten',ucte:'3te',uce:'3e',dortten:'4ten',dortte:'4te',dorde:'4e',besten:'5ten',beste:'5te',bese:'5e',altidan:'6dan',altida:'6da',altiya:'6ya',yediden:'7den',yedide:'7de',yediye:'7ye',sekizden:'8den',sekizde:'8de',sekize:'8e',dokuzdan:'9dan',dokuzda:'9da',dokuza:'9a',ondan:'10dan',onda:'10da',ona:'10a'};for(const [k,v] of Object.entries(inflected).sort((a,b)=>b[0].length-a[0].length))n=n.replace(new RegExp(`\\b${k}\\b`,'g'),v);for(const k of Object.keys(NUMBER_WORDS).sort((a,b)=>b.length-a.length))n=n.replace(new RegExp(`\\b${k.replace(/ /g,'\\s+')}\\b`,'g'),String(NUMBER_WORDS[k]));return n.replace(/\b(\d{1,2})\s+bucuk(?:ta|te|da|de)?\b/g,'$1.30').replace(/\b(\d{1,2})\s+ceyrek(?:ta|te|da|de)?\b/g,'$1.15').replace(/(\d{1,2})'(den|dan|ten|tan|de|da|te|ta|e|a)/g,'$1$2');}
  function parseDate(text,fallback=todayISO()){
    const n=fold(text);if(/\bevvelsi gun\b|\bondan onceki gun\b/.test(n))return addDays(todayISO(),-2);if(/\bdun\b/.test(n))return addDays(todayISO(),-1);if(/\bobur gun\b|\botesi gun\b/.test(n))return addDays(todayISO(),2);if(/\byarin\b/.test(n))return addDays(todayISO(),1);if(/\bbugun\b|\bbugunku\b/.test(n))return todayISO();
    const dm=n.match(/\b(\d{1,2})\s+(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\b/);if(dm){const d=new Date();d.setHours(0,0,0,0);d.setMonth(MONTHS[dm[2]],Number(dm[1]));if(d<parseISO(addDays(todayISO(),-1)))d.setFullYear(d.getFullYear()+1);return iso(d);}for(const [name,wd] of Object.entries(WEEKDAYS)){if(new RegExp(`\\b(?:gelecek\\s+)?${name}\\b`).test(n)){const base=parseISO(todayISO());let diff=(wd-base.getDay()+7)%7;if(diff===0&&n.includes('gelecek'))diff=7;return addDays(todayISO(),diff);}}return fallback;
  }
  function parseClock(raw,context=''){let x=fold(raw).replace(/^saat\s*/,'').replace(/(deki|daki|de|da|te|ta|e|a)$/,'');const m=x.match(/^(\d{1,2})(?:[:.]([0-5]?\d))?$/);if(!m)return null;let h=Number(m[1]),mm=Number(m[2]||0);if(h>24)return null;const ctx=fold(context);if(h<12){if(/sabah|ogleden once/.test(ctx)){}else if(/ogleden sonra|aksam|gece/.test(ctx))h+=12;else if(h>=1&&h<=7)h+=12;}if(h===24)h=0;return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;}
  function extractTimes(text){const n=normalizeNumbers(text);const out=[];const re=/\b(?:saat\s*)?(\d{1,2}(?:[:.]\d{1,2})?)(?:'?(?:deki|daki|de|da|te|ta|den|dan|ten|tan|e|a))?\b/g;let m;while((m=re.exec(n))){const raw=m[1];const before=n.slice(Math.max(0,m.index-10),m.index);const after=n.slice(re.lastIndex,re.lastIndex+12);if(/\b(test|soru|sayfa|dakika|dk)\s*$/.test(before)||/^\s*(test|soru|sayfa|dakika|dk)\b/.test(after))continue;const t=parseClock(raw,n);if(t&&!out.includes(t))out.push(t);}return out;}
  function parseIntervals(text){const n=normalizeNumbers(text),out=[];const re=/(\d{1,2}(?:[:.]\d{1,2})?)\s*(?:ile|-|den|dan|ten|tan)\s*(\d{1,2}(?:[:.]\d{1,2})?)(?:\s*(?:arasi|arasinda))?/g;let m;while((m=re.exec(n))){let start=parseClock(m[1],n),end=parseClock(m[2],n);if(start&&end){if(minute(end)<=minute(start)&&minute(start)<12*60)end=time(minute(end)+12*60);if(minute(end)>minute(start))out.push({start,end,index:m.index,endIndex:re.lastIndex});}}return {normalized:n,intervals:out};}
  function parseDuration(text){const n=normalizeNumbers(text);let m=n.match(/\b(\d+(?:[.,]\d+)?)\s*(saat|sa)\b/);if(m)return Math.round(Number(m[1].replace(',','.'))*60);m=n.match(/\b(\d+)\s*(dakika|dk)\b/);return m?Number(m[1]):null;}
  function parseMetric(text){const n=normalizeNumbers(text);const m=n.match(/\b(\d+(?:[.,]\d+)?)\s*(test|soru|sayfa|dakika|dk|bolum)\b/);if(!m)return null;let unit=m[2];if(unit==='dk')unit='dakika';if(unit==='bolum')unit='bölüm';return {value:Number(m[1].replace(',','.')),unit};}
  function detectSubject(text){for(const [subject,title,words] of TOPICS){for(const w of words)if(fuzzyContains(text,w))return {subject,title};}for(const [subject,words] of Object.entries(SUBJECT_ALIASES)){for(const w of words)if(fuzzyContains(text,w))return {subject,title:subject};}return null;}
  function detectSubjects(text){const found=[];for(const [subject,title,words] of TOPICS){for(const w of words)if(fuzzyContains(text,w)){if(!found.some(x=>x.subject===subject&&x.title===title))found.push({subject,title,word:w});break;}}for(const [subject,words] of Object.entries(SUBJECT_ALIASES)){for(const w of words)if(fuzzyContains(text,w)){if(!found.some(x=>x.subject===subject&&x.title===subject))found.push({subject,title:subject,word:w});break;}}return found;}
  function cleanTitle(raw,fallback='Çalışma'){let s=String(raw).trim();s=s.replace(/\b(bugun|bugünkü|yarin|dun|pazartesi|sali|çarşamba|carsamba|persembe|perşembe|cuma|cumartesi|pazar)\b/gi,' ').replace(/\b(saat|arasi|arasina|arasinda|başla|basla|ekle|koy|yerlestir|yerleştir|programa|programina|programına|bloğu|blogu|blok|dersi|ders)\b/gi,' ').replace(/\b\d{1,2}(?:[:.]\d{1,2})?\s*(?:-|ile|den|dan|ten|tan)\s*\d{1,2}(?:[:.]\d{1,2})?\b/g,' ').replace(/\b\d+(?:[.,]\d+)?\s*(test|soru|sayfa|dakika|dk|saat|sa|bölüm|bolum)\b/gi,' ').replace(/\s+/g,' ').trim().replace(/^[-–,:]+|[-–,:]+$/g,'').trim();return s||fallback;}
  function wordScore(hay,needle){const h=fold(hay),n=fold(needle);if(!n)return 0;if(h===n)return 100;if(h.includes(n)||n.includes(h))return 70;const hT=h.split(/\W+/).filter(Boolean),nT=n.split(/\W+/).filter(Boolean);let score=0;for(const t of nT)if(hT.some(x=>x===t||levenshtein(x,t)<=1))score+=10;return score;}

  function ensureState(s){s=s||{};for(const k of ['blocks','tasks','debts','exams','questions','assistantMessages'])if(!Array.isArray(s[k]))s[k]=[];if(!s.settings||typeof s.settings!=='object')s.settings={};if(!s.selectedDate)s.selectedDate=todayISO();return s;}
  function ensureMessages(s){ensureState(s);if(!s.assistantMessages.length)s.assistantMessages.push({id:uid('mata'),role:'mata',text:'Merhaba 💙 Ben Mata. Hakuna’da elle yapabildiğin program, görev, borç, deneme ve soru işlemlerini bana normal konuşma diliyle yaptırabilirsin. Değişiklikleri önce gösteririm; sen onaylayınca uygularım.',time:new Date().toISOString()});}
  function addMessage(s,role,text){ensureMessages(s);s.assistantMessages.push({id:uid('mata'),role,text,time:new Date().toISOString()});if(s.assistantMessages.length>60)s.assistantMessages=s.assistantMessages.slice(-60);}
  async function currentState(){const s=ensureState(await readState());ensureMessages(s);return s;}
  function friendly(kind){const bank={proposal:['Tabii 💙','Olur 🌿','Hazırladım ✨','Tamamdır 💫'],applied:['Hazır ✨','Oldu 💙','Tamamdır 🌿','Bitti 💫'],clarify:['Tabii, bir şeyi netleştireyim 💙','Olur, minicik bir detay lazım 🌿','Hemen yaparım; şunu netleştirelim ✨']};const a=bank[kind]||bank.proposal;return a[Math.floor(Math.random()*a.length)];}

  function findBlock(state,{date=todayISO(),subject=null,start=null,title=null}={}){let arr=(state.blocks||[]).filter(b=>b.date===date);if(start)arr=arr.filter(b=>b.start===start);if(subject)arr=arr.filter(b=>b.subject===subject||wordScore(b.title,subject)>20);if(title){const ranked=arr.map(b=>({b,s:wordScore(`${b.title} ${b.subject}`,title)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);if(ranked.length&&ranked[0].s>ranked[1]?.s)return {one:ranked[0].b,list:ranked.map(x=>x.b)};if(ranked.length)arr=ranked.map(x=>x.b);}return arr.length===1?{one:arr[0],list:arr}:{one:null,list:arr};}
  function findByTitle(list,text){const ranked=(list||[]).map(x=>({x,s:wordScore(`${x.title||''} ${x.name||''} ${x.source||''} ${x.reference||''} ${x.subject||''}`,text)})).filter(y=>y.s>0).sort((a,b)=>b.s-a.s);if(!ranked.length)return {one:null,list:[]};if(ranked.length===1||ranked[0].s>ranked[1].s+9)return {one:ranked[0].x,list:ranked.map(y=>y.x)};return {one:null,list:ranked.map(y=>y.x)};}
  function targetText(text){return String(text).replace(/\b(bugun|bugünkü|yarin|dun|saat|deki|daki|bloğu|blogu|blok|dersi|ders|görevi|gorevi|görev|gorev|borcu|borç|sorusu|soru|tamamlandı|tamamlandi|kısmen|kismen|yapılmadı|yapilmadi|sil|kaldır|kaldir|taşı|tasi|değiştir|degistir|yap|et|ekle|koy)\b/gi,' ').replace(/\b\d{1,2}(?:[:.]\d{1,2})?\b/g,' ').replace(/\s+/g,' ').trim();}
  function chooseBlock(state,text,date=todayISO()){const sub=detectSubject(text),times=extractTimes(text),oldStart=times[0]||null,title=targetText(text);return findBlock(state,{date,subject:sub?.subject||null,start:oldStart,title:title||sub?.title||null});}
  function ambiguity(kind,list){if(!list?.length)return `${kind} bulamadım.`;const shown=list.slice(0,5).map(x=>x.start&&x.end?`${x.start}–${x.end} ${x.title}`:(x.title||x.name||x.source||'Kayıt')).join(', ');return `Birden fazla eşleşme var: ${shown}. Saatini ya da adını biraz daha net söyler misin?`;}

  function actionLabel(a){
    const b=a.oldBlock;
    switch(a.type){
      case 'add_block': return `${a.start}–${a.end} · ${EMOJI[a.subject]||'✨'} ${a.title}`;
      case 'delete_block': return `Kaldır: ${b.start}–${b.end} · ${b.title}`;
      case 'edit_block': {const bits=[];if(a.patch.start)bits.push(`başlangıç ${b.start} → ${a.patch.start}`);if(a.patch.end)bits.push(`bitiş ${b.end} → ${a.patch.end}`);if(a.patch.date)bits.push(`tarih → ${fmtDate(a.patch.date)}`);if(a.patch.subject)bits.push(`ders → ${a.patch.subject}`);if(a.patch.title)bits.push(`ad → ${a.patch.title}`);if(a.patch.metricValue)bits.push(`miktar → ${a.patch.metricValue} ${a.patch.metricUnit||b.metricUnit||''}`);if(a.patch.note!==undefined)bits.push('notu güncelle');return `Düzenle: ${b.title} · ${bits.join(' · ')}`;}
      case 'status_block': return `${b.title} → ${a.status==='complete'?'Tamamlandı':a.status==='partial'?'Kısmen tamamlandı':'Tamamlanmadı'}${a.remaining?` · kalan ${a.remaining.value} ${a.remaining.unit}`:''}`;
      case 'add_task': return `Görev ekle: ${a.title}${a.value?` · ${a.value} ${a.unit}`:''}`;
      case 'delete_task': return `Görevi sil: ${a.item.title}`;
      case 'toggle_task': return `${a.item.title} → ${a.completed?'Tamamlandı':'Aktif'}`;
      case 'schedule_task': return `Görevi programa koy: ${a.start}–${a.end} · ${a.item.title}`;
      case 'add_debt': return `Borç ekle: ${a.title} · ${a.value} ${a.unit}`;
      case 'delete_debt': return `Borcu sil: ${a.item.title}`;
      case 'schedule_debt': return `Borcu programa koy: ${a.start}–${a.end} · ${a.item.title}`;
      case 'add_question': return `Soru ekle: ${a.source} · ${a.reference}${a.topic?` · ${a.topic}`:''}`;
      case 'delete_question': return `Soruyu sil: ${a.item.source} · ${a.item.reference}`;
      case 'toggle_question': return `${a.item.source} · ${a.item.reference} → ${a.status==='solved'?'Çözüldü':'Açık'}`;
      case 'add_exam': return `Deneme ekle: ${a.name} · ${a.examType} · ${fmtDate(a.date)} · ${a.rows.length} ders sonucu`;
      case 'delete_exam': return `Denemeyi sil: ${a.item.name}`;
      default:return 'Değişiklik';
    }
  }
  function conflict(state,a){if(!['add_block','schedule_task','schedule_debt','edit_block'].includes(a.type))return false;let date=a.date||a.patch?.date||a.oldBlock?.date,start=a.start||a.patch?.start||a.oldBlock?.start,end=a.end||a.patch?.end||a.oldBlock?.end,id=a.oldBlock?.id||null;if(!date||!start||!end)return false;return (state.blocks||[]).some(b=>b.date===date&&b.id!==id&&minute(start)<minute(b.end)&&minute(end)>minute(b.start));}

  Object.assign(window.HakunaMataV2 ||= {}, {
    SUBJECTS,UNITS,EMOJI,uid,esc,fold,todayISO,parseISO,iso,addDays,fmtDate,minute,time,duration,fmtDuration,
    openDB,readState,writeState,normalizeNumbers,parseDate,parseClock,extractTimes,parseIntervals,parseDuration,parseMetric,
    detectSubject,detectSubjects,cleanTitle,wordScore,ensureState,ensureMessages,addMessage,currentState,friendly,
    findBlock,findByTitle,targetText,chooseBlock,ambiguity,actionLabel,conflict
  });
})();
