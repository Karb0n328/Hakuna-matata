(() => {
  'use strict';

  const android = window.HakunaAndroidNotifications;
  if (typeof android?.postMessage === 'function') {
    const send = (action, data) => android.postMessage(JSON.stringify({action, ...data}));
    const syncTimer = () => {
      const timer = window.HakunaStudyTimer?.state();
      if (timer) send('timer', {
        endAt: timer.status === 'running' || timer.status === 'finished' ? timer.endAt : 0,
        finished: timer.status === 'finished'
      });
    };
    const syncAccount = () => send('account', {user: window.HakunaAccount?.info()?.id || ''});
    window.addEventListener('hakuna-account-changed', syncAccount);
    if (window.HakunaAccount?.info()?.id) syncAccount();
    for (const event of ['hakuna-timer-changed', 'hakuna-native-resumed', 'focus']) {
      window.addEventListener(event, syncTimer);
    }
    const closeRoom = room => send('room-stop', {room});
    window.HakunaRoomNotifications = {
      close: closeRoom,
      closeAndroidRoom: closeRoom,
      started: (room, code) => send('room-start', {room, code}),
      syncRooms: rooms => send('room-sync', {active: rooms.filter(room => room.studying).map(room => room.id)}),
      enable: () => new Promise(resolve => {
        android.onmessage = event => {
          android.onmessage = null;
          resolve(event.data === 'granted');
        };
        send('enable');
      })
    };
    syncTimer();
    return;
  }

  const ownerKey = 'hakuna.push.owner';
  const dismissedKey = 'hakuna.push.prompt.dismissed';
  const supported = 'Notification' in window && 'PushManager' in window &&
    'serviceWorker' in navigator;
  const accountId = () => window.HakunaAccount?.info?.()?.id;
  const api = body => window.HakunaAccount.roomNotifications(body);
  let prompt;
  let syncTask;
  let scheduledTimer;
  let syncAgain = false;

  async function close(roomId) {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    for (const notification of await registration.getNotifications()) {
      const matchesRoom = roomId ? notification.tag === 'hakuna-study-' + roomId : notification.tag.startsWith('hakuna-study-');
      if (matchesRoom) notification.close();
    }
  }

  function hidePrompt() {
    prompt?.remove();
    prompt = null;
  }

  function showPrompt() {
    if (prompt || localStorage.getItem(dismissedKey)) return;
    prompt = document.createElement('dialog');
    prompt.className = 'hm-notification-permission';
    prompt.setAttribute('aria-labelledby', 'hm-notification-title');
    prompt.innerHTML = '<h2 id="hm-notification-title">Bildirimleri aç?</h2><div><button type="button" class="secondary-btn" autofocus>Açma</button><button type="button" class="primary-btn">İzin ver</button></div>';
    const [dismiss, allow] = prompt.querySelectorAll('button');
    const decline = () => {
      localStorage.setItem(dismissedKey, '1');
      hidePrompt();
    };
    prompt.addEventListener('cancel', event => {
      event.preventDefault();
      decline();
    });
    allow.addEventListener('click', async () => {
      allow.disabled = true;
      dismiss.disabled = true;
      try {
        await enable();
      } catch (error) {
        console.warn('Hakuna bildirim izni açılamadı', error);
      } finally {
        if (Notification.permission !== 'default') hidePrompt();
        else {
          allow.disabled = false;
          dismiss.disabled = false;
        }
      }
    });
    dismiss.addEventListener('click', decline);
    document.body.append(prompt);
    prompt.showModal();
  }

  async function scheduleTimer(subscription, user) {
    const state = window.HakunaStudyTimer?.state();
    if (!state) return;
    const endAt = state.status === 'running' || state.status === 'finished'
      ? Number(state.endAt) : null;
    const signature = JSON.stringify([user, subscription.endpoint, endAt]);
    if (signature === scheduledTimer) return;
    await api({action:'timer-schedule', endpoint:subscription.endpoint, endAt});
    scheduledTimer = signature;
  }

  function sync(accountChanged = false) {
    if (!supported) return Promise.resolve();
    if (syncTask) {
      syncAgain = true;
      return syncTask;
    }
    const user = accountId();
    syncTask = syncOnce(user,accountChanged).finally(() => {
      syncTask = null;
      const accountSwitched = user !== accountId();
      if (syncAgain || accountSwitched) {
        syncAgain = false;
        void sync(accountSwitched);
      }
    });
    return syncTask;
  }

  async function syncOnce(user, accountChanged) {
    if (!user || Notification.permission !== 'default') hidePrompt();
    if (!user && !accountChanged) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      const owner = localStorage.getItem(ownerKey);
      if (owner && owner !== accountId()) {
        await subscription?.unsubscribe();
        subscription = null;
        localStorage.removeItem(ownerKey);
        await close();
      }
      if (!user || user !== accountId() || !navigator.onLine) return;
      if (Notification.permission === 'default') {
        showPrompt();
        return;
      }
      if (Notification.permission !== 'granted') return;
      if (subscription && owner === user) {
        await scheduleTimer(subscription, user);
        return;
      }

      const config = await api({action:'config'});
      if (user !== accountId()) return;
      const key = Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key
      });
      try {
        if (user !== accountId()) throw Error('Hesap değişti.');
        await api({action:'subscribe', subscription:subscription.toJSON()});
        if (user !== accountId()) throw Error('Hesap değişti.');
        localStorage.setItem(ownerKey, user);
      } catch (error) {
        await subscription.unsubscribe();
        throw error;
      }
      await scheduleTimer(subscription, user);
    } catch (error) {
      console.warn('Hakuna bildirim kaydı tamamlanamadı', error);
    }
  }

  async function enable() {
    if (!supported && window.HakunaAndroid) throw Error('Bildirimler için Android APK’yı güncelle.');
    if (!supported) throw Error('Bildirim için Hakuna’yı ana ekrana ekleyip oradan aç.');
    const user = accountId();
    if (!user) throw Error('Önce Hakuna hesabına giriş yap.');
    if (!navigator.onLine) throw Error('İnternet bağlantısı gerekiyor.');
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'denied') {
      localStorage.setItem(dismissedKey, '1');
      hidePrompt();
      throw Error('Bildirim iznini cihazının veya tarayıcının ayarlarından aç.');
    }
    if (permission !== 'granted') throw Error('Bildirim izni verilmedi.');
    hidePrompt();
    await sync();
    const registration = await navigator.serviceWorker.ready;
    if (localStorage.getItem(ownerKey) !== user || !(await registration.pushManager.getSubscription())) {
      await sync();
    }
    if (accountId() !== user || localStorage.getItem(ownerKey) !== user || !(await registration.pushManager.getSubscription())) {
      throw Error('Bildirimler açılamadı. Tekrar dene.');
    }
  }

  window.addEventListener('hakuna-account-changed', () => void sync(true));
  window.addEventListener('hakuna-timer-changed', () => void sync());
  window.addEventListener('storage', event => {
    if (event.key === 'hakuna.studyTimer.v1') void sync();
  });
  window.addEventListener('online', () => void sync());
  window.addEventListener('focus', () => void sync());
  window.HakunaRoomNotifications = {close,enable};
  void sync();
})();
