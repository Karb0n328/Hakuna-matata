(() => {
  'use strict';

  const API='https://yokatlas.yok.gov.tr/api/tercih-kilavuz';
  const CACHE_PREFIX='hakuna.yksQuota.v1.';
  const CACHE_TTL=24*60*60*1000;
  const PAGE_SIZE=50;

  let groupPromise=null;
  const deptPromises=new Map();
  const deptCache=new Map();
  let renderQueued=false;

  function trKey(value=''){
    return String(value)
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u')
      .replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,' ')
      .trim().replace(/\s+/g,' ');
  }

  function intValue(value){
    if(value===null||value===undefined||value==='')return null;
    const n=Number(String(value).replace(/\./g,'').replace(',','.'));
    return Number.isFinite(n)?Math.round(n):null;
  }

  async function getJson(url,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(url,Object.assign({
        mode:'cors',
        cache:'no-store',
        credentials:'omit',
        headers:{'Accept':'application/json'}
      },options,{signal:controller.signal}));
      if(!response.ok)throw new Error('YÖK Atlas '+response.status);
      return await response.json();
    }finally{
      clearTimeout(timer);
    }
  }

  function getGroups(){
    if(groupPromise)return groupPromise;
    groupPromise=getJson(API+'/universite-programlar').then(data=>{
      if(!Array.isArray(data))throw new Error('Program listesi geçersiz');
      return data;
    }).catch(error=>{
      groupPromise=null;
      throw error;
    });
    return groupPromise;
  }

  function groupIdsForDepartment(groups,department){
    const wanted=trKey(department);
    const exact=groups.filter(item=>{
      const name=item.birimGrupAdi??item.birim_grup_adi??'';
      const score=item.puanTuru??item.puan_turu??'';
      return trKey(name)===wanted&&trKey(score)==='say';
    });
    if(exact.length)return exact.map(item=>Number(item.birimGrupId??item.birim_grup_id)).filter(Number.isFinite);

    const relaxed=groups.filter(item=>{
      const name=item.birimGrupAdi??item.birim_grup_adi??'';
      const score=item.puanTuru??item.puan_turu??'';
      const key=trKey(name);
      return trKey(score)==='say'&&(key.includes(wanted)||wanted.includes(key));
    });
    return relaxed.map(item=>Number(item.birimGrupId??item.birim_grup_id)).filter(Number.isFinite);
  }

  function searchBody(groupIds,page){
    return {
      filters:{
        puanTuru:'SAY',
        universiteId:[],
        birimGrupId:groupIds,
        ilKodu:[],
        birimTuruId:46,
        universiteTuru:null,
        bursOraniId:null,
        ogrenimTuruId:null,
        kilavuzKodu:null,
        minBasariSirasi:null,
        maxBasariSirasi:null
      },
      page,
      size:PAGE_SIZE,
      sortBy:'basariSirasi',
      direction:'ASC'
    };
  }

  async function searchPage(groupIds,page){
    return getJson(API+'/search',{
      method:'POST',
      headers:{'Accept':'application/json','Content-Type':'application/json'},
      body:JSON.stringify(searchBody(groupIds,page))
    });
  }

  function compactRows(content){
    const rows=[];
    for(const item of content){
      const uni=item.universiteAdi??item.universite_adi??'';
      const program=item.birimAdi??item.birim_adi??'';
      const currentYear=intValue(item.yil??item.year) || 2026;
      for(let offset=0;offset<=3;offset++){
        const suffix=offset?String(offset):'';
        const year=currentYear-offset;
        const quota=intValue(item['kontenjan'+suffix] ?? item['kontenjan_'+suffix]);
        const rank=intValue(item['basariSirasi'+suffix] ?? item['basari_sirasi'+(suffix?'_'+suffix:'')]);
        if(quota!==null||rank!==null)rows.push([uni,program,year,quota,rank]);
      }
    }
    return rows;
  }

  function saveLocal(department,rows){
    try{
      localStorage.setItem(CACHE_PREFIX+trKey(department),JSON.stringify({at:Date.now(),rows}));
    }catch{}
  }

  function loadLocal(department){
    try{
      const raw=localStorage.getItem(CACHE_PREFIX+trKey(department));
      if(!raw)return null;
      const data=JSON.parse(raw);
      if(!data||!Array.isArray(data.rows)||Date.now()-Number(data.at)>CACHE_TTL)return null;
      return data.rows;
    }catch{return null;}
  }

  function makeLookup(rows){
    const exact=new Map();
    const rank=new Map();
    const collisions=new Set();

    for(const row of rows){
      const [uni,program,year,quota,baseRank]=row;
      const q=intValue(quota);
      if(q===null)continue;
      const exactKey=trKey(uni)+'|'+trKey(program)+'|'+year;
      if(!exact.has(exactKey))exact.set(exactKey,q);

      if(baseRank!==null){
        const rankKey=trKey(uni)+'|'+year+'|'+String(intValue(baseRank));
        if(rank.has(rankKey)&&rank.get(rankKey)!==q)collisions.add(rankKey);
        else rank.set(rankKey,q);
      }
    }
    for(const key of collisions)rank.delete(key);
    return {exact,rank};
  }

  async function loadDepartment(department){
    const key=trKey(department);
    if(deptCache.has(key))return deptCache.get(key);
    if(deptPromises.has(key))return deptPromises.get(key);

    const cached=loadLocal(department);
    if(cached){
      const lookup=makeLookup(cached);
      deptCache.set(key,lookup);
      return lookup;
    }

    const promise=(async()=>{
      const groups=await getGroups();
      const ids=groupIdsForDepartment(groups,department);
      if(!ids.length)throw new Error('Bölüm YÖK Atlas eşleşmesi bulunamadı');

      const first=await searchPage(ids,0);
      const all=[...(Array.isArray(first.content)?first.content:[])];
      const totalPages=Math.max(1,intValue(first.totalPages??first.total_pages)||1);

      for(let page=1;page<totalPages;page+=4){
        const pageNos=[];
        for(let p=page;p<Math.min(totalPages,page+4);p++)pageNos.push(p);
        const results=await Promise.all(pageNos.map(p=>searchPage(ids,p)));
        for(const result of results){
          if(Array.isArray(result.content))all.push(...result.content);
        }
      }

      const rows=compactRows(all);
      saveLocal(department,rows);
      const lookup=makeLookup(rows);
      deptCache.set(key,lookup);
      return lookup;
    })().finally(()=>deptPromises.delete(key));

    deptPromises.set(key,promise);
    return promise;
  }

  function programNameFromRow(row,department){
    const detail=row.querySelector('td:nth-child(2) > span')?.textContent?.trim()||'';
    if(!detail)return department;
    const first=detail.split(' · ')[0]?.trim();
    return first||department;
  }

  function rowRank(row){
    const text=row.querySelector('td:nth-child(3) strong')?.textContent||'';
    return intValue(text);
  }

  function quotaForRow(lookup,row,department,year){
    const uni=row.querySelector('td:nth-child(2) > strong')?.textContent?.trim()||'';
    const program=programNameFromRow(row,department);
    const exactKey=trKey(uni)+'|'+trKey(program)+'|'+year;
    if(lookup.exact.has(exactKey))return lookup.exact.get(exactKey);

    const rank=rowRank(row);
    if(rank!==null){
      const rankKey=trKey(uni)+'|'+year+'|'+String(rank);
      if(lookup.rank.has(rankKey))return lookup.rank.get(rankKey);
    }
    return null;
  }

  function ensureHeader(table){
    const headerRow=table.querySelector('thead tr');
    if(!headerRow)return;
    if(!headerRow.querySelector('[data-yks-quota-head]')){
      const th=document.createElement('th');
      th.dataset.yksQuotaHead='1';
      th.textContent='Kontenjan';
      headerRow.appendChild(th);
    }
  }

  function ensureCells(tbody){
    for(const row of tbody.querySelectorAll(':scope > tr')){
      const cells=row.querySelectorAll(':scope > td');
      if(cells.length===1&&cells[0].hasAttribute('colspan')){
        cells[0].colSpan=4;
        continue;
      }
      if(cells.length>=3&&!row.querySelector('[data-yks-quota-cell]')){
        const td=document.createElement('td');
        td.dataset.yksQuotaCell='1';
        td.innerHTML='<strong>…</strong>';
        row.appendChild(td);
      }
    }
  }

  function setMetaState(state){
    const meta=document.querySelector('#yksProgramMeta span');
    if(!meta)return;
    const base=meta.textContent.replace(/ · kontenjan[^·]*/gi,'').trim();
    if(state==='loading')meta.textContent=base+' · kontenjan yükleniyor';
    else if(state==='ready')meta.textContent=base+' · kontenjan YÖK Atlas';
    else if(state==='error')meta.textContent=base+' · kontenjan alınamadı';
  }

  async function enhance(){
    const table=document.querySelector('.yks-program-table');
    const tbody=document.querySelector('#yksProgramRows');
    const deptEl=document.querySelector('#yksDepartment');
    const yearEl=document.querySelector('#yksProgramYear');
    if(!table||!tbody||!deptEl||!yearEl)return;

    ensureHeader(table);
    ensureCells(tbody);

    const department=deptEl.value;
    const year=Number(yearEl.value);
    const token=trKey(department)+'|'+year;

    for(const row of tbody.querySelectorAll(':scope > tr')){
      if(row.querySelectorAll(':scope > td').length<4)continue;
      row.dataset.yksQuotaToken=token;
      const cell=row.querySelector('[data-yks-quota-cell] strong');
      if(cell&&!cell.textContent)cell.textContent='…';
    }

    setMetaState('loading');

    try{
      const lookup=await loadDepartment(department);
      if(document.querySelector('#yksDepartment')?.value!==department||Number(document.querySelector('#yksProgramYear')?.value)!==year)return;

      for(const row of tbody.querySelectorAll(':scope > tr')){
        if(row.dataset.yksQuotaToken!==token)continue;
        const cell=row.querySelector('[data-yks-quota-cell] strong');
        if(!cell)continue;
        const quota=quotaForRow(lookup,row,department,year);
        cell.textContent=quota===null?'—':new Intl.NumberFormat('tr-TR').format(quota);
        cell.title=quota===null?'Kontenjan eşleşmesi bulunamadı':year+' genel kontenjanı';
      }
      setMetaState('ready');
    }catch(error){
      console.warn('YKS kontenjan verisi yüklenemedi:',error);
      for(const cell of tbody.querySelectorAll('[data-yks-quota-cell] strong'))cell.textContent='—';
      setMetaState('error');
    }
  }

  function schedule(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(()=>{
      renderQueued=false;
      void enhance();
    });
  }

  function init(){
    schedule();
    const view=document.querySelector('#view');
    if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
    document.addEventListener('change',event=>{
      if(event.target?.matches?.('#yksDepartment,#yksProgramYear'))setTimeout(schedule,0);
    },true);
    document.addEventListener('input',event=>{
      if(event.target?.matches?.('#yksProgramSearch'))setTimeout(schedule,0);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();