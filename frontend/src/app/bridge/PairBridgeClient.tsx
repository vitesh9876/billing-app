"use client";

import { useState } from "react";
import Link from "next/link";
import ShopBrandHeader from "@/components/ShopBrandHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import { billingFetch } from "@/lib/supabaseBilling";
import { Smartphone, Key, Copy, Check } from "lucide-react";

export default function PairBridgeClient() {
  const [device, setDevice] = useState("");
  const [name, setName] = useState("Shop phone");
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <main className="mx-auto max-w-xl p-6 md:p-8 text-slate-900">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-10 shadow-sm">
        <ShopBrandHeader />
        
        <Breadcrumbs items={[{ label: "Pair SMS Phone" }]} />

        <div className="mb-4">
          <Link href="/" className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline">
            &larr; Back to billing
          </Link>
        </div>

        <h1 className="mt-2 text-2xl md:text-3xl font-semibold">Pair SMS phone</h1>
        <p className="my-3 text-xs md:text-sm text-slate-600">
          Enter the device UUID shown in the SmartShop SMS Bridge Android app. Pairing again replaces the previous device authorization key.
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setKey("");
            setMessage("");
            try {
              const r = await billingFetch("/api/v1/devices/pair", {
                method: "POST",
                body: JSON.stringify({ id: device.trim(), name: name.trim() }),
              });
              const data = await r.json();
              if (!r.ok) throw new Error(data.detail);
              setKey(data.pairingKey);
            } catch (e) {
              setMessage((e as Error).message || "Pairing could not be confirmed.");
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
              Device UUID *
            </label>
            <input
              required
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs outline-none focus:border-[#C5A880] transition-colors"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
              Phone Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#C5A880] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#0B1320] hover:bg-[#152238] px-5 py-3 text-xs font-semibold text-[#E5C378] disabled:opacity-50 shadow-xs cursor-pointer transition-colors"
          >
            {busy ? "Generating Pairing Key…" : "Create Pairing Key"}
          </button>
        </form>

        {key && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs">
            <p className="mb-2 font-medium text-amber-900">
              Paste this key into the SmartShop SMS Bridge app. Keep it private; it is shown only once.
            </p>
            <input
              readOnly
              value={key}
              aria-label="Private device pairing key"
              className="w-full rounded-xl border border-amber-200 bg-white p-2.5 font-mono text-xs select-all outline-none"
            />
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(key);
                  setCopied(true);
                  setMessage("Pairing key copied to clipboard.");
                  setTimeout(() => setCopied(false), 3000);
                } catch {
                  setMessage("Select and copy the key manually.");
                }
              }}
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? "Copied!" : "Copy Key"}</span>
            </button>
          </div>
        )}

        {message && <p role="status" className="mt-4 text-xs font-medium text-slate-600">{message}</p>}

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-amber-700">Billing</Link>
            <Link href="/privacy" className="hover:text-amber-700">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-amber-700">Contact</Link>
          </div>
          <span>SMS Gateway</span>
        </div>
      </div>
    </main>
  );
}
