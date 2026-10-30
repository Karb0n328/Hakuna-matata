// Deterministic, offline verifiers for Hakuna YKS AI teacher.
// This module verifies calculations/atom conservation/unit dimensions only.
// Correct calculations do not prove the model interpreted a question correctly.

export type Check = {kind?:string; expression?:string; expected?:string; equation?:string; target?:string};
export type CheckReport = {
  attempted:number; passed:number; failed:number; skipped:number;
  hardMismatch:boolean; notes:string[]; labels:string[];
};
const near=(a:number,b:number)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));

export function arithmetic(input:string):number {
  const raw=String(input||"").trim().replace(/,/g,".").replace(/[×·]/g,"*").replace(/[÷]/g,"/").replace(/[−–]/g,"-").replace(/π/g,"pi").replace(/√\s*\(/g,"sqrt(").replace(/\s+/g,"");
  if(!raw||raw.length>240)throw Error("Aritmetik ifade uzun veya boş.");
  const regex=/\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[a-zA-Z]+|[()+\-*/^]/g;
  const tokens=raw.match(regex)||[];
  if(tokens.join("")!==raw||tokens.length>130)throw Error("Desteklenmeyen ifade.");
  let i=0,depth=0,steps=0;
  const current=()=>tokens[i];
  const consume=(token:string)=>{if(current()!==token)throw Error("İfade sözdizimi.");i++;};
  const finite=(v:number)=>{if(!Number.isFinite(v)||Math.abs(v)>1e100)throw Error("Sonuç sayı aralığı dışında.");return v;};
  function expr():number{
    let x=term();while(current()==="+"||current()==="-"){const op=tokens[i++],v=term();x=finite(op==="+"?x+v:x-v);}return x;
  }
  function term():number{
    let x=unary();while(current()==="*"||current()==="/"){const op=tokens[i++],v=unary();if(op==="/"&&Math.abs(v)<1e-15)throw Error("Sıfıra bölme.");x=finite(op==="*"?x*v:x/v);}return x;
  }
  function unary():number{
    if(current()==="+"){i++;return unary();}
    if(current()==="-"){i++;return -unary();}
    return power();
  }
  function power():number{
    let x=primary();
    if(current()==="^"){i++;const exp=unary();if(Math.abs(exp)>80)throw Error("Üs çok büyük.");x=finite(x**exp);}return x;
  }
  function primary():number{
    if(++steps>160||depth>25)throw Error("İfade çok karmaşık.");
    const t=current();if(!t)throw Error("Eksik ifade.");
    if(t==="("){i++;depth++;const v=expr();depth--;consume(")");return v;}
    if(/^\d/.test(t)){i++;return finite(Number(t));}
    if(t==="pi"){i++;return Math.PI;}
    if(t==="e"){i++;return Math.E;}
    const funcs:{[key:string]:(x:number)=>number}={sqrt:Math.sqrt,abs:Math.abs,ln:Math.log,log:Math.log10,sin:Math.sin,cos:Math.cos,tan:Math.tan};
    if(Object.prototype.hasOwnProperty.call(funcs,t)){
      i++;consume("(");depth++;const v=expr();depth--;consume(")");
      return finite(funcs[t](v));
    }
    throw Error("Desteklenmeyen sembol: "+t);
  }
  const result=finite(expr());
  if(i!==tokens.length)throw Error("Fazladan karakter.");
  return result;
}

type Dim=[number,number,number,number]; // kg, m, s, mol
const U:Record<string,Dim>={
  kg:[1,0,0,0],g:[1,0,0,0],mg:[1,0,0,0],
  m:[0,1,0,0],cm:[0,1,0,0],mm:[0,1,0,0],km:[0,1,0,0],
  s:[0,0,1,0],ms:[0,0,1,0],min:[0,0,1,0],h:[0,0,1,0],
  mol:[0,0,0,1],L:[0,3,0,0],mL:[0,3,0,0],
  N:[1,1,-2,0],J:[1,2,-2,0],W:[1,2,-3,0],Pa:[1,-1,-2,0],Hz:[0,0,-1,0],
  C:[0,0,1,0] // only charge's time dimension is not supported: fail closed by excluding C below
};
delete U.C;
const combine=(a:Dim,b:Dim,sign=1):Dim=>a.map((v,i)=>v+sign*b[i]) as Dim;
const times=(a:Dim,n:number):Dim=>a.map(v=>v*n) as Dim;
export function dimension(expr:string):Dim{
  const raw=String(expr||"").replace(/\s+/g,"").replace(/²/g,"^2").replace(/³/g,"^3").replace(/·/g,"*");
  if(!raw||raw.length>100)throw Error("Birim uzunluğu geçersiz.");
  const tokens=raw.match(/[A-Za-z]+|\d+|[()+\-*/^]/g)||[];
  if(tokens.join("")!==raw||tokens.length>90)throw Error("Birim ifadesi desteklenmiyor.");
  let i=0;
  function atom():Dim{
    if(tokens[i]==="("){i++;const value=product();if(tokens[i++]!==")")throw Error("Parantez eksik.");return value;}
    const name=tokens[i++];if(!name||!Object.prototype.hasOwnProperty.call(U,name))throw Error("Bilinmeyen birim.");
    return U[name];
  }
  function factor():Dim{
    let v=atom();
    if(tokens[i]==="^"){i++;let sign=1;if(tokens[i]==="-"){sign=-1;i++;}else if(tokens[i]==="+"){i++;}
      const n=Number(tokens[i++]);if(!Number.isInteger(n)||n>12)throw Error("Geçersiz birim üssü.");
      v=times(v,sign*n);
    }
    return v;
  }
  function product():Dim{
    let v=factor();
    while(tokens[i]==="*"||tokens[i]==="/"){const op=tokens[i++];v=combine(v,factor(),op==="*"?1:-1);}return v;
  }
  const result=product();
  if(i!==tokens.length)throw Error("Tamamlanmamış birim.");
  return result;
}

function atoms(formula:string):Record<string,number>{
  const text=formula.trim();
  if(!text||text.length>90||/[^A-Za-z0-9()]/.test(text))throw Error("Kimyasal formül desteklenmiyor.");
  let i=0;
  function group(nested=false):Record<string,number>{
    const result:Record<string,number>={};let used=false;
    const number=()=>{const start=i;while(/[0-9]/.test(text[i]||""))i++;return start===i?1:Number(text.slice(start,i));};
    while(i<text.length&&text[i]!==")"){
      let counts:Record<string,number>;
      if(text[i]==="("){i++;counts=group(true);if(text[i++]!==")")throw Error("Eksik kimyasal parantez.");}
      else{
        const match=/^[A-Z][a-z]?/.exec(text.slice(i));
        if(!match)throw Error("Geçersiz element simgesi.");
        i+=match[0].length;counts={[match[0]]:1};
      }
      const n=number();if(!Number.isInteger(n)||n<1||n>1000)throw Error("Kimyasal katsayı geçersiz.");
      for(const [k,v] of Object.entries(counts))result[k]=(result[k]||0)+v*n;
      used=true;
    }
    if(!used)throw Error("Boş kimyasal grup.");
    if(nested&&i>=text.length)throw Error("Eksik kapama parantezi.");
    return result;
  }
  const result=group();if(i!==text.length)throw Error("Beklenmeyen kimyasal parantez.");
  return result;
}
export function balancedEquation(eq:string):boolean{
  const text=String(eq||"").replace(/→|⟶|⇒/g,"->").replace(/⇌|↔/g,"->").trim();
  if(text.length>240)throw Error("Tepkime denklemi uzun.");
  const halves=text.split(/\s*->\s*/);
  if(halves.length!==2)throw Error("Tepkimede ok bulunamadı.");
  function parseSide(s:string):Record<string,number>{
    const total:Record<string,number>={};
    const species=s.split(/\s+\+\s+/).map(x=>x.trim());
    if(!species.length||species.some(x=>!x))throw Error("Eksik tepkime bileşeni.");
    for(const token of species){
      const match=/^(\d+)?\s*([A-Za-z][A-Za-z0-9()]*)$/.exec(token);
      if(!match)throw Error("Denklem bileşeni desteklenmiyor. Artıların etrafına boşluk koy.");
      const coefficient=match[1]?Number(match[1]):1;
      if(!Number.isInteger(coefficient)||coefficient<1||coefficient>500)throw Error("Katsayı desteklenmiyor.");
      const a=atoms(match[2]);
      for(const [atom,count] of Object.entries(a))total[atom]=(total[atom]||0)+count*coefficient;
    }
    return total;
  }
  const left=parseSide(halves[0]),right=parseSide(halves[1]);
  const keys=new Set([...Object.keys(left),...Object.keys(right)]);
  return keys.size>0&&[...keys].every(k=>left[k]===right[k]);
}
export function verifyChecks(input:unknown, subject:string):CheckReport{
  const report:CheckReport={attempted:0,passed:0,failed:0,skipped:0,hardMismatch:false,notes:[],labels:[]};
  const checks=Array.isArray(input)?input.slice(0,6):[];
  for(const raw of checks){
    if(!raw||typeof raw!=="object")continue;
    const c=raw as Check,kind=String(c.kind||"");
    if(!["arithmetic","chemical_balance","dimension"].includes(kind))continue;
    report.attempted++;
    try{
      let good=false,label="";
      if(kind==="arithmetic"){
        const actual=arithmetic(String(c.expression||""));
        const expected=arithmetic(String(c.expected||""));
        good=near(actual,expected);
        label="Hesap kontrolü";
      }else if(kind==="chemical_balance"){
        if(subject!=="Kimya")throw Error("Yalnız kimya denklemi denetlenir.");
        good=balancedEquation(String(c.equation||""));
        label="Atom korunumu";
      }else{
        if(subject!=="Fizik"&&subject!=="Kimya")throw Error("Birim kontrolü uygun değil.");
        const lhs=dimension(String(c.expression||"")),rhs=dimension(String(c.target||""));
        good=lhs.every((x,i)=>x===rhs[i]);
        label="Birim boyutları";
      }
      if(good){report.passed++;report.labels.push(label);report.notes.push(label+": geçti.");}
      else{report.failed++;report.hardMismatch=true;report.notes.push(label+": tutarsızlık bulundu.");}
    }catch{
      // Unsupported syntax cannot be called a failure or a validation pass.
      report.skipped++;report.notes.push("Bir kontrol ifadesi güvenilir biçimde değerlendirilemedi.");
    }
  }
  return report;
}
