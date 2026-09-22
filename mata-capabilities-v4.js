/* Local, account-scoped assistant capabilities. No credentials or external AI calls. */
(() => {
  'use strict';
  const M=window.HakunaMataV2;if(!M)throw new Error('Mata core missing');
  const fallback=M.parseRequest;
  const collections={questions:'soru',exams:'deneme',blocks:'blok',planItems:'plan kartı',tasks:'görev',debts:'borç'};
  const norm=t=>M.fold(t).replace(/\b(mat|matemtk|matmatik)\b/g,'matematik').replace(/\b(bio|biyo)\b/g,'biyoloji').replace(/\b(geo)\b/g,'geometri').replace(/\b(listelee|listle)\b/g,'listele').replace(/\b(gosterirmisin|gosterir misin|gosterebilir misin|gostersene|gostersen|gosterir)\b/g,'goster').replace(/\b(silersen|silsene|siler misin)\b/g,'sil').replace(/\b(eklesene|ekler misin|ekleyebilir misin)\b/g,'ekle');
  const net=r=>Number(r.correct||0)-Number(r.wrong||0)/4;
  const total=e=>(e.rows||[]).reduce((s,r)=>s+net(r),0);
  const entity=t=>/soru/.test(t)?'questions':/deneme|netler|karn[e]/.test(t)?'exams':/borc/.test(t)?'debts':/gorev|havuz/.test(t)?'tasks':/kart|saatsiz/.test(t)?'planItems':/blok|program|plan|calisma/.test(t)?'blocks':null;
  const subject=t=>M.SUBJECTS.find(s=>s!=='Deneme'&&s!=='Diğer'&&norm(t).includes(norm(s)))||null;
  const mutation=t=>/\b(koy|yerlestir|dagit|bosalt|kaydir|aktar|erte|tamamlandi|yapilmadi|kismen|bitir|sil|kaldir|cikar|temizle|ekle|kaydet|olustur|gir|degistir|duzenle|tasi|kopyala|cogalt|tamamla|cozdum|cozuldu|bitirdim|geri ac|aktif yap|notunu|adini|referans)\b/.test(t);
  let context=null;
  const owner=()=>localStorage.getItem('hakuna.cloud.localOwner')||'local';
  function resetContext(){context=null;}
  function remember(kind,rows,text,offset=0){context={kind,text,offset,owner:owner(),rows:JSON.parse(JSON.stringify(rows))};}
  function filtered(state,kind,text){
    let rows=[...(state[kind]||[])];const n=norm(text),sub=subject(n);
    if(sub)rows=rows.filter(r=>kind==='exams'?(r.rows||[]).some(x=>x.subject===sub):r.subject===sub);
    if(kind==='questions'){
      if(/cozulmemis|cozemedigim|cozemediklerim|acik|bekleyen|kalan/.test(n))rows=rows.filter(r=>r.status!=='solved');
      else if(/cozdugum|cozulmus|cozulen/.test(n))rows=rows.filter(r=>r.status==='solved');
    }
    if(kind==='tasks'&&/aktif|kalan|bekleyen|bitmemis/.test(n))rows=rows.filter(r=>!r.completed);
    if(['blocks','planItems'].includes(kind)&&/tamamlanan|bitirdigim/.test(n))rows=rows.filter(r=>r.status==='complete');
    if(kind==='exams'&&/\b(tyt|ayt)\b/.test(n))rows=rows.filter(r=>norm(r.type)===n.match(/\b(tyt|ayt)\b/)[1]);
    const dateField=kind==='debts'?'sourceDate':'date';
    if(/bugun|yarin|dun|\d{4}-\d{2}-\d{2}|pazartesi|sali|carsamba|persembe|cuma|pazar/.test(n)){
      const d=n.match(/\d{4}-\d{2}-\d{2}/)?.[0]||M.parseDate(n.replace(/yarinki/g,'yarin').replace(/dunku/g,'dun'),state.selectedDate||M.todayISO());rows=rows.filter(r=>String(r[dateField]||r.createdAt||'').slice(0,10)===d);
    }else if(/bu hafta|son 7 gun/.test(n)){
      const end=M.todayISO(),weekday=new Date(end+'T12:00:00').getDay(),start=M.addDays(end,/bu hafta/.test(n)?-((weekday+6)%7):-6);rows=rows.filter(r=>{const d=String(r[dateField]||r.createdAt||'').slice(0,10);return d>=start&&d<=end;});
    }
    const quotes=[...String(text).matchAll(/["“]([^"”]+)["”]/g)].map(m=>norm(m[1]));
    for(const q of quotes)rows=rows.filter(r=>norm([r.title,r.name,r.source,r.reference,r.topic,r.note].join(' ')).includes(q));
    rows.sort((a,b)=>String(a.date||a.createdAt||'').localeCompare(String(b.date||b.createdAt||''))||String(a.start||'').localeCompare(String(b.start||'')));
    if(kind==='exams')rows.reverse();
    if(/\bson\b/.test(n)&&!/son 7 gun/.test(n)&&kind==='exams')rows=rows.slice(0,Number(n.match(/son\s+(\d+)/)?.[1]||1));
    return rows;
  }
  function description(kind,r){
    if(kind==='questions')return `${r.subject} · ${r.source} · ${r.reference} · ${r.status==='solved'?'Çözüldü':'Açık'}${r.topic?' · '+r.topic:''}${r.note?'\n   Not: '+r.note:''}`;
    if(kind==='exams')return `${r.date} · ${r.name} (${r.type}) · ${total(r)} net${r.duration?' · '+r.duration+' dk':''}${r.ranking?' · '+r.ranking:''}\n   ${(r.rows||[]).map(x=>`${x.subject}: ${x.correct}D ${x.wrong}Y ${x.blank||0}B → ${net(x)} net`).join(' | ')}`;
    return `${r.date||r.sourceDate||''} ${r.start?r.start+'–'+r.end+' ':''}${r.title} · ${r.subject}${r.value||r.metricValue?' · '+(r.value||r.metricValue)+' '+(r.unit||r.metricUnit):''}${r.status?' · '+r.status:r.completed?' · Tamamlandı':''}${r.note?'\n   Not: '+r.note:''}`.trim();
  }
  function list(state,kind,text){
    const next=/devam/.test(norm(text))&&context?.kind===kind;
    if(!next&&context?.kind===kind&&/sadece|yalniz/.test(norm(text)))text=context.text+' '+text;
    const query=next?context.text:text,rows=filtered(state,kind,query),offset=next?context.offset+30:0;
    remember(kind,rows,query,offset);
    if(!rows.length)return {reply:'Bu filtrelere uyan kayıt yok.'};
    if(offset>=rows.length)return {reply:'Listenin sonuna geldik.'};
    return {reply:rows.length+' '+collections[kind]+' kaydı · '+(offset+1)+'–'+Math.min(offset+30,rows.length)+' gösteriliyor:\n'+rows.slice(offset,offset+30).map((r,i)=>(offset+i+1)+'. '+description(kind,r)).join('\n')+(offset+30<rows.length?'\nKalan kayıtlar için “devamını göster” yaz.':'')};
  }
  function analysis(state,text){
    const n=norm(text),kind=entity(n);
    if(kind==='exams'){
      const rows=filtered(state,'exams',text);if(!rows.length)return {reply:'Analiz edilecek deneme kaydı yok.'};
      const groups={};for(const e of rows){const key=e.type==='Branş'?'Branş / '+(e.rows||[]).map(r=>r.subject).sort().join(', '):e.type||'Tür belirtilmemiş';(groups[key]||=[]).push(e);}
      return {reply:Object.entries(groups).map(([type,es])=>{const scores=es.map(total),subs={};for(const e of es)for(const r of e.rows||[]){const a=subs[r.subject]||={n:0,net:0,wrong:0,blank:0};a.n++;a.net+=net(r);a.wrong+=Number(r.wrong||0);a.blank+=Number(r.blank||0);}
        return `${type} · ${es.length} deneme\nOrtalama: ${(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2)} net · En yüksek: ${Math.max(...scores)}\n${es.length>1?'Son iki deneme farkı: '+(scores[0]-scores[1]).toFixed(2)+' net\n':''}${Object.entries(subs).map(([s,a])=>`${s}: ${(a.net/a.n).toFixed(2)} ortalama net · ${a.wrong} yanlış · ${a.blank} boş`).join('\n')}`;}).join('\n\n')+'\nFarklı sınav türleri ayrı değerlendirildi; tek denemeden kesin gelişim sonucu çıkarılmaz.'};
    }
    const bs=filtered(state,'blocks',text),done=bs.filter(b=>b.status==='complete');
    return {reply:`${bs.length} blok · ${done.length} tamamlandı\nPlanlanan: ${bs.reduce((s,b)=>s+M.duration(b.start,b.end),0)} dk\nTamamlandı işaretlenen: ${done.reduce((s,b)=>s+M.duration(b.start,b.end),0)} dk\nAçık soru: ${(state.questions||[]).filter(q=>q.status!=='solved').length}\nAktif görev: ${(state.tasks||[]).filter(t=>!t.completed).length}\nBorç: ${(state.debts||[]).length}\nSüreler blok kayıtlarından hesaplanır; gerçek zaman ölçümü değildir.`};
  }
  function parse(state,text){
    const n=norm(text);if(context&&context.owner!==owner())resetContext();
    if(mutation(n))return fallback(state,text);
    if(/neler yap|yardim|yetenek/.test(n))return {reply:'Sorular, denemeler, bloklar, görevler ve borçları okuyabilirim. Ders, tarih, durum ve tırnak içindeki kaynak/konuya göre filtreleyebilirim.\nÖrnek: Matematik sorularımı listele · Son 5 TYT denememi analiz et · Bugünkü programımı göster · Sadece çözülmemişleri · Devamını göster.\nFotoğrafların içeriğini değil, kayıt metinlerini ve notlarını okuyabilirim.'};
    let kind=entity(n);
    if(/cozemedikler|cozdugum|cozemedigim/.test(n)&&!kind)kind='questions';
    if(!kind&&context&&/devam|sadece|yalniz|bunlar|onlar/.test(n))kind=context.kind;
    if(/analiz|istatistik|ne kadar calist|performans|genel durum/.test(n))return analysis(state,text);
    if(kind)return list(state,kind,text);
    return fallback(state,text);
  }
  Object.assign(M,{parseRequest:parse,resetConversationContext:resetContext,capabilitiesV4:{norm,filtered,list,analysis,parse,entity,description,getContext:()=>context&&context.owner===owner()?JSON.parse(JSON.stringify(context)):null}});
})();
