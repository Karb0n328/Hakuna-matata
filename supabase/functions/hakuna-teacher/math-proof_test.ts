import {independentMathProof} from "./math-proof.ts";
import cases from "./original_benchmark_v1.json" with {type:"json"};
const check=(v:boolean,m:string)=>{if(!v)throw Error(m);};
Deno.test("Direct symbolic derivative catches the live observed Lite failure",()=>{
 const q="f(x)=4x³ - 1x² - 1x + 4 olduğuna göre f'(-2) kaçtır?";
 const good=independentMathProof(q,"Matematik","51");
 const bad=independentMathProof(q,"Matematik","-101");
 check(good.status==="verified"&&good.calculated===51,"derivative proof");
 check(bad.status==="contradiction","observed model mistake was not detected");
});
Deno.test("Direct proof covers every generated equation, derivative, integral, physics, chemistry, and geometry if supported",()=>{
 const q=cases.questions;
 let checked=0,unavailable=0,failures:string[]=[];
 for(const item of q){
  const proof=independentMathProof(item.question,item.subject,item.expected);
  if(proof.status==="verified")checked++;
  else if(proof.status==="unavailable")unavailable++;
  else failures.push(item.id+" "+proof.kind+": expected "+item.expected+" calculated "+proof.calculated);
 }
 check(failures.length===0,"Gold formula mismatch: "+failures.join("; "));
 check(checked>=70,"Too few certified synthetic calculations: "+checked+"/"+q.length);
 check(unavailable>=10,"Must not accidentally claim narrative questions as proved");
});
Deno.test("Reject unsupported or unsafe math and nonnumeric answers",()=>{
 const bad=independentMathProof("f(x)=x^99999+1 olduğuna göre f'(2) kaçtır?","Matematik","0");
 check(bad.status==="unavailable","unsupported power should not be solved");
 const mixed=independentMathProof("f(x)=3x³ + 2x² + 1 olduğuna göre f'(1) kaçtır?","Matematik","C");
 check(mixed.status==="unavailable","an option letter is not proof of a number");
 const domain=independentMathProof("Bir tarihi olay hangi yılda oldu?","Tarih","1900");
 check(domain.status==="unavailable","nonmath check must abstain");
});
