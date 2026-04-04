import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getETFDetail } from "@/lib/api";
import { StockLogo } from "@/components/stock-logo";
import ep from "../../explore-pages.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const dec = decodeURIComponent(symbol);
  return {
    title: `${dec} ETF — Shariah Holdings Screen | Barakfi`,
    description: `Shariah compliance breakdown for ETF ${dec} based on underlying holdings.`,
  };
}

function badgeClass(st: string) {
  if (st === "HALAL") return ep.badgeHalal;
  if (st === "NON_COMPLIANT") return ep.badgeBad;
  return ep.badgeCautious;
}

export default async function ETFDetailPage({ params }: Props) {
  const { symbol } = await params;
  const dec = decodeURIComponent(symbol);
  const data = await getETFDetail(dec);

  if (!data) notFound();

  return (
    <main className="shellPage">
      <div className={ep.shell}>
        <nav style={{ marginBottom: 16, fontSize: "0.82rem" }}>
          <Link href="/etfs" style={{ color: "var(--emerald)" }}>
            ETFs
          </Link>
          <span style={{ color: "var(--text-tertiary)" }}> / </span>
          <span style={{ color: "var(--text-secondary)" }}>{data.symbol}</span>
        </nav>

        <header className={ep.hero} style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <StockLogo symbol={data.symbol} size={52} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 className={ep.title}>{data.name}</h1>
            <p className={ep.subtitle}>
              {data.data_note ||
                `Holdings as of ${data.holdings_as_of || "—"} · source ${data.holdings_source || "—"}`}
            </p>
          </div>
        </header>

        {data.total_holdings_checked > 0 && (
          <div className={ep.statBar}>
            <div className={ep.statChip}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                Halal (weight)
              </span>
              <strong style={{ color: "var(--emerald)" }}>{data.halal_pct ?? "—"}%</strong>
            </div>
            <div className={ep.statChip}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                Cautious
              </span>
              <strong style={{ color: "var(--gold)" }}>{data.cautious_pct ?? "—"}%</strong>
            </div>
            <div className={ep.statChip}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                Non-compliant
              </span>
              <strong style={{ color: "var(--red)" }}>{data.non_compliant_pct ?? "—"}%</strong>
            </div>
            <div className={ep.statChip}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                Overall
              </span>
              <strong>{data.status}</strong>
            </div>
          </div>
        )}

        {data.total_holdings_checked === 0 ? (
          <div className={ep.empty}>
            <h2 className={ep.emptyTitle}>Holdings not loaded</h2>
            <p className={ep.emptyText}>{data.data_note}</p>
          </div>
        ) : (
          <div className={ep.tableWrap}>
            <table className={ep.table}>
              <thead>
                <tr>
                  <th>Holding</th>
                  <th style={{ textAlign: "right" }}>Weight %</th>
                  <th>Screen</th>
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h) => (
                  <tr key={h.symbol}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{h.symbol}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{h.name}</div>
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {h.weight_pct != null ? `${h.weight_pct.toFixed(2)}%` : "—"}
                    </td>
                    <td>
                      <span className={`${ep.statusBadge} ${badgeClass(h.status)}`}>
                        {h.status}
                      </span>
                      {h.mapped && h.underlying_symbol && (
                        <Link
                          href={`/stocks/${encodeURIComponent(h.underlying_symbol)}`}
                          style={{ marginLeft: 8, fontSize: "0.75rem", color: "var(--emerald)" }}
                        >
                          Stock page
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p
          style={{
            marginTop: 24,
            fontSize: "0.78rem",
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
            maxWidth: 720,
          }}
        >
          Informational screening only, not investment advice or a fatwa. ETF holdings lag filings; verify with your
          scholar or advisor.
        </p>
      </div>
    </main>
  );
}
