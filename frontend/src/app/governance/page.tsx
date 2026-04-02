import type { Metadata } from "next";
import { GovernanceShell } from "@/components/governance-shell";

export const metadata: Metadata = {
  title: "Admin Console — Barakfi",
  description: "Governance operations: review cases, compliance overrides, feature flags, and user management.",
};

export default function GovernancePage() {
  return <GovernanceShell />;
}
