import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Stocks — BarakFi Tools",
  description: "Compare is available inside Tools.",
  alternates: { canonical: "https://barakfi.in/tools?tab=compare" },
  robots: { index: false, follow: false },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ symbols?: string }>;
}) {
  const { symbols: rawSymbols } = await searchParams;
  const nextUrl = rawSymbols?.trim()
    ? `/tools?tab=compare&symbols=${encodeURIComponent(rawSymbols)}`
    : "/tools?tab=compare";
  redirect(nextUrl);
}
