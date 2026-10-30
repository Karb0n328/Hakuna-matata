import {findLegacyProgram,legacyProgramStatus,LEGACY_PROGRAM_CATALOG} from "./curriculum.ts";
import {arithmetic,balancedEquation,dimension,verifyChecks} from "./verification.ts";
import {findOfficialReferences} from "./sources.ts";

function assert(v:boolean,msg:string){if(!v)throw Error(msg);}
function close(a:number,b:number){return Math.abs(a-b)<1e-9;}
Deno.test("arithmetic: operations and precedence",()=>{
  assert(close(arithmetic("(2+3)*4"),20),"parentheses");
  assert(close(arithmetic("2^3^2"),512),"right-associative power");
  assert(close(arithmetic("-2^2"),-4),"negative precedence");
  assert(close(arithmetic("sqrt(81)+pi-pi"),9),"sqrt/pi");
  assert(close(arithmetic("1,5*4"),6),"comma decimal");
  assert(close(arithmetic("2^-3"),0.125),"negative powers");
});
Deno.test("arithmetic: reject unsupported code and invalid expressions",()=>{
  for(const s of ["alert(1)","1/0","(2+3","2**3","x+4","9^500",""]) {
    let thrown=false;try{arithmetic(s);}catch{thrown=true;}
    assert(thrown,"should fail: "+s);
  }
});
Deno.test("chemistry: conservation of atoms",()=>{
  assert(balancedEquation("2 H2 + O2 -> 2 H2O"),"water");
  assert(!balancedEquation("H2 + O2 -> H2O"),"unbalanced water");
  assert(balancedEquation("2 Al + 3 Cl2 -> 2 AlCl3"),"AlCl3");
  assert(balancedEquation("Ca(OH)2 + 2 HCl -> CaCl2 + 2 H2O"),"parenthesized");
});
Deno.test("physics: dimensional consistency",()=>{
  assert(JSON.stringify(dimension("kg*m/s^2"))===JSON.stringify(dimension("N")),"newton");
  assert(JSON.stringify(dimension("N*m"))===JSON.stringify(dimension("J")),"joule");
  assert(JSON.stringify(dimension("J/s"))===JSON.stringify(dimension("W")),"watt");
  assert(JSON.stringify(dimension("kg/m/s^2"))===JSON.stringify(dimension("Pa")),"pascal");
});
Deno.test("hard failures hide unsupported certainty",()=>{
  const ok=verifyChecks([{kind:"arithmetic",expression:"(12+8)/2",expected:"10"}],"Matematik");
  assert(ok.passed===1&&!ok.hardMismatch,"valid numeric");
  const bad=verifyChecks([{kind:"arithmetic",expression:"(12+8)/2",expected:"11"}],"Matematik");
  assert(bad.failed===1&&bad.hardMismatch,"wrong numeric");
  const unitBad=verifyChecks([{kind:"dimension",expression:"kg*m/s",target:"N"}],"Fizik");
  assert(unitBad.hardMismatch,"unit mismatch");
  const chemBad=verifyChecks([{kind:"chemical_balance",equation:"H2 + O2 -> H2O"}],"Kimya");
  assert(chemBad.hardMismatch,"atom mismatch");
  const unsupported=verifyChecks([{kind:"arithmetic",expression:"x+1",expected:"2"}],"Matematik");
  assert(unsupported.skipped===1&&!unsupported.hardMismatch,"unsupported expression");
});
Deno.test("source search: legacy MEB subject match only",()=>{
  const m=findOfficialReferences("Matematik","Belirli integral ile alan","x ekseninin altında",[]);
  assert(m.some(x=>x.id==="math-12-area"),"integral source");
  const b=findOfficialReferences("Biyoloji","Sindirim","pankreas lipaz",[]);
  assert(b.length>0&&b.every(x=>x.subject==="Biyoloji"),"biology sources");
  const none=findOfficialReferences("Türkçe","Paragraf","ana düşünce",[]);
  assert(none.length===0,"no fabricated sources");
});
Deno.test("Legacy 2018 curriculum registry covers all core YKS lesson families",()=>{
 const fields=["Matematik","Geometri","Fizik","Kimya","Biyoloji","Türkçe","Türk Dili ve Edebiyatı","Tarih","T.C. İnkılap Tarihi ve Atatürkçülük","Coğrafya","Felsefe","Din Kültürü ve Ahlak Bilgisi","İngilizce"];
 for(const field of fields){
   const p=findLegacyProgram(field);
   assert(p!==null&&p.programTrack==="2018","missing 2018 syllabus: "+field);
   assert(p.programUrl.startsWith("https://mufredat.meb.gov.tr/"),"non-official curriculum: "+field);
   assert(p.bookCatalogUrl.startsWith("https://ogmmateryal.eba.gov.tr/"),"non-OGM book portal: "+field);
   assert(p.bookAvailability==="catalog-only","book catalog falsely tagged full-text: "+field);
 }
 assert(LEGACY_PROGRAM_CATALOG.length>=14,"expected breadth");
 assert(legacyProgramStatus("Mantık")==="legacy-unconfirmed","2019 is not 2018");
 assert(legacyProgramStatus("Bilinmeyen")==="not-indexed","unknown status");
});
Deno.test("All subject-specific references are on official domains and never claim indexed books",()=>{
 const cases=[
  ["Türkçe","nazım biçimi","şiir ve uyak"],["Tarih","tarihe yardımcı bilimler","arkeoloji ve kronoloji"],
  ["Coğrafya","basınç alanları","alçak basınç"],["Felsefe","bilgi felsefesi","epistemoloji"],
  ["Din Kültürü ve Ahlak Bilgisi","ibadet yükümlülüğü","mükellef"],
  ["Sosyoloji","toplumsal kontrol","norm"],["Mantık","önermeler","mantık"],
  ["Psikoloji","davranış","bilimsel yöntem"],["İngilizce","school life","school"],
  ["T.C. İnkılap Tarihi ve Atatürkçülük","Mondros","milli mücadele"],
  ["Geometri","integral alan","x ekseni"]
 ];
 for(const [subject,topic,question] of cases){
   const refs=findOfficialReferences(subject,topic,question,[]);
   assert(refs.length>0,"missing topic excerpt for "+subject);
   assert(refs.every(x=>x.url.startsWith("https://ogmmateryal.eba.gov.tr/")),"nonofficial source");
 }
});
