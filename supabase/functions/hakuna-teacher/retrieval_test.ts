import {extractEvidence,fetchOfficialEvidence} from "./retrieval.ts";
import {OFFICIAL_REFERENCES} from "./sources.ts";
const assert=(x:boolean,msg:string)=>{if(!x)throw Error(msg);};
Deno.test("Retrieval extracts evidence from official HTML, strips scripts and tags",()=>{
 const source=OFFICIAL_REFERENCES.find(x=>x.id==="bio-11-amilaz");
 if(!source)throw Error("source missing");
 const html='<html><body><h1>Sindirim</h1><p>Amilaz ağızda nişastanın sindirimini başlatır. Pankreastan gelen amilaz ince bağırsakta etki gösterir.</p><script>SHOULD_NOT_APPEAR()</script><p>Disakkaritler disakkaridazlarla yapı taşlarına parçalanır.</p></body></html>';
 const result=extractEvidence(source,html,"amilaz");
 assert(!!result&&result.retrieved&&result.excerpt.includes("Amilaz"),"evidence not extracted");
 assert(!result?.excerpt.includes("SHOULD_NOT_APPEAR"),"script included");
});
Deno.test("Retrieval must reject content when no matching term appears",()=>{
 const source=OFFICIAL_REFERENCES.find(x=>x.id==="bio-11-amilaz");
 if(!source)throw Error("source missing");
 const res=extractEvidence(source,"<div>".concat("İlgisiz ve uzun bir örnek metin. ".repeat(20),"</div>"),"elektromanyetik");
 assert(res===null,"unrelated webpage falsely cited");
});
Deno.test("Retrieval refuses non-allowlisted content and redirects",async()=>{
 const source=OFFICIAL_REFERENCES.find(x=>x.id==="bio-11-amilaz");
 if(!source)throw Error("source missing");
 let count=0;
 const mock=async()=>{count++;return new Response('<p>Amilaz ve sindirim: '+('Nişasta. '.repeat(60))+'</p>',{status:200,headers:{"content-type":"text/html"}})};
 const found=await fetchOfficialEvidence([{...source,url:"https://example.com/attack.html"}],"amilaz",mock as typeof fetch);
 assert(found.length===0&&count===0,"SSRF allowlist was bypassed");
 const good=await fetchOfficialEvidence([source],"amilaz",mock as typeof fetch);
 assert(good.length===1&&count===1,"valid official source skipped");
 const redirect=async()=>new Response("",{status:302,headers:{"location":"https://example.com"}});
 const discarded=await fetchOfficialEvidence([source],"amilaz",redirect as typeof fetch);
 assert(!discarded.length,"redirect accepted");
});
