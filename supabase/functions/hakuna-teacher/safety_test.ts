import {sanitizeUnverifiedSolution,shouldHideUnverified} from "./safety.ts";
const assert=(condition:boolean,message:string)=>{if(!condition)throw Error(message);};
Deno.test("An incorrect answer must not leak in visible steps",()=>{
 const original={answer:"E",steps:["1. İlk hesap.","2. Sonuç E şıkkı, 25!"],examTip:"E seçeneğini işaretle",checkNote:"İki çözüm çelişti.",caution:"Bence E",review:"celiski",subject:"Matematik",sourceCoverage:{verifiedFullText:false}};
 const hidden=sanitizeUnverifiedSolution(original);
 assert(hidden.answer===""&&hidden.steps.length===0&&hidden.examTip===""&&hidden.caution==="","answer leaked");
 assert(!JSON.stringify(hidden).includes("E şıkkı"),"leak through explanation");
 assert(original.steps.length===2,"original mutated");
 assert(hidden.sourceCoverage.verifiedFullText===false,"metadata lost");
});
Deno.test("Safe and unsafe statuses are classified conservatively",()=>{
 for(const status of ["celiski","hesap_celiski","kaynak_celiski","kontrol_gerekli","okunamadi"])
  assert(shouldHideUnverified(status,"A"),"unsafe status was exposed: "+status);
 assert(!shouldHideUnverified("hesap_ve_model","C"),"verified answer was hidden");
 assert(shouldHideUnverified("hesap_ve_model",""),"blank answer should not be confirmed");
});
