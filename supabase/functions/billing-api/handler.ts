import { ApiError, object, reminders, transaction, type Row } from "./domain.ts";
import { bridgeRequest, pairDevice, revokeDevice, triggerReminders, catalogWrite, changeSMS, clearTransaction, dashboard, deleteAuxiliary, deleteCustomer,
  deleteTransaction, deviceView, putCustomer, queueSMS, queueView, saveRecord, setSMSDispatchPaused, smsDispatchControl, templateWrite, type Database } from "./store.ts";

export interface Settings {
  allowedOrigins: Set<string>;
  writesEnabled: boolean;
  region: string;
  signupCode?: string;
}
export type Authenticate = (token: string) => Promise<{ id: string; email: string } | null>;
export type AuthenticateBridge = (token:string) => Promise<{deviceId:string,tokenHash:string} | null>;
export interface AuthAdmin {
  createUser(email:string,password:string):Promise<string|null>;
  deleteUser(userId:string):Promise<void>;
}
export async function tokenHash(token:string):Promise<string> {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function actorDatabase(db:Database,actor:string,email=""):Database {
  return {...db,begin:async(fn,readOnly=false)=>await db.begin(async c=> {
    if (!readOnly) {
      await c.query("SELECT set_config('billing.actor',$1,true)",[actor]);
      await c.query("SELECT set_config('billing.actor_email',$1,true)",[email]);
    }
    return await fn(c);
  },readOnly)};
}

function sameSecret(a:string,b:string):boolean {
  const left=new TextEncoder().encode(a),right=new TextEncoder().encode(b);
  let difference=left.length ^ right.length;
  for (let i=0;i<Math.max(left.length,right.length);i++) difference |= (left[i] || 0) ^ (right[i] || 0);
  return difference===0;
}

async function checkSignupCode(db:Database,code:string,expected:string):Promise<"valid"|"invalid"|"locked"> {
  return await db.begin(async c=> {
    await c.query("INSERT INTO public.billing_signup_guard(singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING");
    const rows=await c.query("SELECT window_started_at,failed_attempts,locked_until FROM public.billing_signup_guard WHERE singleton=true FOR UPDATE");
    const state=rows[0];
    if (state?.locked_until && Date.parse(state.locked_until)>Date.now()) return "locked";
    const expired=!state || Date.parse(state.window_started_at)<Date.now()-15*60*1000;
    if (!sameSecret(code,expected)) {
      const failures=expired?1:Number(state.failed_attempts)+1;
      await c.query(`UPDATE public.billing_signup_guard SET window_started_at=CASE WHEN $2 THEN now() ELSE window_started_at END,
        failed_attempts=$1,locked_until=CASE WHEN $3 THEN now()+interval '15 minutes' ELSE NULL END WHERE singleton=true`,
        [failures,expired,failures>=8]);
      return failures>=8?"locked":"invalid";
    }
    await c.query("UPDATE public.billing_signup_guard SET failed_attempts=0,window_started_at=now(),locked_until=NULL WHERE singleton=true");
    return "valid";
  });
}

async function body(req: Request): Promise<Row> {
  if (!req.headers.get("content-type")?.includes("application/json")) throw new ApiError(415,"JSON content type is required.");
  // Bound memory even when a client omits Content-Length.
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400,"Request body is required.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > 1048576) { await reader.cancel(); throw new ApiError(413,"Request is too large. Import records individually."); }
    chunks.push(chunk.value);
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk,offset); offset += chunk.byteLength; }
  let parsed;
  try { parsed = JSON.parse(new TextDecoder().decode(merged)); }
  catch { throw new ApiError(400,"Invalid JSON."); }
  return object(parsed,"Request");
}

export function createHandler(db: Database, authenticate: Authenticate, settings: Settings, authenticateBridge?:AuthenticateBridge,
  authenticateCron?:(token:string)=>Promise<boolean>,authAdmin?:AuthAdmin) {
  return async (req: Request): Promise<Response> => {
    let requestDb=db;
    const started = performance.now();
    const origin = req.headers.get("origin");
    const headers: Record<string,string> = {
      "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff", "Vary":"Origin", "X-Billing-Region":settings.region,
      "Access-Control-Expose-Headers":"Server-Timing, X-Billing-Region",
    };
    if (origin && settings.allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
    const response = (data: unknown,status=200) => {
      headers["Server-Timing"] = `api;dur=${(performance.now()-started).toFixed(1)}`;
      return new Response(status === 204 ? null : JSON.stringify(data),{ status,headers });
    };
    try {
      if (origin && !settings.allowedOrigins.has(origin)) throw new ApiError(403,"Origin is not permitted.");
      if (req.method === "OPTIONS") {
        headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-region, x-client-info";
        headers["Access-Control-Max-Age"] = "600";
        return response(null,204);
      }
      const path = new URL(req.url).pathname.replace(/^.*\/billing-api(?=\/|$)/,"").replace(/^\/api\/v1/,"") || "/";
      if (req.method === "GET" && path === "/health") {
        return response({ status:"ok",region:settings.region,writesEnabled:settings.writesEnabled });
      }
      if (path === "/auth/register" && req.method === "POST") {
        if (!settings.writesEnabled) throw new ApiError(503,"Account creation is temporarily unavailable.");
        if (!settings.signupCode || !authAdmin) throw new ApiError(503,"Account creation is not configured yet.");
        const input=await body(req);
        const email=typeof input.email==="string" ? input.email.trim().toLowerCase() : "";
        const password=typeof input.password==="string" ? input.password : "";
        const code=typeof input.secretCode==="string" ? input.secretCode.trim() : "";
        if (!/^\S+@\S+\.\S+$/.test(email) || password.length<10 || password.length>256 || code.length<1 || code.length>128) {
          throw new ApiError(400,"Enter a valid email and a password with at least 10 characters.");
        }
        const codeStatus=await checkSignupCode(db,code,settings.signupCode);
        if (codeStatus==="locked") throw new ApiError(429,"Account creation is temporarily locked. Try again in 15 minutes.");
        if (codeStatus==="invalid") throw new ApiError(403,"The secret code is incorrect.");
        let userId:string|null=null;
        try { userId=await authAdmin.createUser(email,password); }
        catch { userId=null; }
        if (!userId) throw new ApiError(409,"Account could not be created. Check the email or contact the shop owner.");
        try {
          await db.begin(async c=> {
            await c.query("INSERT INTO public.billing_operators(user_id) VALUES ($1)",[userId]);
            await c.query("INSERT INTO public.billing_access_events(actor,actor_email,event) VALUES ($1,$2,'account_created')",[userId,email]);
          });
        } catch {
          try { await authAdmin.deleteUser(userId); } catch { console.error("signup cleanup failed"); }
          throw new ApiError(500,"Account setup could not be completed. Contact the shop owner before trying again.");
        }
        return response({created:true},201);
      }
      const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
      if (!bearer) throw new ApiError(401,"Sign in to access billing records.");
      if (path==='/loans/scheduled-reminders') {
        if (req.method!=='POST' || !await authenticateCron?.(bearer)) throw new ApiError(401,"Scheduled task is not authorized.");
        if (!settings.writesEnabled) throw new ApiError(503,"Preview is read-only.");
        return response(await triggerReminders(actorDatabase(db,'scheduled-reminders')));
      }
      if (path.startsWith('/bridge/')) {
        if (req.method!=='POST') throw new ApiError(405,"Bridge requests require POST.");
        const device=await authenticateBridge?.(bearer);
        if (!device) throw new ApiError(401,"Device is not paired.");
        if (!settings.writesEnabled) throw new ApiError(503,"Preview is read-only.");
        const payload=await body(req);
        payload.authenticatedTokenHash=device.tokenHash;
        return response(await bridgeRequest(actorDatabase(db,`device:${device.deviceId}`),device.deviceId,path.split('/').at(-1)!,payload));
      }
      const user = await authenticate(bearer);
      if (!user) throw new ApiError(401,"Session expired. Sign in again.");
      requestDb=actorDatabase(db,user.id,user.email);
      const mutation = !["GET","HEAD"].includes(req.method);
      if (mutation && !settings.writesEnabled) throw new ApiError(503,"Preview is read-only. Your saved data has not been changed.");
      if (req.method === "GET") {
        if (path === "/session") {
          await db.query("INSERT INTO public.billing_access_events(actor,actor_email,event) VALUES ($1,$2,'login')",[user.id,user.email]);
          return response({ userId:user.id,writesEnabled:settings.writesEnabled });
        }
        if (path === "/activity") {
          const [events,changes]=await Promise.all([
            db.query("SELECT id,occurred_at,actor_email,event FROM public.billing_access_events ORDER BY occurred_at DESC,id DESC LIMIT 250"),
            db.query("SELECT id,changed_at,actor,actor_email,table_name,operation,before_row,after_row FROM public.billing_audit ORDER BY changed_at DESC,id DESC LIMIT 250"),
          ]);
          return response({events,changes});
        }
        if (path === "/dashboard-data") return response(await dashboard(db));
        if (path === "/customers") return response(await db.query('SELECT * FROM public.customers'));
        if (path === "/transactions") return response((await db.query('SELECT * FROM public.transactions')).map(transaction));
        if (path === "/items") return response(await db.query('SELECT * FROM public.item_catalog'));
        if (path === "/sms/templates") return response(await db.query('SELECT * FROM public.sms_templates'));
        if (path === "/sms/queue") return response((await db.query('SELECT * FROM public.sms_queue')).map(queueView));
        if (path === "/sms/dispatch-control") return response(await smsDispatchControl(db));
        if (path === "/devices") return response((await db.query('SELECT * FROM public.devices')).map(deviceView));
        if (path === "/loans/reminders-status") {
          const data = await dashboard(db);
          return response(reminders(data.transactions,data.customers,data.smsQueue.map((s:Row)=>({phone:s.phone,message:s.message})),false));
        }
      }
      if (req.method === "POST") {
        const data = await body(req);
        if (path === "/password-changed") {
          await db.query("INSERT INTO public.billing_access_events(actor,actor_email,event) VALUES ($1,$2,'password_changed')",[user.id,user.email]);
          return response({recorded:true});
        }
        if (path === "/records/save") return response(await saveRecord(requestDb,data));
        if (path === "/transactions") return response((await saveRecord(requestDb,{transaction:data})).transaction);
        if (path === "/customers") return response(await putCustomer(requestDb,data));
        if (path === "/transactions/clear") return response(await clearTransaction(requestDb,data));
        if (path === "/items") return response(await catalogWrite(requestDb,data));
        if (path === "/sms/template") return response(await templateWrite(requestDb,data));
        if (path === "/sms/template/delete") return response(await deleteAuxiliary(requestDb,"template",data.name,data.expectedTemplate));
        if (path === "/sms/send") return response(await queueSMS(requestDb,data));
        if (path === "/sms/dispatch-control") {
          if (typeof data.paused !== "boolean") throw new ApiError(400,"Choose whether SMS delivery should be paused.");
          return response(await setSMSDispatchPaused(requestDb,data.paused,user.email));
        }
        if (path === "/sms/cancel") return response(await changeSMS(requestDb,data,true));
        if (path === "/sms/retry") return response(await changeSMS(requestDb,data,false));
        if (path === '/devices/pair') {
          const secret=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
          const paired=await pairDevice(requestDb,data,await tokenHash(secret));
          return response({...paired,pairingKey:secret});
        }
        if (path === '/devices/register') throw new ApiError(409,"Pair this device from the signed-in website first.");
        if (path === '/devices/unregister') return response(await revokeDevice(requestDb,String(data.id || '')));
        if (path === '/loans/trigger-reminders') return response(await triggerReminders(requestDb));
      }
      if (req.method === "DELETE") {
        const data = await body(req);
        const id = decodeURIComponent(path.slice(path.lastIndexOf("/")+1));
        if (path.startsWith("/transactions/")) return response(await deleteTransaction(requestDb,id,data.expectedTransaction));
        if (path.startsWith("/customers/")) return response(await deleteCustomer(requestDb,id,data.expectedCustomer));
        if (path.startsWith("/items/")) return response(await deleteAuxiliary(requestDb,"item",Number(id),data.expectedItem));
      }
      throw new ApiError(404,"Endpoint not found.");
    } catch (error) {
      if (error instanceof ApiError) return response({detail:error.message},error.status);
      const code = (error as {code?:string})?.code;
      if (["23505","23503","40001","40P01","55P03"].includes(code || "")) {
        return response({detail:"Save conflicted with another change. Refresh before retrying."},409);
      }
      // Never include connection strings, SQL parameters, contacts or financial data in logs/errors.
      console.error("billing-api failed",code || "internal");
      return response({detail:"The operation could not be confirmed. Refresh your records before retrying."},500);
    }
  };
}
