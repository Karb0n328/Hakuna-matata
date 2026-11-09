const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'ten-kasim-2026.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'ten-kasim-2026.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

class ClockDate extends Date {
  static currentMs = Date.parse('2026-11-09T21:15:00Z'); // Istanbul Nov 10, 00:15
  constructor(...args) { super(...(args.length ? args : [ClockDate.currentMs])); }
  static now() { return ClockDate.currentMs; }
}
class Tokens {
  constructor() { this.set = new Set(); }
  add(v) { this.set.add(v); }
  remove(v) { this.set.delete(v); }
  contains(v) { return this.set.has(v); }
  toggle(v, on) {
    if (on === undefined) on = !this.contains(v);
    if (on) this.add(v); else this.remove(v);
    return on;
  }
}
let inserted = null;
let page = 'Odalar';
let observerCallback = null;
let clockTick = null;
let roomMarkupPresent = false;
const photo = {
  events:{},
  naturalWidth:0,
  addEventListener(name, cb){this.events[name]=cb;},
  removeAttribute(){}
};
const view = {
  before(node) { inserted = node; node.isConnected = true; },
  querySelector(selector) {assert.equal(selector,'.sr-room');return roomMarkupPresent?{}:null;}
};
const body = {classList:new Tokens()};
const pageTitle = {get textContent(){return page;}};
const document = {
  readyState:'loading',
  hidden:false,
  body,
  events:{},
  getElementById(id) {return id==='view'?view:id==='pageTitle'?pageTitle:null;},
  createElement(tag) {
    assert.equal(tag, 'section');
    const node = {
      attrs:{}, dataset:{}, classList:new Tokens(), isConnected:false, innerHTML:'',
      setAttribute(key,val){this.attrs[key]=val;},
      querySelector(key){
        assert(['.tk10-photo','.tk10-story-image-main','.tk10-story-image-fill'].includes(key));
        return photo;
      },
      remove(){this.isConnected=false;if(inserted===this)inserted=null;}
    };
    Object.defineProperty(node,'className',{set(value){
      for(const key of String(value).split(/\s+/))if(key)node.classList.add(key);
    }});
    return node;
  },
  addEventListener(name,cb){this.events[name]=cb;}
};
const window = {
  events:{},
  addEventListener(name,cb){this.events[name]=cb;},
  setInterval(cb, ms){assert.equal(ms,30000);clockTick=cb;return 1;}
};
class MutationObserver {
  constructor(cb){observerCallback=cb;}
  observe(element,flags){
    if(element===pageTitle){assert.equal(flags.childList,true);return;}
    assert.equal(element,body);
    assert.equal(flags.attributes,true);
    assert.deepEqual(Array.from(flags.attributeFilter),['class']);
  }
}
vm.runInNewContext(src,{window,document,Date:ClockDate,Intl,MutationObserver}, {filename:'ten-kasim-2026.js'});

const isActive=window.HakunaTenKasim2026.isActiveAt;
for (const [when,expected] of [
  ['2026-11-09T20:59:59Z',false],  // 9 Nov 23:59:59 Istanbul
  ['2026-11-09T21:00:00Z',true],   // 10 Nov 00:00 Istanbul
  ['2026-11-10T06:05:00Z',true],   // 10 Nov 09:05 Istanbul
  ['2026-11-10T20:59:59Z',true],   // 10 Nov 23:59:59 Istanbul
  ['2026-11-10T21:00:00Z',false],  // 11 Nov 00:00 Istanbul
  ['2027-11-09T21:00:00Z',false]   // One-time 2026 event
]) assert.equal(isActive(new Date(when)),expected,when);

// The Rooms landing page displays the compact tribute.
document.events.DOMContentLoaded();
assert(inserted&&inserted.classList.contains('tk10-story'),'Rooms lobby must display chapter VI');
assert.equal(inserted.dataset.chapter,'6');
assert(body.classList.contains('tk10-active'));
assert.equal(typeof observerCallback,'function');

// A room opening keeps the page title 'Odalar', but hides the tribute
// immediately on immersion without touching study-room content.
body.classList.add('sr-immersed');observerCallback();
assert.equal(inserted,null,'opened room must not show tribute');
assert.equal(body.classList.contains('tk10-active'),false);

// Even without the immersion class, the opened-room markup protects isolation.
body.classList.remove('sr-immersed');
roomMarkupPresent=true;observerCallback();
assert.equal(inserted,null,'actual room markup also blocks the tribute');

// Returning to the Rooms lobby, with no page title change, restores it.
roomMarkupPresent=false;observerCallback();
assert(inserted&&inserted.classList.contains('tk10-story'),'back to lobby restores chapter VI');
assert.equal(inserted.dataset.chapter,'6');

// The user navigates to Today: full-size tribute appears before #view.
page='Bugün';observerCallback();
assert(inserted&&inserted.classList.contains('tk10-home'));
assert.equal(inserted.attrs['aria-label'],'10 Kasım 2026, Gazi Mustafa Kemal Atatürk anması');
assert(body.classList.contains('tk10-active'));

// Ten ordinary non-home pages advance the same story in sidebar order.
const expectedOrder=['Plan','Görevler','Denemeler','Sorular','Soru Kitaplığım',
  'Odalar','Analiz','Rehberlik','Öneriler','Ayarlar'];
assert.deepEqual(Array.from(window.HakunaTenKasim2026.chapters.map(c=>c.page)),expectedOrder);
for(let i=0;i<expectedOrder.length;i++){
  page=expectedOrder[i];observerCallback();
  assert(inserted.classList.contains('tk10-story'),page+' must show a chapter');
  assert.equal(inserted.dataset.chapter,String(i+1),page+' chronology index');
  assert.match(inserted.innerHTML,/Salih Bozok/);
  assert.match(inserted.innerHTML,/Fotoğraf: Wikimedia Commons/);
  assert.match(inserted.innerHTML,/Hatırat/);
  assert.equal(inserted.classList.contains('tk10-home'),false);
}
page='Odalar';observerCallback();
assert.equal(inserted.dataset.chapter,'6');

// Midnight Istanbul: the effect disappears automatically via the interval.
page='Bugün';observerCallback();
assert(inserted);
ClockDate.currentMs=Date.parse('2026-11-10T21:00:00Z');
clockTick();
assert.equal(inserted,null);
assert.equal(body.classList.contains('tk10-active'),false);

// The photo and both styles are loaded only via dedicated non-room assets.
assert.match(src,/commons\.wikimedia\.org/);
assert.match(src,/insideOpenedRoom/);
assert.match(src,/observer\.observe\(document\.body, \{attributes: true/);
assert.match(html,/ten-kasim-2026\.css\?v=1-memorial/);
assert.match(html,/ten-kasim-2026\.js\?v=3-pasa-wording/);
assert.match(css,/body\.tk10-active:not\(\.sr-immersed\) \.ataturk-corner/);
assert.match(css,/\.tk10-story-image-main\s*\{[\s\S]*?object-fit:contain/);
assert.match(css,/\.tk10-home \.tk10-photo\s*\{[\s\S]*?object-fit:contain/);
assert.doesNotMatch(css,/\.sr-room-header|\.sr-room-grid|\.sr-desk-scene|\.sx-room\s*\{/);
assert.match(sw,/ten-kasim-2026\.js\?v=1-memorial/);
assert.match(sw,/ten-kasim-2026\.css\?v=1-memorial/);
console.log('PASS 10 Kasım home tribute, ten chronologically linked Bozok stories, image framing, Rooms lobby isolation and midnight removal');
