"use client";

import { useEffect, useState } from "react";
import SupabaseBillingGate from "@/components/SupabaseBillingGate";
import { billingSupabase } from "@/lib/supabaseBilling";

function Documents() {
  const [files,setFiles] = useState<{name:string}[]>([]);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const load = async()=> {
    const supabase = billingSupabase();
    const {data:{session}} = await supabase.auth.getSession();
    if (!session) return;
    const {data,error} = await supabase.storage.from("billing-documents").list(session.user.id,{limit:1000,sortBy:{column:"created_at",order:"desc"}});
    if (error) setMessage("Documents could not be loaded."); else setFiles(data || []);
  };
  useEffect(()=> {void load();},[]);
  return <main className="mx-auto max-w-3xl p-8 text-slate-900">
    <a href="/" className="text-sm underline">Back to billing</a>
    <h1 className="mt-5 text-3xl font-semibold">Private documents</h1>
    <p className="mt-2 mb-5 text-slate-600">Upload a PDF or photo, up to 10 MB. Saved files are kept separately from your bills.</p>
    <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={async e=> {
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size>10485760 || !["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type)) {setMessage("Choose a PDF, JPG, PNG or WebP file up to 10 MB.");return;}
      setBusy(true);setMessage("Uploading…");
      try {
        const supabase = billingSupabase();
        const {data:{session}} = await supabase.auth.getSession();
        if (!session) throw new Error("Sign in again.");
        const name = file.name.replace(/[^\p{L}\p{N}._-]/gu,"_").slice(-120);
        const {error} = await supabase.storage.from("billing-documents").upload(`${session.user.id}/${crypto.randomUUID()}-${name}`,file,{upsert:false,contentType:file.type});
        if (error) throw error;
        setMessage("Document saved.");await load();
      } catch {setMessage("Upload could not be confirmed. Check the list before retrying.");}
      finally {setBusy(false);e.target.value="";}
    }} />
    <p className="my-4 text-sm" role="status">{message}</p>
    <ul className="divide-y divide-slate-200">{files.map(file=><li key={file.name} className="py-3">
      <button className="text-left underline" onClick={async()=> {
        // Open synchronously to preserve the user's click through popup blockers.
        const tab = window.open("about:blank","_blank");
        if (tab) tab.opener=null;
        try {
          const supabase = billingSupabase();
          const {data:{session}} = await supabase.auth.getSession();
          if (!session) throw new Error("Sign in again.");
          const {data,error} = await supabase.storage.from("billing-documents").createSignedUrl(`${session.user.id}/${file.name}`,60);
          if (error || !data) throw error;
          if (tab) tab.location.href=data.signedUrl;else setMessage("Allow popups to open this document.");
        } catch {tab?.close();setMessage("Document could not be opened.");}
      }}>{file.name.replace(/^[0-9a-f-]{36}-/,"")}</button>
    </li>)}</ul>
  </main>;
}
export default function Page() {return <SupabaseBillingGate><Documents /></SupabaseBillingGate>;}
