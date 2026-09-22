/* Shared conversational adapter. All writes remain proposals handled by actionsV4. */
(() => {
  'use strict';
  const M=window.HakunaMataV2,A=M.actionsV4,R=M.capabilitiesV4,fallback=M.parseRequest;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const norm=t=>R.norm(t).replace(/\b(yaparmisin|yapar misin|yapsana)\b/g,'yap').replace(/\b(tasisana|tasir misin|aktarir misin)\b/g,'tasi').replace(/\b(duzenlesene|duzenler misin)\b/g,'duzenle');
  const labels={title:'başlık',subject:'ders',date:'tarih',start:'başlangıç',end:'bitiş',metricValue:'miktar',metricUnit:'birim',note:'not',order:'sıra',value:'miktar',unit:'birim',sourceDate:'kaynak tarihi',topic:'konu',source:'kaynak',reference:'soru referansı',type:'sınav türü',name:'deneme adı',duration:'süre',ranking:'sıralama',rows:'ders sonuçları'};
  const aliases={title:['baslik','ad','adi','adini'],subject:['ders'],date:['tarih'],start:['baslangic'],end:['bitis'],metricValue:['miktar'],metricUnit:['birim'],note:['not','notu','notunu'],order:['sira'],value:['miktar'],unit:['birim'],sourceDate:['kaynak tarihi'],topic:['konu'],source:['kaynak'],reference:['referans','soru referansi'],type:['tur','sinav turu'],name:['deneme adi','ad','adi','adini'],duration:['sure'],ranking:['siralama'],rows:['sonuclar']};
  const required={blocks:['title','subject','date','start','end'],planItems:['title','subject','date'],tasks:['title','subject'],debts:['title','subject','value'],questions:['subject','source','reference'],exams:['type','name','date','rows']};
  let pending=null,lastOwner=A.owner();
  function reset(){pending=null;M.resetConversationContext();lastOwner=A.owner();}
  function date(text){return String(text).match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]||(/bugun|yarin|dun|pazartesi|sali|carsamba|persembe|cuma|cumartesi|pazar/.test(norm(text))?M.parseDate(norm(text).replace(/yarinki|yarina/g,'yarin').replace(/bugune/g,'bugun').replace(/dunku/g,'dun')):undefined);}
  function readValue(field,value,k){
    if(['metricValue','value','order','duration'].includes(field)){
      if(/^(bos|yok|temizle)$/i.test(norm(value)))return null;
      const n=Number(M.normalizeNumbers(value).replace(',','.'));if(!Number.isFinite(n)||n<0)throw Error('Sıfır veya pozitif bir sayı yaz.');return n;
    }
    if(field==='subject'){const s=M.SUBJECTS.find(x=>norm(x)===norm(value));if(!s)throw Error('Dersi açık yaz: Matematik, Türkçe, Fizik, Kimya…');return s;}
    if(['date','sourceDate'].includes(field)){const d=date(value);if(!d)throw Error('Tarihi “yarın” veya YYYY-AA-GG biçiminde yaz.');return d;}
    if(['start','end'].includes(field)){const t=String(value).trim().replace('.',':');if(!/^([01]?\d|2[0-3]):[0-5]\d$/.test(t))throw Error('Saati 09:30 biçiminde yaz.');return t.padStart(5,'0');}
    if(['unit','metricUnit'].includes(field)){const u=M.UNITS.find(x=>norm(x)===norm(value));if(!u)throw Error('Birim: test, soru, sayfa, dakika veya bölüm.');return u;}
    if(field==='type'){const t=['TYT','AYT','Branş'].find(x=>norm(x)===norm(value));if(!t)throw Error('TYT, AYT veya Branş yaz.');return t;}
    if(field==='rows'){const rows=M.examRows(value,k);if(!rows.length)throw Error('Örnek: Türkçe 35D 5Y, Matematik 30D 5Y 5B.');return rows;}
    return /^(bos|temizle)$/i.test(norm(value))?'':String(value).trim().replace(/^["“]|["”]$/g,'');
  }
  function extract(k,text,base={}){
    const out={},n=norm(text),allowed=A.schemas[k];
    // Named fields are unambiguous and preserve the user's original spelling.
    for(const part of String(text).split(/[;\n]/)){
      const m=part.match(/^\s*([^:=]+)\s*[:=]\s*(.*?)\s*$/);if(!m)continue;
      const key=allowed.find(f=>(aliases[f]||[]).includes(norm(m[1])));if(key)out[key]=readValue(key,m[2],out.type||base.type||'TYT');
    }
    for(const f of allowed){if(Object.hasOwn(out,f))continue;
      for(const a of aliases[f]||[]){const m=n.match(new RegExp('(?:^|\\s)'+a+'\\s+["“]([^"”]+)["”]'));if(m){const original=String(text).match(/["“]([^"”]+)["”]/g)||[];const value=original.map(x=>x.slice(1,-1)).find(x=>norm(x)===m[1])||m[1];out[f]=readValue(f,value,out.type||base.type||'TYT');break;}}
    }
    const sub=M.SUBJECTS.find(s=>s!=='Diğer'&&s!=='Deneme'&&new RegExp('(?:^|\\W)'+norm(s)+'(?:$|\\W)').test(n));
    if(allowed.includes('subject')&&sub&&!out.subject)out.subject=sub;
    const d=date(text),dateKey=k==='debts'?'sourceDate':'date';if(d&&allowed.includes(dateKey)&&!out[dateKey])out[dateKey]=d;
    const metric=M.parseMetric(text);if(metric){const f=allowed.includes('metricValue')?'metricValue':allowed.includes('value')?'value':null;if(f){out[f]??=metric.value;out[f==='value'?'unit':'metricUnit']??=metric.unit;}}
    if(k==='blocks'){const intervals=M.parseIntervals(text).intervals;if(intervals.length===1){out.start??=intervals[0].start;out.end??=intervals[0].end;}}
    if(k==='questions'&&!out.reference){const refs=String(text).match(/(?:test|sayfa|sf|soru)\s*\d+/ig);if(refs)out.reference=refs.join(' / ');}
    if(k==='exams'){if(/\btyt\b/.test(n))out.type??='TYT';else if(/\bayt\b/.test(n))out.type??='AYT';else if(/brans/.test(n))out.type??='Branş';const rows=M.examRows(text,out.type||base.type||'TYT');if(rows.length)out.rows??=rows;}
    return out;
  }
  function ask(p,field){pending={...p,field,owner:A.owner()};return {reply:`${labels[field]||field} bilgisini yazar mısın?${field==='rows'?' Örnek: Türkçe 35D 5Y, Matematik 30D 5Y 5B.':field==='start'||field==='end'?' Örnek: 09:30.':''}\nVazgeçmek için “iptal” yazabilirsin.`};}
  function finish(p){
    if(p.op==='add'){
      const missing=required[p.kind].find(f=>p.data[f]===undefined||p.data[f]===''||p.data[f]===null);if(missing)return ask(p,missing);
    }
    if(p.op==='edit'&&!Object.keys(p.data).length){pending={...p,field:'patch',owner:A.owner()};return {reply:'Neyi değiştireyim? Örnek: not: Hocaya sor; konu: Türev; miktar: 3. Tarih için “yarına taşı” da diyebilirsin.'};}
    if(p.op==='schedule'){for(const f of ['date','start','end'])if(!p.data[f])return ask(p,f);}
    if(p.op==='status'&&p.status==='partial'&&!p.remaining)return ask(p,'remaining');
    const targets=p.op==='add'?[null]:p.targets;
    pending=null;
    return {actions:targets.map(before=>({type:'record',collection:p.kind,op:p.op,before,data:p.data,...(p.op==='status'?{status:p.status,remaining:p.remaining}:{})}))};
  }
  function intent(n){
    if(/\b(sil|kaldir|temizle)\b/.test(n)&&!/not|baslik|kaynak|konu/.test(n))return 'delete';
    if(/\b(cogalt|kopyala)\b/.test(n))return 'duplicate';
    if(/\b(cozdum|cozuldu|tamamla|tamamlandi|bitirdim|bitir|yapilmadi|kismen|aktif yap|geri ac)\b/.test(n))return 'status';
    if(/programa (koy|aktar|ekle)/.test(n))return 'schedule';
    if(/\b(ekle|kaydet|olustur|gir)\b/.test(n))return 'add';
    if(/\b(duzenle|degistir|tasi|erte|yap)\b/.test(n)||/notunu|adini/.test(n))return 'edit';
    return null;
  }
  function selected(state,k,n){
    n=n.replace(/birincisini|birincisi/g,'birinci').replace(/ikincisini|ikincisi/g,'ikinci').replace(/ucuncusunu|ucuncusu/g,'ucuncu').replace(/dorduncusunu/g,'dorduncu').replace(/besincisini/g,'besinci');
    const context=R.getContext();
    const ordinal=n.match(/\b(\d+)\s*(?:\.|numarali|numarayi|nci|inci|uncu)/)?.[1]||({ilk:1,birinci:1,ikincisi:2,ikinci:2,ucuncu:3,ucuncusu:3,dorduncu:4,besinci:5})[n.split(/\s+/).find(x=>/^(ilk|birinci|ikincisi|ikinci|ucuncu|ucuncusu|dorduncu|besinci)$/.test(x))];
    if(context?.kind===k&&(ordinal||/bunlar|hepsi|hepsini|bunlari|onu|bunu|onlari/.test(n))){
      const rows=ordinal?[context.rows[Number(ordinal)-1]].filter(Boolean):/onu|bunu/.test(n)&&context.rows.length===1?context.rows: /onu|bunu/.test(n)?[]:context.rows;
      if(!rows.length)throw Error('Hangi kaydı kastettiğini bulamadım. Liste numarasını yaz.');
      if(rows.some(r=>JSON.stringify((state[k]||[]).find(x=>x.id===r.id))!==JSON.stringify(r)))throw Error('Listedeki kayıtlar değişmiş. Önce yeniden listele.');
      return rows;
    }
    // Date in a move is the destination; do not use it to select the source.
    let query=n.replace(/yarina|yarin|bugune|bugun|\d{4}-\d{2}-\d{2}/g,'');
    if(!/tasi|erte|tarih/.test(n))query=n;
    let rows=R.filtered(state,k,query);
    const quoted=[...n.matchAll(/["“]([^"”]+)["”]/g)].map(m=>m[1]);
    if(quoted.length&&/notunu|adini|baslik|not:|konu:/.test(n))rows=R.filtered(state,k,query.replace(/["“][^"”]+["”]/g,''));
    if(rows.length>1){const tokens=query.replace(/(?:not|konu|baslik|ad|tarih)\s*[:=].*$/,'').split(/[^a-z0-9]+/).filter(x=>x.length>3);const scored=rows.map(r=>({r,score:tokens.filter(t=>norm([r.title,r.name,r.source,r.reference,r.topic].join(' ')).split(/\W+/).includes(t)).length}));const top=Math.max(...scored.map(x=>x.score));if(top>0)rows=scored.filter(x=>x.score===top).map(x=>x.r);}
    return rows;
  }
  function parse(state,text){
    if(A.owner()!==lastOwner){reset();return {reply:'Hesap değişti. İsteğini bu hesap için yeniden yaz.'};}
    const n=norm(text);
    if(/^(iptal|vazgec|bosver|bos ver|hayir)$/.test(n)){reset();return {reply:'İptal ettim. Değişiklik yapmadım.',cancel:true};}
    try{
      if(pending){
        const p=pending;if(p.owner!==A.owner()){reset();return {reply:'Hesap değişti; isteğini yeniden yaz.'};}
        if(p.field==='choice'){
          const num=Number(n.replace(/[^0-9]/g,''));if(!Number.isInteger(num)||num<1||num>p.choices.length)return {reply:'Gösterdiğim listeden bir numara yaz veya “iptal” de.'};
          p.targets=[p.choices[num-1]];return finish(p);
        }
        if(p.field==='patch')Object.assign(p.data,extract(p.kind,text,p.targets?.[0]));
        else if(p.field==='remaining'){const metric=M.parseMetric(text);if(!metric)return {reply:'Kalanı “3 test” veya “20 soru” gibi yaz.'};p.remaining=metric;}
        else p.data[p.field]=readValue(p.field,text,p.kind==='exams'?p.data.type:p.kind);
        return finish(p);
      }
      if(/neler yap|yetenek|yardim/.test(n))return {reply:'Sorularını, denemelerini, saatli bloklarını, plan kartlarını, görevlerini ve borçlarını listeleyebilir, ekleyebilir, düzenleyebilir, çoğaltabilir ve silebilirim.\nÖrnek: Matematik sorularımı listele → ikincisini çözdüm.\nPlan kartı ekle → eksik bilgileri sorarım.\nGörevleri göster → ikincisini düzenle → not: Akşam çöz.\nToplu işlem: Bunları yarına taşı. Kayıtları önizlemede kontrol edip onaylarsın.\nBelirsiz eşleşmede seçim isterim. Serbest dil desteğim sınırlı; anlaşılmayan alanları “not: …; konu: …” şeklinde yazabilir veya kayıt seçme alanını kullanabilirsin.'};
      if(/ayarlar.*(goster|listele|nedir)/.test(n))return {reply:`Plan görünümü: ${state.settings?.planMode==='cards'?'Kartlar':'Zaman çizelgesi'}\nHafta başlangıcı: ${['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][state.settings?.weekStartDay??1]}`};
      const op=intent(n),context=R.getContext();let kind=R.entity(n);
      if(!kind&&context&&/ikinc|birinc|ucunc|dordunc|besinc|ilk|\d+\.|numara|bunlar|bunlari|bunu|onu|hepsi/.test(n))kind=context.kind;
      if(!op)return fallback(state,text);
      if(!kind)return {reply:'Hangi kayıt türüyle işlem yapayım: blok, plan kartı, görev, borç, soru veya deneme?'};
      // Preserve mature multi-block planning and time-shifting expressions.
      if(kind==='blocks'&&!context&&/kaydir|erkene|gece|dakika.*(ileri|geri)/.test(n))return fallback(state,text);
      if(op==='add'&&kind!=='planItems'){
        const previous=fallback(state,text);
        if(previous.actions?.length)return previous;
      }
      const data=extract(kind,text),p={kind,op,data,targets:[],owner:A.owner()};
      if(op==='add'){
        if(['blocks','planItems','exams'].includes(kind))data.date??=state.selectedDate||M.todayISO();
        if(kind==='debts'){data.sourceDate??=M.todayISO();data.unit??='test';}
        if(kind==='planItems'&&!data.title){const quoted=String(text).match(/["“]([^"”]+)["”]/);if(quoted)data.title=quoted[1];}
        return finish(p);
      }
      if(op==='schedule'){const range=M.parseIntervals(text).intervals[0];p.data={...(data.date?{date:data.date}:date(text)?{date:date(text)}:{}),...(range?{start:range.start,end:range.end}:{})};}
      if(op==='status'){
        p.status=kind==='tasks'?!/aktif|geri ac/.test(n):kind==='questions'?(/geri ac|aktif/.test(n)?'open':'solved'):/kismen/.test(n)?'partial':/yapilmadi/.test(n)?'incomplete':/geri ac|aktif/.test(n)?'pending':'complete';
        if(p.status==='partial')p.remaining=M.parseMetric(text);
      }
      p.targets=selected(state,kind,n);
      if(!p.targets.length)return {reply:'Bu tarife uyan kayıt bulamadım. Önce kayıtlarını listeleyip numarasıyla seçebilirsin.'};
      const plural=/bunlar|bunlari|hepsi|tumunu|tamamini/.test(n);
      if(p.targets.length>1&&!plural){pending={...p,choices:clone(p.targets),field:'choice'};return {reply:'Birden fazla kayıt var. Hangisi? Numara yaz:\n'+p.targets.map((r,i)=>`${i+1}. ${R.description(kind,r)}`).join('\n')};}
      if(p.targets.length>100)return {reply:'Tek seferde en fazla 100 kayıt değiştirebilirim. Ders veya tarihle listeyi daralt.'};
      return finish(p);
    }catch(e){return {reply:e.message};}
  }
  M.parseRequest=parse;M.conversationV4={parse,reset};
})();
