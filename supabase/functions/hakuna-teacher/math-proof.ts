// Narrow deterministic YKS word-problem / polynomial checks.
// Every parser fails closed: if the text is outside supported patterns it returns null.
// This is not a general-purpose mathematical theorem prover.
export type Proof = {
 status:"verified"|"contradiction"|"unavailable";
 kind:string; calculated?:number; modelNumber?:number; message:string;
};
function maybeNumber(raw:unknown):number|null{
 if(typeof raw!=="string")return null;
 let s=raw.trim().replace(/,/g,".").replace(/^x\s*=\s*/i,"").replace(/^sonu[cç]\s*[:=]\s*/i,"");
 const m=/^([-+]?[0-9]+(?:\.[0-9]+)?)(?:\s*(?:TL|cm|m|g|kg|N|J|W|V|A|amper|volt|mol|M|m\/s(?:\^?2|²)?|m\/s²|ohm))?$/i.exec(s);
 if(!m)return null;
 const n=Number(m[1]);return Number.isFinite(n)?n:null;
}
const equal=(a:number,b:number)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
function polynomialValue(raw:string,at:number,operation:"derivative"|"integral",upper?:number):number|null{
 const s=raw.replace(/[²³⁴]/g,x=>({"²":"^2","³":"^3","⁴":"^4"}[x]||x))
  .replace(/[−–]/g,"-").replace(/\s+/g,"").replace(/,/g,".");
 if(!/^[+\-]?(?:\d+(?:\.\d+)?(?:x(?:\^[0-4])?)?|x(?:\^[0-4])?)(?:[+\-](?:\d+(?:\.\d+)?(?:x(?:\^[0-4])?)?|x(?:\^[0-4])?))*$/u.test(s))return null;
 const normalized=/^[+-]/.test(s)?s:"+"+s;
 const terms=normalized.match(/[+-][^+-]+/g)||[];
 const values=new Map<number,number>();
 for(const t of terms){
  const sign=t[0]==="-"?-1:1;const token=t.slice(1);
  const match=/^(\d+(?:\.\d+)?)?(x(?:\^([0-4]))?)?$/i.exec(token);
  if(!match||(!match[1]&&!match[2]))return null;
  const c=sign*(match[1]?Number(match[1]):1), power=match[2]?(match[3]?Number(match[3]):1):0;
  values.set(power,(values.get(power)||0)+c);
 }
 if(operation==="derivative"){
  let total=0;for(const [exp,coeff] of values){if(exp>=1)total+=exp*coeff*at**(exp-1);}
  return total;
 }
 if(upper===undefined||!Number.isFinite(upper))return null;
 let total=0;for(const [exp,coeff] of values)total+=coeff*(upper**(exp+1)-at**(exp+1))/(exp+1);
 return total;
}
export function independentMathProof(question:string,subject:string,candidateAnswer:string):Proof{
 const unavailable:Proof={status:"unavailable",kind:"unsupported",message:"Bu soru türü için doğrudan hesap ispatı bulunamadı."};
 const s=String(question||"").normalize("NFKC").replace(/[−–]/g,"-").replace(/³/g,"^3").replace(/²/g,"^2");
 const name=String(subject||"").toLocaleLowerCase("tr-TR");
 if(!["matematik","geometri","fizik","kimya"].includes(name))return unavailable;
 let calculated:number|null=null,kind="unsupported";
 if(name==="matematik"){
  const f=/f\(x\)\s*=\s*([^,;\n]+?)(?=\s+olduğuna|\s+için|$)/i.exec(s);
  const deriv=/f\s*['’]\s*\(\s*(-?\d+(?:[.,]\d+)?)\s*\)/i.exec(s);
  if(f&&deriv){
   calculated=polynomialValue(f[1],Number(deriv[1]),"derivative");kind="polynomial-derivative";
  }else if(f&&/belirli integral/i.test(s)){
   const ends=/(-?\d+(?:[.,]\d+)?)\s*['’]?\s*d[ae]n\s+(-?\d+(?:[.,]\d+)?)\s*['’]?\s*y[ea]/iu.exec(s);
   if(ends){calculated=polynomialValue(f[1],Number(ends[1]),"integral",Number(ends[2]));kind="polynomial-integral";}
  }
  if(calculated===null){
   const eq=/\biçin\s+(\d+)\s*x\s*([+-])\s*(\d+)\s*=\s*(-?\d+)\s*\.\s*x\s+kaçtır/iu.exec(s);
   if(eq){const a=Number(eq[1]),b=(eq[2]==="+"?1:-1)*Number(eq[3]),c=Number(eq[4]);calculated=(c-b)/a;kind="linear-equation";}
  }
 }else if(name==="geometri"){
  const geo=/dik kenar uzunlukları\s+(\d+)\s*cm\s+ve\s+(\d+)\s*cm.*hipotenüsü/iu.exec(s);
  if(geo){calculated=Math.hypot(Number(geo[1]),Number(geo[2]));kind="pythagoras";}
 }else if(name==="fizik"){
  const force=/(\d+)\s*kg.*?\s+(\d+)\s*N\s+net kuvvet.*?ivmen/iu.exec(s);
  if(force){calculated=Number(force[2])/Number(force[1]);kind="newton-second-law";}
  const ohm=/direnci\s+(\d+)\s*ohm.*?\s+(\d+)\s*volt.*?akım/iu.exec(s);
  if(ohm){calculated=Number(ohm[2])/Number(ohm[1]);kind="ohms-law";}
 }else if(name==="kimya"){
  const mol=/(\d+)\s*mol.*?(\d+)\s*litre\s+çözelti\s+kaç\s*M/iu.exec(s);
  if(mol){calculated=Number(mol[1])/Number(mol[2]);kind="molarity";}
  const mass=/molar kütlesi\s+(\d+)\s*g\/mol.*?\s+(\d+)\s*mol.*?kütle\s+kaç/iu.exec(s);
  if(mass){calculated=Number(mass[1])*Number(mass[2]);kind="mole-mass";}
 }
 if(calculated===null||!Number.isFinite(calculated))return unavailable;
 const guessed=maybeNumber(candidateAnswer);
 if(guessed===null)return {status:"unavailable",kind,message:"Hesaplanan sayısal değerle modelin cevap biçimi otomatik eşleştirilemedi."};
 return {
  status:equal(calculated,guessed)?"verified":"contradiction",
  kind,calculated,modelNumber:guessed,
  message:equal(calculated,guessed)?"Soru metninden bağımsız hesap sonucu model cevabıyla eşleşti.":"Soru metninden bağımsız hesap modeli doğrulamadı."
 };
}
