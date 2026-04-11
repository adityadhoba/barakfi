import type { Metadata } from "next";
import Link from "next/link";
import { getETFs } from "@/lib/api";
import { StockLogo } from "@/components/stock-logo";
import ep from "../explore-pages.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Halal ETFs — Shariah Compliant Exchange-Traded Funds | Barakfi",
  description:
    "Screen ETFs for Shariah compliance using disclosed holdings. See halal-weight estimates and drill into each fund.",
  keywords: [
    "halal etf",
    "shariah compliant etf",
    "islamic etf",
    "halal index fund",
    "shariah etf screening",
    "muslim etf investing",
  ],
  alternates: { canonical: "https://barakfi.in/etfs" },
};

function statusColor(st?: string | null) {
  if (st === "HALAL") return "var(--emerald)";
  if (st === "NON_COMPLIANT") return "var(--red)";
  return "var(--gold)";
}

export default async function ETFsPage() {
  const etfs = await getETFs();

  return (
    <main className="shellPage">
      <div className={ep.shell}>
        <header className={ep.hero}>
          <h1 className={ep.title}>Halal ETFs</h1>
          <p className={ep.subtitle}>
            We analyse disclosed ETF holdings and map them to our Shariah screening engine. Weights drive the halal
            percentage — sync holdings with{" "}
            <code style={{ fontSize: "0.85em" }}>python -m app.scripts.sync_etf_holdings</code> after fetching ETF
            symbols. Optional: set <code style={{ fontSize: "0.85em" }}>MARKET_DATA_API_KEY</code> for FMP fallback.
          </p>
        </header>

        {etfs.length === 0 ? (
          <div className={ep.empty}>
            <h2 className={ep.emptyTitle}>No ETFs in the database yet</h2>
            <p className={ep.emptyText}>
              Run <code>fetch_real_data.py</code> (US list includes SPY, QQQ, VTI) or mark funds with{" "}
              <code>is_etf</code>, then sync holdings.
            </p>
          </div>
        ) : (
          <div className={ep.grid}>
            {etfs.map((etf) => (
              <Link
                key={`${etf.exchange}-${etf.symbol}`}
                href={`/etfs/${encodeURIComponent(etf.symbol)}`}
                className={ep.card}
              >
                <StockLogo symbol={etf.symbol} size={40} />
                <div className={ep.cardMeta}>
                  <div className={ep.cardTitle}>{etf.symbol}</div>
                  <div className={ep.cardSub}>{etf.name}</div>
                </div>
                <div className={ep.badgeRow}>
                  <span className={ep.cardSub}>{etf.exchange}</span>
                  {etf.holdings_count != null && etf.holdings_count > 0 && etf.halal_pct != null && (
                    <span className={ep.pct} style={{ color: statusColor(etf.status) }}>
                      {etf.halal_pct}% halal
                    </span>
                  )}
                  {(!etf.holdings_count || etf.holdings_count === 0) && (
                    <span className={ep.pct} style={{ color: "var(--text-tertiary)" }}>
                      Sync holdings
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
