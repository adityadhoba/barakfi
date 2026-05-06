"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import { HubRouteShell } from "@/components/hub-route-shell";
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

function formatApiError(data: Record<string, unknown>): string {
  const d = data.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((x) => (typeof x === "object" && x && "msg" in x ? String((x as { msg: string }).msg) : JSON.stringify(x)))
      .join("; ");
  }
  if (d != null && typeof d === "object") return JSON.stringify(d);
  const err = data.error;
  if (typeof err === "string") return err;
  return "Request failed. Try again.";
}

function ToolsFooter() {
  return (
    <footer className={styles.siteFooter}>
      <div className={styles.footerBrand}>BarakFi</div>
      <div className={styles.footerLinks}>
        <Link href="/tools/purification">Purification</Link>
        <Link href="/tools/zakat">Zakat</Link>
        <Link href="/compare">Compare</Link>
        <Link href="/request-coverage">Request Coverage</Link>
      </div>
      <div className={styles.footerMeta}>© 2026 BarakFi · Educational use</div>
    </footer>
  );
}

function PurificationPanel() {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [dividendPerShare, setDividendPerShare] = useState("");
  const [ratio, setRatio] = useState("");
  const [method, setMethod] = useState("Based on Interest Income % (AAOIFI Standard)");

  const shareCount = Number.parseFloat(shares) || 0;
  const dps = Number.parseFloat(dividendPerShare) || 0;
  const ratioPct = Number.parseFloat(ratio) || 0;
  const totalDividend = shareCount * dps;
  const purificationAmount = (totalDividend * ratioPct) / 100;
  const netDividend = totalDividend - purificationAmount;
  const hasResult = totalDividend > 0 && ratioPct > 0;

  return (
    <div className={styles.pagePanelWrap}>
      <div className={styles.pagePanelMain}>
        <header className={styles.toolHeader}>
          <p className={styles.toolEyebrow}>Tools · Purification</p>
          <h1 className={styles.toolTitle}>Dividend Purification Calculator</h1>
          <p className={styles.toolDesc}>
            If a stock is <strong>Shariah Compliant but has minor non-compliant income</strong>, you may need to purify a portion of your dividends by donating to charity.
          </p>
        </header>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Stock Ticker</label>
          <input
            className={styles.fieldInput}
            type="text"
            placeholder="e.g. TCS, INFY, WIPRO"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Number of Shares Held</label>
            <input
              className={styles.fieldInput}
              type="number"
              placeholder="e.g. 100"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Dividend Per Share (₹) <span className={styles.fieldHint}>from company announcement</span></label>
            <div className={styles.fieldPrefixWrap}>
              <span className={styles.prefix}>₹</span>
              <input
                className={styles.fieldInput}
                type="number"
                placeholder="e.g. 28.00"
                value={dividendPerShare}
                onChange={(e) => setDividendPerShare(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Non-Compliant Income Ratio (%) <span className={styles.fieldHint}>from stock detail page</span></label>
          <input
            className={styles.fieldInput}
            type="number"
            placeholder="e.g. 3.8"
            value={ratio}
            onChange={(e) => setRatio(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Purification Method</label>
          <select className={styles.fieldSelect} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Based on Interest Income % (AAOIFI Standard)</option>
            <option>Based on Non-Permissible Revenue %</option>
            <option>Conservative — Higher of the two</option>
          </select>
        </div>

        <div className={styles.buttonRow}>
          <button type="button" className={styles.btnPrimary}>Calculate Purification Amount</button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              setTicker("");
              setShares("");
              setDividendPerShare("");
              setRatio("");
              setMethod("Based on Interest Income % (AAOIFI Standard)");
            }}
          >
            Clear
          </button>
        </div>

        {hasResult ? (
          <div className={styles.resultCard}>
            <div className={styles.resultLabel}>Purification Calculation Result</div>
            <div className={styles.resultRow}><span>Total Dividend Received</span><strong>₹{totalDividend.toFixed(2)}</strong></div>
            <div className={styles.resultRow}><span>Non-Compliant Ratio Applied</span><strong>{ratioPct.toFixed(2)}%</strong></div>
            <div className={styles.resultRow}><span>Amount to Purify (Donate)</span><strong className={styles.resultHighlight}>₹{purificationAmount.toFixed(2)}</strong></div>
            <div className={styles.resultRow}><span>Net Permissible Dividend</span><strong>₹{netDividend.toFixed(2)}</strong></div>
            <p className={styles.resultNote}>
              Donate the purification amount to a charity of your choice as general charity. The selected method is recorded as <strong>{method}</strong>.
            </p>
          </div>
        ) : null}
      </div>

      <aside className={styles.pagePanelSide}>
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>What is Dividend Purification?</h2>
          <p className={styles.infoBody}>
            Even Shariah-compliant companies may earn a small amount of interest from bank deposits or other non-permissible sources.
          </p>
          <div className={styles.infoDivider} />
          <p className={styles.infoBody}><strong>Purification</strong> means donating that small portion to charity, cleansing the non-permissible share from your dividend income.</p>
        </div>

        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>How to find the ratio</h2>
          <div className={styles.stepsMini}>
            <div className={styles.stepMini}><div className={styles.stepMiniNum}>1</div><div className={styles.stepMiniText}>Open the stock&apos;s BarakFi detail page.</div></div>
            <div className={styles.stepMini}><div className={styles.stepMiniNum}>2</div><div className={styles.stepMiniText}>Locate the interest income or non-permissible ratio in the compliance breakdown.</div></div>
            <div className={styles.stepMini}><div className={styles.stepMiniNum}>3</div><div className={styles.stepMiniText}>Enter that percentage here and calculate the donation amount.</div></div>
          </div>
        </div>

        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Current Nisab</h2>
          <div className={styles.infoRow}><span>Gold Nisab (87.5g)</span><strong>₹7,08,000</strong></div>
          <div className={styles.infoRow}><span>Silver Nisab (612.4g)</span><strong>₹42,800</strong></div>
          <div className={styles.infoRow}><span>Zakat Rate</span><strong>2.5%</strong></div>
          <div className={styles.infoRow}><span>Gold Rate/g</span><strong>₹8,092</strong></div>
        </div>
      </aside>
    </div>
  );
}

function ZakatPanel() {
  const [equity, setEquity] = useState("");
  const [gold, setGold] = useState("");
  const [silver, setSilver] = useState("");
  const [cash, setCash] = useState("");
  const [fd, setFd] = useState("");
  const [liabilities, setLiabilities] = useState("");
  const [method, setMethod] = useState("Zakatable Assets Method (Net Assets per share × shares)");

  const goldRate = 8092;
  const silverRate = 98.5;
  const nisabGold = 708050;
  const equityValue = Number.parseFloat(equity) || 0;
  const goldValue = (Number.parseFloat(gold) || 0) * goldRate;
  const silverValue = (Number.parseFloat(silver) || 0) * silverRate;
  const cashValue = Number.parseFloat(cash) || 0;
  const fdValue = Number.parseFloat(fd) || 0;
  const liabilitiesValue = Number.parseFloat(liabilities) || 0;
  const totalAssets = equityValue + goldValue + silverValue + cashValue + fdValue;
  const netWealth = Math.max(totalAssets - liabilitiesValue, 0);
  const zakatDue = netWealth >= nisabGold ? netWealth * 0.025 : 0;
  const hasResult = totalAssets > 0;

  return (
    <div className={styles.pagePanelWrap}>
      <div className={styles.pagePanelMain}>
        <header className={styles.toolHeader}>
          <p className={styles.toolEyebrow}>Tools · Zakat</p>
          <h1 className={styles.toolTitle}>Zakat Calculator</h1>
          <p className={styles.toolDesc}>
            Calculate Zakat on your <strong>equity portfolio, gold, silver, cash savings, and other assets</strong> using current India-focused Nisab figures.
          </p>
        </header>

        <div className={styles.nisabBar}>
          <div className={styles.nisabBarLabel}>Current Nisab (India)</div>
          <div className={styles.nisabBarValues}>
            <span>Gold <strong>₹7,08,000</strong></span>
            <span>Silver <strong>₹42,800</strong></span>
            <span>Rate <strong>2.5%</strong></span>
          </div>
        </div>

        <section className={styles.sectionBlock}>
          <div className={styles.sectionLabel}>Equity Holdings</div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Current Market Value of Shares</label>
              <div className={styles.fieldPrefixWrap}><span className={styles.prefix}>₹</span><input className={styles.fieldInput} type="number" placeholder="e.g. 500000" value={equity} onChange={(e) => setEquity(e.target.value)} /></div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Zakat Method</label>
              <select className={styles.fieldSelect} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>Zakatable Assets Method (Net Assets per share × shares)</option>
                <option>Market Value Method (2.5% of full value)</option>
                <option>Conservative (higher of the two)</option>
              </select>
            </div>
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <div className={styles.sectionLabel}>Gold & Silver</div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}><label className={styles.fieldLabel}>Gold (grams)</label><input className={styles.fieldInput} type="number" placeholder="e.g. 100" value={gold} onChange={(e) => setGold(e.target.value)} /></div>
            <div className={styles.fieldGroup}><label className={styles.fieldLabel}>Silver (grams)</label><input className={styles.fieldInput} type="number" placeholder="e.g. 500" value={silver} onChange={(e) => setSilver(e.target.value)} /></div>
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <div className={styles.sectionLabel}>Cash & Savings</div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}><label className={styles.fieldLabel}>Bank Savings</label><div className={styles.fieldPrefixWrap}><span className={styles.prefix}>₹</span><input className={styles.fieldInput} type="number" placeholder="e.g. 200000" value={cash} onChange={(e) => setCash(e.target.value)} /></div></div>
            <div className={styles.fieldGroup}><label className={styles.fieldLabel}>Fixed Deposits / Other</label><div className={styles.fieldPrefixWrap}><span className={styles.prefix}>₹</span><input className={styles.fieldInput} type="number" placeholder="e.g. 100000" value={fd} onChange={(e) => setFd(e.target.value)} /></div></div>
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <div className={styles.sectionLabel}>Deductions</div>
          <div className={styles.fieldGroup}><label className={styles.fieldLabel}>Total Liabilities / Debts Due This Year</label><div className={styles.fieldPrefixWrap}><span className={styles.prefix}>₹</span><input className={styles.fieldInput} type="number" placeholder="e.g. 50000" value={liabilities} onChange={(e) => setLiabilities(e.target.value)} /></div></div>
        </section>

        <div className={styles.buttonRow}>
          <button type="button" className={styles.btnPrimary}>Calculate Zakat Due</button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              setEquity("");
              setGold("");
              setSilver("");
              setCash("");
              setFd("");
              setLiabilities("");
              setMethod("Zakatable Assets Method (Net Assets per share × shares)");
            }}
          >
            Clear All
          </button>
        </div>

        {hasResult ? (
          <div className={styles.resultCard}>
            <div className={styles.resultLabel}>Zakat Calculation</div>
            <div className={styles.resultRow}><span>Total Zakatable Assets</span><strong>₹{totalAssets.toFixed(2)}</strong></div>
            <div className={styles.resultRow}><span>Less: Liabilities</span><strong>₹{liabilitiesValue.toFixed(2)}</strong></div>
            <div className={styles.resultRow}><span>Net Zakatable Wealth</span><strong>₹{netWealth.toFixed(2)}</strong></div>
            <div className={styles.resultRow}><span>Nisab Threshold (Gold)</span><strong>₹{nisabGold.toLocaleString("en-IN")}</strong></div>
            <div className={styles.resultRow}><span>Nisab Reached?</span><strong>{netWealth >= nisabGold ? "Yes" : "No"}</strong></div>
            <div className={styles.resultRow}><span>Zakat Due (2.5%)</span><strong className={styles.resultHighlight}>₹{zakatDue.toFixed(2)}</strong></div>
            <p className={styles.resultNote}>This educational estimate uses the selected method: <strong>{method}</strong>. Consult a qualified Islamic scholar for your personal obligation.</p>
          </div>
        ) : null}
      </div>

      <aside className={styles.pagePanelSide}>
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Zakat on Stocks</h2>
          <p className={styles.infoBody}>There are two main scholarly approaches to calculating Zakat on shares.</p>
          <div className={styles.infoDivider} />
          <p className={styles.infoBody}><strong>1. Zakatable Assets Method</strong><br />Multiply your shares by the company&apos;s net zakatable assets per share.</p>
          <div className={styles.infoDivider} />
          <p className={styles.infoBody}><strong>2. Market Value Method</strong><br />Pay 2.5% on the full current market value of your holdings.</p>
        </div>

        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Live Rates (India)</h2>
          <div className={styles.infoRow}><span>Gold (24K / gram)</span><strong>₹8,092</strong></div>
          <div className={styles.infoRow}><span>Silver (/ gram)</span><strong>₹98.5</strong></div>
          <div className={styles.infoRow}><span>Nisab — Gold</span><strong>₹7,08,050</strong></div>
          <div className={styles.infoRow}><span>Nisab — Silver</span><strong>₹60,282</strong></div>
          <div className={styles.infoRow}><span>Zakat Rate</span><strong>2.5%</strong></div>
        </div>

        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Important</h2>
          <p className={styles.infoBody}>This calculator is <strong>educational only</strong>. Zakat calculations can vary by school of thought and individual circumstances.</p>
        </div>
      </aside>
    </div>
  );
}

function ComparePanel({ stocks }: { stocks: Stock[] }) {
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
    <section className={styles.comparePageWrap}>
      <header className={styles.toolHeader}>
        <p className={styles.toolEyebrow}>Compare</p>
        <h1 className={styles.toolTitle}>Compare Stocks</h1>
        <p className={styles.toolDesc}>Compare <strong>Shariah compliance ratios, financial data, and screening status</strong> side by side for up to 3 stocks.</p>
      </header>

      <div className={styles.compareTip}>
        <span className={styles.tipIcon}>◆</span>
        <p className={styles.tipText}><strong>Daily compare sessions are limited.</strong> Selections stay editable until you click Compare.</p>
      </div>

      <div className={styles.compareSearchRow}>
        {queries.map((query, index) => {
          const selectedStock = selected.find((stock) => stock.symbol === slots[index]);
          return (
            <div key={index} className={styles.compareSearchSlot}>
              <div className={styles.cssLabel}><span className={styles.slotNum}>{index + 1}</span> Stock {index + 1}{index === 2 ? <span className={styles.optionalTag}> (optional)</span> : null}</div>
              <input
                className={styles.cssInput}
                type="text"
                placeholder="Search ticker or name…"
                value={query}
                onChange={(e) => {
                  const next = [...queries];
                  next[index] = e.target.value.toUpperCase();
                  setQueries(next);
                  if (!e.target.value) {
                    const nextSlots = [...slots];
                    nextSlots[index] = "";
                    setSlots(nextSlots);
                  }
                }}
              />
              {selectedStock ? (
                <div className={styles.cssStockPreview}>
                  <div className={styles.cssLogo}>{selectedStock.symbol.charAt(0)}</div>
                  <div>
                    <div className={styles.cssTicker}>{selectedStock.symbol}</div>
                    <div className={styles.cssName}>{selectedStock.name}</div>
                  </div>
                </div>
              ) : <div className={styles.slotPlaceholder}>Type a ticker like RELIANCE or TCS</div>}
              {query && !selectedStock ? (
                <div className={styles.suggestionBox}>
                  {suggestions[index].slice(0, 5).map((stock) => (
                    <button key={stock.symbol} type="button" className={styles.suggestionItem} onClick={() => setSlot(index, stock.symbol)}>
                      <strong>{stock.symbol}</strong>
                      <span>{stock.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        <button type="button" className={styles.btnCompare} disabled={selected.length < 2 || loading} onClick={runCompare}>
          {loading ? "Comparing…" : "Compare →"}
        </button>
      </div>

      {selected.length >= 2 && Object.keys(screening).length > 0 ? (
        <div className={styles.compareTableWrap}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th>Metric</th>
                {selected.map((stock) => <th key={stock.symbol} className={styles.stockCol}>{stock.symbol}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className={styles.sectionDividerRow}><td colSpan={selected.length + 1}>Shariah Compliance</td></tr>
              <tr>
                <td className={styles.metricLabel}>Status</td>
                {selected.map((stock) => {
                  const status = screening[stock.symbol]?.status ?? null;
                  return <td key={stock.symbol} className={styles.statusCell}><span className={`${styles.badge} ${statusClass(status)}`}>{screeningUiLabel(status ?? "NON_COMPLIANT")}</span></td>;
                })}
              </tr>
              <tr>
                <td className={styles.metricLabel}>Sector</td>
                {selected.map((stock) => <td key={stock.symbol} className={styles.centerCell}>{stock.sector}</td>)}
              </tr>
              <tr className={styles.sectionDividerRow}><td colSpan={selected.length + 1}>Market Data</td></tr>
              <tr>
                <td className={styles.metricLabel}>Price</td>
                {selected.map((stock) => <td key={stock.symbol} className={styles.metricVal}>{formatMoney(stock.price, resolveDisplayCurrency(stock.exchange, stock.currency))}</td>)}
              </tr>
              <tr>
                <td className={styles.metricLabel}>Market Cap</td>
                {selected.map((stock) => <td key={stock.symbol} className={styles.metricVal}>{formatMcapShort(stock.market_cap, resolveDisplayCurrency(stock.exchange, stock.currency))}</td>)}
              </tr>
              <tr>
                <td className={styles.metricLabel}>P/E Ratio</td>
                {selected.map((stock) => <td key={stock.symbol} className={styles.metricVal}>{stock.pe_ratio != null ? `${stock.pe_ratio.toFixed(1)}×` : "—"}</td>)}
              </tr>
            </tbody>
          </table>
          <div className={styles.compareLinkRow}><Link className={styles.btnOutlineLink} href={`/compare?symbols=${selected.map((stock) => stock.symbol).join(",")}`}>Open full compare →</Link></div>
        </div>
      ) : (
        <div className={styles.compareEmpty}>
          <div className={styles.compareEmptyTitle}>Choose stocks to compare</div>
          <div className={styles.compareEmptyBody}>Search above to add between 2 and 3 stocks. We only use the compare workflow after you click Compare.</div>
          <div className={styles.compareEmptyHint}>Tip: try RELIANCE, TCS, or INFY</div>
        </div>
      )}
    </section>
  );
}

function RequestPanel() {
  const { isSignedIn, getToken } = useAuth();
  const [symbol, setSymbol] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [exchange, setExchange] = useState("NSE");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignedIn) return;
    setStatus("loading");
    setMessage("");
    const token = await getToken();
    if (!token) {
      setStatus("err");
      setMessage("Could not get a session. Please sign in again.");
      return;
    }
    try {
      const res = await fetch("/api/me/coverage-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          exchange: exchange.trim().toUpperCase(),
          notes: [companyName.trim(), notes.trim()].filter(Boolean).join(" · "),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("err");
        setMessage(formatApiError(data as Record<string, unknown>));
        return;
      }
      setStatus("ok");
      setMessage("Thanks — we received your request. We will review and add coverage when possible.");
      setSymbol("");
      setCompanyName("");
      setNotes("");
    } catch {
      setStatus("err");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <section className={styles.requestPageWrap}>
      <header className={styles.toolHeader}>
        <p className={styles.toolEyebrow}>Coverage · Request</p>
        <h1 className={styles.toolTitle}>Request Stock Coverage</h1>
        <p className={styles.toolDesc}>Can&apos;t find a stock on BarakFi? <strong>Request us to screen it for Shariah compliance.</strong></p>
      </header>

      <div className={styles.requestStats}>
        <div className={styles.rsCell}><div className={styles.rsNum}>527</div><div className={styles.rsLabel}>Stocks currently covered</div></div>
        <div className={styles.rsCell}><div className={styles.rsNum}>29</div><div className={styles.rsLabel}>Sectors screened</div></div>
        <div className={styles.rsCell}><div className={styles.rsNum}>Free</div><div className={styles.rsLabel}>To request coverage</div></div>
      </div>

      <div className={styles.requestForm}>
        <div className={styles.requestFormLabel}>Submit a Request</div>
        {!isSignedIn ? (
          <div className={styles.signInPrompt}>
            <p>You need to sign in before submitting a request so we can track it for your account.</p>
            <Link href="/sign-in?redirect_url=/tools" className={styles.btnPrimaryLink}>Sign in to request coverage</Link>
          </div>
        ) : (
          <form className={styles.requestFields} onSubmit={onSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Stock Ticker / Symbol <span className={styles.fieldHint}>NSE or BSE symbol</span></label>
              <input className={styles.fieldInput} type="text" placeholder="e.g. ZOMATO, NYKAA, PAYTM" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} required />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Company Name</label>
              <input className={styles.fieldInput} type="text" placeholder="e.g. Zomato Limited" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Exchange</label>
                <select className={styles.fieldSelect} value={exchange} onChange={(e) => setExchange(e.target.value)}>
                  <option>NSE</option>
                  <option>BSE</option>
                  <option>Both NSE &amp; BSE</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Priority</label>
                <select className={styles.fieldSelect} defaultValue="Standard">
                  <option>Standard</option>
                  <option>Watchlist need</option>
                  <option>Portfolio need</option>
                </select>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Notes</label>
              <textarea className={styles.fieldTextarea} placeholder="Tell us anything useful about the company or why you need it screened." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={status === "loading"}>{status === "loading" ? "Submitting…" : "Submit Request"}</button>
            {message ? <p className={status === "ok" ? styles.formOk : styles.formErr}>{message}</p> : null}
          </form>
        )}
      </div>

      <div className={styles.faqList}>
        <div className={styles.faqItem}><h2 className={styles.faqQ}>How fast is review?</h2><p className={styles.faqA}>It depends on data availability and queue load. Directly listed NSE names are usually the simplest to process.</p></div>
        <div className={styles.faqItem}><h2 className={styles.faqQ}>Do I need an account?</h2><p className={styles.faqA}>Yes. Sign in is required so we can associate the request with your user and future workflow history.</p></div>
        <div className={styles.faqItem}><h2 className={styles.faqQ}>What should I include?</h2><p className={styles.faqA}>Ticker, exchange, and a short note if the company is commonly known by a different brand or has a recent symbol change.</p></div>
      </div>
    </section>
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
        {activeTab === "purification" ? <PurificationPanel /> : null}
        {activeTab === "zakat" ? <ZakatPanel /> : null}
        {activeTab === "compare" ? <ComparePanel stocks={stocks} /> : null}
        {activeTab === "request" ? <RequestPanel /> : null}

        <div className={styles.disclaimerBar}>
          <span>Educational only · Not a religious ruling · <Link href="/methodology">Methodology</Link></span>
          <span>v2026.04.2</span>
        </div>
      </div>

      <ToolsFooter />
    </HubRouteShell>
  );
}
