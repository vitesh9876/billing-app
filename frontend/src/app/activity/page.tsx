"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SupabaseBillingGate from "@/components/SupabaseBillingGate";
import { billingFetch } from "@/lib/supabaseBilling";

type ActivityEntry={
  id:number;
  time:string;
  email:string;
  action:string;
  before?:unknown;
  after?:unknown;
};

function ActivityLog(){
  const [entries,setEntries]=useState<ActivityEntry[]>([]);
  const [message,setMessage]=useState("Loading activity…");
  useEffect(()=>{
    let cancelled=false;
    billingFetch("/api/v1/activity").then(async response=>{
      const data=await response.json();
      if(!response.ok) throw new Error(data.detail || "Activity could not be loaded.");
      if(cancelled)return;
      const access=(data.events || []).map((row:{id:number;occurred_at:string;actor_email:string;event:string})=>({
        id:row.id,time:row.occurred_at,email:row.actor_email,action:row.event.replaceAll("_"," "),
      }));
      const changes=(data.changes || []).map((row:{id:number;changed_at:string;actor_email:string;actor:string;table_name:string;operation:string;before_row:unknown;after_row:unknown})=>({
        id:row.id,time:row.changed_at,email:row.actor_email || row.actor || "System",action:`${row.operation.toLowerCase()} ${row.table_name}`,
        before:row.before_row,after:row.after_row,
      }));
      setEntries([...access,...changes].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)));
      setMessage(access.length+changes.length?"":"No activity has been recorded yet.");
    }).catch(()=>{if(!cancelled)setMessage("Activity could not be loaded. Refresh and try again.");});
    return ()=>{cancelled=true;};
  },[]);

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
    <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
      <Link href="/" className="text-sm text-amber-700 underline">← Back to billing</Link>
      <h1 className="mt-5 text-3xl font-semibold">Account and change activity</h1>
      <p className="mt-2 mb-6 text-sm text-slate-600">Sign-ins, account events, and recorded changes to billing records.</p>
      {message && <p role="status" className="mb-4 text-sm text-slate-600">{message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Time</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Record details</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry,index)=><tr key={`${entry.id}-${entry.action}-${index}`}>
              <td className="whitespace-nowrap p-3">{new Date(entry.time).toLocaleString()}</td>
              <td className="p-3">{entry.email}</td>
              <td className="p-3 capitalize">{entry.action}</td>
              <td className="p-3">{entry.before!==undefined || entry.after!==undefined?<details>
                <summary className="cursor-pointer text-amber-700 underline">View before and after</summary>
                <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2">Before: {JSON.stringify(entry.before,null,2) ?? "—"}</pre>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2">After: {JSON.stringify(entry.after,null,2) ?? "—"}</pre>
                </div>
              </details>:"—"}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </main>;
}

export default function Page(){return <SupabaseBillingGate><ActivityLog /></SupabaseBillingGate>;}
