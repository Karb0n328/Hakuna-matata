const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
async function request({offline=false,exact=false}={}){
  const handlers={},writes=[];
  const context={self:{location:{origin:'https://app.test'},addEventListener:(n,f)=>handlers[n]=f,clients:{claim(){}},skipWaiting(){}},URL,Response,Headers,fetch:()=>offline?Promise.reject(Error('offline')):Promise.resolve(new Response('new script')),
    caches:{match:async(req,options)=>options?.ignoreSearch?new Response('old base'):exact?new Response('exact version'):undefined,open:async()=>({put:async(req,res)=>writes.push(await res.text())})}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),context);
  let response;const tasks=[];
  handlers.fetch({request:{method:'GET',url:'https://app.test/main.js?v=new',destination:'script'},waitUntil:p=>tasks.push(p),respondWith:p=>response=p});
  const text=await (await response).text();await Promise.all(tasks);return text;
}
test('new script version never reuses old base while online',async()=>assert.equal(await request(),'new script'));
test('exact cached script starts without waiting for fresh network',async()=>assert.equal(await request({exact:true}),'exact version'));
test('offline keeps the existing script available',async()=>assert.equal(await request({offline:true}),'old base'));
