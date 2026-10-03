"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { billingFetch, billingSupabase, clearBillingSnapshots } from "@/lib/supabaseBilling";

const inputClass="mt-1 mb-4 w-full rounded-lg border border-slate-300 p-3";

export default function SupabaseBillingGate({children}:{children:ReactNode}) {
  const [userId,setUserId] = useState<string | null>(null);
  const [authorized,setAuthorized] = useState(false);
  const [loading,setLoading] = useState(true);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [confirmPassword,setConfirmPassword] = useState("");
  const [secretCode,setSecretCode] = useState("");
  const [accountMode,setAccountMode] = useState<"signin"|"signup">("signin");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [readOnly,setReadOnly] = useState(true);
  const [showPasswordForm,setShowPasswordForm] = useState(false);
  const [newPassword,setNewPassword] = useState("");
  const [confirmNewPassword,setConfirmNewPassword] = useState("");
  const [passwordMessage,setPasswordMessage] = useState("");

  useEffect(()=> {
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
    if (!userId) return;
    let cancelled = false;
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

  const signOut = async ()=> {
    setAuthorized(false); clearBillingSnapshots();
    await billingSupabase().auth.signOut();
  };

  useEffect(()=> {
    const openPasswordSettings=()=>{setPasswordMessage("");setShowPasswordForm(true);};
    const signOutFromSettings=()=>{void signOut();};
    window.addEventListener("sbj:change-password",openPasswordSettings);
    window.addEventListener("sbj:sign-out",signOutFromSettings);
    return ()=>{
      window.removeEventListener("sbj:change-password",openPasswordSettings);
      window.removeEventListener("sbj:sign-out",signOutFromSettings);
    };
  },[]);

  const submitAccount = async (event:FormEvent<HTMLFormElement>)=> {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      const supabase=billingSupabase();
      if (accountMode==="signin") {
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if (error) setError("Sign-in failed. Check your email and password.");
        else setPassword("");
        return;
      }
      if (password.length<10) {setError("Choose a password with at least 10 characters.");return;}
      if (password!==confirmPassword) {setError("The passwords do not match.");return;}
      const base=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,"");
      const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!base || !publishableKey) throw new Error("Supabase connection is not configured.");
      const response=await fetch(`${base}/functions/v1/billing-api/auth/register`,{
        method:"POST",headers:{"Content-Type":"application/json",apikey:publishableKey,"x-region":"ap-south-1"},
        body:JSON.stringify({email:email.trim(),password,secretCode}),cache:"no-store",
      });
      const result=await response.json();
      if (!response.ok) {setError(result.detail || "Account could not be created.");return;}
      const {error:signInError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
      setPassword("");setConfirmPassword("");setSecretCode("");
      if (signInError) {
        setAccountMode("signin");
        setError("Account created. Sign in with your email and password.");
      }
    } catch {setError("Connection failed. Please try again.");}
    finally {setBusy(false);}
  };

  const submitPasswordChange=async(event:FormEvent<HTMLFormElement>)=> {
    event.preventDefault();if(busy)return;setError("");setPasswordMessage("");
    if(newPassword.length<10){setPasswordMessage("Choose a password with at least 10 characters.");return;}
    if(newPassword!==confirmNewPassword){setPasswordMessage("The passwords do not match.");return;}
    setBusy(true);
    try {
      const {error}=await billingSupabase().auth.updateUser({password:newPassword});
      if(error){setPasswordMessage("Password could not be changed. Please try again.");return;}
      setNewPassword("");setConfirmNewPassword("");
      const audit=await billingFetch("/api/v1/password-changed",{method:"POST",body:JSON.stringify({})});
      if(!audit.ok){setPasswordMessage("Your password changed, but the activity entry could not be saved. Tell the shop owner.");return;}
      setPasswordMessage("Password changed successfully.");
    } catch {setPasswordMessage("Your password change could not be confirmed. Sign in again to check.");}
    finally {setBusy(false);}
  };

  if (authorized) return <>
    {readOnly && <p role="status" className="fixed top-3 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">Preview: changes are disabled.</p>}
    {showPasswordForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form onSubmit={submitPasswordChange} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">Change password</h2>
        <p className="my-3 text-sm text-slate-600">Use at least 10 characters. Your current password will stay unchanged unless the update succeeds.</p>
        <label className="block text-sm text-slate-700">New password
          <input type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm text-slate-700">Confirm new password
          <input type="password" autoComplete="new-password" minLength={10} required value={confirmNewPassword} onChange={e=>setConfirmNewPassword(e.target.value)} className={inputClass} />
        </label>
        {passwordMessage && <p role="status" className="mb-4 text-sm text-slate-700">{passwordMessage}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={()=>setShowPasswordForm(false)} className="rounded-lg border px-4 py-2">Close</button>
          <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy?"Saving…":"Save password"}</button>
        </div>
      </form>
    </div>}
    {children}
  </>;

  return <main className="sbj-login-screen flex items-center justify-center">
    <form className="sbj-login-card w-full max-w-md bg-white p-8" onSubmit={submitAccount} autoComplete="on">
      <div className="mb-6 flex justify-center">
        <img src="/shop-logo-horizontal.png" alt="Sri Sai Balaji Jewelry and Furniture" className="sbj-login-logo h-20 w-full object-contain" />
      </div>
      <h1 className="font-serif text-3xl font-bold text-slate-900">{accountMode==="signin"?"Welcome back":"Create your account"}</h1>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-slate-600">{accountMode==="signin"?"Sign in to securely access your shop records.":"Create an account using the shop’s private access code."}</p>
      {loading ? <p role="status">Checking access…</p> : <>
        <label className="block text-sm text-slate-700">Email
          <input id="billing-email" name="email" type="email" autoComplete="username" inputMode="email" required value={email} onChange={e=>setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm text-slate-700">Password
          <input id="billing-password" name="password" type="password" autoComplete={accountMode==="signin"?"current-password":"new-password"} minLength={accountMode==="signup"?10:undefined} required value={password} onChange={e=>setPassword(e.target.value)} className={inputClass} />
        </label>
        {accountMode==="signup" && <>
          <label className="block text-sm text-slate-700">Confirm password
            <input type="password" autoComplete="new-password" minLength={10} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm text-slate-700">Shop secret code
            <input type="password" autoComplete="off" required value={secretCode} onChange={e=>setSecretCode(e.target.value)} className={inputClass} />
          </label>
        </>}
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-slate-900 p-3 text-white disabled:opacity-50">{busy?(accountMode==="signup"?"Creating account…":"Signing in…"):accountMode==="signup"?"Create account":"Sign in"}</button>
        <button type="button" onClick={()=>{setError("");setPassword("");setConfirmPassword("");setSecretCode("");setAccountMode(accountMode==="signin"?"signup":"signin");}} className="mt-4 w-full text-sm text-slate-700 underline">
          {accountMode==="signin"?"Create account with shop secret code":"Already have an account? Sign in"}
        </button>
        {userId && <button type="button" onClick={signOut} className="mt-3 w-full text-sm underline">Use another account</button>}
      </>}
    </form>
  </main>;
}
