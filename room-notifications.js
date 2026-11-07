(()=>{'use strict';
 const ownerKey='hakuna.push.owner';
 const supported=()=>('Notification'in window)&&('PushManager'in window)&&('serviceWorker'in navigator);
 const api=b=>{if(!window.HakunaAccount?.roomNotifications)throw Error('Önce hesabına giriş yap.');return window.HakunaAccount.roomNotifications(b)};
 async function toggle(){
  if(!supported())throw Error('Bildirim için Hakuna’yı ana ekrana ekleyip oradan aç.');
  if(!navigator.onLine)throw Error('İnternet bağlantısı gerekiyor.');
  const user=window.HakunaAccount?.info?.()?.id;if(!user)throw Error('Önce hesabına giriş yap.');
  const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
  if(permission!=='granted')throw Error('Bildirim iznini cihaz ayarlarından açabilirsin.');
  const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
  if(sub&&localStorage.getItem(ownerKey)===user){await api({action:'unsubscribe',endpoint:sub.endpoint});await sub.unsubscribe();localStorage.removeItem(ownerKey);return false;}
  if(sub){await sub.unsubscribe();sub=null;}
  const config=await api({action:'config'});const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  try{await api({action:'subscribe',subscription:sub.toJSON()});localStorage.setItem(ownerKey,user);}catch(e){await sub.unsubscribe();throw e;}return true;
 }
 async function close(){if(!('serviceWorker'in navigator))return;const reg=await navigator.serviceWorker.ready;for(const n of await reg.getNotifications())if(n.tag.startsWith('hakuna-study-'))n.close();}
 window.addEventListener('hakuna-account-changed',async()=>{const saved=localStorage.getItem(ownerKey);if(saved&&saved!==window.HakunaAccount?.info?.()?.id&&supported()){const r=await navigator.serviceWorker.ready;await(await r.pushManager.getSubscription())?.unsubscribe();localStorage.removeItem(ownerKey);await close();}});
 window.HakunaRoomNotifications={toggle,close,enabled:()=>localStorage.getItem(ownerKey)===window.HakunaAccount?.info?.()?.id};
})();
