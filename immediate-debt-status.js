(() => {
  'use strict';

  const DB_NAME='hakuna-matata-db';
  const DB_VERSION=1;
  const STATE_KEY='state';
  const $=(s,r=document)=>r.querySelector(s);

  let lastBlockId=null;
  let lastPlanKey=null;
  let checking=false;

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

  async function readState(){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('app','readonly');
      const req=tx.objectStore('app').get(STATE_KEY);
      req.onsuccess=()=>{const state=req.result||{};db.close();resolve(state);};
      req.onerror=()=>{db.close();reject(req.error);};
    });
  }

  async function writeState(state){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('app','readwrite');
      tx.objectStore('app').put(state,STATE_KEY);
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>{db.close();reject(tx.error);};
    });
  }

  function normalize(state){
    state.blocks=Array.isArray(state.blocks)?state.blocks:[];
    state.planItems=Array.isArray(state.planItems)?state.planItems:[];
    state.debts=Array.isArray(state.debts)?state.debts:[];
    return state;
  }

  function blockDebt(state,b){
    return state.debts.find(d=>d?.sourceBlockId===b.id || (b.sourceDebtId && d?.id===b.sourceDebtId))||null;
  }
  function planDebt(state,p){
    return state.debts.find(d=>d?.sourcePlanItemId===p.id || (p.sourceDebtId && d?.id===p.sourceDebtId))||null;
  }

  function ensureBlock(state,id,status,remaining){
    const b=state.blocks.find(x=>x.id===id);if(!b)return false;
    let changed=false;
    if(b.status!==status){b.status=status;changed=true;}

    if(status==='complete'){
      const before=state.debts.length;
      state.debts=state.debts.filter(d=>d?.sourceBlockId!==b.id && (!b.sourceDebtId || d?.id!==b.sourceDebtId));
      return changed||state.debts.length!==before;
    }

    if(status!=='partial'&&status!=='incomplete')return changed;
    const hasRemaining=status==='partial' && remaining && Number(remaining.value)>0;
    const hasMetric=Number(b.metricValue)>0;
    const value=hasRemaining?Number(remaining.value):(hasMetric?Number(b.metricValue):duration(b.start,b.end));
    const unit=hasRemaining?(remaining.unit||b.metricUnit||'test'):(hasMetric?(b.metricUnit||'test'):'dakika');
    if(!(value>0))return changed;

    let d=blockDebt(state,b);
    if(!d){
      d={id:uid('debt'),title:b.title||'Çalışma',subject:b.subject||'Diğer',value,unit,sourceBlockId:b.id,sourceDate:b.date,createdAt:new Date().toISOString()};
      state.debts.push(d);changed=true;
    }else{
      if(d.value!==value){d.value=value;changed=true;}
      if(d.unit!==unit){d.unit=unit;changed=true;}
      if(d.title!==b.title){d.title=b.title;changed=true;}
      if(d.subject!==b.subject){d.subject=b.subject;changed=true;}
      if(!b.sourceDebtId && d.sourceBlockId!==b.id){d.sourceBlockId=b.id;changed=true;}
      if(d.sourceDate!==b.date){d.sourceDate=b.date;changed=true;}
    }
    return changed;
  }

  function ensurePlan(state,key,status,remaining){
    const [kind,id]=String(key||'').split(':');if(kind!=='plan'||!id)return false;
    const p=state.planItems.find(x=>x.id===id);if(!p)return false;
    let changed=false;
    if(p.status!==status){p.status=status;changed=true;}

    if(status==='complete'){
      const before=state.debts.length;
      state.debts=state.debts.filter(d=>d?.sourcePlanItemId!==p.id && (!p.sourceDebtId || d?.id!==p.sourceDebtId));
      return changed||state.debts.length!==before;
    }

    if(status!=='partial'&&status!=='incomplete')return changed;
    const hasRemaining=status==='partial' && remaining && Number(remaining.value)>0;
    const hasMetric=Number(p.metricValue)>0;
    const value=hasRemaining?Number(remaining.value):(hasMetric?Number(p.metricValue):1);
    const unit=hasRemaining?(remaining.unit||p.metricUnit||'test'):(p.metricUnit||'test');
    if(!(value>0))return changed;

    let d=planDebt(state,p);
    if(!d){
      d={id:uid('debt'),title:p.title||'Çalışma',subject:p.subject||'Diğer',value,unit,sourcePlanItemId:p.id,sourceDate:p.date,createdAt:new Date().toISOString()};
      state.debts.push(d);changed=true;
    }else{
      if(d.value!==value){d.value=value;changed=true;}
      if(d.unit!==unit){d.unit=unit;changed=true;}
      if(d.title!==p.title){d.title=p.title;changed=true;}
      if(d.subject!==p.subject){d.subject=p.subject;changed=true;}
      if(!p.sourceDebtId && d.sourcePlanItemId!==p.id){d.sourcePlanItemId=p.id;changed=true;}
      if(d.sourceDate!==p.date){d.sourceDate=p.date;changed=true;}
    }
    return changed;
  }

  function rememberPage(){
    const title=$('#pageTitle')?.textContent?.trim();
    if(title==='Plan')sessionStorage.setItem('hakuna.immediateDebtReturn','plan');
    else sessionStorage.removeItem('hakuna.immediateDebtReturn');
  }

  async function verify(kind,key,status,remaining=null){
    if(checking)return;
    checking=true;
    try{
      const state=normalize(await readState());
      const changed=kind==='block'?ensureBlock(state,key,status,remaining):ensurePlan(state,key,status,remaining);
      if(!changed)return;

      // Normal uygulama akışı bir şeyi kaçırdıysa yalnız o zaman yedek düzeltme yap.
      // Rutin her kayıtta sayfayı yenilemek artık yok.
      await writeState(state);
      rememberPage();
      sessionStorage.setItem('hakuna.fallbackSync','1');
      setTimeout(()=>location.reload(),20);
    }catch(err){
      console.warn('Hakuna debt verification',err);
    }finally{
      checking=false;
    }
  }

  function later(fn){setTimeout(fn,360);}

  document.addEventListener('click',e=>{
    const block=e.target.closest?.('[data-block-id],[data-plan-block]');
    if(block){lastBlockId=block.dataset.blockId||block.dataset.planBlock||lastBlockId;return;}

    const oldStatus=e.target.closest?.('[data-status]');
    if(oldStatus && lastBlockId){
      const status=oldStatus.dataset.status;
      if(status==='complete'||status==='incomplete')later(()=>verify('block',lastBlockId,status));
      return;
    }

    const cardStatus=e.target.closest?.('[data-hm-status]');
    if(cardStatus){
      const card=cardStatus.closest('[data-hm-item]');
      if(card)lastPlanKey=card.dataset.hmItem;
      const status=cardStatus.dataset.hmStatus;
      if((status==='complete'||status==='incomplete')&&lastPlanKey)later(()=>verify('plan',lastPlanKey,status));
    }
  },true);

  document.addEventListener('submit',e=>{
    if(e.target?.id==='partialForm' && lastBlockId){
      const fd=new FormData(e.target);
      const remaining={value:Number(fd.get('value')),unit:String(fd.get('unit')||'test')};
      later(()=>verify('block',lastBlockId,'partial',remaining));
      return;
    }
    if(e.target?.id==='hmPartialForm' && lastPlanKey){
      const fd=new FormData(e.target);
      const remaining={value:Number(fd.get('value')),unit:String(fd.get('unit')||'test')};
      later(()=>verify('plan',lastPlanKey,'partial',remaining));
    }
  },true);

  function restorePage(){
    const fallback=sessionStorage.getItem('hakuna.fallbackSync')==='1';
    sessionStorage.removeItem('hakuna.fallbackSync');
    if(!fallback || sessionStorage.getItem('hakuna.immediateDebtReturn')!=='plan')return;
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
