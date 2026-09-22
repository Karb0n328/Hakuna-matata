(() => {
  'use strict';
  const M=window.HakunaMataV2;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const owner=()=>localStorage.getItem('hakuna.cloud.localOwner')||'';
  const schemas={
    blocks:['title','subject','date','start','end','metricValue','metricUnit','note'],
    planItems:['title','subject','date','metricValue','metricUnit','note','order'],
    tasks:['title','subject','value','unit','note'],
    debts:['title','subject','value','unit','sourceDate'],
    questions:['subject','topic','source','reference','note'],
    exams:['type','date','name','duration','ranking','rows']
  };
  const names={blocks:'Saatli blok',planItems:'Plan kartı',tasks:'Görev',debts:'Borç',questions:'Soru',exams:'Deneme'};
  const fieldNames={title:'Başlık',subject:'Ders',date:'Tarih',start:'Başlangıç',end:'Bitiş',metricValue:'Miktar',metricUnit:'Birim',note:'Not',order:'Sıra',value:'Miktar',unit:'Birim',sourceDate:'Kaynak tarihi',topic:'Konu',source:'Kaynak',reference:'Soru',type:'Tür',name:'Ad',duration:'Süre (dk)',ranking:'Sıralama',rows:'Sonuçlar',status:'Durum',completed:'Tamamlandı',sourceDebtId:'Bağlı borç',sourceBlockId:'Bağlı blok',sourcePlanItemId:'Bağlı plan kartı'};
  function display(v){if(v==null)return '—';if(Array.isArray(v))return v.map(r=>`${r.subject}: ${r.correct}D ${r.wrong}Y ${r.blank}B`).join(', ');return ({pending:'Bekliyor',complete:'Tamamlandı',partial:'Kısmen',incomplete:'Yapılmadı',open:'Açık',solved:'Çözüldü',true:'Evet',false:'Hayır'})[v]||String(v);}
  const collections=Object.keys(schemas), tickets=new WeakMap();
  const fail=message=>{throw new Error(message);};
  const fingerprint=s=>JSON.stringify(collections.map(k=>s[k]||[]));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||M.iso(M.parseISO(v))!==v)fail('Geçerli bir tarih seç.');}
  function number(v,label,nullable=false){if(nullable&&v===null)return;if(typeof v!=='number'||!Number.isFinite(v)||v<0)fail(`${label} sıfır veya pozitif bir sayı olmalı.`);}
  function fields(collection,data){if(!data||typeof data!=='object'||Array.isArray(data))fail('Kayıt alanları geçersiz.');for(const k of Object.keys(data))if(!schemas[collection].includes(k))fail(`Bu alan değiştirilemez: ${k}`);}
  function validate(k,r){
    const texts=schemas[k].filter(f=>!['rows','duration','value','metricValue','order'].includes(f));
    for(const f of texts)if(r[f]!==undefined&&(typeof r[f]!=='string'||r[f].length>10000))fail(`Geçersiz metin alanı: ${f}`);
    for(const f of k==='questions'?['source','reference']:k==='exams'?['name']:['title'])if(!r[f]?.trim())fail(`${f==='title'?'Başlık':f==='name'?'Deneme adı':f==='source'?'Kaynak':'Soru referansı'} boş olamaz.`);
    if(k!=='exams'&&!M.SUBJECTS.includes(r.subject))fail('Geçerli bir ders seç.');
    if('date' in r)date(r.date);
    if(k==='blocks'){
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.end)||M.minute(r.end)<=M.minute(r.start))fail('Bitiş saati başlangıçtan sonra olmalı; geceyi aşan blokları ikiye böl.');
    }
    if(['blocks','planItems'].includes(k)){number(r.metricValue,'Miktar',true);if(!M.UNITS.includes(r.metricUnit))fail('Geçerli bir birim seç.');if(!['pending','complete','partial','incomplete'].includes(r.status))fail('Geçersiz durum.');}
    if(k==='planItems'){number(r.order,'Sıra');if(!Number.isInteger(r.order))fail('Sıra tam sayı olmalı.');}
    if(['tasks','debts'].includes(k)){number(r.value,'Miktar',k==='tasks');if(!M.UNITS.includes(r.unit))fail('Geçerli bir birim seç.');}
    if(k==='tasks'&&typeof r.completed!=='boolean')fail('Geçersiz görev durumu.');
    if(k==='debts')date(r.sourceDate);
    if(k==='questions'&&!['open','solved'].includes(r.status))fail('Geçersiz soru durumu.');
    if(k==='exams'){
      if(!['TYT','AYT','Branş'].includes(r.type))fail('Geçerli sınav türü seç.');
      number(r.duration,'Süre',true);
      if(!Array.isArray(r.rows)||!r.rows.length)fail('En az bir ders sonucu gir.');
      const caps=r.type==='TYT'?{'Türkçe':40,'Sosyal':20,'Matematik':40,'Fen':20}:r.type==='AYT'?{'Matematik':40,'Fizik':14,'Kimya':13,'Biyoloji':13,'Edebiyat':24,'Tarih-1':10,'Coğrafya-1':6,'Tarih-2':11,'Coğrafya-2':11,'Felsefe':12,'Din':6}:null;
      const seen=new Set();
      for(const row of r.rows){
        if(!row||typeof row.subject!=='string'||!row.subject.trim()||seen.has(row.subject))fail('Dersler boş veya tekrarlı olamaz.');seen.add(row.subject);
        for(const f of ['correct','wrong','blank']){number(row[f],'Doğru/yanlış/boş');if(!Number.isInteger(row[f]))fail('Soru sayıları tam sayı olmalı.');}
        if(caps&&(!Object.hasOwn(caps,row.subject)||row.correct+row.wrong+row.blank>caps[row.subject]))fail(`${row.subject}: ders veya toplam soru sayısı geçersiz.`);
      }
    }
  }
  function defaults(k,s){
    const common={id:M.uid(k),createdAt:new Date().toISOString()};
    if(k==='questions')return {...common,subject:'Diğer',topic:'',note:'',status:'open'};
    if(k==='exams')return {...common,type:'TYT',date:M.todayISO(),duration:null,ranking:''};
    if(k==='debts')return {...common,subject:'Diğer',value:1,unit:'test',sourceDate:M.todayISO(),sourceBlockId:null};
    if(k==='tasks')return {...common,subject:'Diğer',value:null,unit:'test',note:'',completed:false};
    return {...common,subject:'Diğer',date:M.todayISO(),metricValue:null,metricUnit:'test',note:'',status:'pending',sourceDebtId:null,...(k==='planItems'?{order:(s.planItems||[]).length}:{})};
  }
  function normalize(a){
    if(a.type==='record')return a;
    const match=/^(add|edit|delete|toggle|status|schedule)_(block|task|debt|question|exam)$/.exec(a.type||'');
    if(!match)fail('Bu işlem henüz desteklenmiyor; hiçbir değişiklik yapılmadı.');
    const [,verb,entity]=match,k={block:'blocks',task:'tasks',debt:'debts',question:'questions',exam:'exams'}[entity];
    const out={type:'record',collection:k,op:verb==='toggle'?'status':verb,before:a.oldBlock||a.item};
    if(verb==='add'){out.data={};for(const f of schemas[k])if(a[f]!==undefined)out.data[f]=a[f];if(k==='exams')out.data.type=a.examType;}
    if(verb==='edit')out.data=a.patch;
    if(verb==='status'||verb==='toggle'){out.status=k==='tasks'?a.completed:a.status;out.remaining=a.remaining;}
    if(verb==='schedule')out.data={date:a.date,start:a.start,end:a.end};
    return out;
  }
  function updateStatus(s,k,r,a){
    if(k==='tasks'){r.completed=a.status;return;}
    if(k==='questions'){r.status=a.status;return;}
    if(!['blocks','planItems'].includes(k))fail('Bu kayıt türünün durum işlemi yok.');
    if(!['pending','complete','partial','incomplete'].includes(a.status))fail('Geçersiz durum.');
    const link=k==='blocks'?'sourceBlockId':'sourcePlanItemId';
    r.status=a.status;
    if(a.status==='complete'){s.debts=s.debts.filter(d=>d[link]!==r.id&&d.id!==r.sourceDebtId);return;}
    if(a.status==='pending'||a.status==='incomplete'&&r.sourceDebtId)return;
    const remaining=a.status==='partial'?a.remaining:{value:r.metricValue??(k==='blocks'?M.duration(r.start,r.end):1),unit:r.metricValue!==null&&r.metricValue!==undefined?r.metricUnit:k==='blocks'?'dakika':'test'};
    if(!remaining)fail('Kısmen tamamlanan çalışma için kalan miktarı gir.');
    number(remaining.value,'Kalan miktar');if(!M.UNITS.includes(remaining.unit))fail('Kalan miktar birimi geçersiz.');
    const debt=s.debts.find(d=>r.sourceDebtId?d.id===r.sourceDebtId:d[link]===r.id);
    if(r.sourceDebtId&&!debt)fail('Bağlı borç bulunamadı. Kaydı yeniden kontrol et.');
    if(debt)Object.assign(debt,{...remaining,title:r.title,subject:r.subject});
    else s.debts.push({...defaults('debts',s),...remaining,title:r.title,subject:r.subject,[link]:r.id,sourceDate:r.date});
  }
  function reduce(state,input){
    if(!Array.isArray(input)||!input.length||input.length>100)fail('Bir önizlemede 1–100 işlem olmalı.');
    const s=clone(state);for(const k of collections)s[k]??=[];
    const actions=input.map(normalize),touched=new Set(),changedBlocks=new Set();
    // Resolve every target against the original state, never by fuzzy matching during execution.
    for(const a of actions){
      const k=a.collection;if(!Object.hasOwn(schemas,k))fail('Bilinmeyen kayıt türü.');
      if(!['add','edit','delete','status','schedule','duplicate'].includes(a.op))fail('Bilinmeyen işlem.');
      if(a.op==='add')continue;
      const id=a.before?.id,record=(state[k]||[]).find(x=>x.id===id);
      if(!record||!same(record,a.before))fail('Seçilen kayıt değişmiş veya silinmiş. Yeniden seç.');
      const key=k+':'+id;if(touched.has(key))fail('Aynı kayda tek önizlemede birden fazla işlem yapılamaz.');touched.add(key);
    }
    for(const a of actions){
      const k=a.collection,idx=s[k].findIndex(r=>r.id===a.before?.id),r=s[k][idx];
      if(a.op==='add'||a.op==='duplicate'){
        fields(k,a.data||{});
        const copy=a.op==='duplicate'?Object.fromEntries(schemas[k].filter(f=>r[f]!==undefined).map(f=>[f,r[f]])):{};
        const item={...defaults(k,s),...copy,...a.data};validate(k,item);s[k].push(item);if(k==='blocks')changedBlocks.add(item.id);
      }else if(a.op==='delete'){
        s[k].splice(idx,1);if(k==='planItems')s.debts=s.debts.filter(d=>d.sourcePlanItemId!==r.id);
      }else if(a.op==='edit'){
        fields(k,a.data);Object.assign(r,a.data);validate(k,r);if(k==='blocks')changedBlocks.add(r.id);
      }else if(a.op==='status'){
        updateStatus(s,k,r,a);validate(k,r);
      }else if(a.op==='schedule'){
        if(!['tasks','debts'].includes(k))fail('Yalnızca görev veya borç programa aktarılabilir.');
        if(!a.data||Object.keys(a.data).some(f=>!['date','start','end'].includes(f)))fail('Program alanları geçersiz.');
        const item={...defaults('blocks',s),...a.data,title:r.title,subject:r.subject,metricValue:r.value??null,metricUnit:r.unit,note:r.note||'',sourceDebtId:k==='debts'?r.id:null};validate('blocks',item);s.blocks.push(item);changedBlocks.add(item.id);
      }
    }
    for(const b of s.blocks)if(changedBlocks.has(b.id)&&s.blocks.some(x=>x.id!==b.id&&x.date===b.date&&M.minute(b.start)<M.minute(x.end)&&M.minute(b.end)>M.minute(x.start)))fail(`${b.date} ${b.start}–${b.end}: saat çakışması var. Önce saatleri düzelt.`);
    return s;
  }
  function summary(before,after){
    const rows=[];
    for(const k of collections){const old=new Map((before[k]||[]).map(r=>[r.id,r])),next=new Map((after[k]||[]).map(r=>[r.id,r]));
      for(const [id,r] of next){const prev=old.get(id);if(prev&&same(prev,r))continue;
        const details=Object.keys(r).filter(f=>!['id','createdAt'].includes(f)&&(!prev||!same(prev[f],r[f]))).map(f=>`${fieldNames[f]||f}: ${prev?display(prev[f])+' → ':''}${display(r[f])}`).join(' · ');
        rows.push(`${names[k]} ${prev?'düzenle':'ekle'}: ${r.title||r.name||r.source||''}\n${details}`);
      }
      for(const [id,r] of old)if(!next.has(id))rows.push(`${names[k]} sil: ${r.title||r.name||r.source||''} · ${r.reference||r.date||r.sourceDate||''} · ${id}`);
    }
    return rows;
  }
  function prepare(state,actions){
    const after=reduce(state,actions),token=Object.freeze({rows:Object.freeze(summary(state,after))});
    tickets.set(token,{owner:owner(),baseline:fingerprint(state),after,used:false});return token;
  }
  async function commit(token){
    const ticket=tickets.get(token);if(!ticket||ticket.used)fail('Önizleme geçersiz veya zaten uygulandı.');
    ticket.used=true; // Consume before awaiting: double-clicks cannot apply twice.
    if(ticket.owner!==owner())fail('Hesap değişti. İsteği yeniden gönder.');
    const state=await M.currentState();
    if(ticket.owner!==owner()||fingerprint(state)!==ticket.baseline)fail('Veriler değişti. Yeni önizleme için isteği yeniden gönder.');
    const deletedAt=new Date().toISOString();
    for(const k of collections){
      const kept=new Set(ticket.after[k].map(r=>r.id));
      for(const r of state[k]||[])if(!kept.has(r.id))state[`__hakuna_deleted_item__:${k}:${encodeURIComponent(r.id)}`]={deletedAt};
      state[k]=clone(ticket.after[k]);
    }
    M.addMessage(state,'mata','Onayladığın değişiklikler kaydedildi.');
    await M.writeState(state);
    return state;
  }
  M.actionsV4={schemas,names,collections,reduce,prepare,commit,summary,owner};
})();
