const COPY='Hesabın bağlıysa verilerin bulutla senkronlanır. İstersen ayrıca bu cihazdan JSON yedeği alabilirsin.';

function patchBackupCopy(){
  const titles=[...document.querySelectorAll('#view .card-title')];
  const title=titles.find(el=>el.textContent.trim().toLocaleLowerCase('tr-TR').includes('veri yedekle'));
  const card=title?.closest('.card');
  if(!card)return;

  const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    const text=(node.nodeValue||'').trim();
    const lower=text.toLocaleLowerCase('tr-TR');
    if(lower.includes('bulut')&&(lower.includes('yok')||lower.includes('yedek'))){
      if(text!==COPY)node.nodeValue=COPY;
      return;
    }
  }
}

const view=document.querySelector('#view');
if(view){
  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      patchBackupCopy();
    });
  };
  new MutationObserver(schedule).observe(view,{childList:true});
  schedule();
}
