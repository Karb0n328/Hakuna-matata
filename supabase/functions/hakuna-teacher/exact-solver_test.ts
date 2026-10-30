import {exactTextSolution} from "./exact-solver.ts";
import data from "./original_benchmark_v1.json" with {type:"json"};
function assert(value:boolean,msg:string){if(!value)throw Error(msg);}
Deno.test("Exact solver correct on every original gold-answer case it supports",()=>{
 const questions=data.questions;
 let supported=0,incorrect=0,unhandled=0;
 for(const q of questions){
  const solved=exactTextSolution(q.question,false);
  if(!solved){unhandled++;continue;}
  supported++;
  if(Number(solved.answer)!==Number(q.expected)){incorrect++;throw Error("Gold discrepancy on "+q.id+" from "+q.question+" expected "+q.expected+" got "+solved.answer);}
  assert(solved.review==="kesin_hesap","must label deterministic calculation");
 }
 assert(incorrect===0,"incorrect numeric output");
 assert(supported>=75,"too few strictly supported original questions: "+supported);
 assert(unhandled>10,"must not falsely claim all question types are supported");
});
Deno.test("Observed wrong Gemini AYT derivative response gets exact 51",()=>{
 const input="f(x)=4x³ - 1x² - 1x + 4 olduğuna göre f'(-2) kaçtır?";
 const solved=exactTextSolution(input,false);
 assert(solved?.answer==="51","cannot independently verify observed error");
 assert(solved.steps.length>0,"an explanation is required");
});
Deno.test("Photos and ambiguous story questions must not trigger exact answers",()=>{
 assert(exactTextSolution("f(x)=4x³ - 1x² - 1x + 4 olduğuna göre f'(-2) kaçtır?",true)===null,"photo got unsupported text-only proof");
 assert(exactTextSolution("Bir çocuk 25 TL harcadı. Cevap kaçtır?")===null,"word problem was guessed");
 assert(exactTextSolution("Amilaz proteinleri parçalar mı?")===null,"biology guessed");
 assert(exactTextSolution("f(x)=2x^99 olduğuna göre f'(1) kaçtır?")===null,"unsupported exponent guessed");
});
