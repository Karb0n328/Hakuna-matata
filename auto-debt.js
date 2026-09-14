const DB_NAME='hakuna-matata-db';
const DB_VERSION=1;
const STATE_KEY='state';

function todayISO(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function uid(prefix='debt'){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}
function minute(t){
  const [h,m]=String(t||'00:00').split(':').map(Number);
  return (h||0)*60+(m||0);
}
function duration(start,end){
  return Math.max(0,minute(end)-minute(start));
}
function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains('app'))req.result.createObjectStore('app');
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function readState(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('app','readonly');
    const req=tx.objectStore('app').get(STATE_KEY);
    req.onsuccess=()=>resolve({db,state:req.result||null});
    req.onerror=()=>{db.close();reject(req.error);};
  });
}
async function writeState(db,state){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('app','readwrite');
    tx.objectStore('app').put(state,STATE_KEY);
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onerror=()=>{db.close();reject(tx.error);};
  });
}

export async function reconcilePastIncompleteBlocks(){
  let holder;
  try{holder=await readState();}catch{return 0;}
  const {db,state}=holder;
  if(!state){db.close();return 0;}

  state.blocks=Array.isArray(state.blocks)?state.blocks:[];
  state.debts=Array.isArray(state.debts)?state.debts:[];
  const today=todayISO();
  let moved=0;

  for(const block of state.blocks){
    if(!block?.date || block.date>=today)continue;
    if(block.status && block.status!=='pending')continue;

    block.status='incomplete';
    moved++;

    const linked=state.debts.find(d=>
      d?.sourceBlockId===block.id || (block.sourceDebtId && d?.id===block.sourceDebtId)
    );

    const hasMetric=Number(block.metricValue)>0;
    const value=hasMetric?Number(block.metricValue):duration(block.start,block.end);
    const unit=hasMetric?(block.metricUnit||'test'):'dakika';

    if(linked){
      linked.title=block.title||linked.title;
      linked.subject=block.subject||linked.subject;
      if(!block.sourceDebtId){
        linked.value=value;
        linked.unit=unit;
        linked.sourceBlockId=block.id;
        linked.sourceDate=block.date;
      }
      continue;
    }

    if(value>0){
      state.debts.push({
        id:uid('debt'),
        title:block.title||'Tamamlanmayan çalışma',
        subject:block.subject||'Diğer',
        value,
        unit,
        sourceBlockId:block.id,
        sourceDate:block.date,
        createdAt:new Date().toISOString()
      });
    }
  }

  if(!moved){db.close();return 0;}
  await writeState(db,state);
  return moved;
}

await reconcilePastIncompleteBlocks();

let checking=false;
async function liveCheck(){
  if(checking || document.visibilityState==='hidden')return;
  checking=true;
  try{
    const moved=await reconcilePastIncompleteBlocks();
    if(moved>0)location.reload();
  }finally{checking=false;}
}

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')liveCheck();
});
setInterval(liveCheck,60_000);
