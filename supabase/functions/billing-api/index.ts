import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { createHandler, tokenHash } from "./handler.ts";
import type { Connection, Database } from "./store.ts";
import type { Row } from "./domain.ts";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required setting: ${name}`);
  return value;
};
const set = (name:string) => new Set(required(name).split(",").map(s=>s.trim()).filter(Boolean));

// Use Supavisor transaction-pooler URL. Prepared statements are disabled for pool mode.
// TLS certificate verification stays enabled; never use rejectUnauthorized:false.
const sql = postgres(required("BILLING_DATABASE_URL"), {
  prepare:false,max:1,ssl:"verify-full",connect_timeout:10,idle_timeout:20,max_lifetime:300,
});
const connection = (client: any): Connection => ({
  query: async (query,params=[]) => Array.from(await client.unsafe(query,params)) as Row[],
});
const db: Database = {
  ...connection(sql),
  begin: async (fn,readOnly=false) => await sql.begin(
    readOnly ? "isolation level repeatable read read only" : "isolation level read committed",
    async tx => await fn(connection(tx)),
  ) as any,
};
const auth = createClient(required("SUPABASE_URL"),required("SUPABASE_ANON_KEY"),{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
});
const handler = createHandler(db,async token => {
  const {data,error} = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const operator=await db.query('SELECT user_id FROM public.billing_operators WHERE user_id=$1',[data.user.id]);
  return operator.length ? {id:data.user.id} : null;
},{
  allowedOrigins:set("BILLING_ALLOWED_ORIGINS"),
  allowedUsers:set("BILLING_ALLOWED_USER_IDS"),
  writesEnabled:Deno.env.get("BILLING_WRITES_ENABLED") === "true",
  region:Deno.env.get("SB_REGION") || "local",
},async token=> {
  const hash=await tokenHash(token);
  const row=(await db.query('SELECT device_id FROM public.billing_bridge_keys WHERE token_hash=$1 AND enabled=true',[hash]))[0];
  return row ? {deviceId:row.device_id,tokenHash:hash} : null;
},async token=> {
  const configured=Deno.env.get('BILLING_CRON_TOKEN_SHA256');
  return Boolean(configured && await tokenHash(token)===configured);
});
Deno.serve(handler);
