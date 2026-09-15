import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';

const SUPABASE_URL='https://zyrbbkbwrijnnykbgjvc.supabase.co';
const SUPABASE_KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';
const TARGET_USER_ID='9731add6-573b-4124-8383-e447b0cdc401';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

let shown=false;

function showPopup(){
  if(shown||document.querySelector('[data-hakuna-targeted-popup]'))return;
  shown=true;

  const backdrop=document.createElement('div');
  backdrop.setAttribute('data-hakuna-targeted-popup','');
  backdrop.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.48);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)';

  const card=document.createElement('div');
  card.setAttribute('role','dialog');
  card.setAttribute('aria-modal','true');
  card.setAttribute('aria-label','Mesaj');
  card.style.cssText='position:relative;width:min(420px,100%);background:#fff;border-radius:22px;padding:34px 26px 28px;box-shadow:0 24px 70px rgba(0,0,0,.28);text-align:center;font-family:inherit;color:#111827';

  const close=document.createElement('button');
  close.type='button';
  close.setAttribute('aria-label','Kapat');
  close.textContent='×';
  close.style.cssText='position:absolute;right:14px;top:10px;border:0;background:transparent;font-size:32px;line-height:1;color:#6b7280;cursor:pointer;padding:6px 10px';

  const title=document.createElement('div');
  title.textContent='Osiye aşığım';
  title.style.cssText='font-size:27px;font-weight:900;line-height:1.25;letter-spacing:-.02em';

  close.addEventListener('click',()=>backdrop.remove());
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)backdrop.remove();});
  document.addEventListener('keydown',function onKey(e){
    if(e.key==='Escape'){
      backdrop.remove();
      document.removeEventListener('keydown',onKey);
    }
  });

  card.append(close,title);
  backdrop.append(card);
  document.body.append(backdrop);
}

async function checkUser(){
  try{
    const {data}=await supabase.auth.getSession();
    if(data?.session?.user?.id===TARGET_USER_ID)showPopup();
  }catch{}
}

checkUser();
supabase.auth.onAuthStateChange((_event,session)=>{
  if(session?.user?.id===TARGET_USER_ID)showPopup();
});
