(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  const $=(s,r=document)=>r.querySelector(s);

  let lastBlockId=null;
  let lastPlanKey=null;
  let syncing=false;

  const uid=(p='debt')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const minute=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return (h||0)*60+(m||0);};
  const duration=(a,b)=>Math.max(0,minute(b)-minute(a));

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('app'))req.result.createObjectStore('app');};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function mutateState(fn){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('app','readwrite');
      const store=tx.objectStore('app');
      const req=store.get(STATE_KEY);
      req.onsuccess=()=>{
        const state=req.result||{};
        state.blocks=Array.isArray(state.blocks)?state.blocks:[];
        state.planItems=Array.isArray(state.planItems)?state.planItems:[];
        state.debts=Array.isArray(state.debts)?state.debts:[];
        try{fn(state);}catch(err){tx.abort();db.close();reject(err);return;}
        store.put(state,STATE_KEY);
      };
      req.onerror=()=>{try{tx.abort();}catch{};db.close();reject(req.error);};
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>{db.close();reject(tx.error);};
      tx.onabort=()=>{db.close();};
    });
  }

  function linkedBlockDebt(state,b){
    return state.debts.find(d=>d?.sourceBlockId===b.id || (b.sourceDebtId && d?.id===b.sourceDebtId))||null;
  }

  function linkedPlanDebt(state,p){
    return state.debts.find(d=>d?.sourcePlanItemId===p.id || (p.sourceDebtId && d?.id===p.sourceDebtId))||null;
  }

  function removeBlockDebt(state,b){
    state.debts=state.debts.filter(d=>d?.sourceBlockId!==b.id && (!b.sourceDebtId || d?.id!==b.sourceDebtId));
  }

  function removePlanDebt(state,p){
    state.debts=state.debts.filter(d=>d?.sourcePlanItemId!==p.id && (!p.sourceDebtId || d?.id!==p.sourceDebtId));
  }

  function upsertBlockDebt(state,b,remaining){
    const hasRemaining=remaining && Number(remaining.value)>0;
    const hasMetric=Number(b.metricValue)>0;
    const value=hasRemaining?Number(remaining.value):(hasMetric?Number(b.metricValue):duration(b.start,b.end));
    const unit=hasRemaining?(remaining.unit||b.metricUnit||'test'):(hasMetric?(b.metricUnit||'test'):'dakika');
    if(!(value>0))return;
    let d=linkedBlockDebt(state,b);
    if(!d){
      d={id:uid('debt'),title:b.title||'Çalışma',subject:b.subject||'Diğer',value,unit,sourceBlockId:b.id,sourceDate:b.date,createdAt:new Date().toISOString()};
      state.debts.push(d);
    }else{
      d.title=b.title||d.title;
      d.subject=b.subject||d.subject;
      d.value=value;
      d.unit=unit;
      if(!b.sourceDebtId)d.sourceBlockId=b.id;
      d.sourceDate=b.date||d.sourceDate;
    }
  }

  function upsertPlanDebt(state,p,remaining){
    const hasRemaining=remaining && Number(remaining.value)>0;
    const hasMetric=Number(p.metricValue)>0;
    const value=hasRemaining?Number(remaining.value):(hasMetric?Number(p.metricValue):1);
    const unit=hasRemaining?(remaining.unit||p.metricUnit||'test'):(p.metricUnit||'test');
    if(!(value>0))return;
    let d=linkedPlanDebt(state,p);
    if(!d){
      d={id:uid('debt'),title:p.title||'Çalışma',subject:p.subject||'Diğer',value,unit,sourcePlanItemId:p.id,sourceDate:p.date,createdAt:new Date().toISOString()};
      state.debts.push(d);
    }else{
      d.title=p.title||d.title;
      d.subject=p.subject||d.subject;
      d.value=value;
      d.unit=unit;
      if(!p.sourceDebtId)d.sourcePlanItemId=p.id;
      d.sourceDate=p.date||d.sourceDate;
    }
  }

  async function syncBlock(id,status,remaining=null){
    if(!id)return;
    await mutateState(state=>{
      const b=state.blocks.find(x=>x.id===id);
      if(!b)return;
      b.status=status;
      if(status==='complete')removeBlockDebt(state,b);
      else if(status==='partial'||status==='incomplete')upsertBlockDebt(state,b,status==='partial'?remaining:null);
    });
  }

  async function syncPlan(key,status,remaining=null){
    if(!key)return;
    const [kind,id]=String(key).split(':');
    if(kind!=='plan'||!id)return;
    await mutateState(state=>{
      const p=state.planItems.find(x=>x.id===id);
      if(!p)return;
      p.status=status;
      if(status==='complete')removePlanDebt(state,p);
      else if(status==='partial'||status==='incomplete')upsertPlanDebt(state,p,status==='partial'?remaining:null);
    });
  }

  function rememberPage(){
    const title=$('#pageTitle')?.textContent?.trim();
    if(title==='Plan')sessionStorage.setItem('hakuna.immediateDebtReturn','plan');
    else sessionStorage.removeItem('hakuna.immediateDebtReturn');
  }

  async function finish(work){
    if(syncing)return;
    syncing=true;
    rememberPage();
    try{await work();}catch(err){console.warn('Hakuna immediate debt sync',err);}
    setTimeout(()=>location.reload(),40);
  }

  document.addEventListener('click',e=>{
    const block=e.target.closest?.('[data-block-id],[data-plan-block]');
    if(block){lastBlockId=block.dataset.blockId||block.dataset.planBlock||lastBlockId;return;}

    const oldStatus=e.target.closest?.('[data-status]');
    if(oldStatus && lastBlockId){
      const status=oldStatus.dataset.status;
      if(status==='complete'||status==='incomplete'){
        setTimeout(()=>finish(()=>syncBlock(lastBlockId,status)),120);
      }
      return;
    }

    const cardStatus=e.target.closest?.('[data-hm-status]');
    if(cardStatus){
      const card=cardStatus.closest('[data-hm-item]');
      if(card)lastPlanKey=card.dataset.hmItem;
      const status=cardStatus.dataset.hmStatus;
      if((status==='complete'||status==='incomplete')&&lastPlanKey){
        setTimeout(()=>finish(()=>syncPlan(lastPlanKey,status)),120);
      }
    }
  },true);

  document.addEventListener('submit',e=>{
    if(e.target?.id==='partialForm' && lastBlockId){
      const fd=new FormData(e.target);
      const remaining={value:Number(fd.get('value')),unit:String(fd.get('unit')||'test')};
      setTimeout(()=>finish(()=>syncBlock(lastBlockId,'partial',remaining)),140);
      return;
    }
    if(e.target?.id==='hmPartialForm' && lastPlanKey){
      const fd=new FormData(e.target);
      const remaining={value:Number(fd.get('value')),unit:String(fd.get('unit')||'test')};
      setTimeout(()=>finish(()=>syncPlan(lastPlanKey,'partial',remaining)),140);
    }
  },true);

  function restorePage(){
    if(sessionStorage.getItem('hakuna.immediateDebtReturn')!=='plan')return;
    sessionStorage.removeItem('hakuna.immediateDebtReturn');
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const btn=document.querySelector('[data-nav="plan"]');
      if(btn){clearInterval(timer);btn.click();}
      else if(tries>40)clearInterval(timer);
    },80);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restorePage);
  else restorePage();
})();
