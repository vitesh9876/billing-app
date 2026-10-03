const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../frontend/src/lib/supabaseBilling.ts'),'utf8');
function client() {
  const calls=[];
  const persistentStorage={};
  let authOptions;
  let session={access_token:'test-access-token',user:{id:'owner'}};
  let connected=false,updates=0,removed=0;
  const channel={on(_event,filter,callback){assert.equal(filter.table,'billing_changes');this.update=callback;return this;},
    subscribe(callback){callback('SUBSCRIBED');return this;}};
  const sdk={auth:{getSession:async()=>({data:{session},error:null})},channel:()=>channel,removeChannel:async()=>{removed++;}};
  const snapshots={transactions:[{id:'T1',amount:100,status:'Pending'}],customers:[{id:'C1',name:'Test'}],
    itemsCatalog:[],smsTemplates:[]};
  const exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,require:name=>{assert.equal(name,'@supabase/supabase-js');return {createClient:(_url,_key,options)=>{authOptions=options.auth;return sdk;}};},
    process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-public-key'}},
    Headers,Response,Map,Set,JSON,Error,Number,
    window:{localStorage:persistentStorage,setInterval:()=>1,clearInterval(){},addEventListener(){},removeEventListener(){}},
    document:{visibilityState:'visible'},
    fetch:async(url,init)=>{calls.push({url,init});return Response.json(url.includes('dashboard-data')?snapshots:{status:'success'});},
  });
  return {api:exports,calls,setSession:value=>{session=value;},channel,
    get authOptions(){return authOptions;},persistentStorage,
    get connected(){return connected;},get updates(){return updates;},get removed(){return removed;},
    subscribe:()=>exports.subscribeBillingChanges(()=>updates++,value=>connected=value)};
}
(async()=>{
  const c=client();
  await c.api.billingFetch('/api/v1/dashboard-data');
  assert.equal(c.authOptions.persistSession,true,'authenticated session persists beyond the current tab');
  assert.equal(c.authOptions.storage,c.persistentStorage,'persistent browser storage is configured');
  const read=c.calls[0];
  assert.equal(read.url,'https://test.supabase.co/functions/v1/billing-api/dashboard-data');
  assert.equal(read.init.headers.get('Authorization'),'Bearer test-access-token');
  assert.equal(read.init.headers.get('x-region'),'ap-south-1');
  assert.equal(read.init.headers.get('apikey'),'test-public-key');
  assert.equal(read.init.cache,'no-store');
  await c.api.billingFetch('/api/v1/transactions/T1',{method:'DELETE'});
  assert.deepEqual(JSON.parse(c.calls[1].init.body).expectedTransaction,{id:'T1',amount:100,status:'Pending'});
  const edit={id:'T1',amount:90,updateOnly:true,expectedTransaction:{id:'T1',amount:100,status:'Pending'}};
  await c.api.billingFetch('/api/v1/records/save',{method:'POST',body:JSON.stringify({transaction:edit})});
  assert.deepEqual(JSON.parse(c.calls[2].init.body).transaction,edit);
  await c.api.billingFetch('/api/v1/transactions',{method:'POST',body:JSON.stringify({id:'import'})});
  assert.equal(JSON.parse(c.calls[3].init.body).createOnly,true);
  c.setSession(null);
  assert.equal((await c.api.billingFetch('/api/v1/customers')).status,401);
  assert.equal(c.calls.length,4,'Signed-out requests must not reach the database API');
  const stop=c.subscribe();assert.equal(c.connected,true);c.channel.update();assert.equal(c.updates,1);stop();assert.equal(c.removed,1);
  const unsupported=await c.api.billingFetch('/legacy/api');
  assert.equal(unsupported.status,400,'unsupported paths must fail closed instead of falling back to another API');
  assert.equal(c.calls.length,4,'unsupported paths must not reach a fallback server');
  console.log('Passed: Supabase-only request routing, Mumbai region, authenticated access, edit/delete snapshots, create-only imports, Realtime cleanup and fail-closed routing.');
})().catch(error=>{console.error(error);process.exitCode=1;});
