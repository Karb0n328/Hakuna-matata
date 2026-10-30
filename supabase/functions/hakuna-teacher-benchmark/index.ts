/**
 * Private, capped live page-image benchmark. Auth is verified GitHub Actions OIDC,
 * not a Supabase user session. The provider key never enters CI and no question
 * images are stored or emitted in logs/results.
 *
 * Only approved workflow executions from main can invoke this endpoint.
 * Requiring our own JWT verification allows the platform verify_jwt=false setting.
 */
import {createRemoteJWKSet,jwtVerify} from "npm:jose@6.1.3";
import postgres from "npm:postgres@3.4.5";
const JWKS=createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="hakuna-osym-private-eval";
const EXPECT_REPO="Karb0n328/Hakuna-matata";
const EXPECT_REF="refs/heads/main";
const EXPECT_WORKFLOW=EXPECT_REPO+"/.github/workflows/osym-image-evaluation.yml@"+EXPECT_REF;
const DB_URL=Deno.env.get("SUPABASE_DB_URL")||"";
const db=DB_URL?postgres(DB_URL,{max:1,prepare:false,ssl:"require",connect_timeout:8,idle_timeout:10}):null;
const send=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const parse=(s:string)=>{const begin=s.indexOf("{"),end=s.lastIndexOf("}");if(begin<0||end<=begin)throw Error("Provider returned malformed JSON");return JSON.parse(s.slice(begin,end+1));};
async function identify(req:Request){
 const h=req.headers.get("Authorization")||"";
 if(!h.startsWith("Bearer "))throw Error("OIDC token required");
 const {payload}=await jwtVerify(h.slice(7),JWKS,{issuer:ISSUER,audience:AUDIENCE,clockTolerance:20});
 if(payload.repository!==EXPECT_REPO||payload.ref!==EXPECT_REF||
     payload.workflow_ref!==EXPECT_WORKFLOW||payload.event_name!=="push")
   throw Error("Workflow identity rejected");
 const runId=String(payload.run_id||"");
 const sha=String(payload.sha||"");
 if(!/^\d{5,20}$/.test(runId)||!/^[0-9a-f]{40}$/.test(sha))throw Error("Invalid workflow claims");
 return {runId,sha};
}
async function generate(model:string,pageData:string,taskPrompt:string){
 if(!db)throw Error("Database unavailable");
 const keyResult=await db.unsafe("select decrypted_secret from vault.decrypted_secrets where name='hakuna_gemini_api_key' limit 1");
 const key=String(keyResult?.[0]?.decrypted_secret||"");
 if(!key)throw Error("Provider unavailable");
 const system=[
 "Sen 2018 MEB TYT/AYT çözüm doğrulama modelisin. Şekildeki ÖSYM kitapçığının YALNIZCA soru sayfasını görüyorsun.",
 "Tüm görünür soruların doğru cevap şıkkını A,B,C,D,E olarak soru numarasıyla döndür.",
 "Bir sorunun parçası veya şekli eksikse boş şık dön. Görseli yanlış okuyabileceğini düşünerek dikkatle değerlendir.",
 "Bir soruyu açıklarken kitapçık sayfasındaki cevap anahtarı varsayma. Emin olmadığın şıkkı uydurma.",
 "Yalnızca JSON nesnesi: {\"answers\":[{\"number\":1,\"answer\":\"B\"}],\"unreadable\":[]}.",
 "Kişisel veri, kaydedilmiş soru ve kitapçık metnini çıktıda yeniden üretme.",
 "İstenen bölüm: "+taskPrompt.slice(0,260)
 ].join("\n");
 const res=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
  method:"POST",signal:AbortSignal.timeout(55000),
  headers:{"Content-Type":"application/json","x-goog-api-key":key},
  body:JSON.stringify({
   contents:[{role:"user",parts:[{text:system},{inlineData:{mimeType:"image/jpeg",data:pageData}}]}],
   generationConfig:{responseMimeType:"application/json",maxOutputTokens:2300,thinkingConfig:{thinkingLevel:model==="gemini-3.5-flash-lite"?"high":"medium"}}
  })
 });
 if(!res.ok)throw Error("Provider status "+res.status);
 const data=await res.json();
 const txt=(data.candidates?.[0]?.content?.parts||[]).map((x:{text?:string})=>x.text||"").join("");
 const result=parse(txt);
 const out:Record<string,string>={};
 if(Array.isArray(result.answers)){
  for(const row of result.answers.slice(0,10)){
   const n=Number(row?.number);
   const a=String(row?.answer||"").trim().toUpperCase();
   if(Number.isInteger(n)&&n>=1&&n<=160&&/^[A-E]$/.test(a))out[String(n)]=a;
  }
 }
 return out;
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return send({error:"POST required"},405);
 let id;
 try{id=await identify(req);}catch{return send({error:"Untrusted workflow"},401);}
 if(!db)return send({error:"Benchmark backend unavailable"},503);
 let body:any;
 try{body=await req.json();}catch{return send({error:"Invalid request"},400);}
 const image=String(body?.image||"");
 const caseId=String(body?.caseId||"");
 const test=String(body?.test||"");
 if(!/^\d{4}-(?:TYT|AYT)-[a-z0-9-]{1,32}$/i.test(caseId)||image.length<1000||image.length>950000||
  !/^[A-Za-z0-9+/]+={0,2}$/.test(image)||!["TYT Türkçe","TYT Matematik","TYT Fen","TYT Sosyal","AYT Matematik","AYT Edebiyat","AYT Fen","AYT Sosyal"].includes(test))
   return send({error:"Unsupported evaluation input"},400);
 try{
  const rows=await db.unsafe(
    "select teacher_eval.claim_github_benchmark($1,$2,$3,8) as allowed",
    [id.runId,id.sha,caseId]
  );
  if(rows?.[0]?.allowed!==true)return send({error:"Run quota or duplicate case"},429);
 }catch{return send({error:"Evaluation budget unavailable"},503);}
 const results:Record<string,Record<string,string>|null>={};
 const errors:Record<string,string>={};
 for(const model of ["gemini-3.6-flash","gemini-3.5-flash-lite"]){
  try{results[model]=await generate(model,image,test);}
  catch(e){results[model]=null;errors[model]=String((e as Error).message||"Failed").slice(0,100);}
 }
 const primary=results["gemini-3.6-flash"]||{};
 const secondary=results["gemini-3.5-flash-lite"]||{};
 const consensus:Record<string,string>={};
 for(const [n,a] of Object.entries(primary)){
  if(secondary[n]===a)consensus[n]=a;
 }
 return send({
   caseId,models:results,consensus,
   errors:Object.keys(errors).length?errors:undefined,
   pageCounted:Object.keys(consensus).length,
   measure:"Independent page-level provisional guesses; authoritative grading happens locally in GitHub Actions without exposing gold labels to the provider."
 });
});
