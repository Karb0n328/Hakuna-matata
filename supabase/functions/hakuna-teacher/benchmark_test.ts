import {scoreBenchmark,type BenchmarkCase,type BenchmarkResult} from "./benchmark.ts";
const c=(id:string,source:BenchmarkCase["source"]="synthetic"):BenchmarkCase=>({
 id,subject:"Matematik",exam:"TYT",format:"text",difficulty:"medium",
 expected:"C",source,
 sourceUrl:source==="official_heldout"?"https://www.osym.gov.tr/2026yks-tyt-ayt-ve-ydt-temel-soru-kitapciklari-ve-cevap-anahtarlari":undefined
});
const a=(id:string,answer:string|null,status:BenchmarkResult["status"]="answered"):BenchmarkResult=>({id,answer,status,latencyMs:500});
Deno.test("empty test cannot claim 99%",()=>{
 const s=scoreBenchmark([],[]);if(s.gatePassed||s.total||s.answeredAccuracy)throw Error("empty benchmark passed");
});
Deno.test("one solved question cannot claim 99%",()=>{
 const s=scoreBenchmark([c("1")],[a("1","C")]);
 if(s.gatePassed||s.answeredAccuracy!==1||s.coverage!==1)throw Error("small benchmark passed");
});
Deno.test("99 correct out of 100 is not statistically sufficient",()=>{
 const cases=Array.from({length:100},(_,i)=>c(String(i),"official_heldout"));
 const results=cases.map((x,i)=>a(x.id,i===9?"D":"C"));
 const r=scoreBenchmark(cases,results);
 if(r.gatePassed||r.correct!==99||r.incorrect!==1||r.wilson95Lower>=.99)throw Error("gate incorrectly allowed 99/100");
});
Deno.test("synthetic 1000 perfect is not verified YKS accuracy",()=>{
 const cases=Array.from({length:1000},(_,i)=>c(String(i)));
 const r=scoreBenchmark(cases,cases.map(x=>a(x.id,"C")));
 if(r.gatePassed||r.officialOnly||r.correct!==1000)throw Error("synthetic set falsely passed");
});
Deno.test("abstentions count against coverage, no cherry-picking",()=>{
 const cases=Array.from({length:30},(_,i)=>c(String(i)));
 const results=cases.map((x,i)=>i<10?a(x.id,"C"):a(x.id,null,"abstained"));
 const r=scoreBenchmark(cases,results);
 if(r.answered!==10||r.abstained!==20||r.coverage>=.5||r.overallAccuracy!==1/3||r.gatePassed)
  throw Error("coverage/accuracy miscount");
});
Deno.test("a real large multi-subject/format holdout may earn certification",()=>{
 const subjects=["Matematik","Fizik","Kimya","Biyoloji","Tarih","Türkçe","Coğrafya","Felsefe"];
 const fmts=["text","diagram","table","graph"] as const;
 const cases=Array.from({length:500},(_,i)=>({
  ...c(String(i),"official_heldout"),subject:subjects[i%subjects.length],
  format:fmts[i%fmts.length],exam:i%3?"TYT" as const:"AYT" as const
 }));
 const r=scoreBenchmark(cases,cases.map(x=>a(x.id,"C")));
 if(!r.gatePassed||r.wilson95Lower<.99||r.correct!==500)throw Error("valid large perfect test rejected");
});
Deno.test("duplicate ids and missing results never certify",()=>{
 const cases=Array.from({length:500},(_,i)=>({...c(String(i),"official_heldout"),subject:"Matematik"}));
 const preds=cases.slice(0,499).map(x=>a(x.id,"C"));
 const r=scoreBenchmark(cases,preds);
 if(r.gatePassed||r.missing!==1)throw Error("missing result omitted");
 let failed=false;try{scoreBenchmark([c("X"),c("X")],[]);}catch{failed=true}
 if(!failed)throw Error("duplicate dataset accepted");
});
