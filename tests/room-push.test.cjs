const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers={},shown=[],opened=[],posted=[];let requests=0;
const self={location:{origin:'https://example.test'},registration:{scope:'https://example.test/Hakuna/',showNotification:async(t,o)=>shown.push({t,o})},clients:{matchAll:async()=>[{postMessage:m=>posted.push(m)}],openWindow:async u=>opened.push(u)},addEventListener:(n,f)=>handlers[n]=f};
const source=fs.readFileSync('sw.js','utf8');vm.runInNewContext(source.slice(source.indexOf("self.addEventListener('push'")),{self,URL,fetch:async()=>{requests++;return {ok:true}}});
(async()=>{let pending;handlers.push({data:{json:()=>({body:'Odam',roomId:'123',code:'K7MP4X9R',pauseToken:'test-token'})},waitUntil:p=>pending=p});await pending;assert.equal(shown[0].t,'Çalışılıyor…');assert.equal(shown[0].o.body,undefined);assert.equal(shown[0].o.actions[0].title,'Mola ver');assert.equal(new URL(shown[0].o.data.url).searchParams.get('room'),'K7MP4X9R');
handlers.notificationclick({notification:{data:shown[0].o.data,close(){}},action:'pause',waitUntil:p=>pending=p});await pending;assert.equal(requests,1);assert.equal(opened.length,0);assert.equal(posted[0].type,'hakuna-study-paused');
handlers.notificationclick({notification:{data:shown[0].o.data,close(){}},action:'',waitUntil:p=>pending=p});await pending;assert.equal(opened.length,1);handlers.push({data:{json:()=>({kind:'timer-finished',endAt:123456})},waitUntil:p=>pending=p});await pending;
assert.equal(shown[1].t,'Süre bitti');assert.equal(shown[1].o.tag,'hakuna-timer-123456');assert.equal(shown[1].o.silent,true);assert.equal(shown[1].o.actions,undefined);
console.log('PASS room and timer notifications, pause action and room deep link');})().catch(e=>{console.error(e);process.exitCode=1});

(async () => {
  const listeners = {};
  const messages = [];
  const bridge = {
    postMessage: data => {
      const message = JSON.parse(data);
      messages.push(message);
      if (message.action === 'enable') bridge.onmessage({data:'settings'});
    }
  };
  let timer = {status:'running', endAt:12345};
  const window = {
    HakunaAndroidNotifications: bridge,
    HakunaAccount: {info:() => ({id:'user'})},
    HakunaStudyTimer: {state:() => timer},
    addEventListener: (event, handler) => { listeners[event] = handler; }
  };
  vm.runInNewContext(require('node:fs').readFileSync('room-notifications.js', 'utf8'), {window});
  assert.deepEqual(messages.splice(0), [
    {action:'account', user:'user'},
    {action:'timer', endAt:12345, finished:false}
  ]);
  window.HakunaRoomNotifications.started('room', 'K7MP4X9R');
  window.HakunaRoomNotifications.close('room');
  window.HakunaRoomNotifications.syncRooms([{id:'room', studying:false},{id:'other', studying:true}]);
  timer = {status:'paused', endAt:12345};
  listeners['hakuna-timer-changed']();
  assert.equal(await window.HakunaRoomNotifications.enable(), false);
  assert.deepEqual(messages, [
    {action:'room-start', room:'room', code:'K7MP4X9R'},
    {action:'room-stop', room:'room'},
    {action:'room-sync', active:['other']},
    {action:'timer', endAt:0, finished:false},
    {action:'enable'}
  ]);
  console.log('PASS Android bridge works without browser push and cancels paused timers');
})().catch(error => { console.error(error); process.exitCode = 1; });
