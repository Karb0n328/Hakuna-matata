(() => {
  'use strict';

  const PROJECT_REF='zyrbbkbwrijnnykbgjvc';
  const AUTH_STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
  const BATU_USER_ID='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
  const THEME_KEY='hakuna.batu.darkMode.v1';
  const DEFAULT_LOGO='./icons/hakuna-brand-v3.png?v=brand-v3';
  const DARK_LOGO='./assets/batu-dark-logo.svg?v=1';

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

  function injectStyles(){
    if(document.getElementById('batuDarkModeStyles'))return;
    const style=document.createElement('style');
    style.id='batuDarkModeStyles';
    style.textContent=`
      .batu-theme-row{position:relative}
      .batu-theme-control{display:flex;align-items:center;gap:10px;flex:0 0 auto}
      .batu-theme-only{display:inline-flex;align-items:center;border:1px solid #dce3ec;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:850;color:#64738a;background:#f8fafc}
      .batu-theme-toggle{width:52px;height:30px;padding:3px;border:0;border-radius:999px;background:#dfe5ed;display:flex;align-items:center;justify-content:flex-start;transition:.18s ease}
      .batu-theme-toggle span{width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 7px rgba(12,24,42,.18);transition:.18s ease}
      .batu-theme-toggle[aria-checked="true"]{background:#111}
      .batu-theme-toggle[aria-checked="true"] span{transform:translateX(22px)}
      .batu-theme-toggle:focus-visible{outline:3px solid rgba(47,126,230,.22);outline-offset:2px}

      html[data-batu-theme="dark"]{
        color-scheme:dark;
        --navy:#000;
        --navy-2:#070707;
        --ink:#f5f5f5;
        --muted:#9b9fa6;
        --line:#2b2d31;
        --bg:#090a0b;
        --card:#121315;
        --blue:#f4f4f4;
        --blue-soft:#1d1f22;
        --cyan-soft:#1b1d20;
        --green:#e3e3e3;
        --green-soft:#1d1f20;
        --amber:#cfcfcf;
        --amber-soft:#202020;
        --red:#bdbdbd;
        --red-soft:#1f1f1f;
        --purple:#d7d7d7;
        --purple-soft:#202124;
        --shadow:none;
      }
      html[data-batu-theme="dark"] body,
      html[data-batu-theme="dark"] .main-area{background:#090a0b!important;color:#f5f5f5!important}
      html[data-batu-theme="dark"] .sidebar{background:#000!important;border-right:1px solid #202226}
      html[data-batu-theme="dark"] .brand-icon{border-radius:10px!important;box-shadow:none!important;object-fit:cover;background:#000}
      html[data-batu-theme="dark"] .brand-subtitle,
      html[data-batu-theme="dark"] .tiny-pill{color:#9b9b9b!important}
      html[data-batu-theme="dark"] .nav-button{color:#a9a9a9!important}
      html[data-batu-theme="dark"] .nav-button:hover{background:#151515!important;color:#fff!important}
      html[data-batu-theme="dark"] .nav-button.active{background:#1c1c1c!important;color:#fff!important;box-shadow:inset 3px 0 0 #fff!important}

      html[data-batu-theme="dark"] .card,
      html[data-batu-theme="dark"] .settings-section,
      html[data-batu-theme="dark"] .list-item,
      html[data-batu-theme="dark"] .summary-box,
      html[data-batu-theme="dark"] .empty-state,
      html[data-batu-theme="dark"] .debt-row,
      html[data-batu-theme="dark"] .hm-mini-row,
      html[data-batu-theme="dark"] .hm-plan-card,
      html[data-batu-theme="dark"] .hm-week-day,
      html[data-batu-theme="dark"] .hm-week-mini,
      html[data-batu-theme="dark"] .hakuna-account-home,
      html[data-batu-theme="dark"] .hakuna-admin-row,
      html[data-batu-theme="dark"] .hakuna-admin-row.header{
        background:#121315!important;
        border-color:#2b2d31!important;
        color:#f5f5f5!important;
        box-shadow:none!important;
      }
      html[data-batu-theme="dark"] .card-title,
      html[data-batu-theme="dark"] .settings-row-title,
      html[data-batu-theme="dark"] .empty-title,
      html[data-batu-theme="dark"] .list-item-title,
      html[data-batu-theme="dark"] .hm-plan-title,
      html[data-batu-theme="dark"] .hm-week-mini strong,
      html[data-batu-theme="dark"] .hakuna-admin-user,
      html[data-batu-theme="dark"] .hakuna-admin-time strong{
        color:#f5f5f5!important;
      }
      html[data-batu-theme="dark"] .card-subtitle,
      html[data-batu-theme="dark"] .settings-row-desc,
      html[data-batu-theme="dark"] .list-item-meta,
      html[data-batu-theme="dark"] .summary-label,
      html[data-batu-theme="dark"] .hm-plan-meta,
      html[data-batu-theme="dark"] .hm-plan-subject,
      html[data-batu-theme="dark"] .hakuna-admin-time span{
        color:#999ea6!important;
      }

      html[data-batu-theme="dark"] .primary-btn{background:#f4f4f4!important;color:#050505!important;box-shadow:none!important}
      html[data-batu-theme="dark"] .secondary-btn,
      html[data-batu-theme="dark"] .ghost-btn,
      html[data-batu-theme="dark"] .pill-btn,
      html[data-batu-theme="dark"] .icon-button,
      html[data-batu-theme="dark"] .date-chip,
      html[data-batu-theme="dark"] .chip,
      html[data-batu-theme="dark"] .circle-check,
      html[data-batu-theme="dark"] .hm-status-btn,
      html[data-batu-theme="dark"] .hm-week-day-head,
      html[data-batu-theme="dark"] .mata-example-list button{
        background:#181a1d!important;
        color:#f0f0f0!important;
        border-color:#303238!important;
        box-shadow:none!important;
      }
      html[data-batu-theme="dark"] .date-chip.active,
      html[data-batu-theme="dark"] .chip.active,
      html[data-batu-theme="dark"] .hm-mode-switch button.active{
        background:#f2f2f2!important;
        color:#070707!important;
        border-color:#f2f2f2!important;
      }
      html[data-batu-theme="dark"] .subject-badge,
      html[data-batu-theme="dark"] .exam-type,
      html[data-batu-theme="dark"] .hakuna-admin-badge{
        background:#202225!important;
        color:#f3f3f3!important;
        border-color:#34363a!important;
      }

      html[data-batu-theme="dark"] .timeline-scroll{background:#0e0f11!important}
      html[data-batu-theme="dark"] .timeline{border-color:#2c2e32!important}
      html[data-batu-theme="dark"] .hour-line{background:#292c31!important}
      html[data-batu-theme="dark"] .half-line{border-color:#202226!important}
      html[data-batu-theme="dark"] .hour-line::before,
      html[data-batu-theme="dark"] .block-time,
      html[data-batu-theme="dark"] .block-meta{color:#92979f!important}
      html[data-batu-theme="dark"] .time-block{
        background:#17191c!important;
        border-color:#32353a!important;
        border-left-color:#8c9198!important;
        color:#f5f5f5!important;
        box-shadow:none!important;
      }
      html[data-batu-theme="dark"] .time-block .block-title{color:#f5f5f5!important}
      html[data-batu-theme="dark"] .status-dot{background:#777!important;box-shadow:0 0 0 3px #17191c!important}
      html[data-batu-theme="dark"] .status-dot.complete{background:#fff!important}
      html[data-batu-theme="dark"] .status-dot.partial{background:#bdbdbd!important}
      html[data-batu-theme="dark"] .status-dot.incomplete{background:#818181!important}
      html[data-batu-theme="dark"] .hm-now-line,
      html[data-batu-theme="dark"] .hm-now-line::before,
      html[data-batu-theme="dark"] .hm-now-label{background:#fff!important;color:#000!important;box-shadow:none!important}

      html[data-batu-theme="dark"] .segmented,
      html[data-batu-theme="dark"] .hm-mode-switch{background:#202226!important}
      html[data-batu-theme="dark"] .segmented button{color:#a2a6ad!important}
      html[data-batu-theme="dark"] .segmented button.active{background:#f2f2f2!important;color:#080808!important}

      html[data-batu-theme="dark"] .field input,
      html[data-batu-theme="dark"] .field select,
      html[data-batu-theme="dark"] .field textarea,
      html[data-batu-theme="dark"] textarea,
      html[data-batu-theme="dark"] input,
      html[data-batu-theme="dark"] select{
        background:#15171a!important;
        color:#f4f4f4!important;
        border-color:#303238!important;
      }
      html[data-batu-theme="dark"] .field label{color:#b0b3b8!important}
      html[data-batu-theme="dark"] input::placeholder,
      html[data-batu-theme="dark"] textarea::placeholder{color:#70747b!important}

      html[data-batu-theme="dark"] .modal-card{background:#0d0e10!important;border-color:#292b2f!important}
      html[data-batu-theme="dark"] .modal-head{background:#121315!important;border-color:#292b2f!important}
      html[data-batu-theme="dark"] .status-option{background:#15171a!important;border-color:#303238!important;color:#f5f5f5!important}
      html[data-batu-theme="dark"] .preview-code{background:#17191c!important;color:#eee!important}

      html[data-batu-theme="dark"] .bottom-nav{background:rgba(5,5,5,.94)!important;border-color:#292b2f!important}
      html[data-batu-theme="dark"] .bottom-nav button{color:#8e9298!important}
      html[data-batu-theme="dark"] .bottom-nav button.active{color:#fff!important}

      html[data-batu-theme="dark"] .mata-chat-head,
      html[data-batu-theme="dark"] .mata-messages,
      html[data-batu-theme="dark"] .mata-input-wrap,
      html[data-batu-theme="dark"] .mata-input-hint,
      html[data-batu-theme="dark"] .mata-intro,
      html[data-batu-theme="dark"] .mata-character,
      html[data-batu-theme="dark"] .mata-proposal{
        background:#121315!important;
        border-color:#2b2d31!important;
        color:#f4f4f4!important;
      }
      html[data-batu-theme="dark"] .mata-message.mata .mata-bubble,
      html[data-batu-theme="dark"] .mata-message.user .mata-bubble,
      html[data-batu-theme="dark"] .mata-proposal-row{
        background:#1c1e21!important;
        color:#f4f4f4!important;
        border-color:#303238!important;
      }
      html[data-batu-theme="dark"] .mata-send{background:#f2f2f2!important;color:#050505!important;box-shadow:none!important}
      html[data-batu-theme="dark"] .mata-name,
      html[data-batu-theme="dark"] .mata-intro-copy strong{color:#f4f4f4!important}
      html[data-batu-theme="dark"] .mata-intro-copy p{color:#a0a4aa!important}

      html[data-batu-theme="dark"] .hm-plan-card.hm-status-complete,
      html[data-batu-theme="dark"] .hm-plan-card.hm-status-partial,
      html[data-batu-theme="dark"] .hm-plan-card.hm-status-incomplete,
      html[data-batu-theme="dark"] .hm-week-mini.hm-status-complete,
      html[data-batu-theme="dark"] .hm-week-mini.hm-status-partial,
      html[data-batu-theme="dark"] .hm-week-mini.hm-status-incomplete,
      html[data-batu-theme="dark"] .week-block.hm-status-complete,
      html[data-batu-theme="dark"] .week-block.hm-status-partial,
      html[data-batu-theme="dark"] .week-block.hm-status-incomplete{
        background:#17191c!important;
        border-color:#34363a!important;
        color:#f0f0f0!important;
        box-shadow:inset 3px 0 0 #aaa!important;
      }
      html[data-batu-theme="dark"] .hm-plan-state span{background:#24262a!important;color:#ddd!important}

      html[data-batu-theme="dark"] .progress-track,
      html[data-batu-theme="dark"] .mini-bar{background:#282a2e!important}
      html[data-batu-theme="dark"] .progress-fill,
      html[data-batu-theme="dark"] .mini-bar > i{background:#eee!important}
      html[data-batu-theme="dark"] svg [fill="#6da6e8"],
      html[data-batu-theme="dark"] svg [fill="#397fdc"]{fill:#eee!important}
      html[data-batu-theme="dark"] svg [stroke="#397fdc"]{stroke:#eee!important}

      html[data-batu-theme="dark"] .toast{background:#f0f0f0!important;color:#080808!important}
      html[data-batu-theme="dark"] .batu-theme-only{background:#202225;color:#ddd;border-color:#34363a}
      html[data-batu-theme="dark"] .batu-theme-toggle{background:#f0f0f0}
      html[data-batu-theme="dark"] .batu-theme-toggle span{background:#050505}
    `;
    document.head.append(style);
  }

  function applyTheme(){
    injectStyles();
    const batu=isBatu();
    const enabled=batu&&localStorage.getItem(THEME_KEY)==='1';
    const root=document.documentElement;
    const logo=document.querySelector('.brand-icon');
    const meta=document.querySelector('meta[name="theme-color"]');

    if(enabled){
      root.dataset.batuTheme='dark';
      if(logo){
        logo.dataset.batuThemeLogo='1';
        if(!logo.src.includes('batu-dark-logo.svg'))logo.src=DARK_LOGO;
      }
      if(meta)meta.content='#000000';
    }else{
      delete root.dataset.batuTheme;
      if(logo?.dataset.batuThemeLogo){
        logo.src=DEFAULT_LOGO;
        delete logo.dataset.batuThemeLogo;
      }
      if(meta)meta.content='#0f1b33';
    }

    if(!batu){
      document.querySelector('[data-batu-theme-row]')?.remove();
    }
    syncToggle();
  }

  function syncToggle(){
    const button=document.querySelector('[data-batu-theme-toggle]');
    if(!button)return;
    const enabled=darkEnabled();
    button.setAttribute('aria-checked',enabled?'true':'false');
    button.title=enabled?'Dark Mode açık':'Dark Mode kapalı';
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
    row.innerHTML=`<div><div class="settings-row-title">Dark Mode</div><div class="settings-row-desc">Sadece Batu için siyah-beyaz görünüm. Açıldığında özel yıldız logosu kullanılır.</div></div><div class="batu-theme-control"><span class="batu-theme-only">Sadece Batu</span><button type="button" class="batu-theme-toggle" role="switch" aria-label="Dark Mode" aria-checked="false" data-batu-theme-toggle><span aria-hidden="true"></span></button></div>`;

    const firstRow=section.querySelector('.settings-row');
    if(firstRow)section.insertBefore(row,firstRow);
    else section.append(row);

    row.querySelector('[data-batu-theme-toggle]')?.addEventListener('click',()=>{
      if(!isBatu())return;
      const next=!darkEnabled();
      localStorage.setItem(THEME_KEY,next?'1':'0');
      applyTheme();
    });

    syncToggle();
  }

  function refresh(){
    applyTheme();
    injectToggle();
  }

  const observer=new MutationObserver(()=>{applyTheme();injectToggle();});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});

  window.addEventListener('storage',refresh);
  window.addEventListener('focus',refresh,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});

  refresh();
  setTimeout(refresh,400);
  setTimeout(refresh,1400);
  setTimeout(refresh,3500);

  window.HakunaBatuTheme={refresh,isBatu,setDark(enabled){if(!isBatu())return false;localStorage.setItem(THEME_KEY,enabled?'1':'0');refresh();return true;}};
})();