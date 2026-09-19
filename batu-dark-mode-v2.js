(() => {
  'use strict';

  const PROJECT_REF='zyrbbkbwrijnnykbgjvc';
  const AUTH_STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
  const BATU_USER_ID='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
  const THEME_KEY='hakuna.batu.darkMode.v1';
  const DEFAULT_LOGO='./icons/hakuna-brand-v3.png?v=brand-v3';
  const DARK_LOGO='./assets/batu-dark-logo-sidebar.svg?v=1';

  let refreshQueued=false;

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

  function isBatu(){
    return readSession()?.user?.id===BATU_USER_ID;
  }

  function darkEnabled(){
    return isBatu()&&localStorage.getItem(THEME_KEY)==='1';
  }

  function syncToggle(){
    const button=document.querySelector('[data-batu-theme-toggle]');
    if(!button)return;
    const enabled=darkEnabled();
    button.setAttribute('aria-checked',enabled?'true':'false');
    button.title=enabled?'Dark Mode açık':'Dark Mode kapalı';
  }

  function applyTheme(){
    const batu=isBatu();
    const enabled=batu&&localStorage.getItem(THEME_KEY)==='1';
    const root=document.documentElement;
    const logo=document.querySelector('.brand-icon');
    const meta=document.querySelector('meta[name="theme-color"]');

    if(enabled){
      root.dataset.batuTheme='dark';
      if(logo){
        logo.dataset.batuThemeLogo='1';
        logo.onerror=()=>{
          logo.onerror=null;
          logo.src='./assets/batu-dark-logo.svg?v=1';
        };
        if(!logo.src.includes('batu-dark-logo-sidebar.svg'))logo.src=DARK_LOGO;
        logo.style.visibility='visible';
        logo.style.opacity='1';
        logo.alt='Batu';
      }
      if(meta)meta.content='#08090b';
    }else{
      delete root.dataset.batuTheme;
      if(logo?.dataset.batuThemeLogo){
        logo.src=DEFAULT_LOGO;
        logo.alt='Hakuna Matata';
        delete logo.dataset.batuThemeLogo;
      }
      if(meta)meta.content='#0f1b33';
    }

    if(!batu)document.querySelector('[data-batu-theme-row]')?.remove();
    syncToggle();
  }

  function injectToggle(){
    const view=document.getElementById('view');
    const title=document.getElementById('pageTitle');
    const existing=document.querySelector('[data-batu-theme-row]');

    if(!isBatu()||title?.textContent?.trim()!=='Ayarlar'||!view){
      existing?.remove();
      return;
    }

    const section=view.querySelector('.settings-section');
    if(!section||existing)return;

    const row=document.createElement('div');
    row.className='settings-row batu-theme-row';
    row.dataset.batuThemeRow='1';
    row.innerHTML=`<div><div class="settings-row-title">Dark Mode</div><div class="settings-row-desc">Batu için siyah-kömür tema ve özel yıldız kapak görseli.</div></div><div class="batu-theme-control"><span class="batu-theme-only">Sadece Batu</span><button type="button" class="batu-theme-toggle" role="switch" aria-label="Dark Mode" aria-checked="false" data-batu-theme-toggle><span aria-hidden="true"></span></button></div>`;

    const firstRow=section.querySelector('.settings-row');
    if(firstRow)section.insertBefore(row,firstRow);
    else section.append(row);

    row.querySelector('[data-batu-theme-toggle]')?.addEventListener('click',()=>{
      if(!isBatu())return;
      localStorage.setItem(THEME_KEY,darkEnabled()?'0':'1');
      applyTheme();
    });

    syncToggle();
  }

  function refresh(){
    applyTheme();
    injectToggle();
  }

  function scheduleRefresh(){
    if(refreshQueued)return;
    refreshQueued=true;
    requestAnimationFrame(()=>{
      refreshQueued=false;
      refresh();
    });
  }

  const observer=new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});

  window.addEventListener('storage',scheduleRefresh);
  window.addEventListener('focus',scheduleRefresh,{passive:true});
  window.addEventListener('online',scheduleRefresh,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRefresh();});

  refresh();
  setTimeout(refresh,350);
  setTimeout(refresh,1200);
  setTimeout(refresh,3200);

  window.HakunaBatuTheme={
    refresh,
    isBatu,
    setDark(enabled){
      if(!isBatu())return false;
      localStorage.setItem(THEME_KEY,enabled?'1':'0');
      refresh();
      return true;
    }
  };
})();