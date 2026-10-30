import {independentMathProof} from "./math-proof.ts";

export type ExactSolution={
  subject:string;exam:"TYT"|"AYT";topic:string;difficulty:"Kolay"|"Orta";
  readable:true;answer:string;steps:string[];examTip:string;caution:string;
  review:"kesin_hesap";checkNote:string;sourceCoverage:{verifiedFullText:false;officialTopicNotes:0;fullTextBooksIndexed:0;excerptsRetrieved:0};
  verification:{attempted:number;passed:number;failed:number;skipped:number;labels:string[]};
  directProof:{status:"verified";kind:string;message:string};
  sources:never[];
};
const supported=[
  {kind:"polynomial-derivative",subject:"Matematik",exam:"AYT",topic:"Türev",rule:"Her axⁿ terimi türev alınırken anxⁿ⁻¹ biçimine dönüşür. Sabitin türevi sıfırdır.",tip:"İstenen x değerini türevi aldıktan sonra yerine koy. Fonksiyon değerini türevle karıştırma."},
  {kind:"polynomial-integral",subject:"Matematik",exam:"AYT",topic:"Belirli integral",rule:"Her axⁿ teriminin ilkel fonksiyonu axⁿ⁺¹/(n+1) olur. Üst sınırdaki değerden alt sınırdaki değer çıkarılır.",tip:"Alt sınır ile üst sınır sırasını kontrol et. İşaretli integral ve geometrik alan farklıdır."},
  {kind:"linear-equation",subject:"Matematik",exam:"TYT",topic:"Birinci dereceden denklemler",rule:"Denklemin her iki tarafına aynı sayı eklenerek sabitler ayrılır, ardından bilinmeyenin katsayısına bölünür.",tip:"Bulduğun x değerini başlangıç denkleminde yerine koyarak kontrol et."},
  {kind:"pythagoras",subject:"Geometri",exam:"TYT",topic:"Pisagor bağıntısı",rule:"Dik üçgende hipotenüsün karesi, iki dik kenarın kareleri toplamıdır: c²=a²+b².",tip:"Hipotenüs daima dik açının karşısında, üçgenin en uzun kenarıdır."},
  {kind:"newton-second-law",subject:"Fizik",exam:"TYT",topic:"Newton'ın ikinci yasası",rule:"Net kuvvet F=m·a olduğundan, ivme a=F/m ile hesaplanır.",tip:"Net kuvveti ve yönünü esas al; kuvvet birimi N, kütle birimi kg olmalı."},
  {kind:"ohms-law",subject:"Fizik",exam:"AYT",topic:"Ohm yasası",rule:"Potansiyel fark V=I·R; akım I=V/R ile hesaplanır.",tip:"Volt, amper ve ohm arasındaki ilişkiyi aynı birim sisteminde kullan."},
  {kind:"molarity",subject:"Kimya",exam:"TYT",topic:"Molarite",rule:"Molarite M=n/V olup çözünen mol sayısı, litre cinsinden çözelti hacmine bölünür.",tip:"Çözeltinin litre cinsinden hacmini kullan; yalnız çözücünün hacmini kullanma."},
  {kind:"mole-mass",subject:"Kimya",exam:"TYT",topic:"Mol-kütle ilişkisi",rule:"Kütle m=n·MA ile hesaplanır; mol sayısı ve molar kütle çarpılır.",tip:"Molar kütlenin g/mol birimini, mol sayısıyla sadeleştir."}
] as const;

function numberText(n:number):string{
 if(!Number.isFinite(n)||Math.abs(n)>1e12)return "";
 const rounded=Math.round(n*1e9)/1e9;
 return Number.isInteger(rounded)?String(rounded):String(rounded);
}
function possibleSubjects(question:string):string[]{
 if(/f\s*['’]\s*\(|belirli integral|\b[a-z]x\s*[+-]\s*\d+\s*=/iu.test(question))return ["Matematik"];
 if(/dik kenar uzunlukları|hipotenüs/iu.test(question))return ["Geometri"];
 if(/net kuvvet|direnci\b|volt|ohm/iu.test(question))return ["Fizik"];
 if(/mol\b|molar kütle|\bM'dir/iu.test(question))return ["Kimya"];
 return [];
}
/**
 * This only returns an answer for explicitly recognized, unit-tested algebraic templates.
 * It is not a general STEM solver and cannot establish 99% YKS accuracy.
 */
export function exactTextSolution(question:string, imagePresent=false):ExactSolution|null{
 const raw=String(question||"").trim();
 if(imagePresent||raw.length<25||raw.length>1300)return null;
 const subjects=possibleSubjects(raw);
 for(const subject of subjects){
   const initial=independentMathProof(raw,subject,"0");
   if(initial.status==="unavailable"||initial.calculated===undefined)return null;
   const value=numberText(initial.calculated);
   if(!value)return null;
   const second=independentMathProof(raw,subject,value);
   if(second.status!=="verified"||second.calculated!==initial.calculated)return null;
   const rule=supported.find(x=>x.kind===second.kind&&x.subject===subject);
   if(!rule)return null;
   return {
     subject:rule.subject,exam:rule.exam,topic:rule.topic,difficulty:"Orta",
     readable:true,answer:value,
     steps:[
       "Verilen ve istenen nicelikler sorudan belirlenir.",
       rule.rule,
       "Bu ilişki sayısal verilere uygulandığında sonuç "+value+" bulunur."
     ],
     examTip:rule.tip,caution:"",
     review:"kesin_hesap",
     checkNote:"Bu dar soru kalıbı, Gemini kullanılmadan iki kez deterministik hesaplamayla kontrol edildi. Bütün YKS soruları için genel doğruluk garantisi değildir.",
     sourceCoverage:{officialTopicNotes:0,fullTextBooksIndexed:0,excerptsRetrieved:0,verifiedFullText:false},
     verification:{attempted:1,passed:1,failed:0,skipped:0,labels:["Soru metninden hesap"]},
     directProof:{status:"verified",kind:rule.kind,message:"Soru metninden deterministik hesap"},
     sources:[]
   };
 }
 return null;
}
