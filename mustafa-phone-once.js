(() => {
  'use strict';

  const PROJECT_REF='zyrbbkbwrijnnykbgjvc';
  const SUPABASE_URL=`https://${PROJECT_REF}.supabase.co`;
  const SUPABASE_KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';
  const AUTH_STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
  const MUSTAFA_USER_ID='9731add6-573b-4124-8383-e447b0cdc401';
  const FLAG='mustafa_phone_popup_seen_v1';
  const LOCAL_KEY=`hakuna.once.${FLAG}.${MUSTAFA_USER_ID}`;
  const PHOTO='./assets/mustafa-phone.jpeg?v=1';

  let shown=false;
  let checking=false;
  let retryCount=0;

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

  function isMustafa(session=readSession()){
    return session?.user?.id===MUSTAFA_USER_ID;
  }

  function localSeen(){
    return localStorage.getItem(LOCAL_KEY)==='1';
  }

  async function fetchRemoteFlags(session){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),2200);
    try{
      const response=await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${MUSTAFA_USER_ID}&select=ui_flags`,
        {
          headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`},
          cache:'no-store',
          signal:controller.signal
        }
      );
      if(!response.ok)return null;
      const rows=await response.json();
      return rows?.[0]?.ui_flags&&typeof rows[0].ui_flags==='object'?rows[0].ui_flags:{};
    }catch{
      return null;
    }finally{
      clearTimeout(timer);
    }
  }

  async function markRemoteSeen(session,existingFlags=null){
    if(!isMustafa(session))return false;
    let flags=existingFlags;
    if(!flags||typeof flags!=='object')flags=await fetchRemoteFlags(session);
    flags=flags&&typeof flags==='object'?flags:{};
    const next={...flags,[FLAG]:true};
    try{
      const response=await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${MUSTAFA_USER_ID}`,
        {
          method:'PATCH',
          headers:{
            apikey:SUPABASE_KEY,
            Authorization:`Bearer ${session.access_token}`,
            'Content-Type':'application/json',
            Prefer:'return=minimal'
          },
          body:JSON.stringify({ui_flags:next})
        }
      );
      return response.ok;
    }catch{
      return false;
    }
  }

  function injectStyles(){
    if(document.getElementById('mustafaPhoneOnceStyles'))return;
    const style=document.createElement('style');
    style.id='mustafaPhoneOnceStyles';
    style.textContent=`
      .mustafa-once{
        position:fixed;inset:0;z-index:2147483600;
        background:rgba(5,7,10,.97);
        display:grid;place-items:center;
        padding:max(22px,env(safe-area-inset-top)) 22px max(22px,env(safe-area-inset-bottom));
        font-family:ui-rounded,-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
      }
      .mustafa-once-card{
        width:min(760px,100%);
        background:#fff;color:#111;
        border-radius:28px;
        padding:26px;
        box-shadow:0 30px 90px rgba(0,0,0,.5);
        display:grid;gap:22px;
      }
      .mustafa-once-main{
        display:grid;
        grid-template-columns:minmax(210px,.9fr) minmax(240px,1.1fr);
        gap:26px;align-items:center;
      }
      .mustafa-once-photo{
        width:100%;max-height:440px;object-fit:contain;
        border-radius:20px;background:#f4f4f4;
        border:1px solid #e7e7e7;
      }
      .mustafa-once-copy{
        font-size:clamp(30px,4.4vw,54px);
        line-height:1.02;font-weight:950;
        letter-spacing:-.055em;
        margin:0;
      }
      .mustafa-once-button{
        width:100%;border:0;border-radius:18px;
        padding:16px 20px;
        background:#111;color:#fff;
        font-size:18px;font-weight:900;
        min-height:56px;
      }
      .mustafa-once-button:active{transform:scale(.99)}
      @media(max-width:620px){
        .mustafa-once-card{padding:18px;border-radius:22px}
        .mustafa-once-main{grid-template-columns:1fr;gap:16px}
        .mustafa-once-photo{max-height:48vh}
        .mustafa-once-copy{text-align:center;font-size:34px}
      }
    `;
    document.head.appendChild(style);
  }

  function closeOverlay(session,flags){
    localStorage.setItem(LOCAL_KEY,'1');
    const overlay=document.querySelector('[data-mustafa-once]');
    overlay?.remove();
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    shown=false;
    void markRemoteSeen(session,flags);
  }

  function showOverlay(session,flags){
    if(shown||localSeen()||!isMustafa(session))return;
    shown=true;
    injectStyles();

    const overlay=document.createElement('div');
    overlay.className='mustafa-once';
    overlay.dataset.mustafaOnce='1';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Etütte telefonum çaldı');

    overlay.innerHTML=`
      <section class="mustafa-once-card">
        <div class="mustafa-once-main">
          <img class="mustafa-once-photo" alt="Tuşlu telefon" src="${PHOTO}">
          <p class="mustafa-once-copy">etütte telefonum çaldı</p>
        </div>
        <button class="mustafa-once-button" type="button">ben malım</button>
      </section>
    `;

    overlay.querySelector('.mustafa-once-button').addEventListener('click',()=>{
      closeOverlay(session,flags);
    },{once:true});

    overlay.addEventListener('click',e=>e.stopPropagation(),true);
    overlay.addEventListener('pointerdown',e=>e.stopPropagation(),true);
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>overlay.querySelector('.mustafa-once-button')?.focus({preventScroll:true}));
  }

  async function check(){
    if(checking||shown)return;
    const session=readSession();
    if(!session){
      if(retryCount++<20)setTimeout(check,500);
      return;
    }
    if(!isMustafa(session))return;

    if(localSeen()){
      void markRemoteSeen(session);
      return;
    }

    checking=true;
    try{
      const flags=await fetchRemoteFlags(session);
      if(flags?.[FLAG]){
        localStorage.setItem(LOCAL_KEY,'1');
        return;
      }
      showOverlay(session,flags);
    }finally{
      checking=false;
    }
  }

  document.addEventListener('keydown',e=>{
    if(shown&&(e.key==='Escape'||e.key==='Esc')){
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },true);

  window.addEventListener('storage',()=>setTimeout(check,0));
  window.addEventListener('focus',()=>setTimeout(check,0),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(check,0);});
  document.addEventListener('hakuna:account-changed',()=>setTimeout(check,50));

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,650),{once:true});
  else setTimeout(check,650);
})();
