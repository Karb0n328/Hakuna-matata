const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function setup(){
  let account='a';
  const box={window:{},localStorage:{getItem:()=>account},document:{documentElement:{dataset:{}},createElement:()=>({}),head:{appendChild(){}}},console};
  vm.createContext(box);
  for(const f of ['mata-core-v2.js','mata-nlu-v2.js','mata-insights-v1.js','mata-brain-v3.js','mata-capabilities-v4.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),box);
  const M=box.window.HakunaMataV2,today=M.todayISO();
  const state={selectedDate:today,questions:[{id:'q1',subject:'Matematik',source:'Orijinal',reference:'Test 2 / Soru 4',topic:'Türev',note:'Hocaya sor',status:'open',createdAt:today},{id:'q2',subject:'Fizik',source:'345',reference:'Soru 8',status:'open',createdAt:today},{id:'q3',subject:'Matematik',source:'Apotemi',reference:'Soru 3',status:'solved',createdAt:today}],blocks:[{id:'b1',date:today,start:'09:00',end:'09:50',subject:'Matematik',title:'Problem',status:'complete'}],tasks:[],debts:[],settings:{},assistantMessages:[],exams:[{id:'e1',name:'TYT A',date:today,type:'TYT',rows:[{subject:'Matematik',correct:30,wrong:4,blank:6}]},{id:'e2',name:'AYT A',date:today,type:'AYT',rows:[{subject:'Matematik',correct:20,wrong:4,blank:16}]}]};
  return {M,state,switchAccount:()=>account='b'};
}
test('matematik sorularımı listele: only math and complete metadata',()=>{const {M,state}=setup();const before=JSON.stringify(state),r=M.parseRequest(state,'kral matematik sorularımı listele');assert.match(r.reply,/Orijinal/);assert.match(r.reply,/Apotemi/);assert.match(r.reply,/Hocaya sor/);assert.doesNotMatch(r.reply,/345/);assert.equal(JSON.stringify(state),before);assert.equal(r.actions,undefined);});
test('conversational variants and Turkish suffixes',()=>{for(const text of ['mat sorularımı göstersene','matematikte çözemediklerimi listele','matematik sorularimi gosterir misin']){const {M,state}=setup();assert.match(M.parseRequest(state,text).reply,/Orijinal/);}});
test('follow-up preserves math subject',()=>{const {M,state}=setup();M.parseRequest(state,'Matematik sorularımı listele');const r=M.parseRequest(state,'sadece çözülmemişleri');assert.match(r.reply,/Orijinal/);assert.doesNotMatch(r.reply,/Apotemi|345/);});
test('quoted source and topic filters',()=>{const {M,state}=setup();const r=M.parseRequest(state,'"Orijinal" kaynak sorularımı listele');assert.match(r.reply,/Orijinal/);assert.doesNotMatch(r.reply,/Apotemi/);});
test('pagination: no silent truncation or duplicates',()=>{const {M,state}=setup();state.questions=Array.from({length:65},(_,i)=>({id:'q'+i,subject:'Matematik',source:'Kitap'+i,reference:'Soru',createdAt:'2026-01-01',status:'open'}));let r=M.parseRequest(state,'Matematik sorularımı listele');assert.match(r.reply,/1–30/);assert.doesNotMatch(r.reply,/Kitap30/);r=M.parseRequest(state,'devamını göster');assert.match(r.reply,/31–60/);r=M.parseRequest(state,'devamını göster');assert.match(r.reply,/61–65/);});
test('date filters and today block data',()=>{const {M,state}=setup();assert.match(M.parseRequest(state,'bugünkü programımı göster').reply,/09:00–09:50/);assert.match(M.parseRequest(state,'2000-01-01 sorularımı listele').reply,/kayıt yok/);});
test('exam results and separated types',()=>{const {M,state}=setup();let r=M.parseRequest(state,'denemelerimi analiz et');assert.match(r.reply,/TYT · 1 deneme/);assert.match(r.reply,/AYT · 1 deneme/);assert.match(r.reply,/29.00/);r=M.parseRequest(state,'TYT denemelerimi listele');assert.match(r.reply,/30D 4Y 6B/);assert.doesNotMatch(r.reply,/AYT A/);});
test('study minutes reflect complete blocks',()=>{const {M,state}=setup();assert.match(M.parseRequest(state,'çalışma analizi').reply,/Tamamlandı işaretlenen: 50 dk/);});
test('read context reset on account switch',()=>{const {M,state,switchAccount}=setup();M.parseRequest(state,'matematik sorularımı listele');switchAccount();assert.equal(M.parseRequest(state,'devamını göster').actions,undefined);assert.doesNotMatch(M.parseRequest(state,'devamını göster').reply||'',/Orijinal/);});
test('existing create action still goes through old preview parser',()=>{const {M,state}=setup();const r=M.parseRequest(state,'Yarın 09:00-09:50 matematik ekle');assert.ok(r.actions?.length);assert.equal(r.actions[0].type,'add_block');});
