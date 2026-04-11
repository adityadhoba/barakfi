import type { Metadata } from "next";
import { GovernanceShell } from "@/components/governance-shell";

export const metadata: Metadata = {
  title: "Governance — Barakfi",
  description:
    "Internal governance console for BarakFi operators: compliance review cases, overrides, and support workflows — restricted authenticated access only; not a consumer marketing or educational page for search engines.",
  robots: { index: false, follow: true },
};

export default function GovernancePage() {
  return <GovernanceShell />;
}
