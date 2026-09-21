(function(root){
  'use strict';

  const YEARS=[2022,2023,2024,2025];
  const LIMITS={
    tytTurkce:40,tytSosyal:20,tytMatematik:40,tytFen:20,
    aytMatematik:40,aytFizik:14,aytKimya:13,aytBiyoloji:13
  };
  const LABELS={
    tytTurkce:'Türkçe',tytSosyal:'Sosyal',tytMatematik:'Matematik',tytFen:'Fen',
    aytMatematik:'Matematik',aytFizik:'Fizik',aytKimya:'Kimya',aytBiyoloji:'Biyoloji'
  };

  // SAY puanı test ağırlıklarıyla oluşturulan birleşik net endeksi, her yılın
  // yayımlanmış sonuçlarına göre ayrı ayrı kalibre edilir.
  const SCORE_MODELS={
    2022:{slope:.9399,intercept:125.03},
    2023:{slope:.9316,intercept:128.99},
    2024:{slope:.9363,intercept:129.57},
    2025:{slope:.9236,intercept:131.77}
  };

  // Yerleştirme puanı -> yaklaşık Y-SAY sırası. Orta bölümdeki çapalar geçmiş
  // yıl sonuçlarıyla kalibre edildi; uçlar kontrollü ekstrapolasyondur.
  const RANK_CURVES={
    2022:[[560,1],[520,6500],[498.56,18383],[460.92,47168],[417.70,87114],[380,145000],[340,235000],[300,385000],[250,650000],[180,1100000],[100,1450000]],
    2023:[[560,1],[520,7000],[499.70,18721],[462.32,47105],[419.55,88077],[380,150000],[340,245000],[300,410000],[250,690000],[180,1160000],[100,1500000]],
    2024:[[560,1],[520,4300],[501.87,9760],[464.29,28790],[421.32,61844],[380,115000],[340,205000],[300,360000],[250,640000],[180,1120000],[100,1480000]],
    2025:[[560,1],[520,5000],[499.72,11214],[462.34,35432],[420.27,75677],[380,135000],[340,230000],[300,395000],[250,690000],[180,1180000],[100,1550000]]
  };

  const TARGETS={
    tip:{label:'Tıp',limit:50000,icon:'🩺'},
    dis:{label:'Diş Hekimliği',limit:80000,icon:'🦷'},
    eczacilik:{label:'Eczacılık',limit:100000,icon:'💊'},
    mimarlik:{label:'Mimarlık',limit:250000,icon:'📐'},
    muhendislik:{label:'Mühendislik',limit:300000,icon:'⚙️'}
  };

  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
  function number(value){
    const parsed=Number(String(value??'').replace(',','.'));
    return Number.isFinite(parsed)?parsed:0;
  }
  function normalizeNets(input){
    const out={};
    Object.keys(LIMITS).forEach(key=>out[key]=clamp(number(input[key]),-LIMITS[key]/4,LIMITS[key]));
    return out;
  }
  function weightedIndex(input){
    const n=normalizeNets(input);
    return 1.32*(n.tytTurkce+n.tytMatematik)+1.36*(n.tytSosyal+n.tytFen)+
      3*n.aytMatematik+2.85*n.aytFizik+3.07*(n.aytKimya+n.aytBiyoloji);
  }
  function diplomaToOBP(value){
    const raw=number(value);
    return raw>=250?clamp(raw,250,500):clamp(raw,50,100)*5;
  }
  function interpolateRank(year,placementScore){
    const curve=RANK_CURVES[year];
    const score=number(placementScore);
    if(score>=curve[0][0])return curve[0][1];
    if(score<=curve[curve.length-1][0])return curve[curve.length-1][1];
    for(let i=0;i<curve.length-1;i++){
      const [highScore,highRank]=curve[i], [lowScore,lowRank]=curve[i+1];
      if(score<=highScore&&score>=lowScore){
        const ratio=(highScore-score)/(highScore-lowScore);
        // Rank growth is closer to exponential than linear between score bands.
        return Math.round(Math.exp(Math.log(highRank)+ratio*(Math.log(lowRank)-Math.log(highRank))));
      }
    }
    return curve.at(-1)[1];
  }
  function calculate(input){
    const nets=normalizeNets(input);
    const academicInput=number(input.diploma||85);
    const obp=diplomaToOBP(academicInput);
    const diploma=obp/5;
    const contribution=obp*(input.penalty?.06:.12);
    const weighted=weightedIndex(nets);
    const results=YEARS.map(year=>{
      const model=SCORE_MODELS[year];
      const rawScore=clamp(model.intercept+model.slope*weighted,100,500);
      const placementScore=clamp(rawScore+contribution,100,560);
      const rank=interpolateRank(year,placementScore);
      const margin=Math.max(350,Math.round(rank*(rank<100000?.055:.075)));
      return {year,rawScore,placementScore,rank,rangeLow:Math.max(1,rank-margin),rangeHigh:rank+margin};
    });
    return {nets,diploma,obp,contribution,weighted,results};
  }

  const api={YEARS,LIMITS,TARGETS,normalizeNets,weightedIndex,diplomaToOBP,interpolateRank,calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!root||!root.document)return;
  root.HakunaYKS=api;

  const doc=root.document;
  let active=false;
  let observer;
  const formatRank=value=>new Intl.NumberFormat('tr-TR').format(Math.round(value));
  const formatScore=value=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);

  function addNavigation(){
    const sidebar=doc.querySelector('#sidebarNav');
    if(sidebar&&!sidebar.querySelector('[data-yks-nav]')){
      const button=doc.createElement('button');
      button.className=`nav-button ${active?'active':''}`;
      button.dataset.yksNav='';
      button.innerHTML='<span class="nav-icon">🎯</span><span class="nav-label">YKS Hesapla</span>';
      sidebar.append(button);
    }
    const more=doc.querySelector('#modalRoot .status-options');
    if(more&&!more.querySelector('[data-yks-nav]')){
      const button=doc.createElement('button');
      button.className='status-option';
      button.dataset.yksNav='';
      button.innerHTML='<div class="status-emoji">🎯</div><div><strong>YKS Hesapla</strong><span>2022–2025 puan ve sıralama</span></div>';
      more.prepend(button);
    }
  }

  function fieldHTML(key){
    return `<label class="yks-net-field"><span>${LABELS[key]} <small>/ ${LIMITS[key]}</small></span><input type="number" inputmode="decimal" step="0.25" min="${-LIMITS[key]/4}" max="${LIMITS[key]}" name="${key}" placeholder="0"></label>`;
  }

  function render(){
    active=true;
    doc.querySelectorAll('[data-nav]').forEach(el=>el.classList.remove('active'));
    doc.querySelectorAll('[data-yks-nav]').forEach(el=>el.classList.add('active'));
    const eyebrow=doc.querySelector('#pageEyebrow'), title=doc.querySelector('#pageTitle'), actions=doc.querySelector('#topbarActions'), view=doc.querySelector('#view');
    if(eyebrow)eyebrow.textContent='Geçmiş yıllarda bu netler ne yapardı?';
    if(title)title.textContent='YKS Hesaplayıcı';
    if(actions)actions.innerHTML='<span class="yks-offline-pill">● Cihazda hesaplanır</span>';
    if(!view)return;
    view.innerHTML=`<div class="yks-layout">
      <form class="yks-form card" id="yksCalculatorForm">
        <div class="yks-hero">
          <div><span class="yks-kicker">SAYISAL</span><h2>Netlerini gir, dört yılı karşılaştır.</h2><p>Sonuçların 2022, 2023, 2024 ve 2025 sınavlarında yaklaşık olarak nereye denk gelirdi?</p></div>
          <div class="yks-year-stack"><span>2022</span><span>2023</span><span>2024</span><span>2025</span></div>
        </div>
        <section class="yks-input-section"><div class="yks-section-head"><div><span>01</span><h3>TYT netleri</h3></div><strong data-tyt-total>0 / 120</strong></div><div class="yks-net-grid">${['tytTurkce','tytSosyal','tytMatematik','tytFen'].map(fieldHTML).join('')}</div></section>
        <section class="yks-input-section"><div class="yks-section-head"><div><span>02</span><h3>AYT Sayısal netleri</h3></div><strong data-ayt-total>0 / 80</strong></div><div class="yks-net-grid">${['aytMatematik','aytFizik','aytKimya','aytBiyoloji'].map(fieldHTML).join('')}</div></section>
        <section class="yks-input-section"><div class="yks-section-head"><div><span>03</span><h3>Okul ve hedef</h3></div></div><div class="yks-final-grid">
          <label class="yks-net-field"><span>Diploma notu / OBP <small>50–100 veya 250–500</small></span><input type="number" inputmode="decimal" step="0.01" min="50" max="500" name="diploma" value="85" required></label>
          <label class="yks-net-field"><span>Hedef bölüm</span><select name="target">${Object.entries(TARGETS).map(([key,t])=>`<option value="${key}" ${key==='tip'?'selected':''}>${t.icon} ${t.label}</option>`).join('')}</select></label>
          <label class="yks-check"><input type="checkbox" name="penalty"><span><strong>OBP kırık</strong><small>Geçen yıl bir programa yerleştim</small></span></label>
        </div></section>
        <div class="yks-actions"><button class="secondary-btn" type="reset">Temizle</button><button class="primary-btn yks-submit" type="submit">Sonuçları hesapla →</button></div>
      </form>
      <aside class="yks-results" id="yksResults"><div class="card yks-empty-result"><div class="yks-empty-icon">⌁</div><h3>Sonuçların burada görünecek</h3><p>Netlerini ve diploma notunu girip hesapla.</p></div></aside>
    </div>`;
    bindForm();
  }

  function renderResults(calculation,targetKey){
    const target=TARGETS[targetKey]||TARGETS.tip;
    const passes=calculation.results.filter(result=>result.rank<=target.limit).length;
    const best=calculation.results.reduce((a,b)=>a.rank<b.rank?a:b);
    const worst=calculation.results.reduce((a,b)=>a.rank>b.rank?a:b);
    const root=doc.querySelector('#yksResults');
    root.innerHTML=`<section class="card yks-summary-card">
      <div class="yks-summary-top"><div><span class="yks-kicker">4 YILIN ÖZETİ</span><h2>${target.icon} ${target.label}</h2></div><div class="yks-pass-ring ${passes===4?'is-good':''}"><strong>${passes}/4</strong><span>yılda baraj içinde</span></div></div>
      <div class="yks-summary-grid"><div><span>En iyi karşılık</span><strong>${best.year} · ${formatRank(best.rank)}</strong></div><div><span>En zor yıl</span><strong>${worst.year} · ${formatRank(worst.rank)}</strong></div><div><span>OBP katkısı</span><strong>+${formatScore(calculation.contribution)}</strong></div></div>
    </section>
    <div class="yks-result-list">${calculation.results.map((result,index)=>`<article class="card yks-year-result ${result.rank<=target.limit?'is-pass':''}">
      <div class="yks-result-year"><span>${result.year}</span><small>${result.rank<=target.limit?'Hedef içinde':'Hedef dışında'}</small></div>
      <div class="yks-rank"><span>Tahmini Y-SAY sırası</span><strong>${formatRank(result.rank)}</strong><small>${formatRank(result.rangeLow)} – ${formatRank(result.rangeHigh)} olası aralık</small></div>
      <div class="yks-scores"><div><span>SAY</span><strong>${formatScore(result.rawScore)}</strong></div><div><span>Y-SAY</span><strong>${formatScore(result.placementScore)}</strong></div></div>
      ${index===0?'<div class="yks-source-note">Geçmiş yıl puan dağılımına göre</div>':''}
    </article>`).join('')}</div>
    <section class="yks-disclaimer"><strong>Bu ne kadar kesin?</strong><p>Puan geçmiş yıl modeliyle, sıralama yayımlanan dağılım aralıkları arasında hesaplanır. Tek sayı merkez tahmindir; tercih yaparken olası aralığı esas al.</p></section>`;
    root.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function bindForm(){
    const form=doc.querySelector('#yksCalculatorForm');
    if(!form)return;
    const updateTotals=()=>{
      const fd=new FormData(form), value=key=>number(fd.get(key));
      const tyt=['tytTurkce','tytSosyal','tytMatematik','tytFen'].reduce((sum,key)=>sum+value(key),0);
      const ayt=['aytMatematik','aytFizik','aytKimya','aytBiyoloji'].reduce((sum,key)=>sum+value(key),0);
      form.querySelector('[data-tyt-total]').textContent=`${tyt.toLocaleString('tr-TR',{maximumFractionDigits:2})} / 120`;
      form.querySelector('[data-ayt-total]').textContent=`${ayt.toLocaleString('tr-TR',{maximumFractionDigits:2})} / 80`;
    };
    form.addEventListener('input',event=>{event.target.setCustomValidity?.('');updateTotals();});
    form.addEventListener('reset',()=>setTimeout(()=>{updateTotals();doc.querySelector('#yksResults').innerHTML='<div class="card yks-empty-result"><div class="yks-empty-icon">⌁</div><h3>Sonuçların burada görünecek</h3><p>Netlerini ve diploma notunu girip hesapla.</p></div>';},0));
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const fd=new FormData(form), input={};
      Object.keys(LIMITS).forEach(key=>input[key]=fd.get(key));
      input.diploma=fd.get('diploma'); input.penalty=fd.get('penalty')==='on';
      const academic=number(input.diploma);
      if(!((academic>=50&&academic<=100)||(academic>=250&&academic<=500))){
        form.elements.diploma.setCustomValidity('Diploma notu 50–100, OBP 250–500 arasında olmalı.');
        form.elements.diploma.reportValidity();
        return;
      }
      form.elements.diploma.setCustomValidity('');
      renderResults(calculate(input),String(fd.get('target')));
    });
    updateTotals();
  }

  function openCalculator(){doc.querySelector('#modalRoot').innerHTML='';render();}
  doc.addEventListener('click',event=>{
    const yksButton=event.target.closest('[data-yks-nav]');
    if(yksButton){event.preventDefault();event.stopPropagation();openCalculator();return;}
    const appNav=event.target.closest('[data-nav]');
    if(appNav&&appNav.dataset.nav!=='more')active=false;
  },true);

  function init(){
    addNavigation();
    observer=new MutationObserver(addNavigation);
    observer.observe(doc.body,{childList:true,subtree:true});
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:null);
