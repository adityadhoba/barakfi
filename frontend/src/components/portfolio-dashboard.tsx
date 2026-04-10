"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import pd from "./portfolio-dashboard.module.css";
import { StockLogo } from "@/components/stock-logo";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { formatMoney, resolveDisplayCurrency } from "@/lib/currency-format";

type HoldingStock = {
  symbol: string;
  name: string;
  price: number;
  sector: string;
  exchange?: string;
  currency?: string;
};

type Holding = {
  id: number;
  quantity: number;
  average_buy_price: number;
  target_allocation_pct: number;
  thesis: string;
  stock: HoldingStock;
};

type ScreeningStatus = {
  symbol: string;
  status: string;
};

type Props = {
  holdings: Holding[];
  screeningStatuses: ScreeningStatus[];
  portfolioName: string;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ltpForHolding(
  h: Holding,
  quotes: Record<string, { last_price: number | null }>,
): number {
  const q = quotes[h.stock.symbol]?.last_price;
  if (q != null && q > 0) return q;
  return h.stock.price;
}

function formatPct(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

type SortKey = "symbol" | "value" | "pnl" | "pnlPct" | "weight";
type SortDir = "asc" | "desc";

export function PortfolioDashboard({ holdings, screeningStatuses, portfolioName }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const symbols = useMemo(() => holdings.map((h) => h.stock.symbol), [holdings]);
  const exchangeBySymbol = useMemo(
    () =>
      Object.fromEntries(
        holdings.map((h) => [
          h.stock.symbol,
          exchangeForBatchQuote(h.stock.exchange, h.stock.currency),
        ]),
      ),
    [holdings],
  );
  const quotes = useBatchQuotes(symbols, exchangeBySymbol);

  const statusMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of screeningStatuses) m.set(s.symbol, s.status);
    return m;
  }, [screeningStatuses]);

  const enriched = useMemo(() => {
    return holdings.map((h) => {
      const invested = h.quantity * h.average_buy_price;
      const ltp = ltpForHolding(h, quotes);
      const currentValue = h.quantity * ltp;
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const status = statusMap.get(h.stock.symbol) || "unknown";
      return { ...h, invested, currentValue, pnl, pnlPct, complianceStatus: status, ltp };
    });
  }, [holdings, statusMap, quotes]);

  const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
  const totalCurrent = enriched.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const halalCount = enriched.filter((h) => h.complianceStatus === "COMPLIANT").length;
  const nonCompliantCount = enriched.filter((h) => h.complianceStatus === "NON_COMPLIANT").length;
  const reviewCount = enriched.length - halalCount - nonCompliantCount;

  // Sector allocation
  const sectorAlloc = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of enriched) {
      map.set(h.stock.sector, (map.get(h.stock.sector) || 0) + h.currentValue);
    }
    return [...map.entries()]
      .map(([sector, value]) => ({
        sector,
        value,
        pct: totalCurrent > 0 ? (value / totalCurrent) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [enriched, totalCurrent]);

  // Diversification score (0–100) using Herfindahl-Hirschman Index
  const diversificationScore = useMemo(() => {
    if (enriched.length <= 1) return 0;
    const weights = enriched.map((h) => (totalCurrent > 0 ? h.currentValue / totalCurrent : 0));
    const hhi = weights.reduce((sum, w) => sum + w * w, 0);
    const minHHI = 1 / enriched.length;
    const maxHHI = 1;
    const normalized = maxHHI === minHHI ? 100 : ((maxHHI - hhi) / (maxHHI - minHHI)) * 100;
    const sectorBonus = Math.min(sectorAlloc.length * 5, 20);
    return Math.min(100, Math.round(normalized + sectorBonus));
  }, [enriched, totalCurrent, sectorAlloc.length]);

  // Sorted holdings
  const sorted = useMemo(() => {
    const arr = [...enriched];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "symbol": cmp = a.stock.symbol.localeCompare(b.stock.symbol); break;
        case "value": cmp = a.currentValue - b.currentValue; break;
        case "pnl": cmp = a.pnl - b.pnl; break;
        case "pnlPct": cmp = a.pnlPct - b.pnlPct; break;
        case "weight": cmp = a.currentValue - b.currentValue; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [enriched, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sectorColors = [
    "var(--emerald)", "#3b82f6", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
    "#6366f1", "#84cc16",
  ];

  if (holdings.length === 0) return null;

  return (
    <div className={pd.dashboard}>
      {/* ── Summary Cards ── */}
      <div className={pd.summaryRow}>
        <div className={pd.summaryCard}>
          <span className={pd.summaryLabel}>Total Invested</span>
          <strong className={pd.summaryValue}>{formatINR(totalInvested)}</strong>
        </div>
        <div className={pd.summaryCard}>
          <span className={pd.summaryLabel}>Current Value</span>
          <strong className={pd.summaryValue}>{formatINR(totalCurrent)}</strong>
        </div>
        <div className={pd.summaryCard}>
          <span className={pd.summaryLabel}>Total P&L</span>
          <strong className={`${pd.summaryValue} ${totalPnl >= 0 ? pd.positive : pd.negative}`}>
            {formatINR(totalPnl)}
            <span className={pd.pnlPctBadge}>{formatPct(totalPnlPct)}</span>
          </strong>
        </div>
        <div className={pd.summaryCard}>
          <span className={pd.summaryLabel}>Compliance</span>
          <div className={pd.complianceMini}>
            <span className={pd.compGreen}>{halalCount} Halal</span>
            {nonCompliantCount > 0 && <span className={pd.compRed}>{nonCompliantCount} Flagged</span>}
            {reviewCount > 0 && <span className={pd.compYellow}>{reviewCount} Review</span>}
          </div>
        </div>
      </div>

      {/* ── Two-column: Holdings Table + Sector Allocation ── */}
      <div className={pd.mainGrid}>
        {/* Holdings Table */}
        <div className={pd.holdingsPanel}>
          <div className={pd.panelHeader}>
            <div>
              <p className={pd.kicker}>Holdings</p>
              <h3 className={pd.panelTitle}>{portfolioName} &middot; {holdings.length} stocks</h3>
            </div>
            <Link className={pd.addBtn} href="/screener">+ Add stocks</Link>
          </div>

          <div className={pd.tableWrap}>
            <table className={pd.table}>
              <thead>
                <tr>
                  <th className={pd.thLeft}>
                    <button className={pd.sortBtn} onClick={() => toggleSort("symbol")}>
                      Stock {sortKey === "symbol" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                    </button>
                  </th>
                  <th className={pd.thRight}>Qty</th>
                  <th className={pd.thRight}>Avg Cost</th>
                  <th className={pd.thRight}>LTP</th>
                  <th className={pd.thRight}>
                    <button className={pd.sortBtn} onClick={() => toggleSort("value")}>
                      Value {sortKey === "value" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                    </button>
                  </th>
                  <th className={pd.thRight}>
                    <button className={pd.sortBtn} onClick={() => toggleSort("pnl")}>
                      P&L {sortKey === "pnl" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                    </button>
                  </th>
                  <th className={pd.thRight}>
                    <button className={pd.sortBtn} onClick={() => toggleSort("pnlPct")}>
                      P&L % {sortKey === "pnlPct" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                    </button>
                  </th>
                  <th className={pd.thCenter}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h) => (
                  <tr key={h.id} className={pd.row}>
                    <td className={pd.tdStock}>
                      <Link href={`/stocks/${encodeURIComponent(h.stock.symbol)}`} className={pd.stockLink}>
                        <StockLogo symbol={h.stock.symbol} size={28} status={h.complianceStatus} />
                        <div className={pd.stockInfo}>
                          <strong>{h.stock.symbol}</strong>
                          <span className={pd.stockName}>{h.stock.name}</span>
                        </div>
                      </Link>
                    </td>
                    <td className={pd.tdRight}>{h.quantity}</td>
                    <td className={pd.tdRight}>{formatINR(h.average_buy_price)}</td>
                    <td className={pd.tdRight}>
                      {formatMoney(h.ltp, resolveDisplayCurrency(h.stock.exchange, h.stock.currency))}
                    </td>
                    <td className={pd.tdRight}>{formatINR(h.currentValue)}</td>
                    <td className={`${pd.tdRight} ${h.pnl >= 0 ? pd.positive : pd.negative}`}>
                      {formatINR(h.pnl)}
                    </td>
                    <td className={`${pd.tdRight} ${h.pnlPct >= 0 ? pd.positive : pd.negative}`}>
                      {formatPct(h.pnlPct)}
                    </td>
                    <td className={pd.tdCenter}>
                      <span
                        className={
                          h.complianceStatus === "COMPLIANT"
                            ? pd.statusHalal
                            : h.complianceStatus === "NON_COMPLIANT"
                              ? pd.statusNonCompliant
                              : pd.statusReview
                        }
                      >
                        {h.complianceStatus === "COMPLIANT"
                          ? "Halal"
                          : h.complianceStatus === "NON_COMPLIANT"
                            ? "Non-Compliant"
                            : "Review"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={pd.footRow}>
                  <td className={pd.tdStock}><strong>Total</strong></td>
                  <td className={pd.tdRight}></td>
                  <td className={pd.tdRight}></td>
                  <td className={pd.tdRight}></td>
                  <td className={pd.tdRight}><strong>{formatINR(totalCurrent)}</strong></td>
                  <td className={`${pd.tdRight} ${totalPnl >= 0 ? pd.positive : pd.negative}`}>
                    <strong>{formatINR(totalPnl)}</strong>
                  </td>
                  <td className={`${pd.tdRight} ${totalPnlPct >= 0 ? pd.positive : pd.negative}`}>
                    <strong>{formatPct(totalPnlPct)}</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sector Allocation + Diversification */}
        <div className={pd.sectorPanel}>
          {/* Diversification Score Gauge */}
          <div className={pd.diversificationGauge}>
            <div className={pd.gaugeVisual}>
              <svg viewBox="0 0 36 36" className={pd.gaugeSvg} role="img" aria-label={`Diversification score: ${diversificationScore}`}>
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={diversificationScore >= 70 ? "var(--emerald)" : diversificationScore >= 40 ? "var(--gold)" : "var(--red)"}
                  strokeWidth="3"
                  strokeDasharray={`${diversificationScore}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className={pd.gaugeNumber}>{diversificationScore}</span>
            </div>
            <div className={pd.gaugeInfo}>
              <p className={pd.kicker}>Diversification</p>
              <h3 className={pd.panelTitle}>
                {diversificationScore >= 70 ? "Well Diversified" : diversificationScore >= 40 ? "Moderate" : "Concentrated"}
              </h3>
              <p className={pd.gaugeHint}>
                {sectorAlloc.length} sector{sectorAlloc.length !== 1 ? "s" : ""} &middot; {enriched.length} stock{enriched.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className={pd.sectionDivider} />

          <div className={pd.panelHeader}>
            <div>
              <p className={pd.kicker}>Allocation</p>
              <h3 className={pd.panelTitle}>By Sector</h3>
            </div>
          </div>

          {/* Donut-style sector bar */}
          <div className={pd.sectorDonut}>
            <div className={pd.sectorDonutBar}>
              {sectorAlloc.map((s, i) => (
                <div
                  key={s.sector}
                  className={pd.sectorDonutSegment}
                  style={{
                    width: `${Math.max(s.pct, 3)}%`,
                    background: sectorColors[i % sectorColors.length],
                  }}
                  title={`${s.sector}: ${s.pct.toFixed(1)}%`}
                />
              ))}
            </div>
          </div>

          <div className={pd.sectorBarStack}>
            {sectorAlloc.map((s, i) => (
              <div key={s.sector} className={pd.sectorRow}>
                <div className={pd.sectorInfo}>
                  <span
                    className={pd.sectorDot}
                    style={{ background: sectorColors[i % sectorColors.length] }}
                  />
                  <span className={pd.sectorName}>{s.sector}</span>
                </div>
                <div className={pd.sectorBarTrack}>
                  <div
                    className={pd.sectorBarFill}
                    style={{
                      width: `${Math.max(s.pct, 2)}%`,
                      background: sectorColors[i % sectorColors.length],
                    }}
                  />
                </div>
                <span className={pd.sectorPct}>{s.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {/* Top/Bottom performers */}
          {enriched.length >= 3 && (
            <div className={pd.performersSection}>
              <p className={pd.performerTitle}>Top Performer</p>
              {(() => {
                const top = [...enriched].sort((a, b) => b.pnlPct - a.pnlPct)[0];
                return (
                  <div className={pd.performerCard}>
                    <div>
                      <strong>{top.stock.symbol}</strong>
                      <span className={pd.performerSub}>{top.stock.sector}</span>
                    </div>
                    <span className={`${pd.performerPnl} ${pd.positive}`}>{formatPct(top.pnlPct)}</span>
                  </div>
                );
              })()}
              <p className={pd.performerTitle} style={{ marginTop: 12 }}>Bottom Performer</p>
              {(() => {
                const bottom = [...enriched].sort((a, b) => a.pnlPct - b.pnlPct)[0];
                return (
                  <div className={pd.performerCard}>
                    <div>
                      <strong>{bottom.stock.symbol}</strong>
                      <span className={pd.performerSub}>{bottom.stock.sector}</span>
                    </div>
                    <span className={`${pd.performerPnl} ${bottom.pnlPct >= 0 ? pd.positive : pd.negative}`}>
                      {formatPct(bottom.pnlPct)}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
