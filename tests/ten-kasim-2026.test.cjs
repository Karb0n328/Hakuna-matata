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
const photo = {
  events:{},
  naturalWidth:0,
  addEventListener(name, cb){this.events[name]=cb;},
  removeAttribute(){}
};
const view = {
  before(node) { inserted = node; node.isConnected = true; }
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
    return {
      attrs:{},
      classList:new Tokens(),
      isConnected:false,
      setAttribute(key,val){this.attrs[key]=val;},
      querySelector(key){assert.equal(key,'.tk10-photo');return photo;},
      remove(){this.isConnected=false;if(inserted===this)inserted=null;}
    };
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
    assert.equal(element,pageTitle);
    assert.equal(flags.childList,true);
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

// The page initially opens directly into Rooms: no banner or theme allowed.
document.events.DOMContentLoaded();
assert.equal(inserted,null,'Rooms lobby stays entirely unchanged');
assert.equal(body.classList.contains('tk10-active'),false);
assert.equal(typeof observerCallback,'function');

// The user navigates to Today: tribute appears before #view.
page='Bugün';observerCallback();
assert(inserted&&inserted.classList.contains('tk10-home'));
assert.equal(inserted.attrs['aria-label'],'10 Kasım 2026, Gazi Mustafa Kemal Atatürk anması');
assert(body.classList.contains('tk10-active'));

// Normal subpages render a compact memorial.
page='Plan';observerCallback();
assert(inserted.classList.contains('tk10-compact'));
assert.equal(inserted.classList.contains('tk10-home'),false);

// Immersive mode is immune even if page title momentarily remains stale.
body.classList.add('sr-immersed');observerCallback();
assert.equal(inserted,null);
assert.equal(body.classList.contains('tk10-active'),false);
body.classList.remove('sr-immersed');

// Switching into Rooms removes the banner, not the room view.
page='Odalar';observerCallback();
assert.equal(inserted,null);
assert.equal(body.classList.contains('tk10-active'),false);

// Midnight Istanbul: the effect disappears automatically via the interval.
page='Bugün';observerCallback();
assert(inserted);
ClockDate.currentMs=Date.parse('2026-11-10T21:00:00Z');
clockTick();
assert.equal(inserted,null);
assert.equal(body.classList.contains('tk10-active'),false);

// The photo and both styles are loaded only via dedicated non-room assets.
assert.match(src,/commons\.wikimedia\.org/);
assert.match(src,/title === 'Odalar'/);
assert.match(html,/ten-kasim-2026\.css\?v=1-memorial/);
assert.match(html,/ten-kasim-2026\.js\?v=1-memorial/);
assert.match(css,/body\.tk10-active:not\(\.sr-immersed\) \.ataturk-corner/);
assert.doesNotMatch(css,/\.sr-room-header|\.sr-room-grid|\.sr-desk-scene|\.sx-room\s*\{/);
assert.match(sw,/ten-kasim-2026\.js\?v=1-memorial/);
assert.match(sw,/ten-kasim-2026\.css\?v=1-memorial/);
console.log('PASS 10 November Istanbul midnight boundaries, one-day visibility, isolated Rooms screen, compact layout and offline asset wiring');
