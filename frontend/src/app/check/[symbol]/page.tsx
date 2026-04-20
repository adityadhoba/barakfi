import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Legacy URL: /check/SYMBOL — redirect directly to the canonical stock page.
// Previously went via /screening/SYMBOL first, creating a 2-hop chain that
// Googlebot couldn't follow (the /screening page uses a JS-only redirect).
export default async function CheckStockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  permanentRedirect(`/stocks/${encodeURIComponent(symbol.trim().toUpperCase())}`);
}
