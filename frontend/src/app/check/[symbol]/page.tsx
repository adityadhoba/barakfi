import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CheckStockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  redirect(`/screening/${encodeURIComponent(symbol)}`);
}
