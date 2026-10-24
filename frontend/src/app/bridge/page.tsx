import type { Metadata } from "next";
import PairBridgeClient from "./PairBridgeClient";
import SupabaseBillingGate from "@/components/SupabaseBillingGate";

export const metadata: Metadata = {
  title: "Pair SMS Bridge",
  description: "Pair dedicated Android phone device for automated customer SMS reminders.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return (
    <SupabaseBillingGate>
      <PairBridgeClient />
    </SupabaseBillingGate>
  );
}
