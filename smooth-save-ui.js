(() => {
  'use strict';

  let timer=0;

  function stabilize(){
    const view=document.querySelector('#view');
    if(!view)return;
    const h=Math.ceil(view.getBoundingClientRect().height);
    if(h>0)view.style.minHeight=`${h}px`;
    document.documentElement.classList.add('hm-route-switching');
    clearTimeout(timer);
    timer=setTimeout(()=>{
      view.style.minHeight='';
      document.documentElement.classList.remove('hm-route-switching');
    },180);
  }

  document.addEventListener('hakuna:ui-stabilize',stabilize);
})();
