(() => {
  'use strict';
  const M=window.HakunaMataV2,A=M.actionsV4;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const fail=s=>{throw new Error(s);};
  const own=()=>`${A.owner()}|${window.HakunaAccount?.info().id||''}`;
  const consentKey=()=>`hakuna.mata.aiConsent.${own()}`;
  const enabled=()=>localStorage.getItem(consentKey())==='1';
  const days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const routes={today:'Bugün',plan:'Plan',tasks:'Görevler ve borçlar',exams:'Denemeler',questions:'Sorular',analytics:'Analiz',settings:'Ayarlar',yks:'YKS sıralama hesaplayıcı',restore:'Yedeği geri yükle',reset:'Yerel veriyi sıfırla',bridge:'ChatGPT köprüsü'};
  const timerNames={start:'Sayacı başlat',pause:'Sayacı duraklat',resume:'Sayaca devam et',stop:'Sayacı sıfırla',addFive:'Sayaca 5 dakika ekle',acknowledge:'Sayaç alarmını kapat'};
  const tickets=new WeakMap();
  const settingsOf=s=>({planMode:s.settings?.planMode||'timeline',weekStartDay:s.settings?.weekStartDay??1});
  const baseline=s=>JSON.stringify([A.collections.map(k=>s[k]||[]),s.settings||{}]);
  function validate(a){
    if(!a||typeof a!=='object')fail('Geçersiz işlem.');
    if(a.type==='settings'){
      if(!a.data||!Object.keys(a.data).length||Object.keys(a.data).some(k=>!['planMode','weekStartDay'].includes(k)))fail('Geçersiz ayar.');
      if('planMode'in a.data&&!['cards','timeline'].includes(a.data.planMode))fail('Plan görünümü geçersiz.');
      if('weekStartDay'in a.data&&(!Number.isInteger(a.data.weekStartDay)||a.data.weekStartDay<0||a.data.weekStartDay>6))fail('Hafta başlangıcı geçersiz.');
    }else if(a.type==='timer'){
      if(!Object.hasOwn(timerNames,a.op))fail('Geçersiz sayaç işlemi.');
      if(a.op==='start'&&(!Number.isInteger(a.minutes)||a.minutes<1||a.minutes>600))fail('Süre 1–600 tam dakika olmalı.');
      if(!window.HakunaStudyTimer)fail('Sayaç henüz yüklenmedi.');
    }else if(a.type==='navigate'){
      if(!Object.hasOwn(routes,a.target))fail('Bu ekran desteklenmiyor.');
    }else if(a.type==='account'){
      if(!['login','register','logout','sync'].includes(a.op))fail('Geçersiz hesap işlemi.');
      if(!window.HakunaAccount)fail('Hesap modülü henüz yüklenmedi.');
      if(['logout','sync'].includes(a.op)&&!window.HakunaAccount.info().id)fail('Önce hesabına giriş yap.');
    }else if(a.type==='theme'){
      if(typeof a.dark!=='boolean'||!window.HakunaBatuTheme?.isBatu())fail('Bu hesap için tema kontrolü kullanılamıyor.');
    }else if(a.type!=='backup')fail('Bilinmeyen işlem.');
  }
  function label(a,s){
    if(a.type==='settings')return Object.entries(a.data).map(([k,v])=>k==='planMode'?`Plan görünümü: ${settingsOf(s).planMode==='cards'?'Kartlar':'Saatli'} → ${v==='cards'?'Kartlar':'Saatli'}`:`Hafta başlangıcı: ${days[settingsOf(s).weekStartDay]} → ${days[v]}`).join('\n');
    if(a.type==='theme')return a.dark?'Koyu temayı aç':'Açık temaya geç';
    if(a.type==='timer')return timerNames[a.op]+(a.op==='start'?` (${a.minutes} dakika; mevcut sayaç yerine)`:'');
    if(a.type==='navigate')return `${routes[a.target]} ekranını aç${['restore','reset'].includes(a.target)?'; dosya seçimi ve son onay bu ekranda yapılacak.':''}`;
    if(a.type==='account')return {login:'Güvenli giriş formunu aç',register:'Güvenli kayıt formunu aç',logout:'Hesaptan çık (cihazdaki veriler korunur)',sync:'Bulut senkronizasyonunu kontrol et'}[a.op];
    return 'Mevcut verileri JSON yedeği olarak indir';
  }
  function prepare(s,actions){
    const extended=actions.some(a=>['settings','timer','navigate','account','backup','theme'].includes(a.type));
    if(!extended)return A.prepare(s,actions);
    if(actions.length!==1)fail('Ayar, sayaç, hesap veya ekran işlemini ayrı bir mesajda iste. Kayıt değişiklikleri toplu yapılabilir.');
    const a=clone(actions[0]);validate(a);
    const token=Object.freeze({rows:Object.freeze([label(a,s)])});
    tickets.set(token,{a,owner:own(),baseline:baseline(s),timer:localStorage.getItem('hakuna.studyTimer.v1'),used:false});return token;
  }
  function download(s){
    const blob=new Blob([JSON.stringify({schema:'hakuna.backup.v1',exported_at:new Date().toISOString(),state:s},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Hakuna-Matata-Yedek-${M.todayISO()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function navigate(target){sessionStorage.setItem('hakuna_mata_platform_target',target);location.reload();}
  async function commit(token){
    if(!tickets.has(token))return A.commit(token);
    const t=tickets.get(token);if(t.used)fail('Bu önizleme zaten kullanıldı.');t.used=true;
    const s=await M.currentState();if(t.owner!==own()||t.baseline!==baseline(s))fail('Hesap veya veriler değişti. İsteği yeniden gönder.');
    const a=t.a;validate(a);
    if(a.type==='settings'){
      s.settings={...s.settings,...a.data};M.addMessage(s,'mata','Ayarların kaydedildi.');await M.writeState(s);
      for(const [k,v]of Object.entries(a.data))localStorage.setItem(`hakuna.${k}`,String(v));
    }else if(a.type==='timer'){
      if(localStorage.getItem('hakuna.studyTimer.v1')!==t.timer)fail('Sayaç değişti. Yeni önizleme oluştur.');
      const timer=window.HakunaStudyTimer,status=timer.state().status;
      if(a.op==='pause'&&status!=='running'||a.op==='resume'&&status!=='paused'||a.op==='addFive'&&!['running','paused'].includes(status))fail('Sayaç bu işlem için uygun durumda değil.');
      timer[a.op](a.minutes);
    }else if(a.type==='theme'){if(!window.HakunaBatuTheme.setDark(a.dark))fail('Tema değiştirilemedi.');}
    else if(a.type==='backup')download(s);
    else if(a.type==='navigate')navigate(a.target);
    else if(['login','register'].includes(a.op))window.HakunaAccount.open(a.op);
    else if(a.op==='logout')await window.HakunaAccount.logout();
    else await window.HakunaAccount.sync();
    if(a.type!=='settings'&&a.type!=='navigate'){
      const fresh=await M.currentState();M.addMessage(fresh,'mata',a.type==='account'&&['login','register'].includes(a.op)?'Hesap formu açıldı. Şifreni yalnızca bu forma gir.':a.type==='account'&&a.op==='sync'?window.HakunaAccount.info().sync:label(a,s)+' — işlem uygulandı.');await M.writeState(fresh);
    }
  }
  function page(rows,offset=0){
    if(!Number.isInteger(offset)||offset<0)fail('Sayfa başlangıcı geçersiz.');
    return {total:rows.length,offset,rows:clone(rows.slice(offset,offset+50)),nextOffset:offset+50<rows.length?offset+50:null};
  }
  function records(s,q){
    if(!A.collections.includes(q.collection))fail('Bilinmeyen kayıt türü.');
    let rows=s[q.collection]||[];
    if(q.ids){if(!Array.isArray(q.ids)||q.ids.some(x=>typeof x!=='string'))fail('Kayıt kimlikleri geçersiz.');rows=rows.filter(r=>q.ids.includes(r.id));}
    if(q.subject)rows=rows.filter(r=>M.fold(r.subject||'')===M.fold(q.subject));
    if(q.status)rows=rows.filter(r=>(r.status||(r.completed?'complete':'pending'))===q.status);
    if(q.from)rows=rows.filter(r=>(r.date||r.sourceDate||r.createdAt||'')>=q.from);
    if(q.to)rows=rows.filter(r=>(r.date||r.sourceDate||r.createdAt||'').slice(0,10)<=q.to);
    if(q.text)rows=rows.filter(r=>M.fold(JSON.stringify(r)).includes(M.fold(q.text)));
    return page(rows,q.offset||0);
  }
  function context(s){return {today:M.todayISO(),selectedDate:s.selectedDate,settings:settingsOf(s),timer:window.HakunaStudyTimer?.state()||null,account:window.HakunaAccount?.info()||{id:null},counts:Object.fromEntries(A.collections.map(k=>[k,(s[k]||[]).length])),recordFields:A.schemas,subjects:M.SUBJECTS,units:M.UNITS,routes,timerActions:timerNames};}
  function calculation(input){
    const api=window.HakunaYKS;if(!api)fail('YKS modülü yüklenmedi.');
    for(const [k,max]of Object.entries(api.LIMITS)){
      const c=input[k+'Correct'],w=input[k+'Wrong'];
      if(!Number.isInteger(c)||!Number.isInteger(w)||c<0||w<0||c+w>max)fail(`${k}: doğru ve yanlış sayılarını 0–${max} aralığında gir; toplam sınırı aşmasın.`);
    }
    if(typeof input.diploma!=='number'||!((input.diploma>=50&&input.diploma<=100)||(input.diploma>=250&&input.diploma<=500)))fail('Diploma 50–100 veya OBP 250–500 olmalı.');
    if(typeof input.penalty!=='boolean')fail('Kırık OBP durumunu belirt.');
    return {notice:'Uygulamanın yaklaşık SAY modeli; resmi sonuç veya yerleşme garantisi değildir.',...api.calculate(input)};
  }
  async function programs(q){
    if(!window.HakunaYKS?.searchPrograms)fail('Üniversite verileri henüz yüklenmedi.');
    const result=await window.HakunaYKS.searchPrograms(q);
    if(q.includeQuota&&q.department&&window.HakunaYKSQuota){
      const departments=[...new Set(result.rows.map(r=>r.department))];
      if(departments.length===1){try{result.rows=await window.HakunaYKSQuota.forPrograms(departments[0],result.year,result.rows);}catch{result.quotaNotice='Kontenjan kaynağına erişilemedi; sayı uydurulmadı.';}}
      else result.quotaNotice='Kontenjan için tek bir bölüm seç.';
    }
    return result;
  }
  function resolve(s,actions){
    if(!Array.isArray(actions)||!actions.length||actions.length>100)fail('Geçersiz işlem listesi.');
    return actions.map(a=>{
      if(a.type!=='record'){validate(a);return a;}
      if(!A.collections.includes(a.collection))fail('Kayıt türü geçersiz.');
      if(a.op==='add')return {...a,before:undefined};
      const record=(s[a.collection]||[]).find(r=>r.id===a.id);
      if(!record)fail('Modelin seçtiği kayıt bulunamadı. Hiçbir değişiklik yapılmadı.');
      return {...a,...(a.collection==='tasks'&&a.op==='status'?{status:a.status==='complete'?true:a.status==='pending'?false:a.status}:{}),before:clone(record)};
    });
  }
  async function readTool(s,name,args){
    if(name==='read_records')return records(s,args);
    if(name==='read_context')return {...context(s),themeAvailable:!!window.HakunaBatuTheme?.isBatu()};
    if(name==='read_history')return page(s.assistantMessages||[],args.offset||0);
    if(name==='search_programs')return programs(args);
    if(name==='calculate_yks')return calculation(args);
    fail('İzin verilmeyen araç.');
  }
  async function model(s,raw){
    const account=window.HakunaAccount;if(!account?.info().id)fail('Gelişmiş dil anlama için hesabına giriş yap. Yerel modu kullanmaya devam edebilirsin.');
    const owner=own(),messages=[...s.assistantMessages.slice(-12).map(m=>({role:m.role==='user'?'user':'assistant',content:m.text})),{role:'user',content:raw}];
    // Current user message was already appended by the UI.
    if(messages.length>1&&messages.at(-2).role==='user'&&messages.at(-2).content===raw)messages.splice(-2,1);
    const seen=new Set();
    for(let step=0;step<8;step++){
      if(owner!==own()||!enabled())fail('Hesap veya model izni değişti. İstek iptal edildi.');
      const out=await account.plan({messages,context:context(s),consent:true});
      if(owner!==own()||!enabled())fail('Hesap veya model izni değişti. Sonuç uygulanmadı.');
      const msg=out.message;if(!msg||msg.role!=='assistant')fail('Model yanıtı geçersiz.');
      const calls=msg.tool_calls||[];
      if(!calls.length)return {reply:String(msg.content||'İsteğini biraz daha açık yazar mısın?')};
      if(calls.length>8)fail('Çok fazla araç isteği. Daha dar bir istek gönder.');
      const proposals=calls.filter(c=>c.function?.name==='propose_actions');
      if(proposals.length){
        if(calls.length!==1)fail('Model okuma ve yazmayı tek yanıtta karıştırdı. İsteği yeniden gönder.');
        const payload=JSON.parse(proposals[0].function.arguments),actions=resolve(s,payload.actions);
        for(const a of actions)if(a.type==='record'&&a.op!=='add'&&!seen.has(a.collection+':'+a.id))fail('Hedef kayıt bu istekte okunmadı. İsteği yeniden gönder.');
        return {actions};
      }
      messages.push(msg);
      for(const call of calls){
        let result;try{const args=JSON.parse(call.function.arguments);result=await readTool(s,call.function.name,args);if(call.function.name==='read_records')for(const row of result.rows)seen.add(args.collection+':'+row.id);}catch(e){result={error:e.message};}
        messages.push({role:'tool',tool_call_id:call.id,content:JSON.stringify(result)});
      }
    }
    return {reply:'Bu istek tek seferde tarama sınırına ulaştı. Tarih veya ders belirterek daralt; hiçbir değişiklik yapmadım.'};
  }
  function local(s,raw){
    const n=M.fold(raw),act=a=>({actions:[a]});
    if(/^(mata )?(neler yapabiliyorsun|yetenekler|yardim)$/.test(n))return {reply:'Blok, plan kartı, görev, borç, soru ve denemeleri okuyabilir ve değiştirebilirim. Sayaç, plan görünümü, hafta başlangıcı, yedekleme, hesap ve YKS araçlarına da erişebilirim. Sağdaki Uygulama araçlarını kullanabilirsin. Gelişmiş dil anlama açıkken günlük dilde çok adımlı istekler de modelle çözümlenir. Silme ve değişiklikler önce önizlenir.'};
    if(/^(ayarlarimi|ayarlar) (goster|listele)$/.test(n))return {reply:`Plan: ${settingsOf(s).planMode==='cards'?'Kartlar':'Saatli'}\nHafta başlangıcı: ${days[settingsOf(s).weekStartDay]}`};
    if(/^(hesabim|hesap bilgilerim|senkron durumu)$/.test(n)){const a=window.HakunaAccount?.info();return {reply:a?.id?`${a.label}\n${a.sync}`:'Hesap bağlı değil; veriler bu cihazda.'};}
    if(/^(sayac|kronometre).*(durum|kaldi)/.test(n)){const t=window.HakunaStudyTimer?.state();return {reply:t?`Sayaç: ${{idle:'Kapalı',running:'Çalışıyor',paused:'Duraklatıldı',finished:'Süre doldu'}[t.status]}${t.status==='running'||t.status==='paused'?` · ${Math.ceil((t.status==='paused'?t.remainingMs:Math.max(0,t.endAt-Date.now()))/60000)} dakika kaldı`:''}`:'Sayaç henüz yüklenmedi.'};}
    if(/sayac|kronometre/.test(n)){
      if(/duraklat/.test(n))return act({type:'timer',op:'pause'});
      if(/devam|surdur/.test(n))return act({type:'timer',op:'resume'});
      if(/sifirla|iptal/.test(n))return act({type:'timer',op:'stop'});
      if(/5 dakika ekle/.test(n))return act({type:'timer',op:'addFive'});
      const minutes=M.parseDuration(raw);if(/baslat|kur/.test(n)&&minutes)return act({type:'timer',op:'start',minutes});
    }
    if(/hafta.*basla/.test(n)){const day=days.findIndex(d=>n.includes(M.fold(d)));if(day>=0)return act({type:'settings',data:{weekStartDay:day}});}
    if(/(plan|gorunum).*(kart|saatli)/.test(n)&&/yap|gec|degistir/.test(n))return act({type:'settings',data:{planMode:n.includes('kart')?'cards':'timeline'}});
    if(/^(verilerimi )?yedek(le| al)$/.test(n))return act({type:'backup'});
    if(/yedek.*geri yukle/.test(n))return act({type:'navigate',target:'restore'});
    if(/^(tum )?(yerel )?verileri(mi)? sifirla$/.test(n))return act({type:'navigate',target:'reset'});
    if(/^(hesaptan )?cikis yap$/.test(n))return act({type:'account',op:'logout'});
    if(/^(hesaba )?giris yap$/.test(n))return act({type:'account',op:'login'});
    if(/^(simdi )?senkronla$/.test(n))return act({type:'account',op:'sync'});
    if(/^yks.*(ac|hesapla)/.test(n))return act({type:'navigate',target:'yks'});
    return null;
  }
  async function request(s,raw){
    if(/^(iptal|vazgeç|vazgec|boşver|bosver|hayır|hayir)$/i.test(raw)){M.conversationV4.reset();return {reply:'İptal edildi. Hiçbir değişiklik yapmadım.'};}
    if(enabled())return model(s,raw);
    return local(s,raw)||M.parseRequest(s,raw);
  }
  const options=[['backup','Yedek indir'],['navigate:restore','Yedeği geri yükle'],['navigate:reset','Yerel verileri sıfırla'],['navigate:bridge','ChatGPT köprüsü'],['navigate:yks','YKS hesaplayıcı'],['navigate:analytics','Analiz'],['account:login','Hesaba giriş'],['account:register','Hesap oluştur'],['account:sync','Senkronla'],['account:logout','Hesaptan çık'],...Object.entries(timerNames).map(([k,v])=>['timer:'+k,v])];
  function html(){return `<section class="card" style="padding:16px"><div class="card-title">Uygulama araçları</div><p class="card-subtitle">Sayaç, ayarlar, hesap ve YKS. İşlemler önce önizlenir.</p><label>İşlem<select data-mata-tool style="width:100%">${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><label>Sayaç süresi (dk)<input data-mata-minutes type="number" min="1" max="600" value="25" style="width:100%"></label><button class="secondary-btn" data-mata-tool-preview>İşlemi önizle</button><hr><label>Plan görünümü<select data-mata-plan><option value="timeline">Saatli</option><option value="cards">Kartlar</option></select></label><label>Hafta başlangıcı<select data-mata-week>${days.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select></label><button class="secondary-btn" data-mata-settings-preview>Ayarları önizle</button><hr><label><input type="checkbox" data-mata-ai ${enabled()?'checked':''}> Gelişmiş dil anlama</label><p class="card-subtitle">Açtığında son 12 sohbet mesajı ve isteğin için okunan çalışma verileri OpenAI’a gönderilir. Hesap ve sunucuda model kurulumu gerekir. Şifreleri sohbete yazma. Kapalıyken yerel mod çalışır.</p><button class="secondary-btn" data-mata-ai-status>Bağlantıyı kontrol et</button><p data-mata-ai-info role="status"></p></section>`;}
  function bind(root,s,propose){
    const renderedOwner=own(),callback=propose;propose=actions=>{if(renderedOwner!==own()){window.alert('Hesap değişti. Mata ekranını yeniden aç.');return;}callback(actions);};
    root.querySelector('[data-mata-plan]').value=settingsOf(s).planMode;root.querySelector('[data-mata-week]').value=settingsOf(s).weekStartDay;
    root.querySelector('[data-mata-tool-preview]').onclick=()=>{const [type,op]=root.querySelector('[data-mata-tool]').value.split(':');propose([{type,...(type==='navigate'?{target:op}:op?{op}:{}),...(type==='timer'&&op==='start'?{minutes:Number(root.querySelector('[data-mata-minutes]').value)}:{})}]);};
    root.querySelector('[data-mata-settings-preview]').onclick=()=>propose([{type:'settings',data:{planMode:root.querySelector('[data-mata-plan]').value,weekStartDay:Number(root.querySelector('[data-mata-week]').value)}}]);
    root.querySelector('[data-mata-ai]').onchange=e=>{localStorage.setItem(consentKey(),e.target.checked?'1':'0');M.conversationV4.reset();root.querySelector('[data-mata-ai-info]').textContent=e.target.checked?'Gelişmiş mod seçildi. Bağlantıyı kontrol edebilirsin.':'Yerel mod açık. Model bağlantısı kapalı.';};
    root.querySelector('[data-mata-ai-status]').onclick=async()=>{const el=root.querySelector('[data-mata-ai-info]');el.textContent='Kontrol ediliyor…';try{if(!window.HakunaAccount?.info().id)throw new Error('Önce hesabına giriş yap.');const r=await window.HakunaAccount.plan({status:true});el.textContent=r.ready?'Model sunucuda yapılandırılmış. İlk istekte bağlantı doğrulanacak.':'Sunucu anahtarı veya model adı eksik. Yerel mod kullanılabilir.';}catch(e){el.textContent=e.message;}};
  }
  function resume(){const target=sessionStorage.getItem('hakuna_mata_platform_target');if(!target||!Object.hasOwn(routes,target))return;sessionStorage.removeItem('hakuna_mata_platform_target');let tries=0;const interval=setInterval(()=>{const selector=target==='yks'?'[data-yks-nav]':`[data-nav="${['restore','reset','bridge'].includes(target)?'settings':target}"]`;const b=document.querySelector(selector);if(b){clearInterval(interval);b.click();if(['restore','reset','bridge'].includes(target)){const hint=document.createElement('p');hint.textContent={restore:'Mata: Yedek dosyanı seçmek için Geri yükle düğmesine bas.',reset:'Mata: Sil düğmesi tüm yerel verileri sıfırlar. Devam etmeden önce yedek al.',bridge:'Mata: ChatGPT köprüsünü bu ekrandan kullanabilirsin.'}[target];hint.setAttribute('role','status');document.querySelector('#view')?.prepend(hint);}}else if(++tries>=30)clearInterval(interval);},100);}
  M.platformV5={prepare,commit,request,records,context,calculation,programs,resolve,html,bind,enabled};resume();
})();
