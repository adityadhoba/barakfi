import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { BrokerOAuthBanner } from "@/components/broker-oauth-banner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portfolio — Barakfi",
  description:
    "Track your halal investments, manage your watchlist, and monitor your portfolio — all in one place.",
};

export default function WorkspacePage() {
  return (
    <>
      <Suspense fallback={null}>
        <BrokerOAuthBanner />
      </Suspense>
      <WorkspaceShell />
    </>
  );
}
