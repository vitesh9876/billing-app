"use client";

import dynamic from "next/dynamic";
import SupabaseBillingGate from "@/components/SupabaseBillingGate";
import BrandLoader from "@/components/BrandLoader";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
  loading: () => <BrandLoader size="fullscreen" message="Opening Sri Sai Balaji Billing & Loans..." />,
});

export default function Home() {
  return (
    <SupabaseBillingGate>
      <Dashboard />
    </SupabaseBillingGate>
  );
}
