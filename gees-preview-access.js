/* GEES private visual preview: only the authorized Batu account. */
(()=>{
  const BATU='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
  const STORAGE='sb-zyrbbkbwrijnnykbgjvc-auth-token';
  let applied=false;
  function eligible(){
    try{const s=JSON.parse(localStorage.getItem(STORAGE)||'null');return s?.user?.id===BATU&&!!s?.access_token;}catch{return false;}
  }
  function update(){
    const yes=eligible();
    if(yes&&!applied){
      applied=true;
      const link=document.createElement('link');link.rel='stylesheet';link.href='./gees-design.css?v=2';link.id='gees-private-styles';document.head.append(link);
      document.documentElement.dataset.geesPreview='true';
    }else if(!yes&&applied){
      applied=false;document.getElementById('gees-private-styles')?.remove();delete document.documentElement.dataset.geesPreview;
    }
  }
  update();window.addEventListener('storage',update);window.addEventListener('focus',update);setInterval(update,2500);
})();