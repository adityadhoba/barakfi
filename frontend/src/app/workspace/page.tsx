import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";

export const metadata: Metadata = {
  title: "Portfolio — Barakfi",
  description: "Track your halal investments, manage your watchlist, and monitor your portfolio — all in one place.",
};

export default function WorkspacePage() {
  return <WorkspaceShell />;
}
