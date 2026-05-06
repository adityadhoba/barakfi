import type { Metadata } from "next";
import { DM_Serif_Display } from "next/font/google";
import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import {
  getAuthenticatedWatchlist,
  getBulkScreeningResults,
  getEquityQuote,
  getMarketIndices,
  getStocks,
  type EquityQuote,
} from "@/lib/api";
import {
  fetchStockAndScreenForPage,
  fetchStockMetadataBundle,
} from "@/lib/stock-detail-fetch";
import { StockDetailError } from "@/components/stock-detail-error";
import { StockPageHtml } from "@/components/stock-page-html";
import { StockPageRouteShell } from "@/components/stock-page-route-shell";
import { screeningUiLabel } from "@/lib/screening-status";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-stock-serif",
});

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const stocks = await getStocks({ orderBy: "market_cap_desc" });
    return stocks
      .filter((stock) => stock.symbol && stock.exchange === "NSE")
      .map((stock) => ({ symbol: stock.symbol }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const sym = decodeURIComponent(symbol).toUpperCase();
  const bundle = await fetchStockMetadataBundle(sym);
  if (!bundle) {
    return {
      title: `${sym} — Shariah screening`,
      description:
        `See whether ${sym} is Shariah Compliant, Requires Review, or Not Compliant under Shariah financial screening for NSE/BSE-listed Indian equities. BarakFi explains debt, non-permissible income, interest income, and other ratios used in compliance checks.`,
      robots: { index: true, follow: true },
    };
  }

  const { stock, statusLabel } = bundle;
  const title = `Is ${stock.name} Halal? Shariah compliance (${stock.symbol}) | BarakFi`;
  const description =
    `Check halal stock status for ${stock.name} (${stock.symbol}) on ${stock.exchange} using Shariah stock screening: current classification ${statusLabel}, with debt, revenue, interest income, and asset ratios compared to widely used Islamic finance benchmarks. Updated when fundamentals sync runs; educational context only.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}` },
    openGraph: {
      title,
      description,
      url: `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}`,
      siteName: "BarakFi",
      locale: "en_IN",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function sanitizeEquityQuote(raw: EquityQuote | null): EquityQuote | null {
  if (!raw) return null;
  const toNumber = (value: unknown): number | null => {
    if (value == null) return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const lastPrice = toNumber(raw.last_price);
  if (lastPrice == null || lastPrice <= 0) return null;

  return {
    ...raw,
    last_price: lastPrice,
    previous_close: toNumber(raw.previous_close),
    change: toNumber(raw.change),
    change_percent: toNumber(raw.change_percent),
    day_high: toNumber(raw.day_high),
    day_low: toNumber(raw.day_low),
    volume: toNumber(raw.volume),
    week_52_high: toNumber(raw.week_52_high),
    week_52_low: toNumber(raw.week_52_low),
  };
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const normalizedSymbol = decodeURIComponent(symbol).trim().toUpperCase();
  if (!normalizedSymbol || normalizedSymbol === "COMPANY" || normalizedSymbol === "SYMBOL") {
    notFound();
  }

  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();
  const actor =
    clerkUser && token
      ? { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress || null }
      : null;

  const [detail, watchlist, allStocks, indices] = await Promise.all([
    fetchStockAndScreenForPage(normalizedSymbol),
    token ? getAuthenticatedWatchlist(token, actor).catch(() => []) : Promise.resolve([]),
    getStocks().catch(() => []),
    getMarketIndices().catch(() => []),
  ]);

  if (detail.kind === "not_found") {
    notFound();
  }
  if (detail.kind === "redirect") {
    redirect(`/stocks/${encodeURIComponent(detail.targetSymbol)}`);
  }
  if (detail.kind === "legacy_blocked") {
    return (
      <StockPageRouteShell breadcrumbSymbol={detail.stock.symbol}>
        <StockDetailError
          symbol={detail.stock.symbol}
          message={`${detail.stock.name} (${detail.stock.symbol}) is no longer an active screening symbol. ${detail.message}${
            detail.stock.canonical_symbol ? ` Use ${detail.stock.canonical_symbol} for the current listing.` : ""
          }`}
        />
      </StockPageRouteShell>
    );
  }
  if (detail.kind === "error") {
    return (
      <StockPageRouteShell breadcrumbSymbol={normalizedSymbol}>
        <StockDetailError symbol={normalizedSymbol} message={detail.message} />
      </StockPageRouteShell>
    );
  }

  const { stock, screening } = detail;

  const [liveQuote, similarScreenings] = await Promise.all([
    getEquityQuote(stock.symbol, "auto_india", stock.exchange).then(sanitizeEquityQuote).catch(() => null),
    (async () => {
      const sectorPeers = allStocks
        .filter((candidate) => candidate.symbol !== stock.symbol && candidate.sector === stock.sector)
        .sort((a, b) => b.market_cap - a.market_cap)
        .slice(0, 5);
      if (sectorPeers.length === 0) return [];
      return getBulkScreeningResults(sectorPeers.map((peer) => peer.symbol)).catch(() => []);
    })(),
  ]);

  const isInWatchlist = watchlist.some((entry) => entry.stock.symbol === stock.symbol);

  const sameSector = allStocks
    .filter((candidate) => candidate.symbol !== stock.symbol && candidate.sector === stock.sector)
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, 5);

  const similarStocks = sameSector.map((peer) => ({
    stock: peer,
    screening: similarScreenings.find((result) => result.symbol.toUpperCase() === peer.symbol.toUpperCase()) ?? null,
  }));

  const pageUrl = `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}`;
  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${stock.name} (${stock.symbol})`,
    description: `Shariah compliance view for ${stock.name} on ${stock.exchange}: ${screeningUiLabel(screening.status)}. Uses financial ratios and methodology checks.`,
    url: pageUrl,
    brand: { "@type": "Brand", name: "BarakFi" },
    provider: { "@type": "Organization", name: "BarakFi", url: "https://barakfi.in" },
    additionalProperty: [
      { "@type": "PropertyValue", name: "complianceStatus", value: screeningUiLabel(screening.status) },
      { "@type": "PropertyValue", name: "exchange", value: stock.exchange },
      { "@type": "PropertyValue", name: "sector", value: stock.sector },
    ],
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is ${stock.name}'s Shariah compliance status?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `BarakFi currently classifies this listing as ${screeningUiLabel(screening.status)} under its educational screening methodology.`,
        },
      },
      {
        "@type": "Question",
        name: `Why is ${stock.symbol} considered ${screeningUiLabel(screening.status)}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: screening.reasons.length > 0 ? screening.reasons.join(" ") : "No detailed reasons were returned by the screening engine.",
        },
      },
    ],
  };

  return (
    <div className={dmSerif.variable}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <StockPageHtml
        stock={stock}
        screening={screening}
        liveQuote={liveQuote}
        indices={indices}
        similarStocks={similarStocks}
        isInWatchlist={isInWatchlist}
      />
    </div>
  );
}
