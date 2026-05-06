"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HubRouteShell } from "@/components/hub-route-shell";
import { PurificationCalculator } from "@/components/purification-calculator";
import { ZakatCalculator } from "@/components/zakat-calculator";
import { RequestCoverageForm } from "@/app/request-coverage/request-coverage-form";
import { rankStocksForQuery } from "@/lib/stock-search-rank";
import { screeningUiLabel } from "@/lib/screening-status";
import type { ScreeningResult, Stock } from "@/lib/api";
import { formatMcapShort, formatMoney, resolveDisplayCurrency } from "@/lib/currency-format";
import styles from "./tools.module.css";

type ToolTab = "purification" | "zakat" | "compare" | "request";

const TAB_LABELS: Array<{ id: ToolTab; label: string }> = [
  { id: "purification", label: "Purification Calculator" },
  { id: "zakat", label: "Zakat Calculator" },
  { id: "compare", label: "Compare Stocks" },
  { id: "request", label: "Request Coverage" },
];

function statusClass(status: string | null) {
  if (status === "HALAL") return styles.badgeCompliant;
  if (status === "CAUTIOUS") return styles.badgeReview;
  return styles.badgeFail;
}

function ComparePreview({ stocks }: { stocks: Stock[] }) {
  const [slots, setSlots] = useState<string[]>(["", "", ""]);
  const [queries, setQueries] = useState(["", "", ""]);
  const [screening, setScreening] = useState<Record<string, ScreeningResult>>({});
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () =>
      slots
        .map((symbol) => stocks.find((stock) => stock.symbol === symbol))
        .filter((stock): stock is Stock => Boolean(stock)),
    [slots, stocks],
  );

  const suggestions = queries.map((query, index) => {
    const picked = new Set(slots.filter(Boolean));
    if (slots[index]) picked.delete(slots[index]);
    return rankStocksForQuery(stocks, query, 6).filter((stock) => !picked.has(stock.symbol));
  });

  async function runCompare() {
    const symbols = slots.filter(Boolean);
    if (symbols.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/screen-bulk?symbols=${encodeURIComponent(symbols.join(","))}`);
      const data = (await res.json()) as ScreeningResult[];
      setScreening(Object.fromEntries(data.map((row) => [row.symbol, row])));
    } finally {
      setLoading(false);
    }
  }

  function setSlot(index: number, symbol: string) {
    const next = [...slots];
    next[index] = symbol;
    setSlots(next);
    const nextQueries = [...queries];
    nextQueries[index] = symbol;
    setQueries(nextQueries);
  }

  return (
    <div className={styles.compareLayout}>
      <div className={styles.compareTip}>
        <span className={styles.tipIcon}>i</span>
        <p className={styles.tipText}>Build a short comparison here, then jump into the full compare workflow when you’re ready.</p>
      </div>
      <div className={styles.compareSearchRow}>
        {queries.map((query, index) => (
          <div key={index} className={styles.compareSearchSlot}>
            <label className={styles.cssLabel}>Stock {index + 1}</label>
            <input
              className={styles.cssInput}
              value={query}
              onChange={(e) => {
                const next = [...queries];
                next[index] = e.target.value.toUpperCase();
                setQueries(next);
              }}
              placeholder="Search ticker or name"
            />
            {query && !slots[index] ? (
              <div className={styles.suggestionBox}>
                {suggestions[index].slice(0, 5).map((stock) => (
                  <button key={stock.symbol} type="button" className={styles.suggestionItem} onClick={() => setSlot(index, stock.symbol)}>
                    <strong>{stock.symbol}</strong>
                    <span>{stock.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {slots[index] ? (
              <button type="button" className={styles.clearSlot} onClick={() => setSlot(index, "")}>
                Clear selection
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className={styles.compareActions}>
        <button type="button" className={styles.btnCalc} disabled={selected.length < 2 || loading} onClick={runCompare}>
          {loading ? "Comparing…" : "Compare selected"}
        </button>
        <Link href={selected.length >= 2 ? `/compare?symbols=${selected.map((stock) => stock.symbol).join(",")}` : "/compare"} className={styles.btnSecondary}>
          Open full compare
        </Link>
      </div>

      <div className={styles.compareTableWrap}>
        <table className={styles.compareTable}>
          <thead>
            <tr>
              <th>Stock</th>
              <th>Sector</th>
              <th>Price</th>
              <th>Market Cap</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {selected.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.compareEmpty}>Choose 2 to 3 stocks to preview the comparison.</td>
              </tr>
            ) : (
              selected.map((stock) => {
                const status = screening[stock.symbol]?.status ?? null;
                return (
                  <tr key={stock.symbol}>
                    <td>
                      <div className={styles.compareStockCell}>
                        <strong>{stock.symbol}</strong>
                        <span>{stock.name}</span>
                      </div>
                    </td>
                    <td>{stock.sector}</td>
                    <td>{formatMoney(stock.price, resolveDisplayCurrency(stock.exchange, stock.currency))}</td>
                    <td>{formatMcapShort(stock.market_cap, resolveDisplayCurrency(stock.exchange, stock.currency))}</td>
                    <td><span className={`${styles.badge} ${statusClass(status)}`}>{screeningUiLabel(status ?? "NON_COMPLIANT")}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ToolsPageClient({ stocks }: { stocks: Stock[] }) {
  const [activeTab, setActiveTab] = useState<ToolTab>("purification");

  return (
    <HubRouteShell>
      <div className={styles.pageTabs}>
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.pageTab} ${activeTab === tab.id ? styles.pageTabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.pageWrap}>
        {activeTab === "purification" ? (
          <section className={styles.pageSection}>
            <header className={styles.toolHeader}>
              <p className={styles.toolEyebrow}>Tools · Purification</p>
              <h1 className={styles.toolTitle}>Dividend Purification Calculator</h1>
              <p className={styles.toolDesc}>Calculate the non-permissible portion of dividend income and keep a clean donation record for compliant investing.</p>
            </header>
            <div className={styles.toolLayout}>
              <div className={styles.toolMain}><PurificationCalculator /></div>
              <aside className={styles.infoCard}>
                <h2 className={styles.infoTitle}>What this helps with</h2>
                <p className={styles.infoBody}>Use the same purification logic you see on stock detail pages and convert a ratio into a donation amount in seconds.</p>
                <div className={styles.stepsMini}>
                  <div className={styles.stepMini}><span className={styles.stepMiniNum}>1</span><span>Find the dividend amount you received</span></div>
                  <div className={styles.stepMini}><span className={styles.stepMiniNum}>2</span><span>Use the purification ratio from the stock page</span></div>
                  <div className={styles.stepMini}><span className={styles.stepMiniNum}>3</span><span>Donate the calculated amount to charity</span></div>
                </div>
              </aside>
            </div>
          </section>
        ) : null}

        {activeTab === "zakat" ? (
          <section className={styles.pageSection}>
            <header className={styles.toolHeader}>
              <p className={styles.toolEyebrow}>Tools · Zakat</p>
              <h1 className={styles.toolTitle}>Zakat Calculator</h1>
              <p className={styles.toolDesc}>Estimate zakat due on your investment portfolio, savings, and gold using a practical investor-friendly workflow.</p>
            </header>
            <div className={styles.toolLayout}>
              <div className={styles.toolMain}><ZakatCalculator /></div>
              <aside className={styles.infoCard}>
                <h2 className={styles.infoTitle}>Practical workflow</h2>
                <p className={styles.infoBody}>Enter a total portfolio value or reuse your portfolio number, check Nisab settings, and note the approximate 2.5% due if you are above threshold.</p>
                <div className={styles.infoRow}><span>Best for</span><strong>Annual review</strong></div>
                <div className={styles.infoRow}><span>Nisab basis</span><strong>Gold threshold</strong></div>
                <div className={styles.infoRow}><span>Output</span><strong>Estimate only</strong></div>
              </aside>
            </div>
          </section>
        ) : null}

        {activeTab === "compare" ? (
          <section className={styles.pageSection}>
            <header className={styles.toolHeader}>
              <p className={styles.toolEyebrow}>Tools · Compare</p>
              <h1 className={styles.toolTitle}>Compare Stocks</h1>
              <p className={styles.toolDesc}>Build a quick shortlist here, then jump into the full compare workspace when you want the complete ratio-by-ratio view.</p>
            </header>
            <ComparePreview stocks={stocks} />
          </section>
        ) : null}

        {activeTab === "request" ? (
          <section className={styles.pageSection}>
            <header className={styles.toolHeader}>
              <p className={styles.toolEyebrow}>Tools · Coverage</p>
              <h1 className={styles.toolTitle}>Request Coverage</h1>
              <p className={styles.toolDesc}>Can’t find a stock? Send the symbol and exchange so the BarakFi team can review it for future screening coverage.</p>
            </header>
            <div className={styles.requestLayout}>
              <div className={styles.requestStats}>
                <div className={styles.rsCell}><span className={styles.rsNum}>NSE</span><span className={styles.rsLabel}>Primary universe</span></div>
                <div className={styles.rsCell}><span className={styles.rsNum}>BSE</span><span className={styles.rsLabel}>Secondary exchange</span></div>
                <div className={styles.rsCell}><span className={styles.rsNum}>Best effort</span><span className={styles.rsLabel}>Review basis</span></div>
              </div>
              <div className={styles.requestGrid}>
                <div className={styles.requestFormCard}><RequestCoverageForm /></div>
                <aside className={styles.faqList}>
                  <div className={styles.faqItem}><h2 className={styles.faqQ}>How fast is review?</h2><p className={styles.faqA}>It depends on data availability and current queue load. Directly listed NSE names are typically easier to process.</p></div>
                  <div className={styles.faqItem}><h2 className={styles.faqQ}>Do I need an account?</h2><p className={styles.faqA}>Yes. Sign in is required so we can associate the request with your user and future workflow history.</p></div>
                  <div className={styles.faqItem}><h2 className={styles.faqQ}>What should I include?</h2><p className={styles.faqA}>Ticker, exchange, and a short note if the company is commonly known by a different brand or has a recent symbol change.</p></div>
                </aside>
              </div>
            </div>
          </section>
        ) : null}

        <footer className={styles.disclaimerBar}>
          <span>Educational workflow only — not a fatwa, certification, or investment recommendation.</span>
          <div className={styles.disclaimerLinks}>
            <Link href="/tools/purification">Purification</Link>
            <Link href="/tools/zakat">Zakat</Link>
            <Link href="/compare">Compare</Link>
            <Link href="/request-coverage">Request Coverage</Link>
          </div>
        </footer>
      </div>
    </HubRouteShell>
  );
}
