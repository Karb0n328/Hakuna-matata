(() => {
  'use strict';

  const PROFILE_KEY='hakuna.cloud.profile';
  const FALLBACK='Planla. Bitir. Devam et.';
  let lastText='';
  let delayedTimer=0;

  function getActiveUserId(){
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||'';
        if(!/^sb-.*-auth-token$/.test(key))continue;
        const raw=localStorage.getItem(key);if(!raw)continue;
        const parsed=JSON.parse(raw);
        const id=parsed?.user?.id||parsed?.currentSession?.user?.id||parsed?.session?.user?.id;
        if(id)return String(id);
      }
    }catch{}
    return null;
  }

  function getProfile(){
    try{
      const raw=localStorage.getItem(PROFILE_KEY);if(!raw)return null;
      const profile=JSON.parse(raw);
      if(!profile?.username||!profile?.userId)return null;
      const activeId=getActiveUserId();
      if(!activeId||String(profile.userId)!==activeId)return null;
      return profile;
    }catch{return null;}
  }

  function prettyUsername(username){
    return String(username||'').replace(/[._-]+/g,' ').replace(/\s+/g,' ').trim().split(' ').filter(Boolean)
      .map(part=>part.charAt(0).toLocaleUpperCase('tr-TR')+part.slice(1)).join(' ');
  }

  function render(){
    const el=document.querySelector('.brand-subtitle');if(!el)return;
    const profile=getProfile();
    const name=profile?prettyUsername(profile.username):'';
    const text=name?`Hoş geldin, ${name} 👋`:FALLBACK;
    if(text===lastText&&el.textContent===text)return;
    lastText=text;
    el.textContent=text;
    el.classList.toggle('brand-welcome',Boolean(name));
    if(profile?.username)el.title=`@${profile.username}`;else el.removeAttribute('title');
  }

  function renderSoon(delay=0){
    clearTimeout(delayedTimer);
    delayedTimer=setTimeout(render,delay);
  }

  function injectStyle(){
    if(document.getElementById('hakunaSidebarWelcomeStyle'))return;
    const style=document.createElement('style');
    style.id='hakunaSidebarWelcomeStyle';
    style.textContent='.brand-subtitle.brand-welcome{font-weight:750;letter-spacing:-.01em;opacity:.96}';
    document.head.appendChild(style);
  }

  function start(){
    injectStyle();
    render();
    window.addEventListener('storage',render);
    window.addEventListener('focus',render);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
    document.addEventListener('submit',e=>{
      if(e.target?.closest?.('.hakuna-cloud-modal'))renderSoon(900);
    },true);
    document.addEventListener('click',e=>{
      const b=e.target.closest?.('button');
      if(!b)return;
      const text=(b.textContent||'').toLocaleLowerCase('tr-TR');
      if(text.includes('çıkış')||text.includes('giriş')||text.includes('kayıt'))renderSoon(900);
    },true);
    document.addEventListener('hakuna:account-changed',()=>renderSoon(0));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
