(() => {
  'use strict';

  const PROJECT_REF='zyrbbkbwrijnnykbgjvc';
  const SUPABASE_URL=`https://${PROJECT_REF}.supabase.co`;
  const SUPABASE_KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';
  const AUTH_STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
  const ADMIN_USER_ID='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
  const FALLBACK_REFRESH_MS=15000;

  let panelOpen=false;
  let fallbackTimer=null;
  let loading=false;
  let realtimeClient=null;
  let realtimeChannel=null;
  let realtimeToken='';

  function readSession(){
    try{
      const raw=localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      const candidates=[parsed,parsed?.currentSession,parsed?.session,parsed?.data?.session];
      for(const value of candidates){
        if(value?.access_token&&value?.user?.id)return value;
      }
    }catch{}
    return null;
  }

  function isAdmin(){
    return readSession()?.user?.id===ADMIN_USER_ID;
  }

  function esc(v=''){
    return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function dateText(value){
    if(!value)return '—';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '—';
    return new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
  }

  function relativeText(value){
    if(!value)return 'Henüz yok';
    const ms=Date.now()-new Date(value).getTime();
    if(!Number.isFinite(ms))return '—';
    if(ms<0||ms<60000)return 'Şimdi';
    const min=Math.floor(ms/60000);
    if(min<60)return `${min} dk önce`;
    const hour=Math.floor(min/60);
    if(hour<24)return `${hour} sa önce`;
    const day=Math.floor(hour/24);
    if(day<30)return `${day} gün önce`;
    return dateText(value);
  }

  function activeNow(value){
    if(!value)return false;
    const ms=Date.now()-new Date(value).getTime();
    return Number.isFinite(ms)&&ms>=0&&ms<6*60*1000;
  }

  function sortRows(rows){
    return rows.slice().sort((a,b)=>{
      const at=new Date(a.last_seen_at||a.last_sign_in_at||a.created_at||0).getTime()||0;
      const bt=new Date(b.last_seen_at||b.last_sign_in_at||b.created_at||0).getTime()||0;
      return bt-at;
    });
  }

  function adminTitleHTML(){
    return '<span class="hakuna-admin-title"><span class="hakuna-admin-mark" aria-hidden="true">A</span><span>Admin</span></span>';
  }

  function injectStyles(){
    if(document.getElementById('hakunaAdminStyles'))return;
    const style=document.createElement('style');
    style.id='hakunaAdminStyles';
    style.textContent=`
      .hakuna-admin-card{grid-column:1/-1}
      .hakuna-admin-card .card-body{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
      .hakuna-admin-title{display:inline-flex;align-items:center;gap:9px}
      .hakuna-admin-mark{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:8px;background:#1f3856;color:#fff;font-size:12px;font-weight:900;letter-spacing:-.02em;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
      .hakuna-admin-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;padding:5px 9px;border-radius:999px;background:#eef4ff;color:#315f9f}
      .hakuna-admin-modal{width:min(860px,100%);max-height:min(82vh,760px);overflow:auto}
      .hakuna-admin-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
      .hakuna-admin-live{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#617085}
      .hakuna-admin-live::before{content:'';width:8px;height:8px;border-radius:50%;background:#22a559;box-shadow:0 0 0 4px rgba(34,165,89,.10)}
      .hakuna-admin-live.waiting::before{background:#e0a129;box-shadow:0 0 0 4px rgba(224,161,41,.10)}
      .hakuna-admin-list{display:grid;gap:9px}
      .hakuna-admin-row{display:grid;grid-template-columns:minmax(140px,1.2fr) minmax(130px,1fr) minmax(130px,1fr) minmax(130px,1fr);gap:12px;align-items:center;border:1px solid #e1e7ef;border-radius:14px;padding:12px 14px;background:#fff}
      .hakuna-admin-row.header{font-size:11px;font-weight:800;color:#718095;background:#f7f9fc;padding-top:9px;padding-bottom:9px}
      .hakuna-admin-user{min-width:0;font-weight:850;color:#21334b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .hakuna-admin-time strong{display:block;font-size:12px;color:#2d405b}.hakuna-admin-time span{display:block;font-size:10px;color:#8a96a6;margin-top:2px}
      .hakuna-admin-now{display:inline-flex;align-items:center;gap:5px;color:#168447!important}.hakuna-admin-now::before{content:'●';font-size:9px}
      .hakuna-admin-empty{padding:24px;text-align:center;color:#718095}
      .hakuna-admin-error{padding:14px;border-radius:12px;background:#fff3f4;color:#9f3040;font-size:12px}
      @media(max-width:700px){
        .hakuna-admin-modal{max-height:80vh}
        .hakuna-admin-row.header{display:none}
        .hakuna-admin-row{grid-template-columns:1fr 1fr;gap:10px}
        .hakuna-admin-user{grid-column:1/-1;font-size:15px}
        .hakuna-admin-time::before{display:block;font-size:9px;font-weight:800;color:#9aa5b4;margin-bottom:3px}
        .hakuna-admin-time.seen::before{content:'SON AKTİF'}
        .hakuna-admin-time.login::before{content:'SON LOGIN'}
        .hakuna-admin-time.created::before{content:'KAYIT'}
        .hakuna-admin-time.created{grid-column:1/-1}
      }
    `;
    document.head.append(style);
  }

  async function fetchUsers(){
    const session=readSession();
    if(!session?.access_token||session?.user?.id!==ADMIN_USER_ID)throw new Error('Admin oturumu bulunamadı.');
    const query='select=username,created_at,last_sign_in_at,last_seen_at';
    const response=await fetch(`${SUPABASE_URL}/rest/v1/profiles?${query}`,{
      headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`},
      cache:'no-store'
    });
    if(!response.ok){
      let message='Admin verileri alınamadı.';
      try{const data=await response.json();message=data?.message||data?.error||message;}catch{}
      throw new Error(message);
    }
    const rows=await response.json();
    return sortRows(Array.isArray(rows)?rows:[]);
  }

  function rowsHTML(rows){
    if(!rows.length)return '<div class="hakuna-admin-empty">Kayıtlı kullanıcı bulunamadı.</div>';
    return `<div class="hakuna-admin-row header"><div>Kullanıcı</div><div>Son aktif</div><div>Son login</div><div>Kayıt</div></div>`+
      rows.map(row=>{
        const live=activeNow(row.last_seen_at);
        return `<div class="hakuna-admin-row">
          <div class="hakuna-admin-user">${esc(row.username||'İsimsiz')}</div>
          <div class="hakuna-admin-time seen"><strong class="${live?'hakuna-admin-now':''}">${esc(relativeText(row.last_seen_at))}</strong><span>${esc(dateText(row.last_seen_at))}</span></div>
          <div class="hakuna-admin-time login"><strong>${esc(relativeText(row.last_sign_in_at))}</strong><span>${esc(dateText(row.last_sign_in_at))}</span></div>
          <div class="hakuna-admin-time created"><strong>${esc(relativeText(row.created_at))}</strong><span>${esc(dateText(row.created_at))}</span></div>
        </div>`;
      }).join('');
  }

  function setLiveStatus(text,waiting=false){
    const live=document.querySelector('[data-hakuna-admin-live]');
    const stamp=document.querySelector('[data-hakuna-admin-updated]');
    if(live)live.classList.toggle('waiting',waiting);
    if(stamp)stamp.textContent=text;
  }

  function renderRows(rows){
    const list=document.querySelector('[data-hakuna-admin-users]');
    const count=document.querySelector('[data-hakuna-admin-count]');
    if(list)list.innerHTML=rowsHTML(rows);
    if(count)count.textContent=String(rows.length);
  }

  async function refreshPanel(){
    if(!panelOpen||loading||document.visibilityState==='hidden')return;
    loading=true;
    try{
      const rows=await fetchUsers();
      renderRows(rows);
      if(!realtimeChannel)setLiveStatus(`Güncel · ${new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}`,true);
    }catch(error){
      console.warn('Hakuna admin refresh',error);
      const list=document.querySelector('[data-hakuna-admin-users]');
      if(list)list.innerHTML=`<div class="hakuna-admin-error">${esc(error.message||'Admin verileri alınamadı.')}</div>`;
      setLiveStatus('Bağlantı bekleniyor',true);
    }finally{
      loading=false;
    }
  }

  async function startRealtime(){
    if(!panelOpen||realtimeChannel)return;
    const session=readSession();
    if(!session?.access_token||session?.user?.id!==ADMIN_USER_ID)return;
    try{
      setLiveStatus('Canlı bağlantı kuruluyor…',true);
      const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm');
      if(!panelOpen)return;
      realtimeClient=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      realtimeToken=session.access_token;
      realtimeClient.realtime.setAuth(realtimeToken);
      realtimeChannel=realtimeClient
        .channel(`hakuna-admin-profiles-${Date.now()}`)
        .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>{
          if(panelOpen)void refreshPanel();
        })
        .subscribe(status=>{
          if(!panelOpen)return;
          if(status==='SUBSCRIBED')setLiveStatus('Canlı · değişiklikler anında geliyor');
          else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setLiveStatus('Canlı bağlantı bekleniyor',true);
          else setLiveStatus('Canlı bağlantı kuruluyor…',true);
        });
    }catch(error){
      console.warn('Hakuna admin realtime',error);
      setLiveStatus('Canlı bağlantı yok · otomatik yenileme açık',true);
    }
  }

  async function refreshRealtimeAuth(){
    const token=readSession()?.access_token||'';
    if(realtimeClient&&token&&token!==realtimeToken){
      realtimeToken=token;
      realtimeClient.realtime.setAuth(token);
    }
  }

  async function stopLive(){
    panelOpen=false;
    clearInterval(fallbackTimer);
    fallbackTimer=null;
    if(realtimeClient&&realtimeChannel){
      try{await realtimeClient.removeChannel(realtimeChannel);}catch{}
    }
    realtimeChannel=null;
    realtimeClient=null;
    realtimeToken='';
  }

  function closePanel(){
    void stopLive();
    const root=document.getElementById('modalRoot');
    if(root?.querySelector('[data-hakuna-admin-modal]'))root.innerHTML='';
  }

  async function refreshSuggestions(){
    const root=document.querySelector('[data-gees-suggestions]');
    const inbox=document.querySelector('[data-gees-inbox]');
    if(!root||!inbox)return;
    const session=readSession();if(!session?.access_token||!isAdmin())return;
    try{
      const headers={apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token};
      const res=await fetch(SUPABASE_URL+'/rest/v1/gees_suggestions?select=id,user_id,category,message,status,created_at,admin_reply,replied_at,reply_dismissed_at&order=created_at.desc&limit=100',{headers});
      if(!res.ok)throw Error('Öneriler alınamadı');const items=await res.json();
      let authors=new Map();
      try{
        const people=await fetch(SUPABASE_URL+'/rest/v1/rpc/admin_suggestion_authors',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});
        if(people.ok){authors=new Map((await people.json()).map(p=>[p.user_id,p.username]));}
      }catch(e){console.warn('Öneri gönderen adları yüklenemedi',e)}
      root.replaceChildren();inbox.replaceChildren();
      if(!items.length){root.textContent='Henüz öneri gelmedi.';inbox.textContent='Henüz cevaplanmış mesaj yok.';return;}
      const pending=items.filter(x=>!x.admin_reply?.trim());
      const answered=items.filter(x=>x.admin_reply?.trim());
      const pendingCount=document.querySelector('[data-gees-pending-count]');
      const inboxCount=document.querySelector('[data-gees-inbox-count]');
      if(pendingCount)pendingCount.textContent=String(pending.length);
      if(inboxCount)inboxCount.textContent=String(answered.length);
      if(!pending.length)root.textContent='Cevap bekleyen öneri yok.';
      if(!answered.length)inbox.textContent='Henüz cevaplanmış mesaj yok.';
      for(const item of items){
        const isAnswered=Boolean(item.admin_reply?.trim());
        const destination=isAnswered?inbox:root;
        const row=document.createElement('div');row.style.cssText='padding:12px 0;border-bottom:1px solid #ddd';
        const title=document.createElement('div');title.style.fontWeight='700';title.textContent=(item.category==='bug'?'Hata':item.category==='other'?'Diğer':'Öneri')+' · Gönderen: '+(authors.get(item.user_id)||'Bilinmeyen kullanıcı')+' · '+new Date(item.created_at).toLocaleString('tr-TR');
        const message=document.createElement('p');message.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';message.textContent=item.message;
        if(isAnswered){
          const sent=document.createElement('div');sent.style.cssText='margin-top:9px;padding:11px 13px;border-radius:10px;background:var(--blue-soft,#edf3ff);color:var(--ink,#21334b);white-space:pre-wrap;overflow-wrap:anywhere';
          const stamp=document.createElement('small');stamp.style.cssText='display:block;margin-bottom:6px;opacity:.7';stamp.textContent='Yanıtın · '+dateText(item.replied_at);
          const answer=document.createElement('div');answer.textContent=item.admin_reply;
          sent.append(stamp,answer);row.append(title,message,sent);destination.append(row);continue;
        }
        const select=document.createElement('select');for(const [v,label] of [['new','Yeni'],['reviewing','İnceleniyor'],['planned','Planlandı'],['completed','Tamamlandı']]){const opt=document.createElement('option');opt.value=v;opt.textContent=label;select.append(opt);}select.value=item.status;
        select.addEventListener('change',async()=>{select.disabled=true;try{const r=await fetch(SUPABASE_URL+'/rest/v1/gees_suggestions?id=eq.'+encodeURIComponent(item.id),{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({status:select.value})});if(!r.ok)throw Error('Durum güncellenemedi');}catch(e){alert(e.message);select.value=item.status;}finally{select.disabled=false;}});
        const replyLabel=document.createElement('label');
        replyLabel.style.cssText='display:block;margin-top:12px;font-size:12px;font-weight:750';
        replyLabel.textContent='Öneriye cevap yaz';
        const reply=document.createElement('textarea');
        reply.rows=3;reply.maxLength=2000;reply.value=item.admin_reply||'';
        reply.placeholder='Bu cevap öneriyi gönderen kişinin ana ekranında görünecek…';
        reply.style.cssText='display:block;width:100%;box-sizing:border-box;min-height:72px;margin-top:6px;padding:10px;border:1px solid #cfd7e4;border-radius:10px;font:inherit;font-size:13px;resize:vertical';
        const send=document.createElement('button');
        send.type='button';send.className='primary-btn';send.style.marginTop='8px';
        send.textContent=item.admin_reply?'Cevabı güncelle':'Cevap gönder';
        const feedback=document.createElement('span');
        feedback.setAttribute('role','status');
        feedback.style.cssText='display:inline-block;margin-left:10px;font-size:12px;color:#567';
        send.addEventListener('click',async()=>{
          const answer=reply.value.trim();
          if(!answer){feedback.textContent='Önce cevap yaz.';return;}
          send.disabled=true;feedback.textContent='Gönderiliyor…';
          try{
            const r=await fetch(SUPABASE_URL+'/rest/v1/gees_suggestions?id=eq.'+encodeURIComponent(item.id),{
              method:'PATCH',
              headers:{...headers,'Content-Type':'application/json','Prefer':'return=representation'},
              body:JSON.stringify({admin_reply:answer,replied_at:new Date().toISOString(),reply_dismissed_at:null})
            });
            if(!r.ok){const detail=await r.json().catch(()=>({}));throw Error(detail.message||'Cevap gönderilemedi ('+r.status+')');}
            const saved=await r.json();
            if(!saved.length)throw Error('Cevap kaydedilmedi. Admin oturumunu kontrol et.');
            item.admin_reply=answer;
            send.textContent='Cevabı güncelle';
            feedback.textContent='✓ Cevap gönderildi.';
            await refreshSuggestions();
          }catch(e){feedback.textContent=e.message;}
          finally{send.disabled=false;}
        });
        replyLabel.append(reply);
        row.append(title,message,select,replyLabel,send,feedback);destination.append(row);
      }
    }catch(e){root.textContent=e.message;inbox.textContent='Gelen kutusu yüklenemedi: '+e.message;}
  }

  function openPanel(){
    if(!isAdmin())return;
    injectStyles();
    const root=document.getElementById('modalRoot');
    if(!root)return;
    panelOpen=true;
    root.innerHTML=`<div class="modal-backdrop" data-hakuna-admin-close>
      <section class="modal-card hakuna-admin-modal" data-hakuna-admin-modal role="dialog" aria-modal="true" aria-label="Hakuna Admin">
        <header class="modal-head">
          <div><div class="eyebrow">Sadece Batu</div><h2 class="modal-title">${adminTitleHTML()}</h2></div>
          <button class="icon-button" type="button" data-hakuna-admin-close aria-label="Kapat">✕</button>
        </header>
        <div class="modal-body">
          <div class="hakuna-admin-toolbar">
            <div><strong><span data-hakuna-admin-count>—</span> kayıtlı kullanıcı</strong><div class="hakuna-admin-live waiting" data-hakuna-admin-live><span data-hakuna-admin-updated>Canlı bağlantı kuruluyor…</span></div></div>
            <button class="secondary-btn" type="button" data-hakuna-admin-refresh>Yenile</button>
          </div>
          <section style="border-top:1px solid #ddd;margin:18px 0;padding-top:18px"><h3>GEES · Öneri kutusu <span class="hakuna-admin-badge" data-gees-pending-count>—</span></h3><div data-gees-suggestions>Öneriler yükleniyor…</div></section><section style="border-top:1px solid #ddd;margin:18px 0;padding-top:18px"><h3>📥 Gelen kutusu <span class="hakuna-admin-badge" data-gees-inbox-count>—</span></h3><p class="card-subtitle">Cevaplanan öneriler ve gönderdiğin yanıtların geçmişi.</p><div data-gees-inbox>Mesajlar yükleniyor…</div></section>
          <div class="hakuna-admin-list" data-hakuna-admin-users><div class="hakuna-admin-empty">Kullanıcılar yükleniyor…</div></div>
        </div>
      </section>
    </div>`;
    root.querySelector('[data-hakuna-admin-modal]')?.addEventListener('click',e=>e.stopPropagation());
    root.querySelector('.modal-backdrop')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closePanel();});
    root.querySelectorAll('[data-hakuna-admin-close]').forEach(btn=>btn.addEventListener('click',closePanel));
    root.querySelector('[data-hakuna-admin-refresh]')?.addEventListener('click',()=>{void refreshPanel();void refreshSuggestions();});
    void refreshSuggestions();
    void refreshPanel();
    void startRealtime();
    clearInterval(fallbackTimer);
    fallbackTimer=setInterval(()=>{void refreshRealtimeAuth();void refreshPanel();},FALLBACK_REFRESH_MS);
  }

  function injectAdminCard(){
    const view=document.getElementById('view');
    const title=document.getElementById('pageTitle');
    const existing=document.querySelector('[data-hakuna-admin-card]');
    if(!isAdmin()||title?.textContent?.trim()!=='Ayarlar'||!view){
      existing?.remove();
      return;
    }
    if(existing)return;
    injectStyles();
    const card=document.createElement('section');
    card.className='card hakuna-admin-card';
    card.dataset.hakunaAdminCard='1';
    card.innerHTML=`<div class="card-head"><div><div class="card-title">${adminTitleHTML()}</div><div class="card-subtitle">Kayıtlı kullanıcılar, son giriş ve son aktif bilgileri.</div></div><span class="hakuna-admin-badge">Sadece Batu</span></div><div class="card-body"><div><strong>Kullanıcı aktivitesi</strong><div class="card-subtitle" style="margin-top:4px">Yeni kayıt, giriş ve aktiflik değişiklikleri Supabase Realtime ile canlı güncellenir.</div></div><button class="primary-btn" type="button" data-open-hakuna-admin>Admin'i aç</button></div>`;
    view.prepend(card);
    card.querySelector('[data-open-hakuna-admin]')?.addEventListener('click',openPanel);
  }

  const observer=new MutationObserver(()=>injectAdminCard());
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('focus',()=>{injectAdminCard();if(panelOpen){void refreshRealtimeAuth();void refreshPanel();}},{passive:true});
  window.addEventListener('online',()=>{if(panelOpen){void refreshRealtimeAuth();void refreshPanel();void startRealtime();}},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){injectAdminCard();if(panelOpen){void refreshRealtimeAuth();void refreshPanel();}}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panelOpen)closePanel();});

  setTimeout(injectAdminCard,500);
  window.HakunaAdminPanel={open:openPanel,refresh:refreshPanel};
})();
