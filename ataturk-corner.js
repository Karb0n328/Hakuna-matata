/* Persistent Atatürk corner: begins 30 October 2026; 29 October celebration remains untouched. */
(()=>{'use strict';
const startDate=new Date(2026,9,30);
const BATU='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
const STORAGE='sb-zyrbbkbwrijnnykbgjvc-auth-token';
function batuPreview(){try{const session=JSON.parse(localStorage.getItem(STORAGE)||'null');return session?.user?.id===BATU&&!!session?.access_token}catch{return false}}
function enabled(){return new Date()>=startDate||batuPreview()}
if(!enabled())return;
const entries=[
['Ataturk1930s.jpg','Ey yükselen yeni nesil! İstikbal sizsiniz. Cumhuriyeti biz kurduk, onu yükseltecek ve yaşatacak sizsiniz.'],
['Atatürk.jpg','Hayatta en hakiki mürşit ilimdir.'],
['Mustafa Kemal Pasha.jpg','Bütün ümidim gençliktedir.'],
['Mustafa Kemal Atatürk.png','Eğitimdir ki bir milleti ya hür, bağımsız, şanlı, yüksek bir topluluk hâlinde yaşatır; ya da bir milleti esaret ve sefalete terk eder.'],
['Portrait photograph of Mustafa Kemal in military uniform 1930.jpg','Benim manevi mirasım ilim ve akıldır.'],
['Atatürk in white tie.jpg','Cumhuriyet, fikren, ilmen, fennen, bedenen kuvvetli ve yüksek karakterli koruyucular ister.'],
['Ataturk in 1923.jpg','Zafer, zafer benimdir diyebilenindir.'],
['Mustafa Kemal Atatürk (1928).jpg','Öğretmenler! Yeni nesil, sizin eseriniz olacaktır.'],
['Mustafa Kemal Atatürk (1936).jpg','Millete efendilik yoktur, hizmet vardır.'],
['Kemal Atatürk portrait.jpg','Ne mutlu Türküm diyene!'],
['Mustafa Kemal Atatürk.jpg','Yurtta sulh, cihanda sulh.']
];
const pages={'Bugün':0,'Plan':1,'Görevler':2,'Denemeler':3,'Sorular':4,'Soru Kitaplığım':5,'Analiz':6,'Rehberlik':7,'Öneriler':8,'Ayarlar':9,'YKS Sıralama Hesaplayıcı':10};
const photoUrl=name=>'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(name)+'?width=760';
const dayKey=()=>{const d=new Date();return [d.getFullYear(),d.getMonth()+1,d.getDate()].join('-')};
const dayNumber=()=>{const d=new Date();return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000)};
const images=new Map();
function preload(index){const file=entries[index][0];if(images.has(file))return images.get(file);const im=new Image();im.decoding='async';im.src=photoUrl(file);images.set(file,im);return im}
let corner=null,previous='',version=0;

function currentPage(){const title=document.getElementById('pageTitle')?.textContent?.trim();return Object.prototype.hasOwnProperty.call(pages,title)?pages[title]:0}
function render(){
 const view=document.getElementById('view');if(!view)return;
 if(!enabled()){corner?.remove();corner=null;previous='';return;}
 const page=currentPage(),today=dayKey(),identity=page+':'+today;
 if(identity===previous)return;
 previous=identity;
 if(!corner){
  corner=document.createElement('section');corner.className='ataturk-corner';corner.setAttribute('aria-label','Atatürk Köşesi');view.before(corner);
 }
 const index=(dayNumber()+page)%entries.length;
 const quoteIndex=(Math.floor(dayNumber()/entries.length)+dayNumber()+page)%entries.length;
 const [file]=entries[index],quote=entries[quoteIndex][1],current=++version;
 corner.classList.toggle('ataturk-corner-home',page===0);
 corner.replaceChildren();
 const art=document.createElement('div');art.className='ataturk-corner-art';
 const photo=document.createElement('img');photo.alt='Mustafa Kemal Atatürk';photo.decoding='async';photo.loading='eager';art.append(photo);
 const copy=document.createElement('div');copy.className='ataturk-corner-copy';
 const label=document.createElement('div');label.className='ataturk-corner-label';label.textContent='ATATÜRK KÖŞESİ';
 const block=document.createElement('blockquote');block.textContent='“'+quote+'”';
 const signature=document.createElement('div');signature.className='ataturk-corner-signature';signature.textContent='— Mustafa Kemal Atatürk';
 copy.append(label,block,signature);
 corner.append(art,copy);
 const cached=preload(index);
 photo.onload=()=>{if(current===version)corner.classList.add('photo-ready')};
 photo.onerror=()=>{if(current!==version)return;photo.style.display='none';corner.classList.add('photo-ready')};
 corner.classList.remove('photo-ready');
 photo.src=cached.src;
 if(photo.complete){if(photo.naturalWidth)photo.onload();else photo.onerror()}
 // Warm the next day's photo for this page, without downloading every portrait at once.
 preload((index+1)%entries.length);
}
function boot(){
 render();
 const title=document.getElementById('pageTitle');
 if(title)new MutationObserver(render).observe(title,{childList:true,characterData:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 window.addEventListener('hakuna:account-changed',render);
 window.addEventListener('storage',render);
 setInterval(render,60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();