"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import pd from "./portfolio-dashboard.module.css";
import { StockLogo } from "@/components/stock-logo";

type HoldingStock = {
  symbol: string;
  name: string;
  price: number;
  sector: string;
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

function formatPct(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

type SortKey = "symbol" | "value" | "pnl" | "pnlPct" | "weight";
type SortDir = "asc" | "desc";

export function PortfolioDashboard({ holdings, screeningStatuses, portfolioName }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const statusMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of screeningStatuses) m.set(s.symbol, s.status);
    return m;
  }, [screeningStatuses]);

  const enriched = useMemo(() => {
    return holdings.map((h) => {
      const invested = h.quantity * h.average_buy_price;
      const currentValue = h.quantity * h.stock.price;
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const status = statusMap.get(h.stock.symbol) || "unknown";
      return { ...h, invested, currentValue, pnl, pnlPct, complianceStatus: status };
    });
  }, [holdings, statusMap]);

  const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
  const totalCurrent = enriched.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const halalCount = enriched.filter((h) => h.complianceStatus === "COMPLIANT").length;
  const nonCompliantCount = enriched.filter((h) => h.complianceStatus === "NON_COMPLIANT").length;
  const reviewCount = enriched.length - halalCount - nonCompliantCount;
  const halalPct = enriched.length > 0 ? Math.round((halalCount / enriched.length) * 100) : 0;

  const halalValue = enriched.filter((h) => h.complianceStatus === "COMPLIANT").reduce((s, h) => s + h.currentValue, 0);
  const nonCompliantValue = enriched.filter((h) => h.complianceStatus === "NON_COMPLIANT").reduce((s, h) => s + h.currentValue, 0);
  const cautionValue = enriched.filter((h) => h.complianceStatus !== "COMPLIANT" && h.complianceStatus !== "NON_COMPLIANT").reduce((s, h) => s + h.currentValue, 0);

  const purificationEstimate = useMemo(() => {
    const nonCompliantHoldings = enriched.filter((h) => h.complianceStatus !== "COMPLIANT");
    const totalNonCompliantDividend = nonCompliantHoldings.reduce((sum, h) => {
      const estimatedDivYield = 0.02;
      return sum + h.currentValue * estimatedDivYield;
    }, 0);
    return Math.round(totalNonCompliantDividend);
  }, [enriched]);

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

  const complianceAlerts = useMemo(() => {
    const alerts: { type: "warning" | "danger"; message: string; symbol: string }[] = [];
    for (const h of enriched) {
      if (h.complianceStatus === "NON_COMPLIANT") {
        alerts.push({ type: "danger", message: `${h.stock.symbol} is Non-Compliant — consider divesting`, symbol: h.stock.symbol });
      }
    }
    if (nonCompliantValue > totalCurrent * 0.2 && totalCurrent > 0) {
      alerts.push({ type: "danger", message: `Over 20% of your portfolio is in non-compliant stocks`, symbol: "" });
    }
    if (halalPct < 50 && enriched.length > 0) {
      alerts.push({ type: "warning", message: `Less than half your holdings are Shariah-compliant`, symbol: "" });
    }
    for (const s of sectorAlloc) {
      if (s.pct > 40) {
        alerts.push({ type: "warning", message: `Heavy concentration (${s.pct.toFixed(0)}%) in ${s.sector}`, symbol: "" });
      }
    }
    return alerts;
  }, [enriched, nonCompliantValue, totalCurrent, halalPct, sectorAlloc]);

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
                    <td className={pd.tdRight}>{formatINR(h.stock.price)}</td>
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

      {/* ── Compliance Monitoring & Purification ── */}
      <div className={pd.mainGrid}>
        {/* Purification Tracker */}
        <div className={pd.sectorPanel}>
          <div className={pd.panelHeader}>
            <div>
              <p className={pd.kicker}>Purification</p>
              <h3 className={pd.panelTitle}>Income to Purify</h3>
            </div>
          </div>
          <div style={{ padding: "0 0 20px" }}>
            {/* Compliance pie */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <svg viewBox="0 0 36 36" width={100} height={100}>
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--line)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--emerald)" strokeWidth="3"
                  strokeDasharray={`${halalPct} ${100 - halalPct}`} strokeDashoffset="25" strokeLinecap="round" />
                {nonCompliantCount > 0 && (
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--red)" strokeWidth="3"
                    strokeDasharray={`${Math.round((nonCompliantCount / enriched.length) * 100)} 100`}
                    strokeDashoffset={`${25 - halalPct}`} strokeLinecap="round" />
                )}
                <text x="18" y="18" textAnchor="middle" dy=".35em" fontSize="8" fontWeight="700" fill="var(--text-primary)">
                  {halalPct}%
                </text>
              </svg>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Halal</div>
                <div style={{ fontWeight: 700, color: "var(--emerald)", fontSize: "0.85rem" }}>{formatINR(halalValue)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Cautious</div>
                <div style={{ fontWeight: 700, color: "var(--gold)", fontSize: "0.85rem" }}>{formatINR(cautionValue)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Flagged</div>
                <div style={{ fontWeight: 700, color: "var(--red)", fontSize: "0.85rem" }}>{formatINR(nonCompliantValue)}</div>
              </div>
            </div>
            <div className={pd.sectionDivider} />
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
                Estimated Annual Purification
              </p>
              <p style={{ fontSize: "1.4rem", fontWeight: 700, color: purificationEstimate > 0 ? "var(--gold)" : "var(--emerald)" }}>
                {formatINR(purificationEstimate)}
              </p>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4 }}>
                Based on ~2% estimated dividend yield on non-compliant holdings
              </p>
              {purificationEstimate > 0 && (
                <Link href="/tools/purification" style={{
                  display: "inline-block", marginTop: 12, padding: "8px 16px",
                  background: "var(--emerald)", color: "#000", borderRadius: "var(--radius-md)",
                  fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
                }}>
                  Calculate Exact Amount
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Compliance Alerts */}
        <div className={pd.holdingsPanel}>
          <div className={pd.panelHeader}>
            <div>
              <p className={pd.kicker}>Monitoring</p>
              <h3 className={pd.panelTitle}>Compliance Alerts</h3>
            </div>
          </div>
          {complianceAlerts.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--emerald)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
              </svg>
              <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>All Clear</p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>No compliance issues detected in your portfolio</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 0 16px" }}>
              {complianceAlerts.map((alert, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  background: alert.type === "danger" ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.08)",
                  border: `1px solid ${alert.type === "danger" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)"}`,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={alert.type === "danger" ? "var(--red)" : "var(--gold)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
                  </svg>
                  <div>
                    <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text-primary)" }}>
                      {alert.message}
                    </p>
                    {alert.symbol && (
                      <Link href={`/stocks/${encodeURIComponent(alert.symbol)}`} style={{ fontSize: "0.75rem", color: "var(--emerald)", textDecoration: "none" }}>
                        View Details &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
