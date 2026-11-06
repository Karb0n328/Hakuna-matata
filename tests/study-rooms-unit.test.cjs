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
const journal=win.HakunaRoomExperience.utils.journal;
assert.equal(journal(0).pages,0);
assert.equal(journal(-20).pages,0);
assert.equal(journal(3599).pages,0);
assert.equal(journal(3600).pages,1);
assert.equal(journal(7200).pages,2);
assert.equal(journal(5400).progress,.5);
assert.ok(fs.readFileSync(require('node:path').join(__dirname,'..','main.js'),'utf8').includes("import('./room-weather.js?v=1')"));
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'..','room-weather.js'),'utf8'),{window:win,document:doc});
const env=win.HakunaRoomWeather.utils;
const rise=Date.parse('2026-11-06T04:00:00Z'),set=Date.parse('2026-11-06T14:00:00Z');
assert.equal(env.phase(rise-1800001,rise,set),'night');
assert.equal(env.phase(rise-1800000,rise,set),'dawn');
assert.equal(env.phase(rise+1800000,rise,set),'day');
assert.equal(env.phase(set-1800000,rise,set),'sunset');
assert.equal(env.phase(set+1800000,rise,set),'night');
assert.equal(env.weather(63),'rain');assert.equal(env.weather(75),'snow');assert.equal(env.weather(97),'thunder');assert.equal(env.weather(45),'fog');assert.equal(env.weather(0),'clear');assert.equal(env.weather(999),'unknown');
assert.equal(env.dateKey(Date.parse('2026-11-06T21:05:00Z')),'2026-11-07');
const summer=Date.parse('2026-06-21T09:00:00Z'),winter=Date.parse('2026-12-21T09:00:00Z');
assert(env.solar(summer,false)-env.solar(summer,true)>env.solar(winter,false)-env.solar(winter,true));
console.log('PASS shared journal, Istanbul day boundaries, solar phases and weather codes');
