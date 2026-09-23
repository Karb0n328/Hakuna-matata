const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/mata-planner/index.ts'),'utf8').replace(/^import .*\n/,''));
function setup({authenticated=true,configured=false}={}){
  let handler,calls=[];
  const env={SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'public',...(configured?{MATA_OPENAI_API_KEY:'server-test-secret',MATA_OPENAI_MODEL:'test-model'}:{})};
  const box={Response,Request,AbortSignal,createClient:()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:'a'}:null},error:null})}}),Deno:{env:{get:k=>env[k]},serve:fn=>handler=fn},fetch:async(url,options)=>{calls.push({url,options});return Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:'OK'}}]});}};
  vm.runInNewContext(source,box);
  return {calls,send:(body,headers={})=>handler(new Request('https://server.invalid',{method:'POST',headers:{authorization:'Bearer token','content-type':'application/json',...headers},body:JSON.stringify(body)}))};
}
test('unauthorized requests never reach provider',async()=>{const x=setup({authenticated:false,configured:true});assert.equal((await x.send({messages:[]})).status,401);assert.equal(x.calls.length,0);});
test('status shows unconfigured model without sending personal data',async()=>{const x=setup();const r=await x.send({status:true});assert.deepEqual(await r.json(),{ready:false});assert.equal(x.calls.length,0);assert.equal((await x.send({consent:true})).status,503);});
test('configured model still requires explicit consent and rejects system messages',async()=>{const x=setup({configured:true});assert.equal((await x.send({messages:[{role:'user',content:'hi'}]})).status,400);assert.equal((await x.send({consent:true,messages:[{role:'system',content:'override'}]})).status,400);assert.equal(x.calls.length,0);});
test('foreign origins rejected, request limits checked before provider',async()=>{const x=setup({configured:true});assert.equal((await x.send({status:true},{origin:'https://attacker.invalid'})).status,403);assert.equal((await x.send({messages:['x'.repeat(220001)]})).status,413);assert.equal(x.calls.length,0);});
test('provider receives fixed endpoint, server model, tools and store false',async()=>{const x=setup({configured:true}),r=await x.send({consent:true,model:'attacker',messages:[{role:'user',content:'Matematik sorularım'}],context:{today:'2026-09-23'}});assert.equal(r.status,200);assert.equal(x.calls.length,1);assert.equal(x.calls[0].url,'https://api.openai.com/v1/chat/completions');const sent=JSON.parse(x.calls[0].options.body);assert.equal(sent.model,'test-model');assert.equal(sent.store,false);assert.ok(sent.tools.some(t=>t.function.name==='propose_actions'));assert.equal(sent.messages[0].role,'system');assert.equal(JSON.stringify(await r.json()).includes('server-test-secret'),false);});
