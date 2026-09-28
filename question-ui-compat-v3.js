(() => {
  'use strict';

  const BOUND='qCompatBound';
  const TAP='qCompatTap';

  function normalize(){
    const rows=[...document.querySelectorAll('[data-question-row], .question-row')];
    for(const row of rows){
      const wrap=row.closest('[data-question-wrap], .question-swipe-wrap, .debt-wrap') || row.parentElement;
      if(!wrap)continue;
      const del=wrap.querySelector('[data-q-swipe-delete]');
      if(!del)continue;

      wrap.classList.add('debt-wrap','question-swipe-wrap');
      row.classList.add('debt-row','question-row');
      del.classList.add('debt-delete-bg','question-delete-bg');

      const edit=row.querySelector('[data-q-edit]');
      if(edit){
        edit.hidden=true;
        edit.setAttribute('aria-hidden','true');
        edit.tabIndex=-1;
      }

      if(!row.dataset[BOUND]){
        row.dataset[BOUND]='1';
        bindTouchSwipe(row);
      }

      if(!row.dataset[TAP]){
        row.dataset[TAP]='1';
        row.addEventListener('click',e=>{
          if(e.target.closest('button,[data-q-swipe-delete]'))return;
          if(row.dataset.qDidSwipe==='1'){
            row.dataset.qDidSwipe='0';
            return;
          }
          const transform=row.style.transform||'';
          if(transform && transform!=='translateX(0px)' && transform!=='translateX(0)')return;
          const hiddenEdit=row.querySelector('[data-q-edit]');
          if(hiddenEdit){
            e.preventDefault();
            e.stopPropagation();
            hiddenEdit.click();
          }
        });
      }
    }
  }

  function bindTouchSwipe(row){
    let startX=0,startY=0,current=0,horizontal=false;

    row.addEventListener('touchstart',e=>{
      const t=e.touches?.[0];
      if(!t)return;
      startX=t.clientX;
      startY=t.clientY;
      current=0;
      horizontal=false;
      row.dataset.qDidSwipe='0';
    },{passive:true});

    row.addEventListener('touchmove',e=>{
      const t=e.touches?.[0];
      if(!t)return;
      const dx=t.clientX-startX;
      const dy=t.clientY-startY;
      if(!horizontal){
        if(Math.abs(dx)<7)return;
        if(Math.abs(dx)<=Math.abs(dy))return;
        horizontal=true;
      }
      if(!horizontal)return;
      current=Math.max(0,Math.min(86,dx));
      if(current>3)row.dataset.qDidSwipe='1';
      row.style.transform='translateX('+current+'px)';
      if(e.cancelable)e.preventDefault();
    },{passive:false});

    row.addEventListener('touchend',()=>{
      if(!horizontal)return;
      current=current>45?86:0;
      row.style.transform='translateX('+current+'px)';
      setTimeout(()=>{if(current===0)row.dataset.qDidSwipe='0';},0);
    },{passive:true});

    row.addEventListener('touchcancel',()=>{
      horizontal=false;
      current=0;
      row.style.transform='translateX(0)';
      row.dataset.qDidSwipe='0';
    },{passive:true});
  }

  function init(){
    normalize();
    const target=document.getElementById('view')||document.body;
    new MutationObserver(()=>normalize()).observe(target,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();