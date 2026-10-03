// Runs the actual API/store against an isolated, in-memory PostgreSQL engine.
// It never reads environment credentials or connects to a hosted database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.join(__dirname,'../supabase/functions/billing-api');
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const exports = {};
  modules.set(name,exports);
  const code = ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  vm.runInNewContext(code,{exports,require:p=>load(path.basename(p)),console,Response,Request,URL,
    Headers,performance,TextDecoder,TextEncoder,crypto:require('node:crypto').webcrypto,Uint8Array,Intl,Date,Map,Set,JSON,Object,Number,Array,Error},{filename:name});
  return exports;
}
const {createHandler} = load('handler.ts');
const {saveRecord,putCustomer,deleteTransaction,clearTransaction,dashboard,queueSMS} = load('store.ts');
const {transaction} = load('domain.ts');
const pg = new PGlite();
let failCommit = false,lockCount = 0;
const conn = {
  query:async(sql,params=[])=>{
    // PGlite has a single session and no advisory-lock extension. Real deployment
    // uses PostgreSQL's transaction-scoped lock; concurrent host behavior is a staging check.
    if (sql.includes('pg_advisory_xact_lock')) {lockCount++;return [];}
    return (await pg.query(sql,params)).rows;
  },
};
const db = {...conn,begin:async(fn,readOnly=false)=>await pg.transaction(async tx=> {
  const c = {query:async(sql,params=[])=>{
    if (sql.includes('pg_advisory_xact_lock')) {lockCount++;return [];}
    return (await tx.query(sql,params)).rows;
  }};
  const result = await fn(c);
  if (failCommit) throw new Error('Simulated commit failure');
  return result;
})};
const customer = {id:'TEST-C1',name:'తెలుగు Test',phone:'',address:'Mumbai',father:null,idproof:null,mandal:null};
const loan = {id:'BILL-300-2026',customerId:customer.id,type:'loan',amount:10000,category:'Gold',date:'2026-08-20',
  status:'Pending',clearedDate:null,createOnly:true,loanDetails:{billNumber:'300',items:[{name:'ring',qty:1,grossWeight:'3.01'}],
    interestPayments:[{amountPaid:100,date:'2026-09-20'}],topups:[{amount:1000}],customField:'keep'}};
const settings = {allowedOrigins:new Set(['https://billing.example']),writesEnabled:true,region:'test',signupCode:'synthetic-invite-code'};
const createdUsers = new Map();
const auth = async token=> {
  if(token==='valid') return {id:'owner',email:'owner@example.test'};
  if(token==='pause-test') return {id:'11111111-1111-4111-8111-111111111111',email:'owner@example.test'};
  const account=createdUsers.get(token);
  if(!account) return null;
  const operators=await db.query('SELECT user_id FROM billing_operators WHERE user_id=$1',[account.id]);
  return operators.length ? {id:account.id,email:account.email} : null;
};
const authAdmin={
  createUser:async(email,password)=>{
    const id='33333333-3333-4333-8333-333333333333';
    await pg.query('INSERT INTO auth.users(id) VALUES ($1)',[id]);
    createdUsers.set('new-user',{id,email,password});return id;
  },
  deleteUser:async(id)=>{await pg.query('DELETE FROM auth.users WHERE id=$1',[id]);createdUsers.delete('new-user');},
};
const handler = createHandler(db,auth,settings,undefined,undefined,authAdmin);
function request(url,method='GET',payload,token='valid',origin='https://billing.example') {
  return new Request('https://test.local/functions/v1/billing-api'+url,{method,
    headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{})},
    ...(payload===undefined?{}:{body:JSON.stringify(payload)})});
}
let passed=0;
async function test(name,fn) {await fn();passed++;console.log('PASS '+name);}
(async()=>{
  await pg.exec(`CREATE TABLE customers (id text PRIMARY KEY,name text NOT NULL,phone text NOT NULL,address text NOT NULL,father text,idproof text,mandal text);
    CREATE TABLE transactions (id text PRIMARY KEY,"customerId" text NOT NULL,type text NOT NULL,amount integer NOT NULL,category text,date text NOT NULL,"itemsJson" text NOT NULL,status text,"clearedDate" text);
    CREATE TABLE sms_queue (uuid text PRIMARY KEY,"customerId" text,phone text NOT NULL,message text NOT NULL,"templateId" text,priority integer,status text,"retryCount" integer,"bridgeDeviceId" text,"createdAt" text,"scheduledAt" text,"sentAt" text,"completedAt" text,"errorMessage" text);
    CREATE TABLE devices ("deviceUuid" text PRIMARY KEY,name text,model text,battery integer,operator text,"lastSeen" text,"connectionStatus" text,"isOnline" boolean);
    CREATE TABLE sms_templates (id serial PRIMARY KEY,name text UNIQUE NOT NULL,content text NOT NULL);
    CREATE TABLE item_catalog (id serial PRIMARY KEY,name text NOT NULL,category text NOT NULL);`);
  await test('missing, invalid and non-owner tokens cannot read or write',async()=>{
    for(const token of [null,'invalid','other']) {
      for(const [route,method,payload] of [['/customers','GET'],['/sms/dispatch-control','GET'],['/records/save','POST',{transaction:loan,customer}]]) {
        const r=await handler(request(route,method,payload,token));assert.equal(r.status,401);
      }
    }
    assert.equal((await db.query('SELECT * FROM customers')).length,0);
  });
  await test('unapproved origins fail and CORS preflight is restricted',async()=>{
    assert.equal((await handler(request('/customers','GET',undefined,'valid','https://evil.example'))).status,403);
    const r=await handler(request('/customers','OPTIONS',undefined,null));assert.equal(r.status,204);
    assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://billing.example');
  });
  await test('read-only preview rejects saves without changing data',async()=>{
    const preview=createHandler(db,auth,{...settings,writesEnabled:false});
    assert.equal((await preview(request('/records/save','POST',{transaction:loan,customer}))).status,503);
    assert.equal((await db.query('SELECT * FROM transactions')).length,0);
  });
  await test('commit failure rolls back both customer and loan and never returns success',async()=>{
    failCommit=true;
    const r=await handler(request('/records/save','POST',{transaction:loan,customer}));failCommit=false;
    assert.equal(r.status,500);
    assert.equal((await db.query('SELECT * FROM customers')).length,0);
    assert.equal((await db.query('SELECT * FROM transactions')).length,0);
  });
  let saved;
  await test('atomic save returns committed full record and preserves Telugu/history',async()=>{
    const r=await handler(request('/records/save','POST',{transaction:loan,customer}));assert.equal(r.status,200);
    saved=(await r.json()).transaction;
    assert.deepEqual(JSON.parse(JSON.stringify(saved.loanDetails)),loan.loanDetails);
    assert.equal((await db.query('SELECT name FROM customers'))[0].name,customer.name);
    assert.equal((await db.query('SELECT amount FROM transactions'))[0].amount,10000);
  });
  await test('same-ID create cannot overwrite a saved loan',async()=>{
    await assert.rejects(()=>saveRecord(db,{transaction:{...loan,amount:1}}),/already exists/);
    assert.equal((await db.query('SELECT amount FROM transactions'))[0].amount,10000);
  });
  await test('duplicate displayed bills reject and roll back a staged new customer',async()=>{
    const c={...customer,id:'TEST-C2'};
    await assert.rejects(()=>saveRecord(db,{transaction:{...loan,id:'BILL-another-2026',customerId:c.id},customer:c}),/bill number/);
    assert.equal((await db.query('SELECT * FROM customers')).length,1);
  });
  await test('bill-only edit keeps stable ID, payments, items and unknown metadata',async()=>{
    const edit={...saved,updateOnly:true,expectedTransaction:saved,loanDetails:{...saved.loanDetails,billNumber:'301'}};
    const result=await saveRecord(db,{transaction:edit});
    assert.equal(result.transaction.id,saved.id);
    assert.deepEqual(JSON.parse(JSON.stringify(result.transaction.loanDetails.interestPayments)),loan.loanDetails.interestPayments);
    assert.equal(result.transaction.loanDetails.customField,'keep');
    saved=JSON.parse(JSON.stringify(result.transaction));
  });
  await test('stale edit and delete cannot overwrite or remove newer changes',async()=>{
    const before=saved;
    saved=JSON.parse(JSON.stringify((await saveRecord(db,{transaction:{...saved,amount:12000,updateOnly:true,expectedTransaction:saved}})).transaction));
    await assert.rejects(()=>saveRecord(db,{transaction:{...before,amount:1,updateOnly:true,expectedTransaction:before}}),/changed/);
    await assert.rejects(()=>deleteTransaction(db,saved.id,before),/changed/);
    assert.equal((await db.query('SELECT amount FROM transactions'))[0].amount,12000);
  });
  await test('customer edit requires original snapshot; newer fields are retained',async()=>{
    const updated={...customer,address:'New Address',expectedCustomer:customer};
    await putCustomer(db,updated);
    await assert.rejects(()=>putCustomer(db,{...customer,name:'Stale',expectedCustomer:customer}),/changed/);
    assert.equal((await db.query('SELECT address FROM customers'))[0].address,'New Address');
  });
  await test('customer with bills cannot be deleted',async()=>{
    const c=(await db.query('SELECT * FROM customers'))[0];
    const r=await handler(request('/customers/'+c.id,'DELETE',{expectedCustomer:c}));assert.equal(r.status,409);
  });
  await test('clearing preserves history and updates pledged totals consistently',async()=>{
    const result=await clearTransaction(db,{txnId:saved.id,clearedDate:'2026-10-03',expectedTransaction:saved});
    assert.equal(result.status,'Cleared');
    assert.deepEqual(JSON.parse(JSON.stringify(result.loanDetails.topups)),loan.loanDetails.topups);
    const snapshot=await dashboard(db);
    assert.equal(snapshot.transactions.filter(t=>t.type==='loan'&&t.status!=='Cleared').reduce((a,t)=>a+t.amount,0),0);
    saved=JSON.parse(JSON.stringify(result));
  });
  await test('failed modification commit retains previous amount and status',async()=>{
    failCommit=true;
    await assert.rejects(()=>saveRecord(db,{transaction:{...saved,amount:99,updateOnly:true,expectedTransaction:saved}}));failCommit=false;
    const row=transaction((await db.query('SELECT * FROM transactions'))[0]);assert.equal(row.amount,12000);assert.equal(row.status,'Cleared');
  });
  await test('invalid amounts/dates, malformed JSON and oversized bodies fail safely',async()=>{
    for(const patch of [{amount:-1},{amount:1.5},{date:'2026-02-30'}]) {
      assert.equal((await handler(request('/records/save','POST',{transaction:{...loan,...patch}}))).status,400);
    }
    const bad=new Request('https://test.local/functions/v1/billing-api/customers',{method:'POST',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:'{'});
    assert.equal((await handler(bad)).status,400);
    assert.equal((await handler(request('/customers','POST',{padding:'x'.repeat(1048577)}))).status,413);
  });
  await test('SMS retries cannot reset a sent record or enqueue duplicates',async()=>{
    const sms={id:'SMS-TEST',phone:'9999999999',message:'Test only'};
    await queueSMS(db,sms);await db.query("UPDATE sms_queue SET status='Sent' WHERE uuid=$1",[sms.id]);
    await queueSMS(db,sms);assert.equal((await db.query('SELECT status FROM sms_queue'))[0].status,'Sent');
    assert.equal((await handler(request('/sms/retry','POST',{smsId:sms.id}))).status,409);
  });
  await test('deleted loans cannot be recreated by a stale editor',async()=>{
    await deleteTransaction(db,saved.id,saved);
    await assert.rejects(()=>saveRecord(db,{transaction:{...saved,updateOnly:true,expectedTransaction:saved}}),/deleted/);
  });
  await test('security migration protects tables, Realtime and private files against broad old policies',async()=>{
    await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(id serial PRIMARY KEY,bucket_id text,name text);
      CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
      GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated;
      GRANT ALL ON storage.objects TO anon,authenticated;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA storage TO anon,authenticated;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE POLICY old_broad_storage_policy ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
      CREATE PUBLICATION supabase_realtime;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
    await pg.exec(fs.readFileSync(path.join(root,'../../migrations/202610030001_billing_access.sql'),'utf8'));
    await pg.exec(fs.readFileSync(path.join(root,'../../migrations/202610030002_signup_and_activity.sql'),'utf8'));
    await pg.exec(fs.readFileSync(path.join(root,'../../migrations/202610030003_sms_dispatch_control.sql'),'utf8'));
    await pg.exec(`INSERT INTO billing_operators(user_id) VALUES ('11111111-1111-4111-8111-111111111111');
      INSERT INTO billing_changes(topic) VALUES ('transactions');
      SET ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);`);
    await assert.rejects(()=>pg.query('SELECT * FROM customers'),/permission denied/);
    assert.equal((await pg.query('SELECT * FROM billing_changes')).rows.length,0);
    await assert.rejects(()=>pg.query('SELECT * FROM billing_access_events'),/permission denied/);
    await assert.rejects(()=>pg.query('SELECT * FROM billing_signup_guard'),/permission denied/);
    await assert.rejects(()=>pg.query('SELECT * FROM sms_dispatch_control'),/permission denied/);
    await assert.rejects(()=>pg.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('billing-documents','22222222-2222-4222-8222-222222222222/test.pdf')"),/row-level security/);
    await pg.query("SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)");
    assert.equal((await pg.query('SELECT * FROM billing_changes')).rows.length,1);
    await pg.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('billing-documents','11111111-1111-4111-8111-111111111111/test.pdf')");
    assert.equal((await pg.query("SELECT * FROM storage.objects WHERE bucket_id='billing-documents'")).rows.length,1);
    assert.equal((await pg.query("DELETE FROM storage.objects WHERE bucket_id='billing-documents' RETURNING *")).rows.length,0);
    assert.equal((await pg.query("UPDATE storage.objects SET name='overwrite.pdf' WHERE bucket_id='billing-documents' RETURNING *")).rows.length,0);
    await pg.exec('RESET ROLE');
  });
  await test('secret-code signup creates an authorized account and logs sign-in/password changes',async()=>{
    const rejected=await handler(request('/auth/register','POST',{email:'new@example.test',password:'correct horse battery',secretCode:'wrong'} ,null));
    assert.equal(rejected.status,403);
    assert.equal((await db.query('SELECT count(*) FROM billing_operators'))[0].count,1,'wrong code creates no operator');
    const registered=await handler(request('/auth/register','POST',{email:'New@Example.Test',password:'correct horse battery',secretCode:'synthetic-invite-code'},null));
    assert.equal(registered.status,201);
    assert.equal((await db.query('SELECT count(*) FROM billing_operators'))[0].count,2);
    const session=await handler(request('/session','GET',undefined,'new-user'));
    assert.equal(session.status,200);
    const password=await handler(request('/password-changed','POST',{},'new-user'));
    assert.equal(password.status,200);
    const activity=await handler(request('/activity','GET',undefined,'valid'));
    assert.equal(activity.status,200);
    const log=await activity.json();
    const newAccountEvents=log.events.filter(e=>e.actor_email==='new@example.test');
    assert.deepEqual(newAccountEvents.map(e=>e.event).sort(),['account_created','login','password_changed']);
    assert.ok(newAccountEvents.every(e=>e.actor_email==='new@example.test'));
    for(let i=0;i<7;i++) {
      const attempt=await handler(request('/auth/register','POST',{email:`guess${i}@example.test`,password:'correct horse battery',secretCode:'wrong'},null));
      assert.equal(attempt.status,403);
    }
    assert.equal((await handler(request('/auth/register','POST',{email:'guess8@example.test',password:'correct horse battery',secretCode:'wrong'},null))).status,429);
    assert.equal((await handler(request('/auth/register','POST',{email:'locked@example.test',password:'correct horse battery',secretCode:'synthetic-invite-code'},null))).status,429);
  });
  await test('Realtime notifications are committed atomically and contain no financial data',async()=>{
    const before=Number((await pg.query('SELECT count(*) FROM billing_changes')).rows[0].count);
    await assert.rejects(()=>pg.transaction(async tx=>{await tx.query("UPDATE customers SET name='Should roll back'");throw new Error('rollback');}));
    assert.equal(Number((await pg.query('SELECT count(*) FROM billing_changes')).rows[0].count),before);
    await pg.query("UPDATE customers SET name='Committed test'");
    const last=(await pg.query('SELECT * FROM billing_changes ORDER BY id DESC LIMIT 1')).rows[0];
    assert.equal(last.topic,'customers');assert.deepEqual(Object.keys(last).sort(),['changed_at','id','topic']);
  });
  await test('paired bridge credentials are scoped, cannot double-claim jobs, and support safe result retries',async()=>{
    const {tokenHash}=load('handler.ts');
    const pairedHandler=createHandler(db,auth,settings,async token=>{
      const hash=await tokenHash(token);
      const row=(await db.query('SELECT device_id FROM billing_bridge_keys WHERE token_hash=$1 AND enabled=true',[hash]))[0];
      return row?{deviceId:row.device_id,tokenHash:hash}:null;
    },async token=>token==='cron-only');
    const pair=await pairedHandler(request('/devices/pair','POST',{id:'PHONE-TEST',name:'Test phone'}));
    assert.equal(pair.status,200);
    const token=(await pair.json()).pairingKey;assert.equal(token.length,64);
    assert.equal((await pairedHandler(request('/customers','GET',undefined,token))).status,401);
    assert.equal((await pairedHandler(request('/bridge/claim','POST',{},'wrong-token'))).status,401);
    await queueSMS(db,{id:'SMS-PAIR-TEST',phone:'9999999999',message:'Synthetic test'});
    const pause=await handler(request('/sms/dispatch-control','POST',{paused:true},'pause-test'));
    assert.equal(pause.status,200);assert.equal((await pause.json()).paused,true);
    const first=await pairedHandler(request('/bridge/claim','POST',{},token));
    const pausedClaim=await first.json();
    assert.equal(first.status,200);assert.equal(pausedClaim.job,null);assert.equal(pausedClaim.paused,true);
    assert.equal((await db.query('SELECT status FROM sms_queue WHERE uuid=$1',['SMS-PAIR-TEST']))[0].status,'Pending');
    const resume=await handler(request('/sms/dispatch-control','POST',{paused:false},'pause-test'));
    assert.equal(resume.status,200);assert.equal((await resume.json()).paused,false);
    const resumed=await pairedHandler(request('/bridge/claim','POST',{},token));
    assert.equal((await resumed.json()).job.smsId,'SMS-PAIR-TEST');
    const second=await pairedHandler(request('/bridge/claim','POST',{},token));assert.equal((await second.json()).job,null);
    const result={smsId:'SMS-PAIR-TEST',status:'Submitted'};
    assert.equal((await pairedHandler(request('/bridge/result','POST',result,token))).status,200);
    assert.equal((await pairedHandler(request('/bridge/result','POST',result,token))).status,200);
    assert.equal((await db.query('SELECT status FROM sms_queue WHERE uuid=$1',['SMS-PAIR-TEST']))[0].status,'Submitted');
    assert.equal((await pairedHandler(request('/loans/scheduled-reminders','POST',{},'cron-only'))).status,200);
    assert.equal((await pairedHandler(request('/customers','GET',undefined,'cron-only'))).status,401);
    await pairedHandler(request('/devices/unregister','POST',{id:'PHONE-TEST'}));
    assert.equal((await pairedHandler(request('/bridge/claim','POST',{},token))).status,401);
  });
  await test('audit history retains deleted records, identifies actors and rolls back with failed writes',async()=>{
    const c=(await db.query('SELECT * FROM customers'))[0];
    const r=await handler(request('/customers','POST',{...c,name:'Audited name',expectedCustomer:c}));assert.equal(r.status,200);
    const audit=(await db.query('SELECT * FROM billing_audit ORDER BY id DESC LIMIT 1'))[0];
    assert.equal(audit.actor,'owner');assert.equal(audit.actor_email,'owner@example.test');assert.equal(audit.before_row.name,c.name);assert.equal(audit.after_row.name,'Audited name');
    const count=(await db.query('SELECT count(*) FROM billing_audit'))[0].count;
    failCommit=true;
    const next={...c,name:'Audited name'};
    assert.equal((await handler(request('/customers','POST',{...next,name:'Failed audit',expectedCustomer:next}))).status,500);failCommit=false;
    assert.equal((await db.query('SELECT count(*) FROM billing_audit'))[0].count,count);
    assert.equal((await handler(request('/customers/'+c.id,'DELETE',{expectedCustomer:next}))).status,200);
    const deleted=(await db.query('SELECT * FROM billing_audit ORDER BY id DESC LIMIT 1'))[0];
    assert.equal(deleted.operation,'DELETE');assert.equal(deleted.before_row.id,c.id);assert.equal(deleted.after_row,null);
    await pg.exec("SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)");
    await assert.rejects(()=>pg.query('SELECT * FROM billing_audit'),/permission denied/);await pg.exec('RESET ROLE');
  });
  assert.ok(lockCount>10,'Writes must acquire the global transaction-scoped lock');
  console.log(`${passed} Supabase backend tests passed. No hosted data was accessed.`);
  await pg.close();
})().catch(async error=>{console.error(error);await pg.close();process.exitCode=1;});
