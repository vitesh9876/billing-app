import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseBillingEnabled = process.env.NEXT_PUBLIC_BILLING_BACKEND === "supabase";
let client: SupabaseClient | null = null;
export function billingSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase connection is not configured.");
    client = createClient(url,key,{auth:{persistSession:true,storage:typeof window === "undefined" ? undefined : window.sessionStorage}});
  }
  return client;
}

const transactions = new Map<string, any>();
const customers = new Map<string, any>();
const items = new Map<number, any>();
const templates = new Map<string, any>();
export function clearBillingSnapshots() {
  transactions.clear(); customers.clear(); items.clear(); templates.clear();
}

export async function billingFetch(input: string, init: RequestInit = {}): Promise<Response> {
  if (!supabaseBillingEnabled || !input.startsWith("/api/v1/")) {
    // Edit snapshots are only understood by the Supabase customer API.
    if (!supabaseBillingEnabled && typeof init.body === "string" && ["/api/v1/customers","/api/v1/records/save"].includes(input)) {
      const payload = JSON.parse(init.body);
      delete payload.expectedCustomer;
      if (payload.customer) delete payload.customer.expectedCustomer;
      return fetch(input,{...init,body:JSON.stringify(payload)});
    }
    return fetch(input,init);
  }
  const supabase = billingSupabase();
  const { data:{session},error } = await supabase.auth.getSession();
  if (error || !session) return Response.json({detail:"Sign in again."},{status:401});
  const headers = new Headers(init.headers);
  headers.set("Authorization",`Bearer ${session.access_token}`);
  headers.set("apikey",process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  headers.set("x-region","ap-south-1");
  const method = (init.method || "GET").toUpperCase();
  let body = init.body;
  if (method !== "GET" && method !== "HEAD") {
    const payload = typeof body === "string" ? JSON.parse(body) : {};
    // Existing transaction forms provide their captured expectedTransaction.
    // Imports are create-only; they can never silently replace an existing bill.
    const t = input === "/api/v1/records/save" ? payload.transaction : input === "/api/v1/transactions" ? payload : null;
    if (t && !t.createOnly && !t.updateOnly) t.createOnly = true;
    if (input === "/api/v1/transactions/clear") payload.expectedTransaction ??= transactions.get(payload.txnId);
    if (method === "DELETE") {
      const id = decodeURIComponent(input.slice(input.lastIndexOf("/")+1));
      if (input.startsWith("/api/v1/transactions/")) payload.expectedTransaction = transactions.get(id);
      if (input.startsWith("/api/v1/customers/")) payload.expectedCustomer = customers.get(id);
      if (input.startsWith("/api/v1/items/")) payload.expectedItem = items.get(Number(id));
    }
    // Existing settings forms are short-lived; a server snapshot is still required.
    if (input === "/api/v1/sms/template") payload.expectedTemplate ??= templates.get(payload.name);
    if (input === "/api/v1/sms/template/delete") payload.expectedTemplate ??= templates.get(payload.name);
    if (input === "/api/v1/items" && payload.id) payload.expectedItem ??= items.get(Number(payload.id));
    headers.set("Content-Type","application/json");
    body = JSON.stringify(payload);
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/,"");
  // Never retry mutations automatically: a network failure can follow a committed write.
  const result = await fetch(`${base}/functions/v1/billing-api${input.replace("/api/v1","")}`,{
    ...init,method,body,headers,cache:"no-store",
  });
  if (result.ok && result.headers.get("content-type")?.includes("application/json")) {
    const data = await result.clone().json();
    const remember = (list:any[],map:Map<any,any>,key="id") => { map.clear(); list.forEach(r=>map.set(r[key],r)); };
    if (input === "/api/v1/dashboard-data" && [data.transactions,data.customers,data.itemsCatalog,data.smsTemplates].every(Array.isArray)) {
      remember(data.transactions,transactions); remember(data.customers,customers);
      remember(data.itemsCatalog,items); remember(data.smsTemplates,templates,"name");
    }
    if (input === "/api/v1/records/save" && data.transaction?.id) {
      transactions.set(data.transaction.id,data.transaction);
      if (data.customer) customers.set(data.customer.id,data.customer);
    }
    if (["/api/v1/transactions","/api/v1/transactions/clear"].includes(input) && method === "POST" && data.id) transactions.set(data.id,data);
    if (input === "/api/v1/customers" && method === "POST" && data.id) customers.set(data.id,data);
    if (input === "/api/v1/sms/templates" && method === "GET") remember(data,templates,"name");
  }
  return result;
}

export function subscribeBillingChanges(onUpdate:()=>void,onConnected:(connected:boolean)=>void):()=>void {
  const supabase = billingSupabase();
  const channel = supabase.channel("billing-updates").on("postgres_changes",{
    event:"INSERT",schema:"public",table:"billing_changes",
  },onUpdate).subscribe(status=>onConnected(status === "SUBSCRIBED"));
  // Recover notifications missed during reconnect; do not keep polling hidden tabs.
  const refresh = () => { if (document.visibilityState === "visible") onUpdate(); };
  const timer = window.setInterval(refresh,60000);
  window.addEventListener("focus",refresh);
  return () => { window.clearInterval(timer); window.removeEventListener("focus",refresh); void supabase.removeChannel(channel); };
}
