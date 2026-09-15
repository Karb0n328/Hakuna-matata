(() => {
  'use strict';

  let overlay=null;
  let releaseTimer=null;
  let maxTimer=null;
  let armed=false;
  let sawMutation=false;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function stripIds(root){
    if(root.id)root.removeAttribute('id');
    root.querySelectorAll?.('[id]').forEach(el=>el.removeAttribute('id'));
    root.querySelectorAll?.('[name]').forEach(el=>el.removeAttribute('name'));
  }

  function copyScrollPositions(source,clone){
    const src=[source,...source.querySelectorAll('*')];
    const dst=[clone,...clone.querySelectorAll('*')];
    const n=Math.min(src.length,dst.length);
    for(let i=0;i<n;i++){
      if(src[i].scrollTop)dst[i].scrollTop=src[i].scrollTop;
      if(src[i].scrollLeft)dst[i].scrollLeft=src[i].scrollLeft;
    }
  }

  function release(){
    clearTimeout(releaseTimer);
    clearTimeout(maxTimer);
    releaseTimer=maxTimer=null;
    armed=false;
    sawMutation=false;
    document.documentElement.classList.remove('hm-ui-stabilizing');
    if(!overlay)return;
    const old=overlay;
    overlay=null;
    old.style.opacity='0';
    setTimeout(()=>old.remove(),90);
  }

  function scheduleRelease(delay=150){
    clearTimeout(releaseTimer);
    releaseTimer=setTimeout(release,delay);
  }

  function arm(){
    if(armed){
      clearTimeout(maxTimer);
      maxTimer=setTimeout(release,850);
      return;
    }
    const main=$('.main-area');
    if(!main)return;

    const rect=main.getBoundingClientRect();
    if(rect.width<1||rect.height<1)return;

    const clone=main.cloneNode(true);
    stripIds(clone);
    clone.setAttribute('aria-hidden','true');
    clone.classList.add('hm-stable-snapshot');
    Object.assign(clone.style,{
      position:'fixed',
      left:`${rect.left}px`,
      top:`${rect.top}px`,
      width:`${rect.width}px`,
      height:`${rect.height}px`,
      margin:'0',
      zIndex:'39',
      pointerEvents:'none',
      overflow:'hidden',
      background:getComputedStyle(document.body).backgroundColor||'#f5f7fb',
      transition:'opacity 80ms ease',
      opacity:'1'
    });
    document.body.appendChild(clone);
    copyScrollPositions(main,clone);

    overlay=clone;
    armed=true;
    sawMutation=false;
    document.documentElement.classList.add('hm-ui-stabilizing');

    clearTimeout(maxTimer);
    maxTimer=setTimeout(release,850);
    // Eğer işlem doğrulamada kalır veya kullanıcı vazgeçerse görüntüyü kilitleme.
    scheduleRelease(460);
  }

  function isMutatingClick(target){
    const el=target.closest?.('button,[role="button"]');
    if(!el)return false;
    if(el.matches('[data-status],[data-hm-status],[data-task-check],[data-q-delete],[data-hm-delete],[data-reset]'))return true;
    if(el.matches('[data-date-step],[data-go-today],[data-hm-date-step],[data-hm-today]'))return true;
    for(const attr of el.getAttributeNames?.()||[]){
      if(attr.startsWith('data-delete-'))return true;
      if(attr.startsWith('data-complete-'))return true;
      if(attr.startsWith('data-toggle-'))return true;
    }
    return false;
  }

  document.addEventListener('click',e=>{
    if(isMutatingClick(e.target))arm();
  },true);

  document.addEventListener('submit',e=>{
    const form=e.target;
    if(!(form instanceof HTMLFormElement))return;
    // Kayıt yapan modalların tümünde çalışır; Mata sohbet formuna karışmaz.
    if(form.closest('#modalRoot'))arm();
  },true);

  document.addEventListener('hakuna:ui-stabilize',arm);

  function initObserver(){
    const view=$('#view');
    const actions=$('#topbarActions');
    if(!view)return;
    const observer=new MutationObserver(()=>{
      if(!armed)return;
      sawMutation=true;
      // Birden fazla yardımcı modül aynı kayıttan sonra DOM'u peş peşe düzenliyor.
      // Son değişiklikten kısa süre sonra eski görüntüyü kaldırıyoruz.
      scheduleRelease(170);
    });
    observer.observe(view,{childList:true,subtree:true,characterData:true});
    if(actions)observer.observe(actions,{childList:true,subtree:true,characterData:true});
  }

  const style=document.createElement('style');
  style.textContent=`
    html.hm-ui-stabilizing *{animation-duration:0s!important;transition-duration:0s!important}
    .hm-stable-snapshot{box-sizing:border-box}
    .hm-stable-snapshot *{pointer-events:none!important}
  `;
  document.head.appendChild(style);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initObserver);
  else initObserver();
})();
