"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DM_Serif_Display, Inter } from "next/font/google";
import { SignOutButton, useAuth, useUser } from "@clerk/nextjs";
import {
  createAnalyticsEvent,
  deleteWatchlistItemV2,
  getAccountOverview,
  getAuthenticatedWatchlist,
  getReportHistory,
  joinWaitlist,
  requestAccountDeletion,
  requestAccountExport,
  updateAccountProfile,
  type AccountDeletionRequestRecord,
  type AccountOverview,
  type DataExportRequestRecord,
  type ScreeningReportHistoryRow,
  type WatchlistEntry,
} from "@/lib/api";
import styles from "@/app/account/account-page.module.css";
import { GlobalMarketTicker } from "@/components/global-market-ticker";
import { LocalMarketingNav } from "@/components/local-marketing-nav";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });
const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

type EditableField = "name" | "preferredIndex" | "defaultMethod" | "notificationPreference" | null;

type ProfileDraft = {
  name: string;
  preferredIndex: string;
  defaultMethod: string;
  notificationPreference: string;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "—";
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
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

function looksPlaceholderEmail(value: string | null | undefined) {
  const normalized = (value || "").trim().toLowerCase();
  return !normalized || normalized.endsWith("@example.local");
}

function looksPlaceholderName(value: string | null | undefined) {
  const normalized = (value || "").trim();
  return !normalized || normalized.startsWith("user_");
}

function chooseDisplayName(accountName: string | undefined, clerkName: string | null | undefined, clerkEmail: string | null | undefined) {
  if (!looksPlaceholderName(accountName)) return accountName || "BarakFi Member";
  if (clerkName && !looksPlaceholderName(clerkName)) return clerkName;
  if (clerkEmail && !looksPlaceholderEmail(clerkEmail)) return clerkEmail.split("@")[0];
  return accountName || clerkName || clerkEmail || "BarakFi Member";
}

function chooseDisplayEmail(accountEmail: string | undefined, clerkEmail: string | null | undefined) {
  if (!looksPlaceholderEmail(accountEmail)) return accountEmail || "—";
  if (clerkEmail && !looksPlaceholderEmail(clerkEmail)) return clerkEmail;
  return accountEmail || clerkEmail || "—";
}

function SidebarIcon({ kind }: { kind: "overview" | "profile" | "watchlist" | "alerts" | "screener" | "zakat" | "purification" | "plan" | "security" | "signout" }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
  switch (kind) {
    case "overview":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
    case "profile":
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>;
    case "watchlist":
      return <svg {...common}><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.5 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z" /></svg>;
    case "alerts":
      return <svg {...common}><path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10.5 21a1.5 1.5 0 0 0 3 0" /></svg>;
    case "screener":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
    case "zakat":
      return <svg {...common}><rect x="3" y="4" width="18" height="14" rx="2" /><line x1="8" y1="20" x2="16" y2="20" /></svg>;
    case "purification":
      return <svg {...common}><polyline points="3 12 7 12 10 4 14 20 17 12 21 12" /></svg>;
    case "plan":
      return <svg {...common}><path d="M12 2l3.1 6.3 6.9 1-5 4.8 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.8 6.9-1L12 2z" /></svg>;
    case "security":
      return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    case "signout":
      return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
  }
}

function FeatureIcon({ enabled }: { enabled: boolean }) {
  return (
    <span className={`${styles.featureIcon} ${enabled ? styles.featureIconOk : styles.featureIconOff}`}>
      {enabled ? (
        <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9l3 3 7-7" /></svg>
      ) : (
        <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M5 5l8 8" /><path d="M13 5l-8 8" /></svg>
      )}
    </span>
  );
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
  const [activeEditor, setActiveEditor] = useState<EditableField>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    name: "",
    preferredIndex: "NIFTY 50",
    defaultMethod: "AAOIFI Aligned",
    notificationPreference: "Email · Weekly digest",
  });

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

  const clerkName = user?.fullName || null;
  const clerkEmail = user?.primaryEmailAddress?.emailAddress || null;
  const displayName = chooseDisplayName(overview?.user.name, clerkName, clerkEmail);
  const displayEmail = chooseDisplayEmail(overview?.user.email, clerkEmail);

  useEffect(() => {
    if (!overview) return;
    setProfileDraft({
      name: chooseDisplayName(overview.user.name, clerkName, clerkEmail),
      preferredIndex: overview.user.preferred_index,
      defaultMethod: overview.user.default_screening_method,
      notificationPreference: overview.user.notification_preference,
    });
  }, [overview, clerkName, clerkEmail]);

  const initial = useMemo(() => {
    const source = displayName || displayEmail || "B";
    return source.charAt(0).toUpperCase();
  }, [displayEmail, displayName]);

  const profileDirty = !!overview && (
    profileDraft.name !== displayName
    || profileDraft.preferredIndex !== overview.user.preferred_index
    || profileDraft.defaultMethod !== overview.user.default_screening_method
    || profileDraft.notificationPreference !== overview.user.notification_preference
  );

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

  async function handleSaveProfile() {
    const token = await getToken();
    if (!token || !overview || !profileDirty) return;
    setSavingProfile(true);
    try {
      const updatedUser = await updateAccountProfile(
        {
          displayName: profileDraft.name,
          preferredIndex: profileDraft.preferredIndex,
          defaultScreeningMethod: profileDraft.defaultMethod,
          notificationPreference: profileDraft.notificationPreference,
        },
        token,
      );
      setOverview((current) => current ? { ...current, user: { ...current.user, ...updatedUser } } : current);
      setBanner("Profile settings updated.");
      setActiveEditor(null);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Could not update your profile right now.");
    } finally {
      setSavingProfile(false);
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
            <Link href="/sign-in?redirect=%2Faccount" className={styles.ghostButton}>Log in</Link>
            <Link href="/sign-up?redirect=%2Faccount" className={styles.solidButton}>Get started</Link>
          </div>
        </div>
      </main>
    );
  }

  if (error || !overview) {
    return <main className={`${styles.page} ${inter.className}`}><div className={styles.loading}>{error || "Could not load your account."}</div></main>;
  }

  const includedFeatures = [
    "Basic screener access",
    "Search and filter Indian stocks",
    "Basic Shariah status preview",
    "50 detailed BarakFi stock-page report opens per month",
    "Watchlist up to 25 stocks",
    "Zakat & purification calculators",
    "Download your own account data",
  ];

  const excludedFeatures = [
    "Compliance alerts",
    "Advanced ratio filters",
    "Historical compliance tracking",
    "Portfolio compliance overview",
    "CSV export of BarakFi screening results",
    "Compare by BarakFi score",
  ];

  return (
    <main className={`${styles.page} ${inter.className}`}>
      <GlobalMarketTicker />

      <LocalMarketingNav />

      <div className={styles.pageWrap}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarUser}>
            <div className={`${styles.userAvatar} ${serif.className}`}>{initial}</div>
            <div className={styles.userName}>{displayName}</div>
            <div className={styles.userEmail}>{displayEmail}</div>
            <div className={styles.userPlan}><span className={styles.planDot} /> FREE PLAN</div>
          </div>

          <div className={styles.navSectionLabel}>Account</div>
          <a className={`${styles.navLink} ${styles.active}`} href="#overview"><SidebarIcon kind="overview" /> <span>Overview</span></a>
          <a className={styles.navLink} href="#profile"><SidebarIcon kind="profile" /> <span>Profile</span></a>
          <a className={styles.navLink} href="#watchlist"><SidebarIcon kind="watchlist" /> <span>Watchlist</span><span className={styles.navBadge}>{overview.usage.watchlist_count}</span></a>
          <a className={styles.navLink} href="#alerts"><SidebarIcon kind="alerts" /> <span>Alerts</span></a>

          <div className={styles.navSectionLabel}>Tools</div>
          <Link className={styles.navLink} href="/screener"><SidebarIcon kind="screener" /> <span>Screener</span></Link>
          <Link className={styles.navLink} href="/tools?tab=zakat"><SidebarIcon kind="zakat" /> <span>Zakat Calculator</span></Link>
          <Link className={styles.navLink} href="/tools?tab=purification"><SidebarIcon kind="purification" /> <span>Purification</span></Link>

          <div className={styles.navSectionLabel}>Settings</div>
          <a className={styles.navLink} href="#usage"><SidebarIcon kind="plan" /> <span>Plan &amp; Usage</span></a>
          <a className={styles.navLink} href="#security"><SidebarIcon kind="security" /> <span>Security</span></a>

          <div className={styles.sidebarBottom}>
            <SignOutButton>
              <button type="button" className={styles.signOutButton}><SidebarIcon kind="signout" /> <span>Sign Out</span></button>
            </SignOutButton>
          </div>
        </aside>

        <section className={styles.main}>
          <header className={styles.pageHeader} id="overview">
            <div className={styles.pageEyebrow}>Account · Usage &amp; watchlist</div>
            <h1 className={`${styles.pageTitle} ${serif.className}`}>Manage your <span>BarakFi</span> workflow</h1>
            <p className={styles.pageSub}>Your BarakFi account tracks stock-page report usage, watchlist capacity, export requests, and future Pro waitlist joins. Searching and browsing do not use your monthly report credits.</p>
          </header>

          {banner ? <div className={styles.banner}>{banner}</div> : null}

          <section className={styles.statsStrip}>
            <div className={styles.stripStat}><div className={`${styles.stripValue} ${serif.className}`}>{overview.usage.reports_used}<span>/{overview.usage.reports_limit}</span></div><div className={styles.stripLabel}>Screening reports used</div></div>
            <div className={styles.stripStat}><div className={`${styles.stripValue} ${serif.className}`}>{overview.usage.watchlist_count}<span>/{overview.usage.watchlist_limit}</span></div><div className={styles.stripLabel}>Watchlist stocks</div></div>
            <div className={styles.stripStat}><div className={`${styles.stripValue} ${serif.className}`}>{overview.usage.reports_remaining}</div><div className={styles.stripLabel}>Reports remaining</div></div>
            <div className={styles.stripStat}><div className={`${styles.stripValue} ${serif.className}`}>{formatDate(overview.usage.reset_date)}</div><div className={styles.stripLabel}>Usage reset date</div></div>
          </section>

          <section className={styles.section} id="profile">
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Profile</div>
              <button type="button" className={styles.sectionAction} disabled={!profileDirty || savingProfile} onClick={() => void handleSaveProfile()}>
                {savingProfile ? "Saving..." : "Save changes →"}
              </button>
            </div>

            <div className={styles.profileGrid}>
              <div className={`${styles.fieldBlock} ${activeEditor === "name" ? styles.fieldBlockActive : ""}`}>
                <div className={styles.fieldMeta}><div className={styles.fieldLabel}>Full Name</div><button type="button" className={styles.fieldEdit} onClick={() => setActiveEditor(activeEditor === "name" ? null : "name")}>Edit</button></div>
                <div className={styles.fieldValue}>{profileDraft.name}</div>
                {activeEditor === "name" ? <input className={styles.inlineInput} value={profileDraft.name} onChange={(e) => setProfileDraft((current) => ({ ...current, name: e.target.value }))} /> : null}
              </div>

              <div className={styles.fieldBlock}>
                <div className={styles.fieldMeta}><div className={styles.fieldLabel}>Email Address</div><button type="button" className={styles.fieldEdit} onClick={() => setBanner("Email address is managed through your sign-in provider.")}>Edit</button></div>
                <div className={styles.fieldValue}>{displayEmail}</div>
              </div>

              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabel}>Member Since</div>
                <div className={styles.fieldValue}>{formatDate(overview.user.member_since)}</div>
              </div>

              <div className={`${styles.fieldBlock} ${activeEditor === "defaultMethod" ? styles.fieldBlockActive : ""}`}>
                <div className={styles.fieldMeta}><div className={styles.fieldLabel}>Default Screening Method</div><button type="button" className={styles.fieldEdit} onClick={() => setActiveEditor(activeEditor === "defaultMethod" ? null : "defaultMethod")}>Edit</button></div>
                <div className={styles.fieldValue}>{profileDraft.defaultMethod}</div>
                {activeEditor === "defaultMethod" ? (
                  <select className={styles.inlineSelect} value={profileDraft.defaultMethod} onChange={(e) => setProfileDraft((current) => ({ ...current, defaultMethod: e.target.value }))}>
                    <option>AAOIFI Aligned</option>
                  </select>
                ) : null}
              </div>

              <div className={`${styles.fieldBlock} ${activeEditor === "preferredIndex" ? styles.fieldBlockActive : ""}`}>
                <div className={styles.fieldMeta}><div className={styles.fieldLabel}>Preferred Index</div><button type="button" className={styles.fieldEdit} onClick={() => setActiveEditor(activeEditor === "preferredIndex" ? null : "preferredIndex")}>Edit</button></div>
                <div className={styles.fieldValue}>{profileDraft.preferredIndex}</div>
                {activeEditor === "preferredIndex" ? (
                  <select className={styles.inlineSelect} value={profileDraft.preferredIndex} onChange={(e) => setProfileDraft((current) => ({ ...current, preferredIndex: e.target.value }))}>
                    <option>NIFTY 50</option>
                    <option>NIFTY 500</option>
                    <option>NIFTY NEXT 50</option>
                  </select>
                ) : null}
              </div>

              <div className={`${styles.fieldBlock} ${activeEditor === "notificationPreference" ? styles.fieldBlockActive : ""}`}>
                <div className={styles.fieldMeta}><div className={styles.fieldLabel}>Notification Preference</div><button type="button" className={styles.fieldEdit} onClick={() => setActiveEditor(activeEditor === "notificationPreference" ? null : "notificationPreference")}>Edit</button></div>
                <div className={styles.fieldValue}>{profileDraft.notificationPreference}</div>
                {activeEditor === "notificationPreference" ? (
                  <select className={styles.inlineSelect} value={profileDraft.notificationPreference} onChange={(e) => setProfileDraft((current) => ({ ...current, notificationPreference: e.target.value }))}>
                    <option>Email · Weekly digest</option>
                    <option>Email · Monthly digest</option>
                    <option>Product updates only</option>
                  </select>
                ) : null}
              </div>
            </div>
          </section>

          <section className={styles.section} id="watchlist">
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Watchlist</div>
              <Link href="/watchlist" className={styles.sectionAction}>Open full watchlist →</Link>
            </div>
            <table className={styles.wlTable}>
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
            <div className={styles.sectionHead}><div className={styles.sectionTitle}>Alerts</div></div>
            <div className={styles.comingSoonCard}>
              <div className={styles.comingSoonTag}>Coming Soon</div>
              <h3 className={`${styles.sectionHeading} ${serif.className}`}>Compliance Alerts</h3>
              <p className={styles.sectionBody}>Alerts are planned for BarakFi Pro. You’ll be able to track saved stocks and get notified when a company’s Shariah status changes, quarterly results are refreshed, or a stock moves into Requires Review. This feature is not active yet.</p>
              <button type="button" className={styles.outlineButton} onClick={() => void handleJoinWaitlist("alerts", "alerts_section")}>
                {overview.waitlist.joined_alerts ? "Joined Alerts Waitlist" : "Join Alerts Waitlist"}
              </button>
            </div>
          </section>

          <section className={styles.section} id="usage">
            <div className={styles.sectionHead}><div className={styles.sectionTitle}>Plan &amp; Usage</div></div>
            <div className={styles.planLayout}>
              <div className={styles.planCurrent}>
                <div className={styles.planSectionLabel}>Plan &amp; Usage</div>
                <div className={`${styles.planName} ${serif.className}`}>BarakFi Free</div>
                <div className={styles.planDescription}>BarakFi Free: 50 detailed stock screening reports per month. Unlimited screener access, watchlist, and calculators. Create a free account.</div>
                <div className={styles.planFeatureRows}>
                  {includedFeatures.map((item) => (
                    <div className={styles.planFeatureRow} key={item}>
                      <FeatureIcon enabled />
                      <span>{item}</span>
                    </div>
                  ))}
                  {excludedFeatures.map((item) => (
                    <div className={`${styles.planFeatureRow} ${styles.planFeatureRowMuted}`} key={item}>
                      <FeatureIcon enabled={false} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.planUpgrade}>
                <div className={styles.upgradeTag}>Coming Soon</div>
                <div className={`${styles.upgradeTitle} ${serif.className}`}>BarakFi <span>Pro</span></div>
                <div className={styles.upgradeBody}>Planned features include unlimited BarakFi screening reports, compliance alerts, advanced ratio filters, historical tracking, portfolio compliance overview, unlimited watchlist, CSV export of BarakFi verdicts, and compare stocks by screening factors.</div>
                <button type="button" className={styles.solidButton} onClick={() => void handleJoinWaitlist("pro", "account_page")}>
                  {overview.waitlist.joined_pro ? "Joined Pro Waitlist" : "Join Pro Waitlist"}
                </button>
              </div>
            </div>
          </section>

          <section className={styles.section} id="security">
            <div className={styles.sectionHead}><div className={styles.sectionTitle}>Security &amp; Data</div></div>
            <div className={styles.profileGrid}>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldMeta}><div className={styles.fieldLabel}>Authentication</div><button type="button" className={styles.fieldEdit} onClick={() => setBanner("Authentication and sessions are managed by Clerk.")}>Info</button></div>
                <div className={styles.fieldValue}>Signed in with Clerk</div>
              </div>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldMeta}><div className={styles.fieldLabel}>Account Data Export</div><button type="button" className={styles.fieldEdit} onClick={() => void handleExport()}>{exportState ? "Queued" : "Request"}</button></div>
                <div className={styles.fieldValue}>{exportState ? "Export requested" : "Download your own account data"}</div>
              </div>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldMeta}><div className={styles.fieldLabel}>Email Security</div><button type="button" className={styles.fieldEdit} onClick={() => setBanner("Update email and security details from your Clerk account controls.")}>Managed</button></div>
                <div className={styles.fieldValue}>Managed by your sign-in provider</div>
              </div>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldMeta}><div className={styles.fieldLabel}>Account Deletion</div><button type="button" className={styles.fieldEdit} onClick={() => void handleDeleteRequest()}>{deletionState ? "Queued" : "Request"}</button></div>
                <div className={styles.fieldValue}>{deletionState ? "Deletion requested" : "Request account deletion"}</div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}><div className={styles.sectionTitle}>Recent report history</div></div>
            <table className={styles.wlTable}>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={3} className={styles.emptyRow}>Open a stock page to start building your history.</td></tr>
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
        </section>
      </div>
    </main>
  );
}
