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
const assets=JSON.parse(sw.match(/const ASSETS=(.*);/)[1]);
assert.equal(new Set(assets).size,assets.length,'precache cannot contain duplicate URLs');
for(const file of ['./study-rooms.js','./study-rooms.css','./study-rooms-immersive.css','./offline-support.js'])assert(assets.includes(file));
console.log('PASS study-room clock math, navigation wiring and PWA assets');

vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'..','room-experience.js'),'utf8'),{window:win,document:doc});
const growth=win.HakunaRoomExperience.utils.growth;
assert.equal(growth(0),0);
assert.equal(growth(-20),0);
assert.equal(growth(Infinity),0);
for(const [index,hour] of [12,48,95,150,215,290].entries()){
  assert.equal(growth(hour*3600-1),index);
  assert.equal(growth(hour*3600),index+1);
}
const pet=win.HakunaRoomExperience.utils.petStage;
const bloom=new Date('2026-11-07T12:00:00Z');
const day=24*3600*1000;
assert.equal(pet(400*3600-1,null,+bloom).kind,'plant');
assert.equal(pet(400*3600,bloom.toISOString(),+bloom).secondsLeft,86400);
assert.equal(pet(400*3600,bloom.toISOString(),+bloom+day-1).secondsLeft,1);
assert.equal(pet(400*3600,bloom.toISOString(),+bloom+day).kind,'dragon');
assert.equal(pet(1900*3600,bloom.toISOString(),+bloom+day).stage,2);
for(const [index,hour] of [10,20,30,40,50,65,85,110,150,220,320].entries()){
  assert.equal(util.chairLevel(hour*3600-1),index);
  assert.equal(util.chairLevel(hour*3600),index+1);
}
assert.equal(util.chairLevel(1000*3600),11);
assert.ok(fs.readFileSync(require('node:path').join(__dirname,'..','main.js'),'utf8').includes("import('./room-weather.js?v=2')"));
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
console.log('PASS shared plant, Istanbul day boundaries, solar phases and weather codes');


// The gift is an exclusive wardrobe choice, but its worn appearance is public
// to room members regardless of who is looking at the avatar.
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'..','room-wardrobe.js'),'utf8'),{window:win});
const wardrobe=win.HakunaRoomWardrobe;
const gift=wardrobe.featuredHead;
const batuId='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
const esilaId='6c5b22a1-a671-4508-9f20-812a7139e785';
assert.equal(gift,'batu_plush_heart_bunny');
assert(wardrobe.itemsFor('head',esilaId).some(([key])=>key===gift),'gift should be available to Esila');
assert(!wardrobe.itemsFor('head',batuId).some(([key])=>key===gift),'gift should no longer be available to Batu');
assert(wardrobe.itemsFor('head',batuId).some(([key])=>key==='batu_thorn_crown'),'Batu should keep his thorn crown');
assert(!wardrobe.itemsFor('head','another-room-member').some(([key])=>key===gift),'other accounts must not be offered the preview item');
assert(!wardrobe.itemsFor('head','another-room-member').some(([key])=>key==='batu_thorn_crown'),'existing exclusive crown must stay private');
const visibleToEveryone=wardrobe.character({head:gift,top:'velour',hair:'braids'});
assert.match(visibleToEveryone,/data-accessory="batu_plush_heart_bunny"/);
assert.match(visibleToEveryone,/data-material="embroidered-plush"/);
assert.match(visibleToEveryone,/linearGradient/);
assert.match(visibleToEveryone,/fill="#da3049"/,'tiny red embroidered heart should replace moon');
assert.doesNotMatch(visibleToEveryone,/M23\.5 5\.4C19\.1 5\.2/,'old moon path must be absent');
assert.doesNotMatch(visibleToEveryone,/<img|\.png|data:image/i,'gift must be embedded vector material rather than pasted PNG');
assert.match(wardrobe.character({head:'batu_thorn_crown'}),/data-accessory="batu_thorn_crown"/);
assert.match(src,/sr-wardrobe-exclusive-card/,'gift has its own subtle wardrobe tile');
assert.doesNotMatch(src,/Sana özel|Deneme aksesuarı/i,'gift display has no trial or exclusivity slogans');
assert.match(visibleToEveryone,/data-head="batu_plush_heart_bunny"/,'hood variant is marked for full-hair coverage');
assert.match(visibleToEveryone,/data-fit="face-framing-hood"/,'hood uses fitted face opening instead of a flat beanie rim');
const css=fs.readFileSync(require('node:path').join(__dirname,'..','study-rooms.css'),'utf8');
assert.match(css,/\.sr-avatar\[data-head="batu_plush_heart_bunny"\] \.sr-avatar-hair \{ visibility:hidden; \}/);
const nextAvatar=wardrobe.character({head:gift,top:'palm',hair:'buns'});
const firstGradient=visibleToEveryone.match(/id="(sr-mooncloud-\d+-fur)"/)?.[1];
const secondGradient=nextAvatar.match(/id="(sr-mooncloud-\d+-fur)"/)?.[1];
assert(firstGradient && secondGradient && firstGradient!==secondGradient,'each desk should get distinct gradient ids');
console.log('PASS Esila gift, Batu removal, red heart, remote rendering and crown compatibility');
