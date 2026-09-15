import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';

const URL='https://zyrbbkbwrijnnykbgjvc.supabase.co';
const KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';
const RECOVERY_REDIRECT='https://karb0n328.github.io/Hakuna-matata/?recovery=1';
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

function forgotButtonHTML(){
  return '<button type="button" class="hakuna-forgot-btn" data-hakuna-forgot>Şifremi unuttum</button>';
}

function patchForgotButton(){
  const login=document.querySelector('.hakuna-cloud-modal [data-form="login"]');
  if(!login||login.querySelector('[data-hakuna-forgot]'))return;
  const submit=login.querySelector('.hakuna-cloud-submit');
  if(!submit)return;
  submit.insertAdjacentHTML('afterend',forgotButtonHTML());
  const btn=login.querySelector('[data-hakuna-forgot]');
  btn.style.cssText='display:block;width:100%;margin-top:10px;border:0;background:transparent;color:#1f6fd0;font-weight:800;cursor:pointer;padding:7px 4px';
  btn.onclick=()=>openForgotPassword(login.closest('.hakuna-cloud-modal-backdrop'));
}

function openForgotPassword(root){
  const modal=root?.querySelector('.hakuna-cloud-modal');
  if(!modal)return;
  modal.innerHTML=`
    <button class="hakuna-cloud-close" aria-label="Kapat">×</button>
    <h2>Şifreni sıfırla</h2>
    <p>Hesabında kullandığın e-posta adresini gir. Şifre yenileme bağlantısını o adrese göndereceğiz.</p>
    <form data-hakuna-reset-request>
      <div class="hakuna-cloud-field"><label>E-posta</label><input name="email" type="email" autocomplete="email" required></div>
      <button class="hakuna-cloud-submit" type="submit">Sıfırlama bağlantısı gönder</button>
    </form>
    <div class="hakuna-cloud-error"></div>
    <button type="button" data-back-login style="display:block;width:100%;margin-top:8px;border:0;background:transparent;color:#1f6fd0;font-weight:800;cursor:pointer;padding:8px">← Giriş ekranına dön</button>
  `;
  modal.querySelector('.hakuna-cloud-close').onclick=()=>root.remove();
  modal.querySelector('[data-back-login]').onclick=()=>{root.remove();document.querySelector('.hakuna-account-home button, .hakuna-cloud-settings .hakuna-cloud-btn')?.click();};
  modal.querySelector('[data-hakuna-reset-request]').onsubmit=async e=>{
    e.preventDefault();
    const form=e.currentTarget,button=form.querySelector('button'),email=String(new FormData(form).get('email')||'').trim();
    button.disabled=true;
    message(root,'Sıfırlama bağlantısı hazırlanıyor…');
    try{
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_REDIRECT});
      if(error)throw error;
      message(root,'Eğer bu e-posta bir Hakuna hesabına bağlıysa sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.',true);
      form.querySelector('input').disabled=true;
      button.textContent='Bağlantı gönderildi';
    }catch(err){
      const text=String(err?.message||err||'');
      if(/not authorized|email address not authorized/i.test(text)){
        message(root,'Mail gönderimi henüz genel kullanıcılara açılmamış. Hakuna SMTP ayarı tamamlanmalı.');
      }else if(/redirect/i.test(text)){
        message(root,'Şifre sıfırlama yönlendirmesi henüz Supabase tarafında izinli değil.');
      }else{
        message(root,'Şifre sıfırlama maili şu anda gönderilemedi. Biraz sonra tekrar dene.');
      }
      button.disabled=false;
    }
  };
}

function showNewPasswordModal(){
  if(document.querySelector('[data-hakuna-new-password]'))return;
  document.querySelector('.hakuna-cloud-modal-backdrop')?.remove();
  const root=document.createElement('div');
  root.className='hakuna-cloud-modal-backdrop';
  root.setAttribute('data-hakuna-new-password','');
  root.innerHTML=`<div class="hakuna-cloud-modal" role="dialog" aria-modal="true">
    <h2>Yeni şifre belirle</h2>
    <p>Yeni şifren en az 8 karakter olmalı.</p>
    <form data-hakuna-new-password-form>
      <div class="hakuna-cloud-field"><label>Yeni şifre</label><input name="password" type="password" autocomplete="new-password" minlength="8" required></div>
      <div class="hakuna-cloud-field"><label>Yeni şifre tekrar</label><input name="confirm" type="password" autocomplete="new-password" minlength="8" required></div>
      <button class="hakuna-cloud-submit" type="submit">Şifreyi değiştir</button>
    </form>
    <div class="hakuna-cloud-error"></div>
  </div>`;
  document.body.append(root);
  root.querySelector('form').onsubmit=async e=>{
    e.preventDefault();
    const form=e.currentTarget,btn=form.querySelector('button'),fd=new FormData(form);
    const password=String(fd.get('password')||''),confirm=String(fd.get('confirm')||'');
    if(password.length<8){message(root,'Şifre en az 8 karakter olmalı.');return;}
    if(password!==confirm){message(root,'Şifreler eşleşmiyor.');return;}
    btn.disabled=true;
    message(root,'Şifre değiştiriliyor…');
    try{
      const {error}=await supabase.auth.updateUser({password});
      if(error)throw error;
      message(root,'Şifren değiştirildi ✓',true);
      history.replaceState({},document.title,location.pathname);
      setTimeout(()=>location.reload(),800);
    }catch(err){
      message(root,err?.message||'Şifre değiştirilemedi. Bağlantının süresi dolmuş olabilir.');
      btn.disabled=false;
    }
  };
}

let recoverySeen=false;
supabase.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY'){
    recoverySeen=true;
    setTimeout(showNewPasswordModal,0);
  }
});

async function recoverFromExistingSession(){
  const wantsRecovery=new URLSearchParams(location.search).get('recovery')==='1'||location.hash.includes('type=recovery');
  if(!wantsRecovery||recoverySeen)return;
  const {data}=await supabase.auth.getSession();
  if(data.session)showNewPasswordModal();
}

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
const observer=new MutationObserver(()=>{
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    patchConnectedLabel();
    patchForgotButton();
  });
});
observer.observe(document.documentElement,{childList:true,subtree:true});
patchConnectedLabel();
patchForgotButton();
recoverFromExistingSession();
