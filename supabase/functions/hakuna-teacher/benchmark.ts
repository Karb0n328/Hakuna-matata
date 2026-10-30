// Accuracy gate: prevent accidental claims that small or synthetic samples prove 99% YKS reliability.
// This is a benchmark scorer, not an AI solver.
export type BenchmarkCase={
 id:string; subject:string; exam:"TYT"|"AYT"|"YDT"; format:"text"|"diagram"|"table"|"graph";
 difficulty:"medium"|"hard"; expected:string;
 source:"official_heldout"|"hand_curated"|"synthetic";
 sourceUrl?:string; year?:number; questionNumber?:number;
};
export type BenchmarkResult={id:string; answer:string|null; status:"answered"|"abstained"|"error"; latencyMs:number};
const z=1.959963984540054;
function norm(value:string):string{
 let s=String(value||"").trim().normalize("NFKC").toLocaleUpperCase("tr-TR");
 s=s.replace(/^(?:DOĞRU\s+)?(?:CEVAP|ŞIK|SEÇENEK)(?:\s*(?:ŞIKKI|SEÇENEĞİ))?\s*[:：=\-]?\s*/u,"")
  .replace(/^([ABCDE])(?:\s*ŞIKKI|\s*SEÇENEĞİ|\s*[).])\s*$/u,"$1");
 return s.replace(/\s+/g,"").replace(",",".").replace(/^\+/, "");
}
function equal(a:string,b:string):boolean{
 const x=norm(a),y=norm(b);
 if(x===y&&x.length>0)return true;
 // Numeric normalization only; fractions, units and textual alternatives require manual adjudication.
 if(/^[-+]?\d+(?:\.\d+)?$/u.test(x)&&/^[-+]?\d+(?:\.\d+)?$/u.test(y)){
  return Math.abs(Number(x)-Number(y))<=1e-9*Math.max(1,Math.abs(Number(x)),Math.abs(Number(y)));
 }
 return false;
}
function wilsonLower(success:number,attempts:number):number{
 if(attempts<=0)return 0;
 const p=success/attempts,z2=z*z,denom=1+z2/attempts;
 return Math.max(0,(p+z2/(2*attempts)-z*Math.sqrt((p*(1-p)+z2/(4*attempts))/attempts))/denom);
}
export function scoreBenchmark(cases:BenchmarkCase[],predictions:BenchmarkResult[]){
 const ids=new Set<string>(), answers=new Map<string,BenchmarkResult>();
 for(const c of cases){
  if(!c.id||ids.has(c.id))throw Error("Duplicate/invalid benchmark question ID");
  ids.add(c.id);
 }
 for(const p of predictions){
  if(!ids.has(p.id)||answers.has(p.id))throw Error("Missing/duplicate prediction ID");
  answers.set(p.id,p);
 }
 let right=0,wrong=0,abstained=0,errors=0,missing=0,answered=0,latencyMs=0;
 const subjects=new Set<string>(),formats=new Set<string>();
 const breakdown:Record<string,{total:number;right:number;wrong:number;abstained:number}>={};
 const incorrectIds:string[]=[];
 for(const c of cases){
  subjects.add(c.subject);formats.add(c.format);
  const bucket=breakdown[c.subject]??={total:0,right:0,wrong:0,abstained:0};bucket.total++;
  const a=answers.get(c.id);
  if(!a){missing++;continue;}
  latencyMs+=Math.max(0,Number(a.latencyMs)||0);
  if(a.status==="error"){errors++;continue;}
  if(a.status==="abstained"||!a.answer){abstained++;bucket.abstained++;continue;}
  answered++;
  if(equal(a.answer,c.expected)){right++;bucket.right++;}
  else{wrong++;bucket.wrong++;incorrectIds.push(c.id);}
 }
 const n=cases.length;
 const officialOnly=cases.every(c=>c.source==="official_heldout"&&!!c.sourceUrl&&/osym\.gov\.tr/u.test(c.sourceUrl));
 const answeredAccuracy=answered?right/answered:0;
 const coverage=n?answered/n:0;
 const overallAccuracy=n?right/n:0;
 const lower=wilsonLower(right,answered);
 const gatePassed=n>=400&&officialOnly&&subjects.size>=6&&
   ["text","diagram","table","graph"].every(v=>formats.has(v))&&
   missing===0&&errors===0&&coverage>=0.95&&
   answeredAccuracy>=0.99&&lower>=0.99;
 return {
  total:n,answered,correct:right,incorrect:wrong,abstained,errors,missing,
  answeredAccuracy,coverage,overallAccuracy,wilson95Lower:lower,
  subjects:subjects.size,formats:[...formats].sort(),officialOnly,
  breakdown,incorrectIds,meanLatencyMs:predictions.length?latencyMs/predictions.length:0,
  gatePassed,
  publicationLabel:gatePassed?"%99 üzeri YKS doğruluğu bu ölçüm kümesinde istatistiksel güvenle doğrulandı.":"%99 YKS doğruluğu henüz doğrulanmadı.",
  disclaimer:"Bu ölçüm yalnızca verilen test kümesine aittir. Yeni soru ve sürümlerde hata oranı değişebilir."
 };
}
