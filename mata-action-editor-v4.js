(() => {
  'use strict';
  const M=window.HakunaMataV2,A=M.actionsV4,esc=M.esc;
  const labels={title:'Başlık',subject:'Ders',date:'Tarih',start:'Başlangıç',end:'Bitiş',metricValue:'Miktar',metricUnit:'Birim',note:'Not',order:'Kart sırası (0’dan başlar)',value:'Miktar',unit:'Birim',sourceDate:'Kaynak tarih',topic:'Konu',source:'Kaynak',reference:'Test / sayfa / soru',type:'Sınav türü',name:'Deneme adı',duration:'Süre (dakika)',ranking:'Sıralama',rows:'Her satır: Ders; doğru; yanlış; boş'};
  const numeric=['metricValue','value','order','duration'];
  const options=(values,selected)=>values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
  const html=()=>`<section class="card"><details class="mata-record-editor" style="padding:16px"><summary><strong>Kayıt seçerek işlem yap</strong></summary><p>Mata isteğini anlayamadığında buradan kaydı ve alanlarını net seçebilirsin. Her değişiklik önce önizlenir.</p><form data-mata-editor><label>Kayıt türü<select name="collection">${Object.entries(A.names).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>İşlem<select name="operation"></select></label><label data-record-label>Kayıt<select name="record"></select></label><div data-editor-fields></div><p data-editor-error role="alert"></p><button class="secondary-btn" type="submit">Önizleme hazırla</button></form></details></section>`;
  function bind(root,state,onProposal){
    const form=root.querySelector('[data-mata-editor]');if(!form)return;
    const select=name=>form.elements.namedItem(name),area=form.querySelector('[data-editor-fields]'),error=form.querySelector('[data-editor-error]');
    let selected=null;const renderedOwner=A.owner();
    function input(f,value){
      let field;
      if(f==='subject')field=`<select name="${f}">${options(M.SUBJECTS,value||'Diğer')}</select>`;
      else if(f==='unit'||f==='metricUnit')field=`<select name="${f}">${options(M.UNITS,value||'test')}</select>`;
      else if(f==='type')field=`<select name="type">${options(['TYT','AYT','Branş'],value||'TYT')}</select>`;
      else if(f==='rows')field=`<textarea name="rows" rows="5" placeholder="Türkçe; 35; 5; 0">${esc((value||[]).map(r=>`${r.subject}; ${r.correct}; ${r.wrong}; ${r.blank}`).join('\n'))}</textarea>`;
      else if(f==='note')field=`<textarea name="note" rows="3">${esc(value||'')}</textarea>`;
      else field=`<input name="${f}" type="${numeric.includes(f)?'number':['date','sourceDate'].includes(f)?'date':['start','end'].includes(f)?'time':'text'}" value="${esc(value??'')}" ${numeric.includes(f)?'min="0" step="any"':''}>`;
      return `<label style="display:grid;gap:4px;margin:10px 0">${labels[f]}${field}</label>`;
    }
    function renderFields(){
      error.textContent='';const k=select('collection').value,op=select('operation').value;
      selected=(state[k]||[]).find(r=>r.id===select('record').value)||null;
      form.querySelector('[data-record-label]').hidden=op==='add';
      const base=op==='add'?{date:M.todayISO(),sourceDate:M.todayISO(),order:(state.planItems||[]).length}:selected||{};
      let fields=op==='delete'?[]:op==='status'?[]:op==='schedule'?['date','start','end']:A.schemas[k];
      area.innerHTML=fields.map(f=>input(f,base[f])).join('');
      if(op==='status'){
        const values=k==='tasks'?['false','true']:k==='questions'?['open','solved']:['pending','complete','partial','incomplete'];
        const statusLabels={false:'Aktif',true:'Tamamlandı',open:'Açık',solved:'Çözüldü',pending:'Bekliyor',complete:'Tamamlandı',partial:'Kısmen',incomplete:'Yapılmadı'};
        area.innerHTML=`<label>Yeni durum<select name="status">${values.map(v=>`<option value="${v}">${statusLabels[v]}</option>`).join('')}</select></label>`;
        if(['blocks','planItems'].includes(k))area.innerHTML+=`<p>Kısmen için kalan miktarı ve birimi gir.</p>${input('value','')}${input('unit','test')}`;
      }
    }
    function renderCollection(){
      const k=select('collection').value;
      const ops={add:'Ekle',edit:'Düzenle',delete:'Sil',duplicate:'Çoğalt'};
      if(['blocks','planItems','tasks','questions'].includes(k))ops.status='Durum değiştir';
      if(['tasks','debts'].includes(k))ops.schedule='Programa koy';
      select('operation').innerHTML=Object.entries(ops).map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
      select('record').innerHTML=(state[k]||[]).map(r=>`<option value="${esc(r.id)}">${esc([r.title||r.name||r.source,r.reference,r.date,r.start,r.subject,r.id].filter(Boolean).join(' · '))}</option>`).join('');
      renderFields();
    }
    select('collection').onchange=renderCollection;select('operation').onchange=renderFields;select('record').onchange=renderFields;
    form.onsubmit=async event=>{
      event.preventDefault();error.textContent='';
      try{
        if(renderedOwner!==A.owner())throw new Error('Hesap değişti. Mata’yı yeniden aç.');
        const k=select('collection').value,op=select('operation').value;
        if(op!=='add'&&!selected)throw new Error('Önce bir kayıt seç.');
        const a={type:'record',collection:k,op,before:selected};
        if(op==='status'){
          a.status=k==='tasks'?select('status').value==='true':select('status').value;
          if(a.status==='partial'){if(!select('value').value.trim())throw new Error('Kalan miktarı gir.');a.remaining={value:Number(select('value').value),unit:select('unit').value};}
        }else if(op!=='delete'){
          a.data={};
          const fields=op==='schedule'?['date','start','end']:A.schemas[k];
          for(const f of fields){const v=select(f).value.trim();
            if(f==='rows')a.data.rows=v.split('\n').filter(x=>x.trim()).map(line=>{const parts=line.split(';').map(x=>x.trim());if(parts.length!==4||parts.slice(1).some(x=>!/^\d+$/.test(x)))throw new Error('Ders sonuçlarını “Türkçe; 35; 5; 0” biçiminde gir.');return {subject:parts[0],correct:Number(parts[1]),wrong:Number(parts[2]),blank:Number(parts[3])};});
            else a.data[f]=numeric.includes(f)?(v===''?null:Number(v)):v;
          }
        }
        await onProposal([a]);
      }catch(e){error.textContent=e.message;}
    };
    renderCollection();
  }
  M.actionEditorV4={html,bind};
})();
