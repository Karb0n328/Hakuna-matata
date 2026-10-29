/* 29 Ekim 2026: each page gets its own Atatürk portrait and quotation. */
(()=>{
'use strict';
const d=new Date();if(!(d.getFullYear()===2026&&d.getMonth()===9&&d.getDate()===29))return;
document.documentElement.classList.add('republic-day-2026');
const P={
today:['Ataturk1930s.jpg','Ey yükselen yeni nesil! İstikbal sizsiniz. Cumhuriyeti biz kurduk, onu yükseltecek ve yaşatacak sizsiniz.'],
plan:['Atatürk.jpg','Hayatta en hakiki mürşit ilimdir.'],
tasks:['Mustafa Kemal Pasha.jpg','Bütün ümidim gençliktedir.'],
exams:['Mustafa Kemal Atatürk.png','Eğitimdir ki bir milleti ya hür, bağımsız, şanlı, yüksek bir topluluk hâlinde yaşatır; ya da bir milleti esaret ve sefalete terk eder.'],
questions:['Portrait photograph of Mustafa Kemal in military uniform 1930.jpg','Benim manevi mirasım ilim ve akıldır.'],
books:['Atatürk in white tie.jpg','Cumhuriyet, fikren, ilmen, fennen, bedenen kuvvetli ve yüksek karakterli koruyucular ister.'],
analytics:['Ataturk in 1923.jpg','Zafer, zafer benimdir diyebilenindir.'],
guidance:['Mustafa Kemal Atatürk (1928).jpg','Öğretmenler! Yeni nesil, sizin eseriniz olacaktır.'],
suggestions:['Mustafa Kemal Atatürk (1936).jpg','Millete efendilik yoktur, hizmet vardır.'],
settings:['Kemal Atatürk portrait.jpg','Ne mutlu Türküm diyene!']
};
const url=file=>'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file)+'?width=760';
const fallback=url('Ataturk1930s.jpg');
let hero,prev='';
function page(){
 const t=document.getElementById('pageTitle')?.textContent?.trim()||'';
 const titles={'Bugün':'today','Plan':'plan','Görevler':'tasks','Denemeler':'exams','Sorular':'questions','Soru Kitaplığım':'books','Analiz':'analytics','Rehberlik':'guidance','Öneriler':'suggestions','Ayarlar':'settings'};
 return titles[t]||'today';
}
function update(){
 const view=document.getElementById('view');if(!view)return;
 if(!hero){hero=document.createElement('section');hero.id='republic-day-banner';hero.className='republic-hero';hero.setAttribute('aria-label','29 Ekim Cumhuriyet Bayramı');view.before(hero)}
 const key=page();if(prev===key)return;prev=key;
 const [photo,quote]=P[key]||P.today,home=key==='today';
 hero.classList.toggle('republic-hero-compact',!home);
 hero.innerHTML='<div class="republic-hero-art" aria-hidden="true"><img class="republic-photo-primary" alt="" loading="eager" referrerpolicy="no-referrer"></div><div class="republic-hero-copy"><div class="republic-eyebrow"><span class="republic-flag" aria-hidden="true">☾ ★</span> 29 EKİM 2026 <span class="republic-line"></span> CUMHURİYET BAYRAMI</div>'+(home?'<div class="republic-hero-title">CUMHURİYET<span>103 YAŞINDA.</span></div>':'')+'<blockquote>“'+quote+'”</blockquote><div class="republic-signature">— Gazi Mustafa Kemal Atatürk</div>'+(home?'<div class="republic-footer"><span>1923 <i></i> 2026</span><strong>29 EKİM CUMHURİYET BAYRAMIMIZ KUTLU OLSUN</strong></div>':'')+'</div>';
 const img=hero.querySelector('.republic-photo-primary');img.onerror=()=>{if(img.src!==fallback)img.src=fallback;else img.style.display='none'};img.src=url(photo);
}
function start(){
 update();
 const title=document.getElementById('pageTitle');
 if(title)new MutationObserver(update).observe(title,{childList:true,characterData:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
