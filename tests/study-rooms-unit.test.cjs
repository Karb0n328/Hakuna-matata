const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'..','study-rooms.js'),'utf8');

const events={};
const win={addEventListener:(n,fn)=>events[n]=fn};
const doc={addEventListener:()=>{}};
vm.runInNewContext(src,{
  window:win,document:doc,Date,URL,URLSearchParams,Number,String,Math,
  setTimeout,clearTimeout,setInterval,clearInterval,console
});
const util=win.HakunaStudyRooms?.utils;
assert.ok(util,'study room helper interface should be available');
assert.equal(util.displayClock(0),'00:00:00');
assert.equal(util.displayClock(125),'00:02:05');
assert.equal(util.displayClock(3601),'01:00:01');
assert.equal(util.duration(3670),'1 sa 01 dk');
assert.equal(util.duration(60),'1 dk 00 sn');
const start=new Date('2026-11-05T18:00:00Z').toISOString();
const room={phase:'focus',focus_minutes:50,break_minutes:10,phase_started_at:start};
assert.equal(util.phaseEnd(room),Date.parse(start)+3000000);
assert.equal(util.phaseLeft(room,Date.parse(start)),3000);
assert.equal(util.phaseLeft(room,Date.parse(start)+3000000),0);
assert.equal(util.phaseLeft({...room,phase:'break'},Date.parse(start)+60000),540);
assert.equal(util.phaseLeft({...room,phase:'idle'},Date.parse(start)),0);
assert.equal(util.phaseLeft({...room,phase_started_at:null},Date.parse(start)),0);
assert.equal(util.phaseLeft(room,Date.parse(start)+30000000),0);
assert.equal(util.duration(-200),'0 dk 00 sn');

const app=fs.readFileSync(require('node:path').join(__dirname,'..','app.js'),'utf8');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
const sw=fs.readFileSync(require('node:path').join(__dirname,'..','sw.js'),'utf8');
assert.ok(app.includes("['rooms','🫂','Odalar']"),'desktop navigation should expose rooms');
assert.ok(app.includes("currentPage==='rooms'"),'router should render study rooms');
assert.ok(app.includes("window.HakunaStudyRooms?.leaveView?.()"),'page navigation should stop room listeners');
assert.ok(html.includes('study-rooms.css'),'page should load room CSS');
assert.ok(html.includes('study-rooms-immersive.css'),'page should load isolated room CSS');
assert.ok(sw.includes("'./study-rooms.js','./study-rooms.css'"),'service worker should cache new feature');
assert.ok(sw.includes("'./study-rooms-immersive.css'"),'service worker should cache private focus space visual layer');
console.log('PASS study-room clock math, navigation wiring and PWA assets');

vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'..','room-experience.js'),'utf8'),{window:win,document:doc});
const sky=win.HakunaRoomExperience.utils.sky;
assert.equal(sky(0).lights,0);
assert.equal(sky(-20).lights,0);
assert.equal(sky(1799).lights,0);
assert.equal(sky(1800).lights,1);
assert.equal(sky(3600).lights,2);
assert.equal(sky(1800*100).points.length,64);
assert.equal(JSON.stringify(sky(3600,'a')),JSON.stringify(sky(3600,'a')));
assert.notEqual(JSON.stringify(sky(3600,'a').points),JSON.stringify(sky(3600,'b').points));
assert.ok(fs.readFileSync(require('node:path').join(__dirname,'..','main.js'),'utf8').includes("import('./room-experience.js?v=1')"));
console.log('PASS deterministic shared sky and feature loading');
