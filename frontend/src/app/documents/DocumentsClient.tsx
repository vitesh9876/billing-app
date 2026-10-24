"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ShopBrandHeader from "@/components/ShopBrandHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import { billingSupabase } from "@/lib/supabaseBilling";
import { FileText, Upload, ShieldCheck } from "lucide-react";

export default function DocumentsClient() {
  const [files, setFiles] = useState<{ name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const supabase = billingSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase.storage
      .from("billing-documents")
      .list(session.user.id, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) setMessage("Documents could not be loaded.");
    else setFiles(data || []);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-8 text-slate-900">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-10 shadow-sm">
        <ShopBrandHeader />
        
        <Breadcrumbs items={[{ label: "Private Documents" }]} />

        <div className="mb-4">
          <Link href="/" className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline">
            &larr; Back to billing
          </Link>
        </div>

        <h1 className="mt-2 text-2xl md:text-3xl font-semibold">Private documents</h1>
        <p className="mt-1 mb-6 text-xs md:text-sm text-slate-600">
          Upload customer identity PDFs or jewelry valuation photos (up to 10 MB). Saved files are encrypted and isolated from regular bills.
        </p>

        <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center mb-6">
          <Upload size={24} className="mx-auto text-slate-400 mb-2" />
          <label className="cursor-pointer inline-flex items-center gap-2 bg-[#0B1320] text-[#E5C378] text-xs font-semibold px-4 py-2 rounded-xl shadow-xs hover:bg-[#152238] transition-colors">
            <span>Choose PDF or Image</span>
            <input
              type="file"
              className="hidden"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10485760 || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                  setMessage("Choose a PDF, JPG, PNG or WebP file up to 10 MB.");
                  return;
                }
                setBusy(true);
                setMessage("Uploading document securely…");
                try {
                  const supabase = billingSupabase();
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) throw new Error("Sign in again.");
                  const name = file.name.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(-120);
                  const { error } = await supabase.storage
                    .from("billing-documents")
                    .upload(`${session.user.id}/${crypto.randomUUID()}-${name}`, file, {
                      upsert: false,
                      contentType: file.type,
                    });
                  if (error) throw error;
                  setMessage("Document saved successfully.");
                  await load();
                } catch {
                  setMessage("Upload could not be confirmed. Check the list before retrying.");
                } finally {
                  setBusy(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
          <p className="text-[11px] text-slate-400 mt-2">Accepted formats: PDF, WebP, PNG, JPG (Max 10 MB)</p>
        </div>

        {message && <p className="my-4 text-xs font-medium text-amber-800" role="status">{message}</p>}

        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Stored Documents</h2>
        {files.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No private documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs">
            {files.map((file) => (
              <li key={file.name} className="py-3 flex items-center justify-between">
                <span className="font-medium text-slate-800 flex items-center gap-2">
                  <FileText size={14} className="text-amber-600" />
                  {file.name.replace(/^[0-9a-f-]{36}-/, "")}
                </span>
                <button
                  className="text-xs text-amber-700 hover:text-amber-900 underline font-semibold"
                  onClick={async () => {
                    const tab = window.open("about:blank", "_blank");
                    if (tab) tab.opener = null;
                    try {
                      const supabase = billingSupabase();
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) throw new Error("Sign in again.");
                      const { data, error } = await supabase.storage
                        .from("billing-documents")
                        .createSignedUrl(`${session.user.id}/${file.name}`, 60);
                      if (error || !data) throw error;
                      if (tab) tab.location.href = data.signedUrl;
                      else setMessage("Allow popups to open this document.");
                    } catch {
                      tab?.close();
                      setMessage("Document could not be opened.");
                    }
                  }}
                >
                  View Document
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-amber-700">Billing</Link>
            <Link href="/privacy" className="hover:text-amber-700">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-amber-700">Contact</Link>
          </div>
          <span>Encrypted Storage</span>
        </div>
      </div>
    </main>
  );
}
