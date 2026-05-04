import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: "https://barakfi.in/screener" },
};

export default function EtfDetailPage() {
  permanentRedirect("/screener");
}
