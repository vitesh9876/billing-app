"use client";

import { useEffect, useState, type ReactNode } from "react";
import { billingFetch, billingSupabase, clearBillingSnapshots, supabaseBillingEnabled } from "@/lib/supabaseBilling";

export default function SupabaseBillingGate({children}:{children:ReactNode}) {
  const [userId,setUserId] = useState<string | null>(null);
  const [authorized,setAuthorized] = useState(false);
  const [loading,setLoading] = useState(true);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [readOnly,setReadOnly] = useState(true);
  useEffect(()=> {
    if (!supabaseBillingEnabled) return;
    try {
      const supabase = billingSupabase();
      const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session)=> {
        setUserId(session?.user.id || null);
        if (!session) { clearBillingSnapshots(); setAuthorized(false); setLoading(false); }
      });
      return ()=>subscription.unsubscribe();
    } catch (e) { setError((e as Error).message); setLoading(false); }
  },[]);
  useEffect(()=> {
    if (!supabaseBillingEnabled || !userId) return;
    let cancelled = false;
    setLoading(true);
    billingFetch("/api/v1/session").then(async response=> {
      const data = await response.json();
      if (!cancelled) {
        setAuthorized(response.ok);
        setReadOnly(!data.writesEnabled);
        setError(response.ok ? "" : data.detail || "Access could not be verified.");
      }
    }).catch(()=> {if (!cancelled) {setAuthorized(false);setError("Connection failed. Please try again.");}})
      .finally(()=> {if (!cancelled) setLoading(false);});
    return ()=>{cancelled=true;};
  },[userId]);
  if (!supabaseBillingEnabled) return <>{children}</>;
  const signOut = async ()=> {
    setAuthorized(false); clearBillingSnapshots();
    await billingSupabase().auth.signOut();
  };
  if (authorized) return <>
    {readOnly && <p role="status" className="fixed top-3 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">Preview: changes are disabled.</p>}
    <div className="fixed right-5 bottom-5 z-40 flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
      <a href="/documents" className="text-slate-700 underline">Documents</a>
      <a href="/bridge" className="text-slate-700 underline">SMS phone</a>
      <button onClick={signOut} className="text-slate-700">Sign out</button>
    </div>
    {children}
  </>;
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <form className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm" onSubmit={async e=> {
      e.preventDefault(); if (busy) return; setBusy(true); setError("");
      try {
        const {error} = await billingSupabase().auth.signInWithPassword({email:email.trim(),password});
        if (error) setError("Sign-in failed. Check your email and password.");
        else setPassword("");
      } catch {setError("Connection failed. Please try again.");}
      finally {setBusy(false);}
    }}>
      <h1 className="text-2xl font-semibold text-slate-900">Sign in to SBJ</h1>
      <p className="mt-2 mb-6 text-sm text-slate-600">Access your billing records securely.</p>
      {loading ? <p role="status">Checking access…</p> : <>
        <label className="block text-sm text-slate-700">Email
          <input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 mb-4 w-full rounded-lg border border-slate-300 p-3" />
        </label>
        <label className="block text-sm text-slate-700">Password
          <input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 mb-4 w-full rounded-lg border border-slate-300 p-3" />
        </label>
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-slate-900 p-3 text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
        {userId && <button type="button" onClick={signOut} className="mt-3 text-sm underline">Use another account</button>}
      </>}
    </form>
  </main>;
}
