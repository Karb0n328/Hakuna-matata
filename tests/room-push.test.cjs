const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

(async () => {
  const handlers = {}, shown = [], opened = [], posted = [], requests = [];
  const self = {
    location: {origin:'https://example.test'},
    registration: {scope:'https://example.test/Hakuna/', showNotification:async (title, options) => shown.push({title, options})},
    clients: {matchAll:async () => [{postMessage:message => posted.push(message)}], openWindow:async url => opened.push(url)},
    addEventListener: (name, handler) => { handlers[name] = handler; }
  };
  const source = fs.readFileSync('sw.js','utf8');
  vm.runInNewContext(source.slice(source.indexOf("self.addEventListener('push'")), {
    self, URL,
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body);
      requests.push(request);
      return {ok:request.token !== 'expired', json:async () => ({token:request.command === 'resume' ? 'new-token' : request.token})};
    }
  });

  let pending;
  const push = async payload => {
    handlers.push({data:{json:() => payload}, waitUntil:promise => {pending=promise;}});
    await pending;
  };
  const tap = async (index, action) => {
    handlers.notificationclick({
      notification:{data:shown[index].options.data, close(){}}, action,
      waitUntil:promise => {pending=promise;}
    });
    await pending;
  };

  await push({roomName:'Odam', roomId:'123', code:'K7MP4X9R', controlToken:'test-token'});
  assert.equal(shown[0].title,'Çalışılıyor…');
  assert.equal(shown[0].options.body,'Odam');
  assert.equal(shown[0].options.actions[0].title,'Çalışmayı durdur');
  assert.equal(new URL(shown[0].options.data.url).searchParams.get('room'),'K7MP4X9R');
  await tap(0,'pause');
  assert.equal(shown[1].title,'Çalışma durduruldu');
  assert.equal(shown[1].options.actions[0].title,'Çalışmayı başlat');
  assert.equal(shown[1].options.tag,shown[0].options.tag);
  await tap(1,'resume');
  assert.equal(shown[2].options.data.controlToken,'new-token');
  assert.deepEqual(requests,[
    {action:'room-control',command:'pause',token:'test-token'},
    {action:'room-control',command:'resume',token:'test-token'}
  ]);
  assert.equal(opened.length,0);
  assert.equal(posted[0].roomId,'123');

  await tap(2,'');
  assert.equal(new URL(opened[0]).searchParams.get('room'),'K7MP4X9R');
  await push({roomId:'other',code:'1234567890ABCDEF12',controlToken:'expired'});
  await tap(3,'pause');
  assert.equal(new URL(opened[1]).searchParams.get('room'),'1234567890ABCDEF12');

  await push({kind:'timer-finished',endAt:123456});
  assert.equal(shown[4].title,'Süre bitti');
  assert.equal(shown[4].options.tag,'hakuna-timer-123456');
  assert.equal(shown[4].options.silent,true);
  assert.equal(shown[4].options.actions,undefined);
  await push({roomId:'123', roomIds:['123','456'], group:true, roomName:'Oda A, Oda B', controlToken:'first.second'});
  const grouped = shown[5].options;
  assert.equal(grouped.tag,'hakuna-study-group');
  assert.notEqual(grouped.tag,shown[0].options.tag);
  assert.equal(grouped.body,'Oda A, Oda B');
  await tap(5,'pause');
  assert.equal(requests.at(-1).token,'first.second');
  assert.deepEqual(posted.at(-1).roomIds,['123','456']);
  assert.equal(shown[6].options.tag,grouped.tag);
  console.log('PASS room names, independent and grouped controls, deep links and timer notifications');
})().catch(error => {console.error(error); process.exitCode=1;});

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
    HakunaAccount: {info:() => ({id:'user'}), roomNotifications: async () => ({token:'native-token'})},
    HakunaStudyTimer: {state:() => timer},
    addEventListener: (event, handler) => { listeners[event] = handler; }
  };
  vm.runInNewContext(require('node:fs').readFileSync('room-notifications.js', 'utf8'), {window});
  assert.deepEqual(messages.splice(0), [
    {action:'account', user:'user'},
    {action:'timer', endAt:12345, finished:false}
  ]);
  await window.HakunaRoomNotifications.started('room', 'K7MP4X9R', 'Odam');
  window.HakunaRoomNotifications.close('room');
  window.HakunaRoomNotifications.syncRooms([{id:'room', studying:false},{id:'other', studying:true}]);
  timer = {status:'paused', endAt:12345};
  listeners['hakuna-timer-changed']();
  assert.equal(await window.HakunaRoomNotifications.enable(), false);
  assert.deepEqual(messages, [
    {action:'room-start', room:'room', code:'K7MP4X9R', roomName:'Odam'},
    {action:'room-start', room:'room', code:'K7MP4X9R', roomName:'Odam', token:'native-token', account:'user'},
    {action:'room-stop', room:'room'},
    {action:'room-sync', active:['other']},
    {action:'timer', endAt:0, finished:false},
    {action:'enable'}
  ]);
  console.log('PASS Android bridge works without browser push and cancels paused timers');
})().catch(error => { console.error(error); process.exitCode = 1; });
