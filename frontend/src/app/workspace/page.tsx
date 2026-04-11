import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portfolio — Barakfi",
  description:
    "Portfolio workspace is temporarily unavailable while we improve the experience. This route redirects to the home page; it is not intended for search indexing.",
  robots: { index: false, follow: true },
};

export default function WorkspacePage() {
  redirect("/");
}
