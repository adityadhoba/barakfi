import type { Metadata } from "next";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FreshnessDashboard } from "./freshness-dashboard";

export const metadata: Metadata = {
  title: "Data Freshness — Admin | Barakfi",
  description: "Internal data freshness and pipeline health dashboard",
  robots: { index: false, follow: false },
};

export default async function FreshnessPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN ?? "";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">
            Data Freshness Dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            Internal pipeline health, job runs, and data coverage status
          </p>
        </div>
        <FreshnessDashboard serviceToken={serviceToken} />
      </div>
    </div>
  );
}
