import type { Metadata } from "next";
import DocumentsClient from "./DocumentsClient";
import SupabaseBillingGate from "@/components/SupabaseBillingGate";

export const metadata: Metadata = {
  title: "Private Documents",
  description: "Secure storage for customer ID proofs and pawn valuation documents.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return (
    <SupabaseBillingGate>
      <DocumentsClient />
    </SupabaseBillingGate>
  );
}
