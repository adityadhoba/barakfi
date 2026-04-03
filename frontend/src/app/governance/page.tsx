import type { Metadata } from "next";
import { GovernanceShell } from "@/components/governance-shell";

export const metadata: Metadata = {
  title: "Governance — Barakfi",
  description: "Governance and compliance operations: review cases, compliance overrides, and rule management.",
};

export default function GovernancePage() {
  return <GovernanceShell />;
}
