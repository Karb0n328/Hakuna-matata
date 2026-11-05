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
 const res=await fetch(URL+path,{method,headers:{...headers(),...(['POST','PATCH'].includes(method)?{'Prefer':'return=representation'}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 if(!res.ok){let msg='Bağlantı hatası';try{const e=await res.json();msg=e.message||e.error||msg}catch{}throw Error(msg)}
 if(res.status===204)return [];const raw=await res.text();return raw?JSON.parse(raw):[];
}
function form(day,item){
 return '<form class="gw-form" data-day="'+day+'" data-id="'+esc(item?.id||'')+'"><label>Ders<select name="subject">'+SUBJECTS.map(s=>'<option value="'+esc(s)+'" '+(s===(item?.subject||'Matematik')?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select></label><label>Yapılacak çalışma<input name="title" required minlength="2" maxlength="200" placeholder="Örn. Kesirler testi" value="'+esc(item?.title||'')+'"></label><label>Hedef / süre<input name="target" maxlength="160" placeholder="Örn. 20 soru · 30 dk" value="'+esc(item?.target||'')+'"></label><div class="gw-form-actions"><button class="primary-btn" type="submit">'+(item?'Değişiklikleri kaydet':'Programa ekle')+'</button><button class="secondary-btn" type="button" data-cancel>Vazgeç</button></div><div class="gw-feedback" role="status"></div></form>';
}
function itemCard(t,done,mentor){
 return '<article class="gw-item '+(done?'gw-done':'')+'" data-plan-id="'+esc(t.id)+'"'+(mentor?' data-drag="'+esc(t.id)+'" tabindex="0" aria-label="'+esc(t.title)+'; taşımak için 2 saniye basılı tut veya sağ/sol ok kullan"':'')+'><span class="gw-item-emoji">'+(EMOJI[t.subject]||'✨')+'</span><div class="gw-item-info"><strong>'+esc(t.title)+'</strong><small>'+esc(t.subject)+(t.target?' · '+esc(t.target):'')+'</small></div>'+(mentor?'<div class="gw-item-actions"><button type="button" data-copy="'+esc(t.id)+'" aria-label="Aynı güne kopyala" title="Aynı güne kopyala">⧉</button><button type="button" data-edit="'+esc(t.id)+'" aria-label="Düzenle">✎</button><button type="button" data-delete="'+esc(t.id)+'" aria-label="Sil">×</button></div>':'<button type="button" class="gw-check" data-check="'+esc(t.id)+'" aria-label="'+(done?'Tamamlamayı geri al':'Tamamlandı işaretle')+'">'+(done?'✓':'○')+'</button>')+'</article>';
}
function statusLine(total,done){return '<div class="gw-progress"><div class="gw-progress-bar"><span style="width:'+(total?Math.round(done/total*100):0)+'%"></span></div><small>'+done+' / '+total+' tamamlandı</small></div>'}
// Appending uses the highest order, so deleted/moved rows never create collisions.
function nextOrder(plan,day){return Math.max(-1,...plan.filter(p=>p.weekday===day).map(p=>Number(p.sort_order)||0))+1}
function bindPlanner(view,plan,week,onEdit,onDelete){
 const shell=view.querySelector('.gw-mentor'),grid=shell.querySelector('.gw-grid');
 const status=shell.querySelector('.gw-operation-status');let busy=false,drag=null,frame=0;
 function message(text){status.textContent=text}
 function lock(value){busy=value;shell.classList.toggle('gw-saving',value);shell.setAttribute('aria-busy',String(value));shell.querySelectorAll('button,input,select').forEach(b=>b.disabled=value)}
 function refreshCounts(){
  shell.querySelectorAll('.gw-day').forEach(day=>{
   const list=day.querySelector('.gw-day-items'),cards=list.querySelectorAll('.gw-item');
   list.querySelector('.gw-day-empty')?.remove();
   if(!cards.length){const empty=document.createElement('div');empty.className='gw-day-empty';empty.textContent='Henüz çalışma yok';list.append(empty)}
   day.querySelector('.gw-day-count').textContent='✓ '+list.querySelectorAll('.gw-done').length+' / '+cards.length+' tamamlandı';
  });
  const total=plan.length,done=grid.querySelectorAll('.gw-done').length;
  shell.querySelector('.gw-progress small').textContent=done+' / '+total+' tamamlandı';
  shell.querySelector('.gw-progress-bar span').style.width=(total?Math.round(done/total*100):0)+'%';
 }
 async function copy(id){
  if(busy||drag)return;const item=plan.find(p=>p.id===id);if(!item)return;
  lock(true);message('Kopyalanıyor…');
  try{
   const rows=await request('guidance_weekly_plan','POST',{student_id:item.student_id,week_start:week,weekday:item.weekday,subject:item.subject,title:item.title,target:item.target,sort_order:nextOrder(plan,item.weekday)});
   if(!rows[0]?.id)throw Error('Kopya doğrulanamadı. Programı yeniden aç.');
   plan.push(rows[0]);const list=grid.querySelector('[data-weekday="'+item.weekday+'"] .gw-day-items');
   list.insertAdjacentHTML('beforeend',itemCard(rows[0],false,true));refreshCounts();
   message('Aynı güne kopyalandı.');
  }catch(e){message('Kopyalanamadı: '+e.message)}finally{lock(false)}
 }
 async function move(id,day){
  if(busy)return;const item=plan.find(p=>p.id===id);if(!item||day===item.weekday||day<0||day>6)return;
  const card=Array.from(grid.querySelectorAll('[data-plan-id]')).find(c=>c.dataset.planId===id);
  const origin=card.parentElement,next=card.nextSibling,oldDay=item.weekday,oldOrder=item.sort_order;
  const order=nextOrder(plan,day);lock(true);message('Kaydediliyor…');
  item.weekday=day;item.sort_order=order;grid.querySelector('[data-weekday="'+day+'"] .gw-day-items').append(card);refreshCounts();
  try{
   const rows=await request('guidance_weekly_plan?id=eq.'+encodeURIComponent(id)+'&week_start=eq.'+week,'PATCH',{weekday:day,sort_order:order});
   if(!rows.some(r=>r.id===id))throw Error('Değişiklik kaydedilemedi.');
   message(DAYS[day]+' gününe taşındı.');
  }catch(e){item.weekday=oldDay;item.sort_order=oldOrder;origin.insertBefore(card,next?.parentElement===origin?next:null);refreshCounts();message('Taşınamadı: '+e.message)}
  finally{lock(false);card.focus({preventScroll:true})}
 }
 // Delegate new cards too, without rebuilding the grid or losing scroll position.
 grid.addEventListener('click',e=>{if(busy||drag)return;const b=e.target.closest('button');if(!b)return;if(b.dataset.copy)copy(b.dataset.copy);if(b.dataset.edit){const item=plan.find(p=>p.id===b.dataset.edit);if(item)onEdit(item.weekday,item)}if(b.dataset.delete)onDelete(b.dataset.delete)});
 grid.addEventListener('keydown',e=>{
  const h=e.target.closest('[data-drag]');if(!h||e.target.closest('button'))return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const item=plan.find(p=>p.id===h.dataset.drag);if(item)move(item.id,item.weekday+(e.key==='ArrowRight'?1:-1))}
 });
 function clear(){
  if(!drag)return;const old=drag;drag=null;
  clearTimeout(old.timer);cancelAnimationFrame(frame);old.ghost?.remove();
  old.card.classList.remove('gw-pressing','gw-drag-source');
  grid.querySelectorAll('.gw-drop-target').forEach(d=>d.classList.remove('gw-drop-target'));
  document.body.classList.remove('gw-is-dragging');
  if(old.pointer!==null&&old.card.hasPointerCapture?.(old.pointer))old.card.releasePointerCapture(old.pointer);
  document.removeEventListener('keydown',escape);window.removeEventListener('blur',cancel);
 }
 function cancel(){const active=drag?.active;clear();if(active)message('Taşıma iptal edildi.')}
 function escape(e){if(e.key==='Escape'){e.preventDefault();cancel()}}
 function hit(x,y){const day=document.elementFromPoint(x,y)?.closest('.gw-day');return day&&grid.contains(day)?day:null}
 function tick(){
  if(!drag)return;if(!shell.isConnected){clear();return}
  if(drag.active){
   const r=grid.getBoundingClientRect(),edge=45;
   if(drag.y>=r.top&&drag.y<=r.bottom){if(drag.x<r.left+edge)grid.scrollLeft-=10;else if(drag.x>r.right-edge)grid.scrollLeft+=10}
   if(drag.y<65)window.scrollBy(0,-10);else if(drag.y>innerHeight-65)window.scrollBy(0,10);
   drag.ghost.style.transform='translate3d('+(drag.x-drag.offsetX)+'px,'+(drag.y-drag.offsetY-8)+'px,0) scale(1.035) rotate(-1deg)';
   const target=hit(drag.x,drag.y);
   grid.querySelectorAll('.gw-drop-target').forEach(d=>d.classList.toggle('gw-drop-target',d===target));
   target?.classList.add('gw-drop-target');
  }
  frame=requestAnimationFrame(tick);
 }
 function begin(card,x,y,pointer,touchId){
  if(busy||drag)return;const r=card.getBoundingClientRect();
  drag={card,pointer,touchId,id:card.dataset.drag,x,y,startX:x,startY:y,offsetX:x-r.left,offsetY:y-r.top,active:false};
  card.classList.add('gw-pressing');
  drag.timer=setTimeout(()=>{
   if(!drag||!shell.isConnected){clear();return}
   drag.active=true;card.classList.remove('gw-pressing');
   const ghost=card.cloneNode(true);drag.ghost=ghost;ghost.classList.add('gw-drag-ghost');ghost.removeAttribute('tabindex');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
   ghost.style.width=card.getBoundingClientRect().width+'px';
   ghost.style.transform='translate3d('+(drag.x-drag.offsetX)+'px,'+(drag.y-drag.offsetY-8)+'px,0) scale(1.035) rotate(-1deg)';
   document.body.append(ghost);card.classList.add('gw-drag-source');document.body.classList.add('gw-is-dragging');
   message('Taşımaya hazır. İstediğin güne bırak.');
  },2000);
  if(pointer!==null)card.setPointerCapture(pointer);
  document.addEventListener('keydown',escape);window.addEventListener('blur',cancel);frame=requestAnimationFrame(tick);
 }
 function update(x,y){
  if(!drag)return;drag.x=x;drag.y=y;
  // Moving before the hold completes is an ordinary scroll, never a drag.
  if(!drag.active&&Math.hypot(x-drag.startX,y-drag.startY)>10)clear();
 }
 function finish(x,y){
  if(!drag)return;const target=hit(x,y),id=drag.id,active=drag.active;
  clear();if(active&&target){const day=Number(target.dataset.weekday);move(id,day)}else if(active)message('Taşıma iptal edildi.');
 }
 grid.addEventListener('contextmenu',e=>{if(e.target.closest('[data-drag]')&&!e.target.closest('button'))e.preventDefault()});
 grid.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||e.button!==0||!e.isPrimary||e.target.closest('button,input,select,textarea'))return;
  const card=e.target.closest('[data-drag]');if(card)begin(card,e.clientX,e.clientY,e.pointerId,null);
 });
 grid.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.pointer){update(e.clientX,e.clientY);if(drag?.active)e.preventDefault()}});
 grid.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.pointer)finish(e.clientX,e.clientY)});
 grid.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.pointer)cancel()});
 grid.addEventListener('lostpointercapture',e=>{if(drag&&e.pointerId===drag.pointer)clear()});
 // Touch listeners keep native scrolling before activation and suppress it only
 // after the hold, including iPad Safari where touch-action cannot change mid-gesture.
 grid.addEventListener('touchstart',e=>{
  if(e.touches.length!==1){cancel();return}
  if(e.target.closest('button,input,select,textarea'))return;
  const card=e.target.closest('[data-drag]'),t=e.changedTouches[0];if(card)begin(card,t.clientX,t.clientY,null,t.identifier);
 },{passive:true});
 grid.addEventListener('touchmove',e=>{
  if(!drag||drag.touchId==null)return;
  const t=Array.from(e.touches).find(t=>t.identifier===drag.touchId);if(!t)return;
  if(drag.active)e.preventDefault();update(t.clientX,t.clientY);
 },{passive:false});
 grid.addEventListener('touchend',e=>{
  if(!drag||drag.touchId==null)return;
  const t=Array.from(e.changedTouches).find(t=>t.identifier===drag.touchId);if(!t)return;
  if(drag.active)e.preventDefault();finish(t.clientX,t.clientY);
 },{passive:false});
 grid.addEventListener('touchcancel',cancel);

}
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
 view.innerHTML='<div class="gw-shell gw-mentor"><div class="gw-top"><div><div class="gd-kicker">REHBERLİK · AYZOS</div><h2>Haftalık çalışma çizelgesi</h2><p>Taşımak için kutuya 2 saniye basılı tut, ardından istediğin güne bırak.</p></div><div class="gw-week-controls"><button type="button" data-week="-7">‹</button><strong>'+week.split('-').reverse().join('.')+' – '+end.split('-').reverse().join('.')+'</strong><button type="button" data-week="7">›</button><button type="button" data-this-week>Bu hafta</button></div></div>'+statusLine(total,completed)+'<div class="gw-operation-status" role="status" aria-live="polite"></div><div class="gw-grid">'+cells+'</div><section class="gw-extras"><h3>Eklenen bağımsız ödevler</h3><p>Önceden eklediğin ödevler silinmedi. Onları aşağıdan düzenleyebilirsin.</p><div class="gw-adhoc"></div></section></div>';
 const ad=view.querySelector('.gw-adhoc');ad.innerHTML=adHoc.length?adHoc.map(t=>'<div class="gw-extra-row"><span>'+esc(t.title)+' · '+esc(t.due_date||'Tarihsiz')+' · '+(t.completed?'✓ Tamamlandı':'○ Bekliyor')+'</span><div><button data-old-edit="'+esc(t.id)+'">Düzenle</button><button data-old-delete="'+esc(t.id)+'">Sil</button></div></div>').join(''):'<p>Henüz ek ödev yok.</p>';
 bindPlanner(view,plan,week,openEditor,async id=>{if(!confirm('Bu çalışmayı programdan silmek istiyor musun?'))return;try{await request('guidance_weekly_plan?id=eq.'+id,'DELETE');render(view,page,adHoc,mentor)}catch(e){alert(e.message)}});
 view.querySelectorAll('[data-week]').forEach(b=>b.onclick=()=>{selectedWeek=shift(week,Number(b.dataset.week));render(view,page,adHoc,mentor)});
 view.querySelector('[data-this-week]').onclick=()=>{selectedWeek=monday();render(view,page,adHoc,mentor)};
 view.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>openEditor(Number(b.dataset.add)));
 view.querySelectorAll('[data-old-edit]').forEach(b=>b.onclick=()=>{const t=adHoc.find(x=>x.id===b.dataset.oldEdit);if(!t)return;const title=prompt('Ödev adı',t.title);if(title===null)return;const trimmed=title.trim();if(trimmed.length<2){alert('En az iki karakter yaz.');return}request('guidance_homework?id=eq.'+t.id,'PATCH',{title:trimmed}).then(()=>{t.title=trimmed;render(view,page,adHoc,mentor)}).catch(e=>alert(e.message))});
 view.querySelectorAll('[data-old-delete]').forEach(b=>b.onclick=()=>{if(confirm('Ödev silinsin mi?'))request('guidance_homework?id=eq.'+b.dataset.oldDelete,'DELETE').then(()=>{adHoc=adHoc.filter(x=>x.id!==b.dataset.oldDelete);render(view,page,adHoc,mentor)}).catch(e=>alert(e.message))});
 function openEditor(day,item){view.querySelectorAll('.gw-day-editor').forEach(x=>x.innerHTML='');const host=view.querySelector('[data-weekday="'+day+'"] .gw-day-editor');host.innerHTML=form(day,item);host.scrollIntoView({block:'nearest',behavior:'smooth'});const f=host.querySelector('form');f.querySelector('[data-cancel]').onclick=()=>host.innerHTML='';f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector('[type=submit]');b.disabled=true;f.querySelector('.gw-feedback').textContent='Kaydediliyor…';const fd=new FormData(f),data={subject:fd.get('subject'),title:String(fd.get('title')).trim(),target:String(fd.get('target')).trim()};try{if(item)await request('guidance_weekly_plan?id=eq.'+item.id,'PATCH',data);else await request('guidance_weekly_plan','POST',{...data,week_start:week,weekday:day,sort_order:nextOrder(plan,day)});render(view,page,adHoc,mentor)}catch(err){f.querySelector('.gw-feedback').textContent=err.message;b.disabled=false}};f.querySelector('[name=title]').focus({preventScroll:true})}
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
