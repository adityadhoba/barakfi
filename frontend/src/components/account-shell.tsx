"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DM_Serif_Display, Inter } from "next/font/google";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  createAnalyticsEvent,
  deleteWatchlistItemV2,
  getAccountOverview,
  getAuthenticatedWatchlist,
  getReportHistory,
  joinWaitlist,
  requestAccountDeletion,
  requestAccountExport,
  type AccountDeletionRequestRecord,
  type AccountOverview,
  type DataExportRequestRecord,
  type ScreeningReportHistoryRow,
  type WatchlistEntry,
} from "@/lib/api";
import styles from "@/app/account/account-page.module.css";
import { LocalMarketingNav } from "@/components/local-marketing-nav";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });
const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "—";
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusClass(status: string | undefined) {
  const normalised = (status || "").toUpperCase();
  if (normalised === "HALAL" || normalised === "SHARIAH COMPLIANT") return styles.badgeCompliant;
  if (normalised === "CAUTIOUS" || normalised === "REQUIRES REVIEW") return styles.badgeReview;
  return styles.badgeNonCompliant;
}

function statusLabel(status: string | undefined) {
  const normalised = (status || "").toUpperCase();
  if (normalised === "HALAL") return "Compliant";
  if (normalised === "CAUTIOUS") return "Requires Review";
  if (normalised === "NON_COMPLIANT") return "Not Compliant";
  return status || "Requires Review";
}

export function AccountShell() {
  const { isLoaded, userId, getToken } = useAuth();
  const { user } = useUser();
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [history, setHistory] = useState<ScreeningReportHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [exportState, setExportState] = useState<DataExportRequestRecord | null>(null);
  const [deletionState, setDeletionState] = useState<AccountDeletionRequestRecord | null>(null);

  useEffect(() => {
    async function load() {
      if (!isLoaded) return;
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("Could not load your account session.");
        const [nextOverview, nextWatchlist, nextHistory] = await Promise.all([
          getAccountOverview(token),
          getAuthenticatedWatchlist(token),
          getReportHistory(token).catch(() => []),
        ]);
        setOverview(nextOverview);
        setWatchlist(nextWatchlist);
        setHistory(nextHistory);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load your account right now.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [getToken, isLoaded, userId]);

  const initial = useMemo(() => {
    const source = overview?.user.name || user?.fullName || user?.primaryEmailAddress?.emailAddress || "B";
    return source.charAt(0).toUpperCase();
  }, [overview?.user.name, user?.fullName, user?.primaryEmailAddress?.emailAddress]);

  async function handleJoinWaitlist(featureKey: "pro" | "alerts", source: "account_page" | "alerts_section") {
    const token = userId ? await getToken() : null;
    try {
      await joinWaitlist({ featureKey, source }, token);
      setBanner(featureKey === "pro" ? "You’re on the BarakFi Pro waitlist." : "You’re on the alerts waitlist.");
      const refreshed = token ? await getAccountOverview(token) : null;
      if (refreshed) setOverview(refreshed);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Could not join the waitlist right now.");
    }
  }

  async function handleRemove(symbol: string) {
    const token = await getToken();
    if (!token) return;
    try {
      await deleteWatchlistItemV2(symbol, token);
      setWatchlist((current) => current.filter((item) => item.stock.symbol !== symbol));
      setOverview((current) =>
        current
          ? {
              ...current,
              usage: {
                ...current.usage,
                watchlist_count: Math.max(current.usage.watchlist_count - 1, 0),
              },
            }
          : current,
      );
      setBanner(`${symbol} removed from your watchlist.`);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Could not remove the stock right now.");
    }
  }

  async function handleExport() {
    const token = await getToken();
    if (!token) return;
    try {
      const result = await requestAccountExport(token);
      setExportState(result);
      setBanner("Account export request recorded. We’ll prepare it from the backend workflow.");
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Could not request your export right now.");
    }
  }

  async function handleDeleteRequest() {
    const token = await getToken();
    if (!token) return;
    try {
      const result = await requestAccountDeletion(undefined, token);
      setDeletionState(result);
      setBanner("Account deletion request recorded. We’ll review it before any destructive step.");
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Could not create the deletion request right now.");
    }
  }

  useEffect(() => {
    if (!userId) return;
    void getToken().then((token) => {
      if (!token) return;
      return createAnalyticsEvent({ eventName: "account_page_viewed", pagePath: "/account" }, token).catch(() => undefined);
    });
  }, [getToken, userId]);

  if (!isLoaded || loading) {
    return <main className={`${styles.page} ${inter.className}`}><div className={styles.loading}>Loading your BarakFi account…</div></main>;
  }

  if (!userId) {
    return (
      <main className={`${styles.page} ${inter.className}`}>
        <div className={styles.guestState}>
          <div className={styles.guestEyebrow}>Account</div>
          <h1 className={`${styles.guestTitle} ${serif.className}`}>Sign in to open your BarakFi account</h1>
          <p className={styles.guestBody}>Your watchlist, report credits, waitlist joins, and export requests are all tied to your signed-in BarakFi profile.</p>
          <div className={styles.guestActions}>
            <Link href="/sign-in" className={styles.ghostButton}>Log in</Link>
            <Link href="/sign-up" className={styles.solidButton}>Get started</Link>
          </div>
        </div>
      </main>
    );
  }

  if (error || !overview) {
    return <main className={`${styles.page} ${inter.className}`}><div className={styles.loading}>{error || "Could not load your account."}</div></main>;
  }

  return (
    <main className={`${styles.page} ${inter.className}`}>
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {["NIFTY 50 23,842.75 +0.54%", "SENSEX 78,553.20 +0.54%", "NIFTY BANK 51,236.80 -0.17%", "NIFTY IT 33,156.40 +0.75%"].map((item, index) => (
            <span className={styles.tickerItem} key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <LocalMarketingNav />

      <div className={styles.pageWrap}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarUser}>
            <div className={`${styles.userAvatar} ${serif.className}`}>{initial}</div>
            <div className={styles.userName}>{overview.user.name}</div>
            <div className={styles.userEmail}>{overview.user.email}</div>
            <div className={styles.userPlan}><span className={styles.planDot} /> {overview.user.plan}</div>
          </div>
          <div className={styles.sidebarLabel}>Account</div>
          <a className={`${styles.sidebarLink} ${styles.sidebarActive}`} href="#overview">Overview</a>
          <a className={styles.sidebarLink} href="#watchlist">Watchlist</a>
          <a className={styles.sidebarLink} href="#alerts">Alerts</a>
          <a className={styles.sidebarLink} href="#usage">Plan &amp; Usage</a>
          <a className={styles.sidebarLink} href="#security">Security</a>
          <a className={styles.sidebarLink} href="#danger">Danger Zone</a>
        </aside>

        <section className={styles.main}>
          <header className={styles.pageHeader} id="overview">
            <div className={styles.pageEyebrow}>Account · Usage &amp; watchlist</div>
            <h1 className={`${styles.pageTitle} ${serif.className}`}>Manage your <span>BarakFi</span> workflow</h1>
            <p className={styles.pageSub}>Your BarakFi account tracks detailed report usage, watchlist capacity, export requests, and future Pro waitlist joins. Searching and browsing do not use your monthly report credits.</p>
          </header>

          {banner ? <div className={styles.banner}>{banner}</div> : null}

          <section className={styles.statsStrip}>
            <div className={styles.statBlock}>
              <div className={`${styles.statNumber} ${serif.className}`}>{overview.usage.reports_used}<span>/{overview.usage.reports_limit}</span></div>
              <div className={styles.statLabel}>Screening reports used</div>
            </div>
            <div className={styles.statBlock}>
              <div className={`${styles.statNumber} ${serif.className}`}>{overview.usage.watchlist_count}<span>/{overview.usage.watchlist_limit}</span></div>
              <div className={styles.statLabel}>Watchlist stocks</div>
            </div>
            <div className={styles.statBlock}>
              <div className={`${styles.statNumber} ${serif.className}`}>{overview.usage.reports_remaining}</div>
              <div className={styles.statLabel}>Reports remaining</div>
            </div>
            <div className={styles.statBlock}>
              <div className={`${styles.statNumber} ${serif.className}`}>{formatDate(overview.usage.reset_date)}</div>
              <div className={styles.statLabel}>Usage reset date</div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Profile</div>
            </div>
            <div className={styles.profileGrid}>
              <div className={styles.fieldBlock}><div className={styles.fieldLabel}>Name</div><div className={styles.fieldValue}>{overview.user.name}</div></div>
              <div className={styles.fieldBlock}><div className={styles.fieldLabel}>Email</div><div className={styles.fieldValue}>{overview.user.email}</div></div>
              <div className={styles.fieldBlock}><div className={styles.fieldLabel}>Plan</div><div className={styles.fieldValue}>Free</div></div>
              <div className={styles.fieldBlock}><div className={styles.fieldLabel}>Member Since</div><div className={styles.fieldValue}>{formatDate(overview.user.member_since)}</div></div>
            </div>
          </section>

          <section className={styles.section} id="watchlist">
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Watchlist</div>
              <Link href="/watchlist" className={styles.sectionAction}>Open full watchlist</Link>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {watchlist.length === 0 ? (
                  <tr><td colSpan={4} className={styles.emptyRow}>Your watchlist is empty. Add up to 25 stocks for free.</td></tr>
                ) : watchlist.slice(0, 8).map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <div className={styles.tk}>{entry.stock.symbol}</div>
                      <div className={styles.co}>{entry.stock.name}</div>
                    </td>
                    <td><span className={`${styles.badge} ${styles.badgeReview}`}>Tracked</span></td>
                    <td>{entry.stock.price ? `₹${entry.stock.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}</td>
                    <td><button type="button" className={styles.removeBtn} onClick={() => void handleRemove(entry.stock.symbol)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={styles.section} id="alerts">
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Compliance alerts</div>
            </div>
            <div className={styles.alertPreview}>
              <h3 className={`${styles.subTitle} ${serif.className}`}>Coming Soon</h3>
              <p className={styles.sectionBody}>Alerts are planned for BarakFi Pro. You’ll be able to track saved stocks and get notified when a company’s Shariah status changes, quarterly results are refreshed, or a stock moves into Requires Review. This feature is not active yet.</p>
              <button type="button" className={styles.outlineButton} onClick={() => void handleJoinWaitlist("alerts", "alerts_section")}>
                {overview.waitlist.joined_alerts ? "Joined Alerts Waitlist" : "Join Alerts Waitlist"}
              </button>
            </div>
          </section>

          <section className={styles.section} id="usage">
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Plan &amp; Usage</div>
            </div>
            <div className={styles.planLayout}>
              <div className={styles.planCurrent}>
                <h3 className={`${styles.planName} ${serif.className}`}>BarakFi Free</h3>
                <p className={styles.planBody}>BarakFi Free gives you access to the screener, basic stock status previews, watchlist tools, and 50 detailed BarakFi screening reports every month. Searching, filtering, and browsing do not count.</p>
                <ul className={styles.featureList}>
                  <li>Basic screener access</li>
                  <li>Search and filter Indian stocks</li>
                  <li>Basic Shariah status preview</li>
                  <li>50 detailed BarakFi screening reports per month</li>
                  <li>Watchlist up to 25 stocks</li>
                  <li>Zakat &amp; purification calculators</li>
                  <li>Download your own account data</li>
                </ul>
                <div className={styles.notIncluded}>Not included: Compliance alerts, advanced ratio filters, historical tracking, portfolio compliance, CSV exports, compare by BarakFi score.</div>
              </div>
              <div className={styles.planUpgrade}>
                <div className={styles.upgradeTag}>Coming soon</div>
                <h3 className={`${styles.upgradeTitle} ${serif.className}`}>BarakFi <span>Pro</span></h3>
                <p className={styles.planBody}>Planned features include unlimited BarakFi screening reports, compliance alerts, advanced ratio filters, historical tracking, portfolio compliance overview, unlimited watchlist, CSV export of BarakFi verdicts, and compare stocks by screening factors.</p>
                <button type="button" className={styles.solidButton} onClick={() => void handleJoinWaitlist("pro", "account_page")}>
                  {overview.waitlist.joined_pro ? "Joined Pro Waitlist" : "Join Pro Waitlist"}
                </button>
              </div>
            </div>
          </section>

          <section className={styles.section} id="security">
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Security &amp; data</div>
            </div>
            <div className={styles.securityGrid}>
              <div className={styles.securityBlock}>
                <div className={styles.securityTag}>Auth</div>
                <h3 className={styles.securityTitle}>Signed in with Clerk</h3>
                <p className={styles.sectionBody}>Identity and sessions are handled by Clerk. BarakFi stores your watchlist, report history, usage counters, and waitlist preferences in our application database.</p>
              </div>
              <div className={styles.securityBlock}>
                <div className={styles.securityTag}>Export</div>
                <h3 className={styles.securityTitle}>Download your account data</h3>
                <p className={styles.sectionBody}>Create a backend export request for your account data. This records your request now so we can generate the file in the next workflow step.</p>
                <button type="button" className={styles.outlineButton} onClick={() => void handleExport()}>
                  {exportState ? "Export requested" : "Request data export"}
                </button>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Recent report history</div>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={3} className={styles.emptyRow}>Open a full BarakFi report to start building your history.</td></tr>
                ) : history.slice(0, 8).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className={styles.tk}>{row.stock_symbol}</div>
                      <div className={styles.co}>{row.company_name || row.exchange}</div>
                    </td>
                    <td><span className={`${styles.badge} ${statusClass(row.result_status || undefined)}`}>{statusLabel(row.result_status || undefined)}</span></td>
                    <td>{formatDate(row.opened_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={styles.dangerSection} id="danger">
            <h3 className={`${styles.dangerTitle} ${serif.className}`}>Danger Zone</h3>
            <p className={styles.sectionBody}>Deleting your BarakFi account is a separate review flow. We’ll mark your account as deletion requested and queue the follow-up action; we do not immediately delete your Clerk identity in this step.</p>
            <button type="button" className={styles.dangerButton} onClick={() => void handleDeleteRequest()}>
              {deletionState ? "Deletion requested" : "Request account deletion"}
            </button>
          </section>
        </section>
      </div>
    </main>
  );
}
