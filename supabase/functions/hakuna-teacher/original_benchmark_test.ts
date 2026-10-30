import dataset from "./original_benchmark_v1.json" with {type:"json"};
import {scoreBenchmark,type BenchmarkCase} from "./benchmark.ts";
const assert=(x:boolean,msg:string)=>{if(!x)throw Error(msg);};
Deno.test("original academic test bank is reproducible, balanced, unique, and not falsely called ÖSYM",()=>{
 const q=dataset.questions as BenchmarkCase[];
 assert(dataset.datasetId==="original-smoke-v1","dataset id");
 assert(dataset.provenance==="original-synthetic-not-osym","provenance");
 assert(q.length>=120,"too few exercises");
 assert(new Set(q.map(x=>x.id)).size===q.length,"duplicate ids");
 assert(new Set(q.map(x=>(x as unknown as {question:string}).question)).size===q.length,"duplicate wordings");
 assert(new Set(q.map(x=>x.subject)).size>=10,"too few subject branches");
 assert(q.every(x=>x.source==="synthetic"&&x.expected&&x.id&&x.exam),"missing gold");
 const report=scoreBenchmark(q,[]);
 assert(report.total===q.length&&!report.gatePassed&&!report.officialOnly,"unanswered/synthetic flagged as certified");
});
Deno.test("deterministic gold labels: 20 linear equation cases",()=>{
 const q=dataset.questions.slice(0,20);
 for(const item of q){
  const match=/(\d+)x ([+-]) (\d+) = (-?\d+)\./.exec(item.question);
  if(!match)throw Error("unrecognized linear case "+item.id);
  const [a,sign,b,c]=[Number(match[1]),match[2],Number(match[3]),Number(match[4])];
  const gold=(c-(sign==="+"?b:-b))/a;
  assert(Number(item.expected)===gold,"incorrect gold label "+item.id);
 }
});
Deno.test("original benchmark answers must never be included as an AI prompt key",()=>{
 const q=dataset.questions;
 assert(q.every(x=>!x.question.includes('"expected"')),"gold values leaked into prompts");
 assert(q.every(x=>x.question.length<650),"inappropriately long fixture");
});
