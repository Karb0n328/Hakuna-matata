/* User-selectable palette: blue, dark, Republic red/white. */
(()=>{'use strict';
const KEY='hakuna.theme.palette.v1';
const options=[['blue','Mavi','Klasik Hakuna tasarımı'],['dark','Dark','Koyu arayüz'],['republic','Kırmızı','Kırmızı-beyaz tasarım']];
let queued=false;
function isHoliday(){const d=new Date();return d.getFullYear()===2026&&d.getMonth()===9&&d.getDate()===29}
function choice(){return localStorage.getItem(KEY)||'blue'}
function apply(){
 const c=choice(),holiday=isHoliday();
 const palette=holiday?'republic':c;
 const root=document.documentElement;
 root.dataset.hakunaPalette=palette;
 root.classList.toggle('republic-day-2026',palette==='republic');
 if(palette!=='republic')document.getElementById('republic-day-banner')?.setAttribute('hidden','');
 else document.getElementById('republic-day-banner')?.removeAttribute('hidden');
 window.HakunaBatuTheme?.refresh?.();
}
function settings(){
 const title=document.getElementById('pageTitle')?.textContent?.trim(),view=document.getElementById('view');
 let row=document.querySelector('[data-hakuna-palette-row]');
 if(title!=='Ayarlar'||!view||isHoliday()){row?.remove();return}
 const section=view.querySelector('.settings-section');if(!section)return;
 if(!row){
  row=document.createElement('div');row.className='settings-row hakuna-palette-row';row.dataset.hakunaPaletteRow='1';
  const copy=document.createElement('div');copy.className='hakuna-palette-description';
  const heading=document.createElement('div');heading.className='settings-row-title';heading.textContent='Görünüm teması';
  const sub=document.createElement('div');sub.className='settings-row-desc';sub.textContent='Atatürk Köşesi dahil uygulamanın renklerini seç.';
  copy.append(heading,sub);
  const group=document.createElement('div');group.className='hakuna-palette-options';group.setAttribute('role','group');group.setAttribute('aria-label','Görünüm teması');
  for(const [value,name,description] of options){
   const button=document.createElement('button');button.type='button';button.dataset.paletteChoice=value;button.title=description;button.textContent=name;
   button.addEventListener('click',()=>{if(isHoliday())return;localStorage.setItem(KEY,value);apply();settings()});group.append(button);
  }
  row.append(copy,group);section.prepend(row);
 }
 row.querySelectorAll('[data-palette-choice]').forEach(button=>{const active=button.dataset.paletteChoice===(choice()==='auto'?(document.documentElement.dataset.hakunaPalette||'blue'):choice());button.setAttribute('aria-pressed',String(active))});
 document.querySelector('[data-batu-theme-row]')?.remove();
}
function refresh(){apply();settings()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
window.addEventListener('storage',schedule);
window.addEventListener('focus',schedule);
refresh();setTimeout(refresh,500);setTimeout(refresh,1500);
})();