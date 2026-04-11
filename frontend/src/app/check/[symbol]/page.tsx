import type { Metadata } from "next";
import { CheckStockView } from "@/components/check-stock-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol} — Instant Halal status | Halal Stock Checker`,
    description: `Check if ${symbol} is Halal — instant Halal status from Halal Stock Checker.`,
  };
}

export default async function CheckStockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return (
    <main className="shellPage">
      <CheckStockView key={symbol} symbol={symbol} />
    </main>
  );
}
