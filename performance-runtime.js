(() => {
  'use strict';

  const $ = (s, r=document) => r.querySelector(s);
  let releaseTimer = 0;
  let heldHeight = 0;
  let queuedRelease = false;

  function installObserverGuard(){
    const Native=window.MutationObserver;
    if(!Native||Native.__hakunaPerfGuard)return;
    class HakunaMutationObserver extends Native{
      observe(target,options){
        const id=target?.id;
        if((id==='view'||id==='modalRoot')&&options?.childList&&options?.subtree){
          return super.observe(target,{...options,subtree:false});
        }
        return super.observe(target,options);
      }
    }
    HakunaMutationObserver.__hakunaPerfGuard=true;
    HakunaMutationObserver.__hakunaNative=Native;
    window.MutationObserver=HakunaMutationObserver;
  }

  installObserverGuard();

  function view(){ return $('#view'); }

  function holdSurface(){
    const v=view();
    if(!v) return;
    const h=Math.ceil(v.getBoundingClientRect().height);
    if(h>0){
      heldHeight=h;
      v.style.minHeight=`${h}px`;
    }
    document.documentElement.classList.add('hm-route-switching');
    clearTimeout(releaseTimer);
    releaseTimer=setTimeout(releaseSurface,240);
  }

  function releaseSurface(){
    clearTimeout(releaseTimer);
    releaseTimer=0;
    const v=view();
    if(v && heldHeight){
      const current=Math.ceil(v.getBoundingClientRect().height);
      if(current>=heldHeight*0.72 || !document.documentElement.classList.contains('hm-route-switching')){
        v.style.minHeight='';
        heldHeight=0;
      }
    }
    document.documentElement.classList.remove('hm-route-switching');
  }

  function releaseAfterPaint(){
    if(queuedRelease) return;
    queuedRelease=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      queuedRelease=false;
      releaseSurface();
    }));
  }

  function isRouteTarget(el){
    return !!el.closest?.('[data-nav],[data-mata-nav],[data-task-tab],[data-open-debts],[data-open-tasks],[data-week-day],[data-hm-select-day]');
  }

  function isDataMutation(el){
    const target=el.closest?.('button,[role="button"],input[type="submit"]');
    if(!target) return false;
    if(target.matches('[data-status],[data-hm-status],[data-task-check],[data-q-toggle],[data-q-delete],[data-delete-debt],[data-delete-task],[data-reset],[data-mata-apply]')) return true;
    return [...(target.getAttributeNames?.()||[])].some(a=>/^(data-delete-|data-complete-|data-toggle-)/.test(a));
  }

  document.addEventListener('pointerdown',e=>{
    if(isRouteTarget(e.target)) holdSurface();
  },{capture:true,passive:true});

  document.addEventListener('click',e=>{
    if(isDataMutation(e.target)) holdSurface();
  },true);

  document.addEventListener('submit',e=>{
    if(e.target instanceof HTMLFormElement && (e.target.closest('#modalRoot') || e.target.matches('[data-debt-edit-form]'))) holdSurface();
  },true);

  document.addEventListener('hakuna:ui-stabilize',holdSurface);

  function initObserver(){
    const v=view();
    if(!v) return;
    new MutationObserver(()=>{
      if(document.documentElement.classList.contains('hm-route-switching')) releaseAfterPaint();
    }).observe(v,{childList:true});
  }

  function init(){
    initObserver();
    document.documentElement.classList.add('hm-performance-ready');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
