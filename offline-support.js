/* Offline views never cache tokens or remote writes. Read snapshots are account-scoped. */
(()=>{'use strict';
 const message='İnternet bağlantısı gerekiyor';
 function requireOnline(){if(navigator.onLine===false)throw Error(message);}
 function accountId(){try{return JSON.parse(localStorage.getItem('sb-zyrbbkbwrijnnykbgjvc-auth-token'))?.user?.id||null}catch{return null}}
 function key(path){const user=accountId();if(!user)throw Error('Önce hesabına giriş yap.');return 'hakuna.offline.read.v1.'+user+'.'+path;}
 function roomLaunch(){
  const user=accountId();
  if(!user)return null;
  let entries=[];
  try{const saved=JSON.parse(localStorage.getItem(key('active-rooms')));if(Array.isArray(saved))entries=saved;}catch{}
  entries=entries.filter(entry=>{
   if(!entry?.room?.id)return false;
   const end=Date.parse(entry.snapshot?.members?.find(member=>member.user_id===user)?.active_end_at||'');
   return !Number.isFinite(end)||end>Date.now();
  });
  return {user,entries};
 }
 function saveRoomLaunch(user,entries){
  if(!user||user!==accountId())return;
  try{localStorage.setItem(key('active-rooms'),JSON.stringify(entries));}catch{}
 }
 async function read(path,loader){const k=key(path);if(navigator.onLine===false){let saved;try{saved=JSON.parse(localStorage.getItem(k))}catch{}if(!saved)throw Error('İnternet bağlantısı gerekiyor. Bu program henüz cihazına kaydedilmemiş.');return saved.data;}
  const data=await loader();try{localStorage.setItem(k,JSON.stringify({data,savedAt:Date.now()}))}catch{}return data;
 }
 function show(){const dialog=document.createElement('dialog');dialog.innerHTML='<h2>İnternet bağlantısı gerekiyor</h2><p>Bu işlemi bağlantın geldiğinde kullanabilirsin.</p><button type="button">Tamam</button>';dialog.style.cssText='max-width:350px;border:1px solid #bbb;border-radius:20px;padding:24px';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();}
 document.addEventListener('click',e=>{if(navigator.onLine!==false)return;if(e.target.closest('[data-open-hakuna-admin]')){e.preventDefault();e.stopImmediatePropagation();show();}},true);
 window.HakunaOffline=Object.freeze({read,requireOnline,show,roomLaunch,saveRoomLaunch});
})();
