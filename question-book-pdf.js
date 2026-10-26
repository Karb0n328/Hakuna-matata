(() => {
  'use strict';
  const W=595.28,H=841.89,SCALE=2.6,LEFT=34,TOP=112,BOTTOM=790,COL_GAP=18;
  const enc=new TextEncoder();
  const byteText=s=>enc.encode(s);
  const fmt=n=>Number(n).toFixed(2);
  const dateTR=()=>new Date().toLocaleDateString('tr-TR');

  async function decode(blob){
    const url=URL.createObjectURL(blob);
    try{
      const img=new Image(); img.decoding='async';
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
      return img;
    } finally { /* caller releases after drawing */ }
  }

  async function imageFromBlob(blob){
    const url=URL.createObjectURL(blob);
    try{
      const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
      return {img,revoke:()=>URL.revokeObjectURL(url)};
    }catch(e){URL.revokeObjectURL(url);throw e;}
  }
  const drawText=(ctx,text,x,y,size=10,color='#17253a',weight='400')=>{
    ctx.fillStyle=color; ctx.font=weight+' '+size+'px system-ui, sans-serif';
    ctx.fillText(String(text),x,y);
  };

  function createSheet(subject,count,pageNumber,period){
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(W*SCALE);canvas.height=Math.round(H*SCALE);
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.scale(SCALE,SCALE);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#1d3758';ctx.fillRect(0,0,W,8);
    drawText(ctx,'HAKUNA MATATA   /   KİŞİSEL SORU KİTAPÇIĞI',LEFT,31,9,'#637187','700');
    drawText(ctx,subject+' • Soru Kitapçığı',LEFT,62,19,'#11263f','700');
    drawText(ctx,period+'   |   '+count+' soru   |   '+dateTR(),LEFT,82,10,'#64748b');
    ctx.strokeStyle='#e1e6ee';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(LEFT,93);ctx.lineTo(W-LEFT,93);ctx.stroke();
    ctx.beginPath();ctx.moveTo(LEFT,H-35);ctx.lineTo(W-LEFT,H-35);ctx.stroke();
    drawText(ctx,'Hakuna Matata • Soru Kitaplığım',LEFT,H-21,8,'#7a8899');
    drawText(ctx,String(pageNumber),W-LEFT-10,H-21,8,'#7a8899','700');
    return {canvas,ctx};
  }

  function writeQuestion(ctx,q,img,x,y,width,height,i){
    const solved=['solved','complete','completed'].includes(q.status);
    const badgeWidth=76;
    const title=String(i)+'.  '+q.subject+' / '+(q.topic||q.source||'Soru');
    const maxTitleWidth=Math.max(55,width-(solved?badgeWidth+9:0));
    ctx.font='700 9px system-ui, sans-serif';
    let short=title;
    while(short.length>6&&ctx.measureText(short).width>maxTitleWidth){
      short=short.slice(0,-2)+'…';
    }
    drawText(ctx,short,x,y+12,9,'#1d3758','700');
    if(solved){
      ctx.fillStyle='#e4f4e9';
      ctx.fillRect(x+width-badgeWidth,y,badgeWidth,16);
      drawText(ctx,'✓ Çözdürüldü',x+width-badgeWidth+5,y+11,8,'#236340','700');
    }
    ctx.strokeStyle='#d8e1eb';ctx.lineWidth=.6;
    ctx.strokeRect(x,y+20,width,height);
    // Preserve every pixel of the stored image; never stretch or crop it in the PDF.
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    const fit=Math.min((width-2)/iw,(height-2)/ih);
    const dw=iw*fit,dh=ih*fit;
    ctx.fillStyle='#fff';ctx.fillRect(x+1,y+21,width-2,height-2);
    ctx.drawImage(img,x+(width-dw)/2,y+21+(height-2-dh)/2,dw,dh);
    const answer=/^[A-E]$/.test(String(q.correctAnswer||'').toUpperCase())?String(q.correctAnswer).toUpperCase():'';
    const label=answer?'Doğru cevap: '+answer:'';
    const meta=[q.source,q.reference].filter(Boolean).join(' • ');
    const maxMetaWidth=width-(answer?78:0);
    ctx.font='400 8px system-ui, sans-serif';
    let shortMeta=meta;
    while(shortMeta.length>4 && ctx.measureText(shortMeta).width>maxMetaWidth){
      shortMeta=shortMeta.slice(0,-2)+'…';
    }
    drawText(ctx,shortMeta,x,y+height+34,8,'#627184');
    if(answer){
      ctx.fillStyle='#e9f1fb';
      ctx.fillRect(x+width-77,y+height+23,77,17);
      drawText(ctx,label,x+width-73,y+height+34,8,'#164578','700');
    }
  }

  async function createPages(items,{subject,period}={}){
    if(!items.length)throw new Error('Kitapçık için fotoğraflı soru bulunamadı.');
    const pages=[];
    const colW=(W-2*LEFT-COL_GAP)/2,fullW=W-2*LEFT;
    let sheet=createSheet(subject,items.length,1,period),positions=[TOP,TOP],number=0;

    async function finish(){
      const blob=await new Promise((resolve,reject)=>sheet.canvas.toBlob(b=>b?resolve(b):reject(new Error('Sayfa görüntüsü üretilemedi.')),'image/jpeg',.91));
      pages.push({bytes:new Uint8Array(await blob.arrayBuffer()),w:sheet.canvas.width,h:sheet.canvas.height});
      sheet.canvas.width=1;sheet.canvas.height=1;
    }
    function newSheet(){
      sheet=createSheet(subject,items.length,pages.length+1,period);
      positions=[TOP,TOP];
    }

    for(const q of items){
      const photo=await q.getPhoto();
      if(!photo)continue;
      const {img,revoke}=await imageFromBlob(photo);
      try{
        const ratio=img.naturalHeight/img.naturalWidth;
        const wide=ratio<.67 || ratio>2.45;
        const maxWidth=wide?fullW:colW;
        const allowed=BOTTOM-TOP-45;
        const width=Math.min(maxWidth,allowed/ratio);
        const height=ratio*width;
        const need=height+47;
        let col=positions[0]<=positions[1]?0:1;
        if(wide){
          if(positions.some(v=>v>TOP)){await finish();newSheet();}
          col=0;
        }else{
          if(positions[col]+need>BOTTOM){
            col=1-col;
            if(positions[col]+need>BOTTOM){await finish();newSheet();col=0;}
          }
        }
        const x=LEFT+(wide?(fullW-width)/2:col*(colW+COL_GAP)+(colW-width)/2);
        const y=wide?TOP:positions[col];
        number++;
        writeQuestion(sheet.ctx,q,img,x,y,width,height,number);
        if(wide){
          positions=[BOTTOM,BOTTOM];
        }else{
          positions[col]=y+need+10;
        }
      }finally{revoke();}
    }
    if(number===0)throw new Error('Kitapçık için açılabilir soru fotoğrafı yok.');
    await finish();
    return pages;
  }

  function pdfFromPages(pages){
    const objects=[null,'',''],catalog=1,rootPages=2;
    const kids=[];
    for(let i=0;i<pages.length;i++){
      const pageObj=3+i*3,imgObj=pageObj+1,contentObj=pageObj+2;
      const data=pages[i];
      kids.push(pageObj+' 0 R');
      const xobj='Im'+i;
      const stream='q\n'+fmt(W)+' 0 0 '+fmt(H)+' 0 0 cm\n/'+xobj+' Do\nQ\n';
      objects[pageObj]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+fmt(W)+' '+fmt(H)+'] /Resources << /XObject << /'+xobj+' '+imgObj+' 0 R >> >> /Contents '+contentObj+' 0 R >>';
      objects[imgObj]={dict:'<< /Type /XObject /Subtype /Image /Width '+data.w+' /Height '+data.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+data.bytes.length+' >>',bytes:data.bytes};
      objects[contentObj]={dict:'<< /Length '+byteText(stream).length+' >>',bytes:byteText(stream)};
    }
    objects[catalog]='<< /Type /Catalog /Pages 2 0 R >>';
    objects[rootPages]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';

    const chunks=[],offsets=[0];
    let length=0;
    const add=v=>{const bytes=typeof v==='string'?byteText(v):v;chunks.push(bytes);length+=bytes.length;};
    add('%PDF-1.4\n%HAKUNA\n');
    for(let i=1;i<objects.length;i++){
      offsets[i]=length;
      add(i+' 0 obj\n');
      const obj=objects[i];
      if(typeof obj==='string')add(obj+'\n');
      else{add(obj.dict+'\nstream\n');add(obj.bytes);add('\nendstream\n');}
      add('endobj\n');
    }
    const xrefAt=length;
    add('xref\n0 '+objects.length+'\n');
    add('0000000000 65535 f \n');
    for(let i=1;i<objects.length;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    add('trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xrefAt+'\n%%EOF\n');
    return new Blob(chunks,{type:'application/pdf'});
  }

  async function build(items,options={}){
    // The answer belongs to the same question object as the image.
    // Questions without readable images are skipped together with their answers.
    const pages=await createPages(items,options);
    return pdfFromPages(pages);
  }
  window.HakunaBookPDF=Object.freeze({build});
})();