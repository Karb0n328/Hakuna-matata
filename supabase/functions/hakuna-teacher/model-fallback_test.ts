import {PRIMARY_MODEL,PRIMARY_BACKUP,shouldTryBackup,secondModel} from "./model-fallback.ts";
function check(c:boolean,msg:string){if(!c)throw Error(msg);}
Deno.test("429 quota and temporary provider failures use backup",()=>{
 for(const status of [429,502,503,504])check(shouldTryBackup({status}),"missing status "+status);
 check(shouldTryBackup({name:"TimeoutError"}),"timeout backup");
 for(const status of [400,401,403,413])check(!shouldTryBackup({status}),"unsafe backup on status "+status);
});
Deno.test("backup checker never agrees with itself",()=>{
 for(const model of [PRIMARY_MODEL,PRIMARY_BACKUP]){
  const second=secondModel(model);
  check(second!==model,"self-verification for "+model);
  check(second.startsWith("gemini-"),"unknown second model");
 }
 check(secondModel(PRIMARY_BACKUP)==="gemini-3.1-flash-lite","backup must avoid exhausted 3.6 model");
});
