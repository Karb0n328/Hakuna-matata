const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const copy=v=>JSON.parse(JSON.stringify(v));
// Deterministic IDB contract double; browser integration is a separate release check.
function database(initial){
  let stored=copy(initial),writes=0,failWrite=false;
  const db={objectStoreNames:{contains:()=>true},transaction(){
    let aborted=false,pending=0,staged,hasPut=false;
    const tx={error:null,abort(){aborted=true;setImmediate(()=>tx.onabort?.());},objectStore(){return {
      get(){const req={};pending++;setImmediate(()=>{if(aborted)return;req.result=copy(stored);req.onsuccess?.();pending--;setImmediate(()=>{if(!pending&&!aborted){if(hasPut){stored=copy(staged);writes++;}tx.oncomplete?.();}});});return req;},
      put(value){if(failWrite){tx.error=new Error('disk failure');tx.abort();return;}staged=copy(value);hasPut=true;}
    };}};return tx;
  }};
  return {api:{open(){const req={};setImmediate(()=>{req.result=db;req.onsuccess?.();});return req;}},get:()=>copy(stored),replace:v=>stored=copy(v),writes:()=>writes,fail:()=>failWrite=true};
}
async function setup(){
  let account='a';
  const state={blocks:[],planItems:[],tasks:[],debts:[],questions:[],exams:[],settings:{},assistantMessages:[],selectedDate:'2026-09-22'};
  const db=database(state),box={window:{},console,indexedDB:db.api,localStorage:{getItem:()=>account}};
  vm.createContext(box);
  for(const file of ['mata-core-v2.js','mata-nlu-v2.js','mata-actions-v4.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),box);
  const M=box.window.HakunaMataV2;await M.openDB();
  return {M,A:M.actionsV4,state,db,switchAccount:()=>account='b'};
}
const data={
  blocks:{title:'Türev',subject:'Matematik',date:'2026-09-22',start:'09:00',end:'10:00'},
  planItems:{title:'Türev kartı',subject:'Matematik',date:'2026-09-22',metricValue:4,metricUnit:'test'},
  tasks:{title:'Problem',subject:'Matematik',value:5,unit:'test'},
  debts:{title:'Kalan test',subject:'Matematik',value:3,unit:'test'},
  questions:{subject:'Matematik',source:'Orijinal',reference:'Test 7 / Soru 4',topic:'Türev'},
  exams:{type:'TYT',name:'Deneme 1',date:'2026-09-22',rows:[{subject:'Türkçe',correct:35,wrong:5,blank:0}]}
};
const add=(collection,patch={})=>({type:'record',op:'add',collection,data:{...data[collection],...patch}});
const action=(collection,op,before,extra={})=>({type:'record',collection,op,before,...extra});
for(const k of Object.keys(data))test(`${k}: add, edit, duplicate, delete without mutating input`,async()=>{
  const {A,state}=await setup(),before=JSON.stringify(state);
  const s=A.reduce(state,[add(k)]);assert.equal(s[k].length,1);assert.equal(JSON.stringify(state),before);
  const field=k==='exams'?'name':k==='questions'?'reference':'title';
  const edited=A.reduce(s,[action(k,'edit',s[k][0],{data:{[field]:'Yeni değer'}})]);assert.equal(edited[k][0][field],'Yeni değer');
  const patch=k==='blocks'?{date:'2026-09-23'}:{};
  const doubled=A.reduce(edited,[action(k,'duplicate',edited[k][0],{data:patch})]);assert.equal(doubled[k].length,2);assert.notEqual(doubled[k][0].id,doubled[k][1].id);
  const removed=A.reduce(doubled,[action(k,'delete',doubled[k][0])]);assert.equal(removed[k].length,1);
});
test('legacy conversation actions enter shared reducer',async()=>{const {M,A,state}=await setup();const result=M.parseRequest(state,'Yarın 09:00-09:50 matematik ekle');assert.equal(A.reduce(state,result.actions).blocks.length,1);});
test('preview is immutable and makes no writes',async()=>{const {A,state,db}=await setup();const t=A.prepare(state,[add('questions')]);assert.ok(Object.isFrozen(t));assert.ok(t.rows[0].includes('Orijinal'));assert.equal(db.writes(),0);assert.equal(state.questions.length,0);});
test('commit requires actual ticket and applies once',async()=>{const {A,state,db}=await setup();await assert.rejects(A.commit({}),/geçersiz/);const t=A.prepare(state,[add('tasks')]);const [one,two]=await Promise.allSettled([A.commit(t),A.commit(t)]);assert.equal(one.status,'fulfilled');assert.equal(two.status,'rejected');assert.equal(db.get().tasks.length,1);assert.equal(db.writes(),1);});
test('account switch invalidates preview',async()=>{const {A,state,switchAccount,db}=await setup();const t=A.prepare(state,[add('questions')]);switchAccount();await assert.rejects(A.commit(t),/Hesap/);assert.equal(db.writes(),0);});
test('external edits invalidate preview without loss',async()=>{const {A,state,db}=await setup();const t=A.prepare(state,[add('tasks')]);const fresh=A.reduce(state,[add('questions')]);db.replace(fresh);await assert.rejects(A.commit(t),/Veriler değişti/);assert.deepEqual(db.get(),copy(fresh));});
test('chat-only changes are retained on apply',async()=>{const {A,M,state,db}=await setup();const t=A.prepare(state,[add('tasks')]);const latest=await M.currentState();M.addMessage(latest,'user','başka mesaj');await M.writeState(latest);await A.commit(t);assert.ok(db.get().assistantMessages.some(x=>x.text==='başka mesaj'));});
test('stale target or duplicate targeting rejects whole batch',async()=>{const {A,state}=await setup();const s=A.reduce(state,[add('tasks')]),r=s.tasks[0];assert.throws(()=>A.reduce(s,[action('tasks','delete',{...r,title:'Eski'})]),/değişmiş/);assert.throws(()=>A.reduce(s,[action('tasks','delete',r),action('tasks','delete',r)]),/birden fazla/);assert.equal(s.tasks.length,1);});
test('invalid batch cannot partially apply',async()=>{const {A,state}=await setup();assert.throws(()=>A.reduce(state,[add('tasks'),add('debts',{value:-1})]),/pozitif/);assert.equal(state.tasks.length,0);});
test('unknown operations, collections and identity edits are refused',async()=>{const {A,state}=await setup();assert.throws(()=>A.reduce(state,[{type:'reset_account'}]),/desteklenmiyor/);assert.throws(()=>A.reduce(state,[{type:'record',collection:'settings',op:'add',data:{}}]),/Bilinmeyen/);assert.throws(()=>A.reduce(state,[add('tasks',{id:'injected'})]),/değiştirilemez/);});
test('date, time and quantities are validated',async()=>{const {A,state}=await setup();for(const patch of [{date:'2026-02-30'},{start:'25:00'},{end:'08:59'},{metricValue:NaN}])assert.throws(()=>A.reduce(state,[add('blocks',patch)]));});
test('same-batch and existing block collisions are rejected, adjacent allowed',async()=>{const {A,state}=await setup();assert.throws(()=>A.reduce(state,[add('blocks'),add('blocks',{start:'09:30',end:'10:30'})]),/çakışması/);const s=A.reduce(state,[add('blocks')]);assert.throws(()=>A.reduce(s,[add('blocks')]),/çakışması/);assert.equal(A.reduce(s,[add('blocks',{start:'10:00',end:'11:00'})]).blocks.length,2);});
test('block swap is validated against final batch state',async()=>{const {A,state}=await setup();const s=A.reduce(state,[add('blocks'),add('blocks',{start:'10:00',end:'11:00'})]);const next=A.reduce(s,[action('blocks','edit',s.blocks[0],{data:{start:'10:00',end:'11:00'}}),action('blocks','edit',s.blocks[1],{data:{start:'09:00',end:'10:00'}})]);assert.equal(next.blocks[0].start,'10:00');});
test('partial and completed block synchronize linked debt',async()=>{const {A,state}=await setup();let s=A.reduce(state,[add('blocks')]);s=A.reduce(s,[action('blocks','status',s.blocks[0],{status:'partial',remaining:{value:2,unit:'test'}})]);assert.equal(s.debts[0].sourceBlockId,s.blocks[0].id);assert.equal(s.debts[0].value,2);const token=A.prepare(s,[action('blocks','status',s.blocks[0],{status:'complete'})]);assert.ok(token.rows.some(x=>x.includes('Borç sil')));s=A.reduce(s,[action('blocks','status',s.blocks[0],{status:'complete'})]);assert.equal(s.debts.length,0);});
test('card debt is cleaned up when card is deleted',async()=>{const {A,state}=await setup();let s=A.reduce(state,[add('planItems')]);s=A.reduce(s,[action('planItems','status',s.planItems[0],{status:'incomplete'})]);assert.equal(s.debts[0].value,4);s=A.reduce(s,[action('planItems','delete',s.planItems[0])]);assert.equal(s.debts.length,0);});
test('schedule debt preserves source link, finishing clears debt',async()=>{const {A,state}=await setup();let s=A.reduce(state,[add('debts')]);s=A.reduce(s,[action('debts','schedule',s.debts[0],{data:{date:'2026-09-22',start:'11:00',end:'12:00'}})]);assert.equal(s.blocks[0].sourceDebtId,s.debts[0].id);s=A.reduce(s,[action('blocks','status',s.blocks[0],{status:'complete'})]);assert.equal(s.debts.length,0);});
test('question and task status values are typed',async()=>{const {A,state}=await setup();let s=A.reduce(state,[add('questions'),add('tasks')]);s=A.reduce(s,[action('questions','status',s.questions[0],{status:'solved'}),action('tasks','status',s.tasks[0],{status:true})]);assert.equal(s.questions[0].status,'solved');assert.equal(s.tasks[0].completed,true);assert.throws(()=>A.reduce(s,[action('tasks','status',s.tasks[0],{status:'true'})]));});
test('exam counts do not bleed between subjects',async()=>{const {M}=await setup();const rows=M.examRows('Türkçe 35D 5Y, Matematik 32D 6Y 2B','TYT');assert.equal(rows[0].blank,0);assert.equal(rows[1].blank,2);});
test('invalid and repeated exam results rejected',async()=>{const {A,state}=await setup();for(const rows of [[{subject:'Türkçe',correct:41,wrong:0,blank:0}],[{subject:'Türkçe',correct:-1,wrong:0,blank:0}],[...data.exams.rows,...data.exams.rows]])assert.throws(()=>A.reduce(state,[add('exams',{rows})]));});
test('core compare-and-write rejects concurrent data change',async()=>{const {M,db,state}=await setup();const stale=await M.currentState();const changed={...state,settings:{changed:true}};db.replace(changed);M.addMessage(stale,'user','test');await assert.rejects(M.writeState(stale),/Veriler veya hesap/);assert.deepEqual(db.get(),changed);});
test('core compare-and-write rejects account switch',async()=>{const {M,db,switchAccount}=await setup();const s=await M.currentState();switchAccount();await assert.rejects(M.writeState(s),/Veriler veya hesap/);assert.equal(db.writes(),0);});
test('write failure never reports saved state',async()=>{const {A,state,db}=await setup();const token=A.prepare(state,[add('tasks')]);db.fail();await assert.rejects(A.commit(token),/disk failure/);assert.equal(db.get().tasks.length,0);assert.equal(db.get().assistantMessages.length,0);});
test('delete and tombstone commit together',async()=>{const {A,state,db}=await setup();const s=A.reduce(state,[add('questions')]);db.replace(s);const id=s.questions[0].id;await A.commit(A.prepare(s,[action('questions','delete',s.questions[0])]));assert.equal(db.get().questions.length,0);assert.ok(db.get()[`__hakuna_deleted_item__:questions:${encodeURIComponent(id)}`].deletedAt);});
