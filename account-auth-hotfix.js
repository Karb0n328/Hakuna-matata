import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';

const URL='https://zyrbbkbwrijnnykbgjvc.supabase.co';
const KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';
const supabase=createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

function message(root,text,ok=false){
  const el=root?.querySelector('.hakuna-cloud-error');
  if(!el)return;
  el.textContent=text;
  el.style.color=ok?'#15803d':'#b42318';
}

async function callAuth(mode,payload){
  const {data,error}=await supabase.functions.invoke('hakuna-account-auth',{body:{mode,...payload}});
  if(error){
    let detail='Hesap sunucusuna ulaşılamadı.';
    try{
      if(error.context?.json){const body=await error.context.json();detail=body?.error||detail;}
      else if(error.context instanceof Response){const body=await error.context.json();detail=body?.error||detail;}
    }catch{}
    throw new Error(detail);
  }
  if(data?.error)throw new Error(data.error);
  if(!data?.session?.access_token||!data?.session?.refresh_token)throw new Error('Oturum oluşturulamadı.');
  return data;
}

async function finishSession(data,root){
  const {error}=await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
  if(error)throw error;
  message(root,'Hesap bağlandı ✓ Verilerin hazırlanıyor…',true);
  setTimeout(()=>{
    root?.remove();
    location.reload();
  },500);
}

document.addEventListener('submit',async e=>{
  const form=e.target;
  if(!(form instanceof HTMLFormElement)||!form.closest('.hakuna-cloud-modal'))return;
  const kind=form.dataset.form;
  if(kind!=='register'&&kind!=='login')return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const root=form.closest('.hakuna-cloud-modal-backdrop');
  const btn=form.querySelector('.hakuna-cloud-submit');
  btn.disabled=true;
  try{
    const fd=new FormData(form);
    if(kind==='register'){
      const username=String(fd.get('username')||'').trim();
      const email=String(fd.get('email')||'').trim();
      const password=String(fd.get('password')||'');
      if(!/^[A-Za-z0-9._-]{3,32}$/.test(username))throw new Error('Kullanıcı adı 3-32 karakter olmalı; harf, rakam, nokta, tire ve alt çizgi kullan.');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Geçerli bir e-posta gir.');
      if(password.length<8)throw new Error('Şifre en az 8 karakter olmalı.');
      message(root,'Hesap oluşturuluyor…');
      const data=await callAuth('register',{username,email,password});
      await finishSession(data,root);
    }else{
      const identifier=String(fd.get('identifier')||'').trim();
      const password=String(fd.get('password')||'');
      if(!identifier||!password)throw new Error('Kullanıcı adı/e-posta ve şifre gerekli.');
      message(root,'Giriş yapılıyor…');
      const data=await callAuth('login',{identifier,password});
      await finishSession(data,root);
    }
  }catch(err){
    message(root,err?.message||String(err));
    btn.disabled=false;
  }
},true);

function patchConnectedLabel(){
  const card=document.querySelector('.hakuna-cloud-settings');
  const connected=!!card?.querySelector('.hakuna-cloud-dot');
  if(card){
    const title=card.querySelector('.card-title');
    const desired=connected?'☁️ Hesap bağlı':'☁️ Hakuna hesabı';
    if(title&&title.textContent!==desired)title.textContent=desired;
  }

  const foot=document.querySelector('.sidebar-foot .tiny-pill');
  if(foot){
    const desired=connected?'☁︎ Hesap bağlı · Senkron açık':'☁︎ Veriler bu cihazda';
    if(foot.textContent.trim()!==desired)foot.textContent=desired;
  }
}

let scheduled=false;
function schedulePatch(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    patchConnectedLabel();
  });
}

const view=document.querySelector('#view');
if(view)new MutationObserver(schedulePatch).observe(view,{childList:true});
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-nav],[data-mata-nav]'))schedulePatch();
},true);
document.addEventListener('hakuna:account-changed',schedulePatch);
window.addEventListener('focus',schedulePatch);
patchConnectedLabel();
