(() => {
  'use strict';

  const PROJECT_REF='zyrbbkbwrijnnykbgjvc';
  const SUPABASE_URL=`https://${PROJECT_REF}.supabase.co`;
  const SUPABASE_KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';
  const AUTH_STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
  const ADMIN_USER_ID='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
  const REFRESH_MS=4000;

  let panelOpen=false;
  let refreshTimer=null;
  let loading=false;
  let lastRows=[];

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

  function injectStyles(){
    if(document.getElementById('hakunaAdminStyles'))return;
    const style=document.createElement('style');
    style.id='hakunaAdminStyles';
    style.textContent=`
      .hakuna-admin-card{grid-column:1/-1}
      .hakuna-admin-card .card-body{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
      .hakuna-admin-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;padding:5px 9px;border-radius:999px;background:#eef4ff;color:#315f9f}
      .hakuna-admin-modal{width:min(860px,100%);max-height:min(82vh,760px);overflow:auto}
      .hakuna-admin-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
      .hakuna-admin-live{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#617085}
      .hakuna-admin-live::before{content:'';width:8px;height:8px;border-radius:50%;background:#22a559;box-shadow:0 0 0 4px rgba(34,165,89,.10)}
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
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/hakuna_admin_users`,{
      method:'POST',
      headers:{
        apikey:SUPABASE_KEY,
        Authorization:`Bearer ${session.access_token}`,
        'Content-Type':'application/json'
      },
      body:'{}',
      cache:'no-store'
    });
    if(!response.ok){
      let message='Admin verileri alınamadı.';
      try{const data=await response.json();message=data?.message||data?.error||message;}catch{}
      throw new Error(message);
    }
    const rows=await response.json();
    return Array.isArray(rows)?rows:[];
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

  function renderRows(rows){
    const list=document.querySelector('[data-hakuna-admin-users]');
    const count=document.querySelector('[data-hakuna-admin-count]');
    const stamp=document.querySelector('[data-hakuna-admin-updated]');
    if(list)list.innerHTML=rowsHTML(rows);
    if(count)count.textContent=String(rows.length);
    if(stamp)stamp.textContent=`Son yenileme ${new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}`;
  }

  async function refreshPanel(){
    if(!panelOpen||loading||document.visibilityState==='hidden')return;
    loading=true;
    try{
      lastRows=await fetchUsers();
      renderRows(lastRows);
    }catch(error){
      console.warn('Hakuna admin refresh',error);
      const list=document.querySelector('[data-hakuna-admin-users]');
      if(list)list.innerHTML=`<div class="hakuna-admin-error">${esc(error.message||'Admin verileri alınamadı.')}</div>`;
    }finally{
      loading=false;
    }
  }

  function stopLive(){
    panelOpen=false;
    clearInterval(refreshTimer);
    refreshTimer=null;
  }

  function closePanel(){
    stopLive();
    const root=document.getElementById('modalRoot');
    if(root?.querySelector('[data-hakuna-admin-modal]'))root.innerHTML='';
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
          <div><div class="eyebrow">Sadece Batu</div><h2 class="modal-title">🛡️ Admin</h2></div>
          <button class="icon-button" type="button" data-hakuna-admin-close aria-label="Kapat">✕</button>
        </header>
        <div class="modal-body">
          <div class="hakuna-admin-toolbar">
            <div><strong><span data-hakuna-admin-count>—</span> kayıtlı kullanıcı</strong><div class="hakuna-admin-live"><span data-hakuna-admin-updated>Canlı bağlantı kuruluyor…</span></div></div>
            <button class="secondary-btn" type="button" data-hakuna-admin-refresh>Yenile</button>
          </div>
          <div class="hakuna-admin-list" data-hakuna-admin-users><div class="hakuna-admin-empty">Kullanıcılar yükleniyor…</div></div>
        </div>
      </section>
    </div>`;
    root.querySelector('[data-hakuna-admin-modal]')?.addEventListener('click',e=>e.stopPropagation());
    root.querySelector('.modal-backdrop')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closePanel();});
    root.querySelectorAll('[data-hakuna-admin-close]').forEach(btn=>btn.addEventListener('click',closePanel));
    root.querySelector('[data-hakuna-admin-refresh]')?.addEventListener('click',()=>void refreshPanel());
    void refreshPanel();
    clearInterval(refreshTimer);
    refreshTimer=setInterval(()=>void refreshPanel(),REFRESH_MS);
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
    card.innerHTML=`<div class="card-head"><div><div class="card-title">🛡️ Admin</div><div class="card-subtitle">Kayıtlı kullanıcılar, son giriş ve son aktif bilgileri.</div></div><span class="hakuna-admin-badge">Özel erişim</span></div><div class="card-body"><div><strong>Kullanıcı aktivitesi</strong><div class="card-subtitle" style="margin-top:4px">Panel açıkken Supabase verileri 4 saniyede bir otomatik yenilenir.</div></div><button class="primary-btn" type="button" data-open-hakuna-admin>Admin'i aç</button></div>`;
    view.prepend(card);
    card.querySelector('[data-open-hakuna-admin]')?.addEventListener('click',openPanel);
  }

  const observer=new MutationObserver(()=>injectAdminCard());
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('focus',()=>{injectAdminCard();if(panelOpen)void refreshPanel();},{passive:true});
  window.addEventListener('online',()=>{if(panelOpen)void refreshPanel();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){injectAdminCard();if(panelOpen)void refreshPanel();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panelOpen)closePanel();});

  setTimeout(injectAdminCard,500);
  window.HakunaAdminPanel={open:openPanel,refresh:refreshPanel};
})();
