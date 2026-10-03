"use client";

import dynamic from "next/dynamic";
import SupabaseBillingGate from "@/components/SupabaseBillingGate";

const Dashboard = dynamic(() => import("@/components/Dashboard"), { ssr: false });

export default function Home() {
  return <SupabaseBillingGate><Dashboard /></SupabaseBillingGate>;
}
