/* Hakuna Matata: Batu <-> Ayzos supervised homework. Server RLS enforces permissions. */
(()=>{
'use strict';
const BATU='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5',AYZOS='b5cdb555-dd57-4d05-9c34-6ff720333874';
const URL='https://zyrbbkbwrijnnykbgjvc.supabase.co';
const KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';
const STORE='sb-zyrbbkbwrijnnykbgjvc-auth-token';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const session=()=>{try{const s=JSON.parse(localStorage.getItem(STORE)||'null');return s?.access_token&&s?.user?.id?s:null}catch{return null}};
const role=()=>{const id=session()?.user?.id;return id===BATU?'mentor':id===AYZOS?'student':null};
const headers=()=>{const s=session();if(!s)throw Error('Önce hesabına giriş yap.');return {'apikey':KEY,'Authorization':'Bearer '+s.access_token,'Content-Type':'application/json'}};
async function api(path,method='GET',body){
 const r=await fetch(URL+'/rest/v1/'+path,{method,headers:{...headers(),...(method==='POST'?{'Prefer':'return=representation'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!r.ok){let m='İşlem başarısız';try{const e=await r.json();m=e.message||e.error||m}catch{}throw Error(m)}
 if(r.status===204||r.status===205)return [];
 const raw=await r.text();return raw?JSON.parse(raw):[];
}
async function rpc(id,completed){
 const r=await fetch(URL+'/rest/v1/rpc/guidance_set_completion',{method:'POST',headers:headers(),body:JSON.stringify({p_id:id,p_completed:completed})});
 if(!r.ok)throw Error('Tamamlama kaydedilemedi.');if(!await r.json())throw Error('Ödev bulunamadı.');
}
let cached=[],lastFetch=0;
async function fetchAll(){cached=await api('guidance_homework?select=*&order=due_date.asc.nullslast,created_at.desc');lastFetch=Date.now();return cached}
const subjectOpts=['Matematik','Türkçe','Fen','Sosyal','İngilizce','Diğer'].map(s=>'<option>'+s+'</option>').join('');
function form(item){
 return '<form id="guidance-form" class="gd-form"><label>Ödev adı<input name="title" maxlength="200" minlength="2" required placeholder="Örn. Matematik 3 test" value="'+esc(item?.title||'')+'"></label><label>Ders<select name="subject">'+subjectOpts.replace('<option>'+esc(item?.subject||'')+'</option>','<option selected>'+esc(item?.subject||'')+'</option>')+'</select></label><label>Teslim tarihi<input name="due_date" type="date" value="'+esc(item?.due_date||date())+'"></label><label>Açıklama<textarea name="details" maxlength="2000" rows="2" placeholder="Konu, sayfa veya yönerge">'+esc(item?.details||'')+'</textarea></label><button class="primary-btn" type="submit">'+(item?'Kaydet':'＋ Ödev ekle')+'</button>'+(item?'<button type="button" class="secondary-btn" data-cancel-edit>Vazgeç</button>':'')+'</form>';
}
function cards(items,mentor){
 return items.length?items.map(t=>'<article class="gd-task '+(t.completed?'gd-complete':'')+'"><div class="gd-task-top"><span class="gd-subject">'+esc(t.subject)+'</span><span class="gd-date">'+(t.due_date?esc(t.due_date):'Tarih yok')+'</span></div><strong>'+esc(t.title)+'</strong>'+(t.details?'<p>'+esc(t.details)+'</p>':'')+'<div class="gd-task-bottom"><span class="gd-state">'+(t.completed?'✓ Tamamlandı':t.due_date&&t.due_date<date()?'● Gecikti':'○ Bekliyor')+'</span><div class="gd-actions">'+(mentor?'<button type="button" data-edit="'+esc(t.id)+'">Düzenle</button><button type="button" data-delete="'+esc(t.id)+'">Sil</button>':'<button type="button" data-complete="'+esc(t.id)+'">'+(t.completed?'Geri al':'✓ Tamamladım')+'</button>')+'</div></div></article>').join(''):'<div class="gd-empty">Henüz ödev yok. İlk ödevini ekleyebilirsin.</div>';
}
const summary=items=>{const done=items.filter(x=>x.completed).length;return '<div class="gd-summary"><div><small>TOPLAM</small><strong>'+items.length+'</strong></div><div><small>TAMAMLANAN</small><strong>'+done+'</strong></div><div><small>BEKLEYEN</small><strong>'+(items.length-done)+'</strong></div><div><small>İLERLEME</small><strong>%'+(items.length?Math.round(done/items.length*100):0)+'</strong></div></div>'};
function bindForm(view,mentor,item){
 const f=view.querySelector('.gd-side #guidance-form');if(!f)return;
 f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector('[type=submit]');b.disabled=true;let msg=f.querySelector('.gd-feedback');if(!msg){msg=document.createElement('div');msg.className='gd-feedback';msg.setAttribute('role','status');f.append(msg)}msg.textContent='Kaydediliyor…';
 try{const data=new FormData(f);const payload={title:String(data.get('title')).trim(),subject:String(data.get('subject')),details:String(data.get('details')).trim(),due_date:data.get('due_date')||null};
 if(item){if(!mentor)throw Error('Düzenleme yetkin yok.');await api('guidance_homework?id=eq.'+encodeURIComponent(item.id),'PATCH',payload)}
 else await api('guidance_homework','POST',{...payload,student_id:AYZOS,created_by:session().user.id});
 await draw(view,mentor?'guidance':'tasks');
 }catch(err){msg.textContent='Kaydedilemedi: '+err.message;b.disabled=false}
 };
 f.querySelector('[data-cancel-edit]')?.addEventListener('click',()=>draw(view,'guidance'));
}
async function draw(view,page){
 const r=role();if(!r)return;const mentor=r==='mentor';view.innerHTML='<div class="gd-loading">Ödevler yükleniyor…</div>';
 try{
 const items=await fetchAll();const today=date(),todays=items.filter(x=>!x.due_date||x.due_date<=today);
 const list=page==='today'?todays:page==='plan'?items:items;
 const title=mentor?'Ayzos · Rehberlik':page==='today'?'Bugünkü ödevler':page==='plan'?'Ödev planım':'Ödevlerim';
 view.innerHTML='<div class="gd-shell"><div class="gd-heading"><span class="gd-kicker">'+(mentor?'REHBERLİK / AYZOS':'HAKUNA / ÖDEV TAKİBİ')+'</span><h2>'+title+'</h2><p>'+(mentor?'Kardeşinin ödevlerini yönet, tamamlananları ve gecikenleri takip et.':'Ödev ekleyebilir ve tamamlayabilirsin. Ödev düzenleme ve silme yalnızca rehberinde.')+'</p></div>'+summary(items)+'<div class="gd-layout"><section class="card gd-list"><div class="gd-section-head"><h3>'+(page==='today'?'Bugün ve gecikenler':page==='plan'?'Ödev takvimi':'Tüm ödevler')+'</h3><span>'+list.length+' ödev</span></div><div class="gd-items">'+cards(list,mentor)+'</div></section><aside class="card gd-side"><h3>＋ '+(mentor?'Ayzos’a ödev ver':'Yeni ödev ekle')+'</h3>'+form()+'</aside></div><div class="gd-footer">Veriler iki hesap arasında Supabase ile eşitlenir. <button type="button" data-refresh>Yenile ↻</button></div></div>';
 bindForm(view,mentor);
 view.querySelector('[data-refresh]').onclick=()=>draw(view,page);
 view.querySelectorAll('[data-complete]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const t=items.find(x=>x.id===b.dataset.complete);await rpc(t.id,!t.completed);await draw(view,page)}catch(err){alert(err.message);b.disabled=false}});
 view.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{if(!mentor)return;const item=items.find(x=>x.id===b.dataset.edit);const side=view.querySelector('.gd-side');side.innerHTML='<h3>✎ Ödevi düzenle</h3><p class="gd-edit-hint">Değişikliklerini yapıp Kaydet butonuna bas.</p>'+form(item);side.classList.add('gd-editing');bindForm(view,mentor,item);side.scrollIntoView({behavior:'smooth',block:'start'});side.querySelector('[name=title]')?.focus({preventScroll:true})});
 view.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!mentor||!confirm('Bu ödev silinsin mi?'))return;b.disabled=true;try{await api('guidance_homework?id=eq.'+encodeURIComponent(b.dataset.delete),'DELETE');await draw(view,page)}catch(err){alert(err.message);b.disabled=false}});
 }catch(err){view.innerHTML='<div class="card"><div class="card-body">Ödevler yüklenemedi: '+esc(err.message)+' <button class="secondary-btn" data-retry>Yeniden dene</button></div></div>';view.querySelector('[data-retry]').onclick=()=>draw(view,page)}
}
window.HakunaGuidance={role,render:(view,page)=>{void draw(view,page)},getCached:()=>cached,lastFetch:()=>lastFetch};
})();
