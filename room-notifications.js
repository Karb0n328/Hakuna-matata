(() => {
  'use strict';

  const ownerKey = 'hakuna.push.owner';
  const dismissedKey = 'hakuna.push.prompt.dismissed';
  const supported = 'Notification' in window && 'PushManager' in window &&
    'serviceWorker' in navigator;
  const accountId = () => window.HakunaAccount?.info?.()?.id;
  const api = body => window.HakunaAccount.roomNotifications(body);
  let prompt;
  let syncing = false;

  async function close() {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    for (const notification of await registration.getNotifications()) {
      if (notification.tag.startsWith('hakuna-study-')) notification.close();
    }
  }

  function hidePrompt() {
    prompt?.remove();
    prompt = null;
  }

  function showPrompt() {
    if (prompt || localStorage.getItem(dismissedKey)) return;
    prompt = document.createElement('aside');
    prompt.setAttribute('aria-label', 'Bildirim izni');
    prompt.style.cssText = 'position:fixed;z-index:1000;top:calc(env(safe-area-inset-top,0px) + 12px);right:12px;display:flex;gap:6px;padding:6px;border:1px solid var(--line,#ddd);border-radius:14px;background:var(--card,#fff);box-shadow:0 6px 22px #0002';
    prompt.innerHTML = '<button type="button" class="primary-btn">Bildirimleri aç</button><button type="button" class="secondary-btn" aria-label="Şimdi değil">×</button>';
    const [allow, dismiss] = prompt.querySelectorAll('button');
    allow.addEventListener('click', async () => {
      allow.disabled = true;
      try {
        if (await Notification.requestPermission() === 'denied') {
          localStorage.setItem(dismissedKey, '1');
        }
      } catch (error) {
        console.warn('Hakuna bildirim izni açılamadı', error);
      } finally {
        if (Notification.permission !== 'default') hidePrompt();
        else allow.disabled = false;
        void sync();
      }
    });
    dismiss.addEventListener('click', () => {
      localStorage.setItem(dismissedKey, '1');
      hidePrompt();
    });
    document.body.append(prompt);
  }

  async function sync(accountChanged = false) {
    if (!supported || syncing) return;
    const user = accountId();
    if (!user || Notification.permission !== 'default') hidePrompt();
    if (!user && !accountChanged) return;
    syncing = true;
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
      if (Notification.permission !== 'granted' || (subscription && owner === user)) return;

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
    } catch (error) {
      console.warn('Hakuna bildirim kaydı tamamlanamadı', error);
    } finally {
      syncing = false;
      if (user !== accountId()) void sync(true);
    }
  }

  window.addEventListener('hakuna-account-changed', () => void sync(true));
  window.addEventListener('online', () => void sync());
  window.addEventListener('focus', () => void sync());
  window.HakunaRoomNotifications = {close};
  void sync();
})();
