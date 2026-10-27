/* Private suggestion replies, visible on the author's home screen until dismissed. */
(()=>{
'use strict';
const URL='https://zyrbbkbwrijnnykbgjvc.supabase.co/rest/v1/';
const KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL',STORE='sb-zyrbbkbwrijnnykbgjvc-auth-token';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user='',items=[],lastCheck=0,checking=false;
function session(){try{const raw=JSON.parse(localStorage.getItem(STORE)||'null');return [raw,raw?.currentSession,raw?.session,raw?.data?.session].find(x=>x?.user?.id&&x?.access_token)||null}catch{return null}}
function headers(s){return {'apikey':KEY,'Authorization':'Bearer '+s.access_token,'Content-Type':'application/json'}}
function paint(){
 const view=document.getElementById('view'),title=document.getElementById('pageTitle');
 if(!view||title?.textContent?.trim()!=='Bugün')return;
 const s=session();if(!s||s.user.id!==user)return;
 const active=items.filter(x=>!x.reply_dismissed_at&&x.admin_reply?.trim());
 const host=view.querySelector('[data-suggestion-replies]');
 if(!active.length){host?.remove();return}
 const markup=active.map(x=>'<article class="suggestion-reply-card" data-reply-id="'+esc(x.id)+'"><div class="suggestion-reply-icon">💬</div><div class="suggestion-reply-content"><strong>Önerinize cevap</strong><p>'+esc(x.admin_reply)+'</p><small>Gönderdiğiniz öneri: '+esc(x.message)+'</small></div><button type="button" class="suggestion-reply-close" data-dismiss-reply="'+esc(x.id)+'" aria-label="Cevabı kapat">×</button></article>').join('');
 if(host){if(host.dataset.markup===markup)return;host.dataset.markup=markup;host.innerHTML=markup}
 else{const node=document.createElement('section');node.className='suggestion-reply-list';node.dataset.suggestionReplies='1';node.dataset.markup=markup;node.innerHTML=markup;view.prepend(node)}
 const root=view.querySelector('[data-suggestion-replies]');
 root.querySelectorAll('[data-dismiss-reply]').forEach(b=>b.onclick=async()=>{
  const id=b.dataset.dismissReply;const item=items.find(x=>x.id===id);if(!item)return;
  b.disabled=true;
  try{
   const s=session();if(!s||s.user.id!==user)throw Error('Oturum değişti');
   const res=await fetch(URL+'rpc/dismiss_suggestion_reply',{method:'POST',headers:headers(s),body:JSON.stringify({p_id:id})});
   if(!res.ok||await res.json()!==true)throw Error('Kapatma kaydedilemedi');
   item.reply_dismissed_at=new Date().toISOString();paint();
  }catch(e){b.disabled=false;alert('Cevap kapatılamadı: '+e.message)}
 });
}
async function refresh(force=false){
 const s=session();if(!s){user='';items=[];paint();return}
 if(s.user.id!==user){user=s.user.id;items=[];lastCheck=0}
 if(checking||(!force&&Date.now()-lastCheck<30000))return;
 checking=true;lastCheck=Date.now();
 try{
  const res=await fetch(URL+'gees_suggestions?select=id,message,admin_reply,replied_at,reply_dismissed_at&user_id=eq.'+encodeURIComponent(s.user.id)+'&admin_reply=not.is.null&order=replied_at.desc&limit=30',{headers:headers(s)});
  if(!res.ok)throw Error('Cevaplar alınamadı');
  const data=await res.json();if(session()?.user?.id!==user)return;items=data;paint();
 }catch(e){console.warn('Öneri cevapları',e)}finally{checking=false}
}
function start(){
 const view=document.getElementById('view');
 if(view){const obs=new MutationObserver(()=>paint());obs.observe(view,{childList:true});}
 void refresh(true);
 setInterval(()=>{if(document.visibilityState==='visible'){void refresh();paint()}},3000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh(true)});
 window.addEventListener('focus',()=>void refresh(true));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
