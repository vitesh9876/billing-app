"use client";
import { useState } from "react";
import SupabaseBillingGate from "@/components/SupabaseBillingGate";
import { billingFetch } from "@/lib/supabaseBilling";

function PairBridge() {
  const [device,setDevice]=useState(''),[name,setName]=useState('Shop phone');
  const [key,setKey]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <main className="mx-auto max-w-xl p-8 text-slate-900">
    <a href="/" className="text-sm underline">Back to billing</a>
    <h1 className="mt-5 text-3xl font-semibold">Pair SMS phone</h1>
    <p className="my-4 text-slate-600">Copy the device UUID from the updated Android bridge app. Pairing again replaces its previous key.</p>
    <form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setKey('');setMessage('');
      try {
        const r=await billingFetch('/api/v1/devices/pair',{method:'POST',body:JSON.stringify({id:device.trim(),name:name.trim()})});
        const data=await r.json();if(!r.ok)throw new Error(data.detail);setKey(data.pairingKey);
      } catch(e){setMessage((e as Error).message || 'Pairing could not be confirmed.');}
      finally{setBusy(false);}
    }} className="space-y-4">
      <label className="block">Device UUID<input required value={device} onChange={e=>setDevice(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="block">Phone name<input required value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
      <button disabled={busy} className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">{busy?'Pairing…':'Create pairing key'}</button>
    </form>
    {key && <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="mb-3">Paste this key into the phone app. Keep it private; it is shown once.</p>
      <input readOnly value={key} aria-label="Private device pairing key" className="w-full rounded border bg-white p-2 font-mono text-sm" />
      <button className="mt-3 underline" onClick={async()=>{try{await navigator.clipboard.writeText(key);setMessage('Pairing key copied.');}catch{setMessage('Select and copy the key.');}}}>Copy key</button>
    </div>}
    <p role="status" className="mt-4">{message}</p>
  </main>;
}
export default function Page(){return <SupabaseBillingGate><PairBridge /></SupabaseBillingGate>;}
