"use client";

import dynamic from "next/dynamic";
import { TopbarAuthFallback } from "@/components/topbar-auth-fallback";

const TopbarAuthLazy = dynamic(
  () => import("@/components/topbar-auth").then((m) => m.TopbarAuth),
  { ssr: false, loading: () => <TopbarAuthFallback /> }
);

export function TopbarAuthDeferred() {
  return <TopbarAuthLazy />;
}
