import type { Metadata } from "next";
import Link from "next/link";
import ShopBrandHeader from "@/components/ShopBrandHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import { ShieldCheck, Lock, PhoneCall, FileText, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Sri Sai Balaji Jewelry & Furniture. Learn how we protect customer records, pledged gold valuations, and automated loan reminders.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Sri Sai Balaji Jewelry & Furniture",
    description:
      "Privacy policy regarding customer records, gold loan pledges, and SMS reminders at Sri Sai Balaji.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  const lastUpdated = "24 October 2026";

  return (
    <main className="min-h-screen bg-[#FAFBFD] p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/90 bg-white p-6 md:p-12 shadow-sm">
        <ShopBrandHeader />
        
        <Breadcrumbs items={[{ label: "Privacy Policy" }]} />

        <div className="mb-8 border-b border-slate-100 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 mb-3">
            <ShieldCheck size={14} className="text-amber-700" />
            <span>Customer Data Protection</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs text-slate-500 font-medium">
            Effective Date &amp; Last Updated: {lastUpdated}
          </p>
        </div>

        <div className="space-y-8 text-xs md:text-sm text-slate-700 leading-relaxed">
          {/* Section 1: Introduction */}
          <section>
            <h2 className="font-serif text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#DFB76C] rounded-full"></span>
              1. Introduction &amp; Scope
            </h2>
            <p>
              Sri Sai Balaji Jewelry &amp; Furniture (&quot;we&quot;, &quot;our&quot;, or &quot;the Shop&quot;) is committed to maintaining the confidentiality, accuracy, and security of your personal and transaction data. This Privacy Policy outlines our practices regarding information collected from customers during retail jewelry purchases, custom silver orders, and pawn loan pledge agreements.
            </p>
          </section>

          {/* Section 2: Information We Collect */}
          <section className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-5">
            <h2 className="font-serif text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-amber-700" />
              2. Information We Collect
            </h2>
            <ul className="space-y-2 list-disc list-inside text-slate-600">
              <li>
                <strong>Customer Identifiers:</strong> Name, 10-digit mobile number, residential address, mandal, and father&apos;s or husband&apos;s name.
              </li>
              <li>
                <strong>Statutory Identification:</strong> Official government identity proof numbers (e.g., Aadhaar, Voter ID) required by pawn-broking compliance and legal regulations.
              </li>
              <li>
                <strong>Pledged Collateral Details:</strong> Item descriptions, quantity, gross weight, net weight, purity yield assessment, and pledged loan valuations.
              </li>
              <li>
                <strong>Financial Records:</strong> Loan issuance date, maturity/due date, principal amount, interest accrual, partial interest payments, and clearance records.
              </li>
            </ul>
          </section>

          {/* Section 3: Use of Information */}
          <section>
            <h2 className="font-serif text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#DFB76C] rounded-full"></span>
              3. How Your Information Is Used
            </h2>
            <p className="mb-3">
              We collect and process customer records solely for legitimate business operations and legal compliance:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Generating legal retail sales invoices, estimate slips, and pawn loan receipts.</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Tracking loan repayment schedules, partial interest settlements, and safe custody.</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Dispatching automated SMS notices for transaction acknowledgments and upcoming loan expiries.</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Fulfilling statutory accounting, audit, and tax reporting requirements.</span>
              </div>
            </div>
          </section>

          {/* Section 4: Automated SMS Communications */}
          <section className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-5">
            <h2 className="font-serif text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <PhoneCall size={18} className="text-amber-700" />
              4. SMS Notifications &amp; Alerts
            </h2>
            <p className="text-slate-700 mb-2">
              Customers who provide their mobile number agree to receive operational text messages regarding:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Immediate thank-you and receipt confirmation upon taking a loan or making a purchase.</li>
              <li>Advance courtesy reminders 30 days and 7 days prior to loan pledge maturity dates.</li>
              <li>Official interest settlement and loan redemption acknowledgments.</li>
            </ul>
            <p className="text-[11px] text-slate-500 mt-2">
              We do not send unsolicited third-party promotional marketing messages or sell mobile contact numbers.
            </p>
          </section>

          {/* Section 5: Data Security & Storage */}
          <section>
            <h2 className="font-serif text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Lock size={18} className="text-amber-700" />
              5. Data Security &amp; Confidentiality
            </h2>
            <p>
              Your personal records and pawn transaction receipts are safeguarded using enterprise-grade encrypted connections, restricted operator authentication, and isolated database backups. We never share, trade, or distribute customer details with third-party advertising companies.
            </p>
          </section>

          {/* Section 6: Contact & Redressal */}
          <section className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Questions or Corrections?</h3>
              <p className="text-xs text-slate-500">Contact our shop management for record updates or privacy inquiries.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/contact"
                className="bg-[#0B1320] hover:bg-[#152238] text-[#E5C378] text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Contact Management</span>
              </Link>
              <Link
                href="/"
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Back to Billing
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
