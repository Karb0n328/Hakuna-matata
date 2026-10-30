// Conservative answer-equivalence rules. Treat inconsistent explicit units as disagreements.
const unitAlias:Record<string,string>={
 "TL":"TRY","₺":"TRY","LİRA":"TRY",
 "AMPER":"A","A":"A","VOLT":"V","V":"V",
 "OHM":"OHM","Ω":"OHM",
 "CM":"CM","M":"M","KM":"KM","MM":"MM",
 "M/S²":"M/S^2","M/S^2":"M/S^2","M/S2":"M/S^2",
 "M/S":"M/S","KG":"KG","G":"G","N":"N",
 "J":"J","W":"W","MOL":"MOL","MOLAR":"MOL/L","MOL/L":"MOL/L"
};
type Parsed={kind:"number"|"option"|"text";value:string|number;unit?:string};
export function parseAnswer(raw:unknown):Parsed{
 let s=typeof raw==="string"?raw.trim().normalize("NFC").toLocaleUpperCase("tr-TR"):"";
 s=s.replace(/^(?:DOĞRU\s+)?(?:CEVAP|ŞIK|SEÇENEK)\s*[:：=\-]?\s*/u,"").trim();
 const choice=/^([ABCDE])(?:\s*(?:ŞIKKI|SEÇENEĞİ)|[).])?$/u.exec(s);
 if(choice)return {kind:"option",value:choice[1]};
 s=s.replace(/^X\s*=\s*/,"");
 const number=/^([-+]?[0-9]+(?:[.,][0-9]+)?)\s*([A-Z0-9\/²^₺ΩİÜÇŞĞ]+)?$/u.exec(s);
 if(number&&Number.isFinite(Number(number[1].replace(",",".")))){
  const unit=number[2];
  if(!unit)return {kind:"number",value:Number(number[1].replace(",","."))};
  if(unitAlias[unit])return {kind:"number",value:Number(number[1].replace(",",".")),unit:unitAlias[unit]};
 }
 return {kind:"text",value:s.replace(/[.!?]/g,"").replace(/\s+/g," ").trim()};
}
export function answersAgree(a:unknown,b:unknown):boolean{
 const x=parseAnswer(a),y=parseAnswer(b);
 if(x.kind!==y.kind||!x.value||!y.value)return false;
 if(x.kind==="number"){
  if(x.unit&&y.unit&&x.unit!==y.unit)return false;
  const n=Number(x.value),m=Number(y.value);
  return Math.abs(n-m)<=1e-8*Math.max(1,Math.abs(n),Math.abs(m));
 }
 return x.value===y.value;
}
