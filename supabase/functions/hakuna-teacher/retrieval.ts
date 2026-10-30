import type {TeacherReference} from "./sources.ts";

// Fetch only pre-approved public OGM book page URLs. Never crawl arbitrary user URLs.
// A fetched excerpt is evidence for checking a factual statement, not an answer key.
const PREFIX="https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/";
const ENTITIES:Record<string,string>={"nbsp":" ","amp":"&","lt":"<","gt":">","quot":'"',"apos":"'","ouml":"ö","uuml":"ü","ccedil":"ç","Ouml":"Ö","Uuml":"Ü","Ccedil":"Ç","iexcl":"¡"};
function normalize(s:string){return s.toLocaleLowerCase("tr-TR").normalize("NFC");}
function cleanHtml(input:string):string{
  const bounded=input.slice(0,280000);
  return bounded
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<(?:br|p|div|li|h[1-6]|tr)\b[^>]*>/gi,"\n")
    .replace(/<[^>]*>/g," ")
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>{const n=parseInt(hex||dec,hex?16:10);return n>0&&n<0x10ffff?String.fromCodePoint(n):" ";})
    .replace(/&([a-z]+);/gi,(_,e)=>ENTITIES[e]||" ")
    .replace(/[ \t]+/g," ").replace(/\n[ \t]*/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}
export type Evidence={id:string;title:string;url:string;excerpt:string;excerptLength:number;retrieved:boolean};
export function extractEvidence(source:TeacherReference,html:string,topic:string):Evidence|null{
  if(!source.url.startsWith(PREFIX)||!source.url.endsWith(".html"))return null;
  const all=cleanHtml(html);
  if(all.length<130)return null;
  const lower=normalize(all);
  const candidates=[...source.keywords,topic].filter(x=>x&&x.length>3);
  let best=-1;
  for(const word of candidates){
    const at=lower.indexOf(normalize(word));
    if(at>=0&&(best<0||at<best))best=at;
  }
  if(best<0)return null;
  const start=Math.max(0,best-450),end=Math.min(all.length,best+1350);
  const excerpt=all.slice(start,end).trim();
  return {id:source.id,title:source.title,url:source.url,excerpt,excerptLength:excerpt.length,retrieved:true};
}
export async function fetchOfficialEvidence(
  references:TeacherReference[],topic:string,
  fetcher:typeof fetch=fetch
):Promise<Evidence[]>{
  const found:Evidence[]=[];
  // Sequentially cap public traffic and expected latency; keep no raw pages.
  for(const ref of references.slice(0,2)){
    if(!ref.url.startsWith(PREFIX)||!/^https:\/\/ogmmateryal\.eba\.gov\.tr\/panel\/upload\/etkilesimli\/kitap\/[a-z0-9/_-]+\.html$/i.test(ref.url))continue;
    try{
      const response=await fetcher(ref.url,{method:"GET",redirect:"error",signal:AbortSignal.timeout(4500),headers:{"Accept":"text/html"}});
      if(!response.ok||!String(response.headers.get("content-type")||"").includes("text/html"))continue;
      if(Number(response.headers.get("content-length")||0)>280000)continue;
      const html=(await response.text()).slice(0,280000);
      const evidence=extractEvidence(ref,html,topic);
      if(evidence)found.push(evidence);
    }catch{/* Fail closed: do not claim this page was read. */}
  }
  return found;
}
