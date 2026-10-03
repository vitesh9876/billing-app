import { ApiError, object, reminders, transaction, type Row } from "./domain.ts";
import { bridgeRequest, pairDevice, revokeDevice, triggerReminders, catalogWrite, changeSMS, clearTransaction, dashboard, deleteAuxiliary, deleteCustomer,
  deleteTransaction, deviceView, putCustomer, queueSMS, queueView, saveRecord, templateWrite, type Database } from "./store.ts";

export interface Settings {
  allowedOrigins: Set<string>;
  allowedUsers: Set<string>;
  writesEnabled: boolean;
  region: string;
}
export type Authenticate = (token: string) => Promise<{ id: string } | null>;
export type AuthenticateBridge = (token:string) => Promise<{deviceId:string,tokenHash:string} | null>;
export async function tokenHash(token:string):Promise<string> {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function actorDatabase(db:Database,actor:string):Database {
  return {...db,begin:async(fn,readOnly=false)=>await db.begin(async c=> {
    if (!readOnly) await c.query("SELECT set_config('billing.actor',$1,true)",[actor]);
    return await fn(c);
  },readOnly)};
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
  authenticateCron?:(token:string)=>Promise<boolean>) {
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
      if (!settings.allowedUsers.has(user.id)) throw new ApiError(403,"This account is not authorized for this shop.");
      requestDb=actorDatabase(db,user.id);
      const mutation = !["GET","HEAD"].includes(req.method);
      if (mutation && !settings.writesEnabled) throw new ApiError(503,"Preview is read-only. Your saved data has not been changed.");
      if (req.method === "GET") {
        if (path === "/session") return response({ userId:user.id,writesEnabled:settings.writesEnabled });
        if (path === "/dashboard-data") return response(await dashboard(db));
        if (path === "/customers") return response(await db.query('SELECT * FROM public.customers'));
        if (path === "/transactions") return response((await db.query('SELECT * FROM public.transactions')).map(transaction));
        if (path === "/items") return response(await db.query('SELECT * FROM public.item_catalog'));
        if (path === "/sms/templates") return response(await db.query('SELECT * FROM public.sms_templates'));
        if (path === "/sms/queue") return response((await db.query('SELECT * FROM public.sms_queue')).map(queueView));
        if (path === "/devices") return response((await db.query('SELECT * FROM public.devices')).map(deviceView));
        if (path === "/loans/reminders-status") {
          const data = await dashboard(db);
          return response(reminders(data.transactions,data.customers,data.smsQueue.map((s:Row)=>({phone:s.phone,message:s.message})),false));
        }
      }
      if (req.method === "POST") {
        const data = await body(req);
        if (path === "/records/save") return response(await saveRecord(requestDb,data));
        if (path === "/transactions") return response((await saveRecord(requestDb,{transaction:data})).transaction);
        if (path === "/customers") return response(await putCustomer(requestDb,data));
        if (path === "/transactions/clear") return response(await clearTransaction(requestDb,data));
        if (path === "/items") return response(await catalogWrite(requestDb,data));
        if (path === "/sms/template") return response(await templateWrite(requestDb,data));
        if (path === "/sms/template/delete") return response(await deleteAuxiliary(requestDb,"template",data.name,data.expectedTemplate));
        if (path === "/sms/send") return response(await queueSMS(requestDb,data));
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
