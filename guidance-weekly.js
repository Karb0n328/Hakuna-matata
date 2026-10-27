/* Digital weekly planner: Batu edits a full week; Ayzos sees only today's schedule. */
(()=>{
'use strict';
const URL='https://zyrbbkbwrijnnykbgjvc.supabase.co/rest/v1/',KEY='sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL',STORE='sb-zyrbbkbwrijnnykbgjvc-auth-token';
const DAYS=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const SUBJECTS=['Matematik','Türkçe','Fen','Sosyal','İngilizce','Okuma','Tekrar','Diğer'];
const EMOJI={'Matematik':'🔢','Türkçe':'📖','Fen':'🔬','Sosyal':'🌍','İngilizce':'🌟','Okuma':'📚','Tekrar':'🧠','Diğer':'✨'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const parse=s=>new Date(s+'T12:00:00');
const shift=(s,n)=>{let d=parse(s);d.setDate(d.getDate()+n);return date(d)};
const monday=()=>{let d=new Date(),dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow);return date(d)};
const dow=()=> (new Date().getDay()+6)%7;
let selectedWeek=monday();
function headers(){let s;try{s=JSON.parse(localStorage.getItem(STORE)||'null')}catch{}if(!s?.access_token)throw Error('Oturum bulunamadı. Yeniden giriş yap.');return {'apikey':KEY,'Authorization':'Bearer '+s.access_token,'Content-Type':'application/json'}}
async function request(path,method='GET',data){
 const res=await fetch(URL+path,{method,headers:{...headers(),...(method==='POST'?{'Prefer':'return=representation'}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 if(!res.ok){let msg='Bağlantı hatası';try{const e=await res.json();msg=e.message||e.error||msg}catch{}throw Error(msg)}
 if(res.status===204)return [];const raw=await res.text();return raw?JSON.parse(raw):[];
}
function form(day,item){
 return '<form class="gw-form" data-day="'+day+'" data-id="'+esc(item?.id||'')+'"><label>Ders<select name="subject">'+SUBJECTS.map(s=>'<option value="'+esc(s)+'" '+(s===(item?.subject||'Matematik')?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select></label><label>Yapılacak çalışma<input name="title" required minlength="2" maxlength="200" placeholder="Örn. Kesirler testi" value="'+esc(item?.title||'')+'"></label><label>Hedef / süre<input name="target" maxlength="160" placeholder="Örn. 20 soru · 30 dk" value="'+esc(item?.target||'')+'"></label><div class="gw-form-actions"><button class="primary-btn" type="submit">'+(item?'Değişiklikleri kaydet':'Programa ekle')+'</button><button class="secondary-btn" type="button" data-cancel>Vazgeç</button></div><div class="gw-feedback" role="status"></div></form>';
}
function itemCard(t,done,mentor){
 return '<article class="gw-item '+(done?'gw-done':'')+'"><span class="gw-item-emoji">'+(EMOJI[t.subject]||'✨')+'</span><div class="gw-item-info"><strong>'+esc(t.title)+'</strong><small>'+esc(t.subject)+(t.target?' · '+esc(t.target):'')+'</small></div>'+(mentor?'<div class="gw-item-actions"><button type="button" data-edit="'+esc(t.id)+'" aria-label="Düzenle">✎</button><button type="button" data-delete="'+esc(t.id)+'" aria-label="Sil">×</button></div>':'<button type="button" class="gw-check" data-check="'+esc(t.id)+'" aria-label="'+(done?'Tamamlamayı geri al':'Tamamlandı işaretle')+'">'+(done?'✓':'○')+'</button>')+'</article>';
}
function statusLine(total,done){return '<div class="gw-progress"><div class="gw-progress-bar"><span style="width:'+(total?Math.round(done/total*100):0)+'%"></span></div><small>'+done+' / '+total+' tamamlandı</small></div>'}
async function render(view,page,adHoc,mentor){
 view.innerHTML='<div class="gd-loading">Haftalık program yükleniyor…</div>';
 try{
 const week=mentor?selectedWeek:monday(),end=shift(week,6);
 const plan=await request('guidance_weekly_plan?select=*&week_start=eq.'+week+'&order=weekday.asc,sort_order.asc,created_at.asc');
 // Fetch only the current week's completion records, scoped by the plan ids.
 const doneRows=plan.length?await request('guidance_weekly_done?select=plan_id&plan_id=in.('+plan.map(p=>p.id).join(',')+')'):[];
 const done=new Set(doneRows.map(x=>x.plan_id));
 const total=plan.length,completed=plan.filter(x=>done.has(x.id)).length;
 if(mentor){
 const cells=DAYS.map((day,i)=>{const items=plan.filter(p=>p.weekday===i);const finished=items.filter(p=>done.has(p.id)).length;return '<section class="gw-day" data-weekday="'+i+'"><div class="gw-day-head"><div><span>'+day+'</span><small>'+shift(week,i).slice(5).split('-').reverse().join('.')+'</small><small class="gw-day-count">✓ '+finished+' / '+items.length+' tamamlandı</small></div><button type="button" data-add="'+i+'" title="Bu güne çalışma ekle">＋</button></div><div class="gw-day-items">'+(items.map(t=>itemCard(t,done.has(t.id),true)).join('')||'<div class="gw-day-empty">Henüz çalışma yok</div>')+'</div><div class="gw-day-editor"></div></section>'}).join('');
 view.innerHTML='<div class="gw-shell gw-mentor"><div class="gw-top"><div><div class="gd-kicker">REHBERLİK · AYZOS</div><h2>Haftalık çalışma çizelgesi</h2><p>Fotoğraftaki çizelge gibi: her güne tek dokunuşla çalışma ekle, düzenle veya sil.</p></div><div class="gw-week-controls"><button type="button" data-week="-7">‹</button><strong>'+week.split('-').reverse().join('.')+' – '+end.split('-').reverse().join('.')+'</strong><button type="button" data-week="7">›</button><button type="button" data-this-week>Bu hafta</button></div></div>'+statusLine(total,completed)+'<div class="gw-grid">'+cells+'</div><section class="gw-extras"><h3>Eklenen bağımsız ödevler</h3><p>Önceden eklediğin ödevler silinmedi. Onları aşağıdan düzenleyebilirsin.</p><div class="gw-adhoc"></div></section></div>';
 const ad=view.querySelector('.gw-adhoc');ad.innerHTML=adHoc.length?adHoc.map(t=>'<div class="gw-extra-row"><span>'+esc(t.title)+' · '+esc(t.due_date||'Tarihsiz')+'</span><div><button data-old-edit="'+esc(t.id)+'">Düzenle</button><button data-old-delete="'+esc(t.id)+'">Sil</button></div></div>').join(''):'<p>Henüz ek ödev yok.</p>';
 view.querySelectorAll('[data-week]').forEach(b=>b.onclick=()=>{selectedWeek=shift(week,Number(b.dataset.week));render(view,page,adHoc,mentor)});
 view.querySelector('[data-this-week]').onclick=()=>{selectedWeek=monday();render(view,page,adHoc,mentor)};
 view.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>openEditor(Number(b.dataset.add)));
 view.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const t=plan.find(p=>p.id===b.dataset.edit);if(t)openEditor(t.weekday,t)});
 view.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Bu çalışmayı programdan silmek istiyor musun?'))return;try{await request('guidance_weekly_plan?id=eq.'+b.dataset.delete,'DELETE');render(view,page,adHoc,mentor)}catch(e){alert(e.message)}});
 view.querySelectorAll('[data-old-edit]').forEach(b=>b.onclick=()=>{const t=adHoc.find(x=>x.id===b.dataset.oldEdit);if(!t)return;const title=prompt('Ödev adı',t.title);if(title===null)return;const trimmed=title.trim();if(trimmed.length<2){alert('En az iki karakter yaz.');return}request('guidance_homework?id=eq.'+t.id,'PATCH',{title:trimmed}).then(()=>{t.title=trimmed;render(view,page,adHoc,mentor)}).catch(e=>alert(e.message))});
 view.querySelectorAll('[data-old-delete]').forEach(b=>b.onclick=()=>{if(confirm('Ödev silinsin mi?'))request('guidance_homework?id=eq.'+b.dataset.oldDelete,'DELETE').then(()=>{adHoc=adHoc.filter(x=>x.id!==b.dataset.oldDelete);render(view,page,adHoc,mentor)}).catch(e=>alert(e.message))});
 function openEditor(day,item){view.querySelectorAll('.gw-day-editor').forEach(x=>x.innerHTML='');const host=view.querySelector('[data-weekday="'+day+'"] .gw-day-editor');host.innerHTML=form(day,item);host.scrollIntoView({block:'nearest',behavior:'smooth'});const f=host.querySelector('form');f.querySelector('[data-cancel]').onclick=()=>host.innerHTML='';f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector('[type=submit]');b.disabled=true;f.querySelector('.gw-feedback').textContent='Kaydediliyor…';const fd=new FormData(f),data={subject:fd.get('subject'),title:String(fd.get('title')).trim(),target:String(fd.get('target')).trim()};try{if(item)await request('guidance_weekly_plan?id=eq.'+item.id,'PATCH',data);else await request('guidance_weekly_plan','POST',{...data,week_start:week,weekday:day,sort_order:plan.filter(p=>p.weekday===day).length});render(view,page,adHoc,mentor)}catch(err){f.querySelector('.gw-feedback').textContent=err.message;b.disabled=false}};f.querySelector('[name=title]').focus({preventScroll:true})}
 }else{
 const day=dow(),todays=plan.filter(p=>p.weekday===day),doneToday=todays.filter(p=>done.has(p.id)).length;
 const extras=adHoc.filter(t=>!t.completed&&(!t.due_date||t.due_date<=date(new Date())));
 view.innerHTML='<div class="gw-shell gw-student"><div class="gw-kid-hero"><div>🌞 ⭐ 🚀</div><span>AYZOS'+"'"+'UN GÜNLÜK MACERASI</span><h2>'+DAYS[day]+' görevlerin!</h2><p>Bugün harika şeyler başarabilirsin. Bir görev seç ve başla!</p>'+statusLine(todays.length,doneToday)+'</div><div class="gw-today-head"><h3>📋 Bugünkü programım</h3><small>'+DAYS[day]+' · '+date(new Date()).split('-').reverse().join('.')+'</small></div><div class="gw-today-list">'+(todays.length?todays.map(t=>itemCard(t,done.has(t.id),false)).join(''):'<div class="gw-cheer">🎉 Bugün için planlanmış çalışma yok. Keyifli bir gün!</div>')+'</div>'+(extras.length?'<div class="gw-extra-student"><h3>📌 Ek ödevlerim</h3>'+extras.map(t=>'<article class="gw-item"><span class="gw-item-emoji">📝</span><div class="gw-item-info"><strong>'+esc(t.title)+'</strong><small>'+esc(t.subject)+'</small></div><button class="gw-check" data-adhoc-check="'+esc(t.id)+'">○</button></article>').join('')+'</div>':'')+'<form class="gw-self-add"><h3>✏️ Kendi ödevimi ekle</h3><input name="title" minlength="2" maxlength="200" required placeholder="Örn. 10 sayfa kitap oku"><button type="submit">＋ Ödev ekle</button><small>Eklediğin ödevleri yalnızca rehberin düzenleyebilir veya silebilir.</small><div role="status" class="gw-self-status"></div></form><p class="gw-kid-note">💜 Haftalık programını rehberin hazırlıyor. Tamamladıklarını işaretle!</p></div>';
 const selfForm=view.querySelector('.gw-self-add');selfForm.onsubmit=async e=>{e.preventDefault();const btn=selfForm.querySelector('button');btn.disabled=true;try{const title=selfForm.querySelector('[name=title]').value.trim();await request('guidance_homework','POST',{student_id:'b5cdb555-dd57-4d05-9c34-6ff720333874',created_by:JSON.parse(localStorage.getItem(STORE)).user.id,title,subject:'Diğer',due_date:date(new Date())});adHoc.push({id:'pending',title,subject:'Diğer',due_date:date(new Date()),completed:false});render(view,page,adHoc,mentor)}catch(e){selfForm.querySelector('.gw-self-status').textContent=e.message;btn.disabled=false}};
 view.querySelectorAll('[data-check]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const id=b.dataset.check;if(done.has(id))await request('guidance_weekly_done?plan_id=eq.'+id,'DELETE');else await request('guidance_weekly_done','POST',{plan_id:id});render(view,page,adHoc,mentor)}catch(e){alert(e.message);b.disabled=false}});
 view.querySelectorAll('[data-adhoc-check]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await fetch(URL+'rpc/guidance_set_completion',{method:'POST',headers:headers(),body:JSON.stringify({p_id:b.dataset.adhocCheck,p_completed:true})});if(!r.ok)throw Error('Tamamlanamadı');const t=adHoc.find(x=>x.id===b.dataset.adhocCheck);if(t)t.completed=true;render(view,page,adHoc,mentor)}catch(e){alert(e.message);b.disabled=false}});
 }
 }catch(err){view.innerHTML='<div class="card"><div class="card-body">Program yüklenemedi: '+esc(err.message)+' <button data-retry class="secondary-btn">Yeniden dene</button></div></div>';view.querySelector('[data-retry]').onclick=()=>render(view,page,adHoc,mentor)}
}
window.HakunaWeekly={render};
})();
