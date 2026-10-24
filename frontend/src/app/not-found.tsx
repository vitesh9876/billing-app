import Link from "next/link";
import ShopBrandHeader from "@/components/ShopBrandHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import { ArrowLeft, Home, MessageSquare, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Page Not Found (404)",
  description: "The page you are looking for does not exist or has been moved.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FAFBFD] p-4 text-slate-900 md:p-8 flex items-center justify-center">
      <div className="mx-auto max-w-xl w-full rounded-3xl border border-slate-200/90 bg-white p-6 md:p-10 shadow-xl text-center">
        <div className="flex justify-center mb-2">
          <ShopBrandHeader />
        </div>

        <Breadcrumbs
          items={[{ label: "404 Not Found" }]}
          className="justify-center"
        />

        <div className="my-6">
          <span className="font-serif text-6xl md:text-7xl font-extrabold text-[#DFB76C] tracking-tight">
            404
          </span>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900 mt-2">
            Page Not Found
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            The page you requested could not be located. It might have been relocated, renamed, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0B1320] hover:bg-[#152238] text-[#E5C378] font-semibold text-xs px-5 py-3 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Home size={14} />
            <span>Return to Billing</span>
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-5 py-3 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <MessageSquare size={14} className="text-slate-500" />
            <span>Contact Support</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-500">
          <Link href="/privacy" className="hover:text-amber-700 transition-colors inline-flex items-center gap-1">
            <ShieldCheck size={13} />
            <span>Privacy Policy</span>
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-amber-700 transition-colors">
            Help &amp; Inquiries
          </Link>
        </div>
      </div>
    </main>
  );
}
