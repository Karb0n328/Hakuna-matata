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