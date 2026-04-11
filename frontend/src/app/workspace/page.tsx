import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portfolio — Barakfi",
  description: "Portfolio workspace is temporarily unavailable while we improve the experience.",
};

export default function WorkspacePage() {
  redirect("/");
}
