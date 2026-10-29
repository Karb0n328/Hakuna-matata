/* 29 Ekim 2026 Cumhuriyet Bayramı edition. Visual-only; no stored user data changes. */
(()=>{
'use strict';
const active=()=>{const d=new Date();return d.getFullYear()===2026&&d.getMonth()===9&&d.getDate()===29;};
if(!active())return;
document.documentElement.classList.add('republic-day-2026');
const photo1='https://commons.wikimedia.org/wiki/Special:FilePath/Ataturk1930s.jpg?width=760';
const photo2='https://commons.wikimedia.org/wiki/Special:FilePath/Portrait_photograph_of_Mustafa_Kemal_in_military_uniform_1930.jpg?width=620';
function build(){
 const main=document.querySelector('.main-area'),view=document.querySelector('#view');
 if(!main||!view||main.querySelector('#republic-day-banner'))return;
 const hero=document.createElement('section');hero.id='republic-day-banner';hero.className='republic-hero';hero.setAttribute('aria-label','29 Ekim Cumhuriyet Bayramı');
 hero.innerHTML='<div class="republic-hero-art" aria-hidden="true"><img class="republic-photo-primary" alt="" src="'+photo1+'" loading="eager" referrerpolicy="no-referrer"><img class="republic-photo-secondary" alt="" src="'+photo2+'" loading="lazy" referrerpolicy="no-referrer"></div><div class="republic-hero-copy"><div class="republic-eyebrow"><span class="republic-flag" aria-hidden="true">☾ ★</span> 29 EKİM 2026 <span class="republic-line"></span> CUMHURİYET BAYRAMI</div><div class="republic-hero-title">CUMHURİYET<span>103 YAŞINDA.</span></div><blockquote>“Ey yükselen yeni nesil! İstikbal sizsiniz. Cumhuriyeti biz kurduk, onu yükseltecek ve yaşatacak sizsiniz.”</blockquote><div class="republic-signature">— Gazi Mustafa Kemal Atatürk</div><div class="republic-footer"><span>1923 <i></i> 2026</span><strong>29 EKİM CUMHURİYET BAYRAMIMIZ KUTLU OLSUN</strong></div></div>';
 view.before(hero);
 const img=hero.querySelector('.republic-photo-primary');img.addEventListener('error',()=>{img.style.display='none';hero.classList.add('republic-no-photo')},{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
