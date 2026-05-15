import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import {
  getBulkScreeningResults,
  getComplianceHistory,
  getEquityQuote,
  getMarketIndices,
  getMultiScreeningResult,
  getStocks,
  type EquityQuote,
  type ReportUnlockResult,
} from "@/lib/api";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, parseFastapiFetchError, unwrapBackendEnvelope } from "@/lib/api-base";
import { fetchStockAndScreenForPage, fetchStockMetadataBundle } from "@/lib/stock-detail-fetch";
import { StockDetailError } from "@/components/stock-detail-error";
import { StockFullReportPage } from "@/components/stock-full-report-page";
import { StockPageRouteShell } from "@/components/stock-page-route-shell";
import { screeningUiLabel } from "@/lib/screening-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StockPageUsageState =
  | { kind: "anonymous"; access: null }
  | { kind: "allowed"; access: ReportUnlockResult | null }
  | { kind: "limit_reached"; access: ReportUnlockResult }
  | { kind: "soft_fail"; access: null; message: string };

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
      title: `${sym} Full Breakdown | BarakFi`,
      description: `Detailed Shariah screening report for ${sym}: ratio-level compliance checks, reasons, and market context.`,
      robots: { index: true, follow: true },
    };
  }

  const { stock, statusLabel } = bundle;
  const title = `${stock.name} (${stock.symbol}) Full Breakdown | BarakFi`;
  const description =
    `${stock.name} full BarakFi screening breakdown: current classification ${statusLabel}, debt and income-purity ratios, receivables, cash/IB assets checks, and detailed report context.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}/report` },
    openGraph: {
      title,
      description,
      url: `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}/report`,
      siteName: "BarakFi",
      locale: "en_IN",
      type: "article",
    },
  };
}

async function checkStockPageUsageAccess(
  symbol: string,
  token: string | null,
  actor: { authSubject: string; email: string | null } | null,
): Promise<StockPageUsageState> {
  if (!token || !actor) return { kind: "anonymous", access: null };

  const apiBaseUrl = getPublicApiBaseUrl();
  try {
    const response = await fetch(`${apiBaseUrl}/reports/${encodeURIComponent(symbol)}/unlock`, {
      method: "POST",
      headers: buildBackendHeaders({ token, actor, contentType: true }),
      cache: "no-store",
      body: JSON.stringify({ source: "stock_page_entry" }),
    });

    if (!response.ok) {
      return {
        kind: "soft_fail",
        access: null,
        message: await parseFastapiFetchError(response),
      };
    }

    const body: unknown = await response.json();
    const access = unwrapBackendEnvelope<ReportUnlockResult>(body);
    if (!access || typeof access !== "object" || typeof access.allowed !== "boolean") {
      return {
        kind: "soft_fail",
        access: null,
        message: "Invalid usage response",
      };
    }

    if (!access.allowed) {
      return { kind: "limit_reached", access };
    }

    return { kind: "allowed", access };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Usage service unavailable";
    return { kind: "soft_fail", access: null, message };
  }
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

export default async function StockFullReportRoute({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const authState = await auth();
  if (!authState.userId) {
    const { symbol } = await params;
    const normalizedSymbol = decodeURIComponent(symbol).trim().toUpperCase();
    const redirectPath = `/stocks/${encodeURIComponent(normalizedSymbol)}/report`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`);
  }

  const { symbol } = await params;
  const normalizedSymbol = decodeURIComponent(symbol).trim().toUpperCase();
  if (!normalizedSymbol || normalizedSymbol === "COMPANY" || normalizedSymbol === "SYMBOL") {
    notFound();
  }

  const clerkUser = await currentUser();
  const token = await authState.getToken();
  const actor =
    clerkUser && token
      ? { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress || null }
      : null;

  const [detail, allStocks, indices] = await Promise.all([
    fetchStockAndScreenForPage(normalizedSymbol),
    getStocks().catch(() => []),
    getMarketIndices().catch(() => []),
  ]);

  if (detail.kind === "not_found") {
    notFound();
  }
  if (detail.kind === "redirect") {
    redirect(`/stocks/${encodeURIComponent(detail.targetSymbol)}/report`);
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
  const usageState = await checkStockPageUsageAccess(stock.symbol, token, actor);

  if (usageState.kind === "limit_reached") {
    return (
      <StockPageRouteShell breadcrumbSymbol={stock.symbol}>
        <StockDetailError
          symbol={stock.symbol}
          message={usageState.access.message || "You've used all 50 monthly full report credits. Access resets next month."}
        />
      </StockPageRouteShell>
    );
  }

  const [liveQuote, similarScreenings, multiScreening, complianceHistory] = await Promise.all([
    getEquityQuote(stock.symbol, "auto_india", stock.exchange).then(sanitizeEquityQuote).catch(() => null),
    (async () => {
      const sectorPeers = allStocks
        .filter((candidate) => candidate.symbol !== stock.symbol && candidate.sector === stock.sector)
        .sort((a, b) => b.market_cap - a.market_cap)
        .slice(0, 5);
      if (sectorPeers.length === 0) return [];
      return getBulkScreeningResults(sectorPeers.map((peer) => peer.symbol)).catch(() => []);
    })(),
    getMultiScreeningResult(stock.symbol).catch(() => null),
    getComplianceHistory(stock.symbol).catch(() => []),
  ]);

  const sameSector = allStocks
    .filter((candidate) => candidate.symbol !== stock.symbol && candidate.sector === stock.sector)
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, 5);

  const similarStocks = sameSector.map((peer) => ({
    stock: peer,
    screening: similarScreenings.find((result) => result.symbol.toUpperCase() === peer.symbol.toUpperCase()) ?? null,
  }));

  const pageUrl = `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}/report`;
  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${stock.name} (${stock.symbol}) Full Breakdown`,
    description: `Detailed Shariah compliance report for ${stock.name} on ${stock.exchange}: ${screeningUiLabel(screening.status)} with ratio-level analysis and reasons.`,
    url: pageUrl,
    provider: { "@type": "Organization", name: "BarakFi", url: "https://barakfi.in" },
  };

  return (
    <StockPageRouteShell breadcrumbSymbol={stock.symbol}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }} />
      <StockFullReportPage
        stock={stock}
        screening={screening}
        liveQuote={liveQuote}
        indices={indices}
        similarStocks={similarStocks}
        multiScreening={multiScreening}
        complianceHistory={complianceHistory}
      />
    </StockPageRouteShell>
  );
}
