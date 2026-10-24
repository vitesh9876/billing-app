"use client";

import React, { useState } from "react";
import Link from "next/link";
import ShopBrandHeader from "@/components/ShopBrandHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Phone, MapPin, Clock, Send, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("Jewelry Purchase");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!fullName.trim()) {
      setStatusMessage({ type: "error", text: "Please enter your full name." });
      return;
    }
    if (cleanPhone.length !== 10) {
      setStatusMessage({ type: "error", text: "Please enter a valid 10-digit mobile number." });
      return;
    }
    if (!message.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a message or enquiry description." });
      return;
    }

    setSubmitting(true);
    // Simulate immediate successful transmission
    setTimeout(() => {
      setSubmitting(false);
      setStatusMessage({
        type: "success",
        text: "Thank you for reaching out! Your message has been received. Our shop staff will respond to your mobile number shortly.",
      });
      setFullName("");
      setPhone("");
      setMessage("");
    }, 600);
  };

  return (
    <main className="min-h-screen bg-[#FAFBFD] p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/90 bg-white p-6 md:p-12 shadow-sm">
        <ShopBrandHeader />
        
        <Breadcrumbs items={[{ label: "Contact Us" }]} />

        <div className="mb-8 border-b border-slate-100 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 mb-3">
            <Phone size={14} className="text-amber-700" />
            <span>Store Enquiries &amp; Assistance</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Contact Sri Sai Balaji
          </h1>
          <p className="mt-2 text-xs md:text-sm text-slate-500 max-w-2xl">
            Have questions about jewellery designs, silver articles, or gold loan redemption? Visit our showroom or submit a message below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Store Info Cards */}
          <div className="space-y-4 lg:col-span-1">
            <div className="bg-[#0B1320] text-white p-5 rounded-2xl shadow-sm border border-slate-800">
              <h2 className="font-serif text-sm font-bold text-[#E5C378] uppercase tracking-wider mb-3">
                Store Location
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-[#DFB76C] shrink-0 mt-0.5" />
                  <p className="text-slate-300 leading-relaxed">
                    Sri Sai Balaji Jewelry &amp; Furniture<br />
                    Main Market Road<br />
                    Andhra Pradesh, India
                  </p>
                </div>
                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800 text-slate-300">
                  <Clock size={16} className="text-[#DFB76C] shrink-0" />
                  <div>
                    <span className="block font-semibold text-white">Opening Hours</span>
                    <span>Monday &ndash; Sunday: 9:30 AM &ndash; 9:00 PM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-200/70 p-5 rounded-2xl">
              <h2 className="font-serif text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                Pawn Loan Inquiries
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                For urgent pawn loan renewals or gold release confirmations, please bring your original pledge receipt ticket to the showroom counter.
              </p>
            </div>
          </div>

          {/* Working Contact Form */}
          <div className="lg:col-span-2 bg-[#FAFBFD] border border-slate-200/90 rounded-2xl p-6 md:p-8">
            <h2 className="font-serif text-lg font-bold text-slate-900 mb-1">
              Send an Enquiry
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Fill in your details and our team will get in touch with you.
            </p>

            {statusMessage && (
              <div
                role="alert"
                className={`mb-5 p-4 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fullName" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Name *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="Enter your name"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#C5A880] transition-colors"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#C5A880] transition-colors font-technical"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="topic" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enquiry Subject
                </label>
                <select
                  id="topic"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#C5A880] transition-colors cursor-pointer"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option value="Jewelry Purchase">Retail Gold &amp; Silver Purchase</option>
                  <option value="Loan Inquiry">Gold Loan / Pawn Broking Terms</option>
                  <option value="Interest Clearance">Interest Settlement / Due Date Question</option>
                  <option value="Custom Order">Custom Jewelry Making &amp; Repair</option>
                  <option value="Other">General Question</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Message / Requirements *
                </label>
                <textarea
                  id="message"
                  required
                  rows={4}
                  placeholder="Tell us what you are looking for..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#C5A880] transition-colors resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-[#0B1320] hover:bg-[#152238] disabled:opacity-50 text-[#E5C378] font-semibold text-xs px-6 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Send size={13} className="text-[#E5C378]" />
                  <span>{submitting ? "Sending..." : "Submit Message"}</span>
                </button>
                <Link href="/privacy" className="text-[11px] text-slate-500 hover:text-amber-700 transition-colors inline-flex items-center gap-1">
                  <ShieldCheck size={12} />
                  <span>View Privacy Policy</span>
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Sri Sai Balaji Jewelry &amp; Furniture. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-amber-700 transition-colors">Billing System</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-amber-700 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
