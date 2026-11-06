/* Offline views never cache tokens or remote writes. Read snapshots are account-scoped. */
(()=>{'use strict';
 const message='İnternet bağlantısı gerekiyor';
 function requireOnline(){if(navigator.onLine===false)throw Error(message);}
 function key(path){let s;try{s=JSON.parse(localStorage.getItem('sb-zyrbbkbwrijnnykbgjvc-auth-token')||'null')}catch{}if(!s?.user?.id)throw Error('Önce hesabına giriş yap.');return 'hakuna.offline.read.v1.'+s.user.id+'.'+path;}
 async function read(path,loader){const k=key(path);if(navigator.onLine===false){let saved;try{saved=JSON.parse(localStorage.getItem(k))}catch{}if(!saved)throw Error('İnternet bağlantısı gerekiyor. Bu program henüz cihazına kaydedilmemiş.');return saved.data;}
  const data=await loader();try{localStorage.setItem(k,JSON.stringify({data,savedAt:Date.now()}))}catch{}return data;
 }
 function show(){const dialog=document.createElement('dialog');dialog.innerHTML='<h2>İnternet bağlantısı gerekiyor</h2><p>Bu işlemi bağlantın geldiğinde kullanabilirsin.</p><button type="button">Tamam</button>';dialog.style.cssText='max-width:350px;border:1px solid #bbb;border-radius:20px;padding:24px';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();}
 document.addEventListener('click',e=>{if(navigator.onLine!==false)return;if(e.target.closest('[data-open-hakuna-admin]')){e.preventDefault();e.stopImmediatePropagation();show();}},true);
 window.HakunaOffline=Object.freeze({read,requireOnline,show});
})();
