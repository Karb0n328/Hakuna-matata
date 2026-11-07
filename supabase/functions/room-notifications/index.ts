import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import webpush from 'npm:web-push@3.6.7';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Content-Type':'application/json'};
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
function validSub(s:any){try{const u=new URL(s.endpoint);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)&&s.endpoint.length<2048&&/^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh)&&/^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth)}catch{return false}}
async function keys(){let {data,error}=await db.from('room_push_keys').select('*').eq('id',true).maybeSingle();if(error)throw error;if(!data){const k=webpush.generateVAPIDKeys();const saved=await db.from('room_push_keys').upsert({id:true,public_key:k.publicKey,private_key:k.privateKey},{onConflict:'id',ignoreDuplicates:true});if(saved.error)throw saved.error;const r=await db.from('room_push_keys').select('*').eq('id',true).single();if(r.error)throw r.error;data=r.data;}return data;}
type PushRow = {subscription: any; due_at?: string};
async function sendPush(row: PushRow, payload: object, key: Awaited<ReturnType<typeof keys>>) {
  if (!validSub(row.subscription)) return false;
  try {
    const request = webpush.generateRequestDetails(row.subscription, JSON.stringify(payload), {
      TTL: 300,
      urgency: 'normal',
      vapidDetails: {
        subject: 'https://karb0n328.github.io/Hakuna-matata/',
        publicKey: key.public_key,
        privateKey: key.private_key
      }
    });
    const response = await fetch(request.endpoint, {
      method: 'POST',
      headers: request.headers,
      body: new Uint8Array(request.body),
      redirect: 'error',
      signal: AbortSignal.timeout(8000)
    });
    if ([404, 410].includes(response.status)) {
      await db.from('room_push_subscriptions').delete().eq('endpoint', row.subscription.endpoint);
    }
    return response.ok;
  } catch {
    return false;
  }
}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Method'},405);try{
 if(Number(req.headers.get('content-length')||0)>12000)return reply({error:'Too large'},413);
 const text=await req.text();if(text.length>12000)return reply({error:'Too large'},413);const b=JSON.parse(text);
 if (b.action === 'timer-dispatch') {
   const token = req.headers.get('x-timer-dispatch');
   if (!token) return reply({error:'Forbidden'},403);
   const jobs = await db.rpc('study_timer_push_claim', {p_token:token});
   if (jobs.error) return reply({error:'Dispatch rejected'}, jobs.error.code === '42501' ? 403 : 500);
   if (!jobs.data.length) return reply({ok:true,sent:0});
   const key = await keys();
   const results = await Promise.all(jobs.data.map((job: PushRow) =>
     sendPush(job, {kind:'timer-finished', endAt:Date.parse(job.due_at!)}, key)));
   return reply({ok:true,sent:results.filter(Boolean).length});
 }
 if(b.action==='pause'){if(!/^[0-9a-f-]{36}$/.test(b.token||''))return reply({error:'Invalid token'},400);const r=await db.rpc('room_push_pause',{p_token:b.token});if(r.error)throw r.error;return reply({ok:r.data},r.data?200:403);}
 const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');const {data:{user},error}=await db.auth.getUser(jwt);if(error||!user)return reply({error:'Giriş gerekli'},401);
 if (b.action === 'timer-schedule') {
   const endAt = b.endAt;
   const now = Date.now();
   if (typeof b.endpoint !== 'string' || b.endpoint.length > 2048 ||
       (endAt !== null && (!Number.isSafeInteger(endAt) || endAt > now + 86400000))) {
     return reply({error:'Invalid timer'},400);
   }
   const due = endAt !== null && endAt >= now - 120000 ? new Date(endAt).toISOString() : null;
   const result = await db.rpc('study_timer_push_schedule', {
     p_user:user.id, p_endpoint:b.endpoint, p_due:due
   });
   if (result.error) throw result.error;
   return reply({ok:true});
 }
 if(b.action==='config'){const k=await keys();return reply({publicKey:k.public_key});}
 if(b.action==='subscribe'){if(!validSub(b.subscription))return reply({error:'Invalid subscription'},400);const existing=await db.from('room_push_subscriptions').select('user_id').eq('endpoint',b.subscription.endpoint).maybeSingle();if(existing.data&&existing.data.user_id!==user.id)return reply({error:'Bu cihazda önce eski hesabın bildirimini kapat.'},409);const r=await db.from('room_push_subscriptions').upsert({endpoint:b.subscription.endpoint,user_id:user.id,subscription:b.subscription,updated_at:new Date().toISOString()});if(r.error)throw r.error;return reply({ok:true});}
 if(b.action==='unsubscribe'){const r=await db.from('room_push_subscriptions').delete().eq('endpoint',b.endpoint).eq('user_id',user.id);if(r.error)throw r.error;return reply({ok:true});}
 if(b.action!=='started')return reply({error:'Invalid action'},400);
 const session=await db.from('study_room_sessions').select('id,room_id').eq('user_id',user.id).eq('room_id',b.roomId).is('ended_at',null).order('started_at',{ascending:false}).limit(1).maybeSingle();if(session.error)throw session.error;if(!session.data)return reply({ok:true,sent:0});
 const subscriptions=await db.from('room_push_subscriptions').select('endpoint,subscription').eq('user_id',user.id);if(subscriptions.error)throw subscriptions.error;if(!subscriptions.data?.length)return reply({ok:true,sent:0});
 const claim=await db.rpc('room_push_claim',{p_session:session.data.id,p_user:user.id});if(claim.error)throw claim.error;if(!claim.data)return reply({ok:true,sent:0});
 const room=await db.from('study_rooms').select('name,short_code,is_active').eq('id',b.roomId).single();if(room.error)throw room.error;if(!room.data.is_active)return reply({ok:true,sent:0});
 const action=await db.from('room_push_actions').insert({session_id:session.data.id,user_id:user.id}).select('token').single();if(action.error)throw action.error;const k=await keys();
 const payload = {roomId:b.roomId, code:room.data.short_code, pauseToken:action.data.token};
 const results = await Promise.all(subscriptions.data.map(row => sendPush(row, payload, k)));
 return reply({ok:true,sent:results.filter(Boolean).length});
 }catch{return reply({error:'Bildirim işlemi tamamlanamadı.'},500);}});
