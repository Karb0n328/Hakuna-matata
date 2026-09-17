(() => {
  'use strict';

  const PROJECT_REF='zyrbbkbwrijnnykbgjvc';
  const SUPABASE_URL=`https://${PROJECT_REF}.supabase.co`;
  const SUPABASE_KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';
  const AUTH_STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
  const LAST_SENT_KEY='hakuna.lastSeenSentAt.v1';
  const MIN_WRITE_INTERVAL=5*60*1000;

  let busy=false;
  let retryTimer=null;

  function readSession(){
    try{
      const raw=localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      const candidates=[parsed,parsed?.currentSession,parsed?.session,parsed?.data?.session];
      for(const value of candidates){
        if(value?.access_token&&value?.user?.id)return value;
      }
    }catch{}
    return null;
  }

  function lastSentAt(){
    const n=Number(localStorage.getItem(LAST_SENT_KEY)||0);
    return Number.isFinite(n)?n:0;
  }

  async function touch({force=false}={}){
    if(busy||document.visibilityState==='hidden'||!navigator.onLine)return false;
    if(!force&&Date.now()-lastSentAt()<MIN_WRITE_INTERVAL)return false;

    const session=readSession();
    const accessToken=session?.access_token;
    const userId=session?.user?.id;
    if(!accessToken||!userId)return false;

    busy=true;
    try{
      const now=new Date().toISOString();
      const response=await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,{
        method:'PATCH',
        headers:{
          apikey:SUPABASE_KEY,
          Authorization:`Bearer ${accessToken}`,
          'Content-Type':'application/json',
          Prefer:'return=minimal'
        },
        body:JSON.stringify({last_seen_at:now})
      });

      if(response.ok){
        localStorage.setItem(LAST_SENT_KEY,String(Date.now()));
        document.documentElement.dataset.hakunaLastSeen='ok';
        return true;
      }

      document.documentElement.dataset.hakunaLastSeen=`http-${response.status}`;
      if(response.status===401||response.status===403){
        clearTimeout(retryTimer);
        retryTimer=setTimeout(()=>touch({force:true}),15000);
      }
      return false;
    }catch(error){
      console.warn('Hakuna last seen update',error);
      document.documentElement.dataset.hakunaLastSeen='offline';
      return false;
    }finally{
      busy=false;
    }
  }

  const wake=()=>void touch();
  window.addEventListener('focus',wake,{passive:true});
  window.addEventListener('online',()=>void touch({force:true}),{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')wake();
  });

  setTimeout(()=>void touch({force:true}),800);
  setInterval(()=>{
    if(document.visibilityState==='visible')void touch();
  },MIN_WRITE_INTERVAL);

  window.HakunaLastSeen={touch};
})();
