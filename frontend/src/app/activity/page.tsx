import type { Metadata } from "next";
import ActivityLog from "./ActivityLog";
import SupabaseBillingGate from "@/components/SupabaseBillingGate";

export const metadata: Metadata = {
  title: "Activity Log",
  description: "View account sign-ins, audit logs, and recorded changes to billing records.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return (
    <SupabaseBillingGate>
      <ActivityLog />
    </SupabaseBillingGate>
  );
}
