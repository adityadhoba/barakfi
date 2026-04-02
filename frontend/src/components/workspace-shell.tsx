import styles from "@/app/page.module.css";
import ws from "./workspace-hero.module.css";
import { ResearchNotePanel } from "@/components/research-note-panel";
import { ComplianceCheckPanel } from "@/components/compliance-check-panel";
import { SavedScreenerPanel } from "@/components/saved-screener-panel";
import { WatchlistPanel } from "@/components/watchlist-panel";
import { ActivityFeedPanel } from "@/components/activity-feed-panel";
import { PortfolioDashboard } from "@/components/portfolio-dashboard";
import {
  bootstrapAuthenticatedUser,
  getAuthenticatedAlerts,
  getAuthenticatedWorkspace,
  getBulkScreeningResults,
  getStocks,
  getWorkspace,
} from "@/lib/api";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { AdUnit } from "@/components/ad-unit";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number) {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)} Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)} L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function BackendUnavailableState() {
  return (
    <main className="shellPage">
    <section className={styles.onboardingState}>
      <div className={styles.onboardingCard}>
        <p className="shellKicker">Temporarily unavailable</p>
        <h2 className="shellH2">We can&apos;t load your portfolio right now</h2>
        <p className="shellSub">
          This usually fixes itself in a few seconds. Try refreshing.
        </p>
        <div className={styles.ctaRow}>
          <Link className={styles.primaryCta} href="/workspace">Refresh</Link>
          <Link className={styles.secondaryCta} href="/screener">Browse stocks</Link>
        </div>
      </div>
    </section>
    </main>
  );
}

function OnboardingRequiredState() {
  return (
    <main className="shellPage">
    <section className={styles.onboardingState}>
      <div className={styles.onboardingCard}>
        <p className="shellKicker">Almost there</p>
        <h2 className="shellH2">Let&apos;s set up your portfolio</h2>
        <p className="shellSub">
          We&apos;ll create your workspace with a starter watchlist so you can begin tracking stocks right away.
        </p>
        <div className={styles.ctaRow}>
          <Link className={styles.primaryCta} href="/onboarding">Get started</Link>
        </div>
      </div>
    </section>
    </main>
  );
}

async function loadWorkspaceForUser(params: {
  email: string;
  displayName: string;
  authSubject: string;
  sessionToken: string;
}) {
  const actor = { authSubject: params.authSubject, email: params.email };
  try {
    return await getAuthenticatedWorkspace(params.sessionToken, actor);
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 404) {
      try {
        await bootstrapAuthenticatedUser(params.sessionToken, {
          email: params.email,
          displayName: params.displayName,
          authProvider: "clerk",
          authSubject: params.authSubject,
        }, actor);
        return await getAuthenticatedWorkspace(params.sessionToken, actor);
      } catch { return null; }
    }
    try { return await getWorkspace(params.authSubject); } catch { return undefined; }
  }
}

export async function WorkspaceShell() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;

  if (!clerkUser || !email) {
    throw new Error("Signed-in Clerk user is required to load the workspace.");
  }

  const sessionToken = await authState.getToken();
  if (!sessionToken) {
    throw new Error("Unable to retrieve Clerk session token.");
  }

  const actor = { authSubject: clerkUser.id, email };
  const workspace = await loadWorkspaceForUser({
    email,
    displayName: clerkUser.firstName || clerkUser.fullName || "Investor",
    authSubject: clerkUser.id,
    sessionToken,
  });

  if (workspace === undefined) return <BackendUnavailableState />;
  if (!workspace) return <OnboardingRequiredState />;

  const [alerts, stocks] = await Promise.all([
    getAuthenticatedAlerts(sessionToken, actor).catch(() => []),
    getStocks(),
  ]);

  const {
    activity_feed: activityFeed,
    dashboard,
    research_notes: researchNotes,
    portfolios,
    compliance_check: complianceCheck,
    saved_screeners: savedScreeners,
    watchlist,
    user,
  } = workspace;

  const sectors = [...new Set(stocks.map((s) => s.sector))].sort();
  const activePortfolio = portfolios[0];

  // Fetch compliance statuses for holdings
  const holdingSymbols = activePortfolio?.holdings?.map((h) => h.stock.symbol) || [];
  const screeningResults = holdingSymbols.length > 0
    ? await getBulkScreeningResults(holdingSymbols).catch(() => [])
    : [];
  const screeningStatuses = screeningResults.map((r) => ({ symbol: r.symbol, status: r.status }));

  const urgentAlerts = alerts.filter((a) => a.level === "critical" || a.level === "warning");
  const firstName = user.display_name.split(" ")[0];

  const totalHoldings = dashboard.holding_count;
  const halalPct = totalHoldings > 0 ? Math.round((dashboard.halal_holdings / totalHoldings) * 100) : 0;
  const journeySteps = [
    { label: "Create account", done: true },
    { label: "Add to watchlist", done: dashboard.watchlist_count > 0 },
    { label: "Screen stocks", done: savedScreeners.length > 0 || researchNotes.length > 0 },
    { label: "Add first research note", done: researchNotes.length > 0 },
    { label: "Build portfolio", done: totalHoldings > 0 },
  ];
  const stepsCompleted = journeySteps.filter((s) => s.done).length;

  return (
    <main className="shellPage">
      {/* ── Welcome Header ── */}
      <section className="shellHero">
        <div className="shellCard">
          <h1 className="shellH1">
            {greeting()}, {firstName}
          </h1>
          <p className="shellSub">
            {totalHoldings > 0
              ? `Tracking ${totalHoldings} holding${totalHoldings > 1 ? "s" : ""} and ${dashboard.watchlist_count} watchlist stock${dashboard.watchlist_count !== 1 ? "s" : ""}.`
              : "Start by adding stocks to your watchlist from the screener."}
          </p>

          {/* ── Stats Strip ── */}
          {totalHoldings > 0 && (
            <div className={ws.statsStrip}>
              <div className={ws.statBlock}>
                <span className={ws.statValue}>{formatCurrency(dashboard.portfolio_market_value)}</span>
                <span className={ws.statLabel}>Portfolio value</span>
              </div>
              <div className={ws.statDivider} />
              <div className={ws.statBlock}>
                <span className={ws.statValue}>{halalPct}%</span>
                <span className={ws.statLabel}>Halal compliance</span>
              </div>
              <div className={ws.statDivider} />
              <div className={ws.statBlock}>
                <span className={ws.statValue}>{dashboard.halal_holdings}</span>
                <span className={ws.statLabel}>Halal stocks</span>
              </div>
              {dashboard.non_compliant_holdings > 0 && (
                <>
                  <div className={ws.statDivider} />
                  <div className={ws.statBlock}>
                    <span className={`${ws.statValue} ${ws.statWarn}`}>{dashboard.non_compliant_holdings}</span>
                    <span className={ws.statLabel}>Need attention</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Journey progress ── */}
          <div className={ws.journeySection}>
            <div className={ws.journeyHeader}>
              <span className={ws.journeyTitle}>Your investment journey</span>
              <span className={ws.journeyCount}>{stepsCompleted}/{journeySteps.length}</span>
            </div>
            <div className={ws.journeyTrack}>
              {journeySteps.map((step) => (
                <div className={ws.journeyStep} key={step.label}>
                  <span className={step.done ? ws.stepDone : ws.stepPending}>
                    {step.done ? "✓" : "○"}
                  </span>
                  <span className={step.done ? ws.stepLabelDone : ws.stepLabelPending}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className={ws.quickActions}>
            <Link href="/screener" className={ws.actionBtn}>
              <span className={ws.actionIcon}>◎</span> Find stocks
            </Link>
            {totalHoldings === 0 && (
              <Link href="/screener" className={ws.actionBtnPrimary}>
                <span className={ws.actionIcon}>+</span> Add first holding
              </Link>
            )}
          </div>
        </div>

        <div className="shellMetricCol">
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Portfolio value</span>
            <strong>{formatCurrency(dashboard.portfolio_market_value)}</strong>
            <p>{dashboard.halal_holdings} halal &middot; {dashboard.non_compliant_holdings} flagged</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Compliance</span>
            <strong style={{ color: halalPct >= 80 ? "var(--emerald)" : halalPct >= 50 ? "var(--gold)" : "var(--red)" }}>
              {halalPct}%
            </strong>
            <p>{totalHoldings > 0 ? `${dashboard.halal_holdings} of ${totalHoldings} stocks are halal` : "No holdings yet"}</p>
            {totalHoldings > 0 && (
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: "var(--bg-soft)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${halalPct}%`,
                    borderRadius: 2,
                    background: halalPct >= 80 ? "var(--emerald)" : halalPct >= 50 ? "var(--gold)" : "var(--red)",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            )}
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Watchlist</span>
            <strong>{dashboard.watchlist_count} stocks</strong>
            <p>Research candidates</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Activity</span>
            <strong>{researchNotes.length}</strong>
            <p>{researchNotes.length} research note{researchNotes.length !== 1 ? "s" : ""}</p>
          </article>
        </div>
      </section>

      {/* ── Alerts ── */}
      {urgentAlerts.length > 0 && (
        <section className={`shellSection ${styles.featurePanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Needs attention</p>
              <h3>{urgentAlerts.length} alert{urgentAlerts.length > 1 ? "s" : ""}</h3>
            </div>
          </div>
          <div className={styles.simpleList}>
            {urgentAlerts.slice(0, 4).map((alert) => (
              <div className={styles.simpleRow} key={`${alert.level}-${alert.title}`}>
                <div>
                  <strong>{alert.title}</strong>
                  <span className={alert.level === "critical" ? styles.statusCritical : styles.statusWarning}>
                    {alert.level === "critical" ? "Urgent" : "Warning"}
                  </span>
                </div>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Portfolio Dashboard ── */}
      {activePortfolio?.holdings && activePortfolio.holdings.length > 0 ? (
        <section className="shellSection">
          <PortfolioDashboard
            holdings={activePortfolio.holdings}
            screeningStatuses={screeningStatuses}
            portfolioName={activePortfolio.name || "Portfolio"}
          />
        </section>
      ) : (
        <section className={`shellSection ${styles.featurePanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Your holdings</p>
              <h3>{activePortfolio?.name || "Portfolio"}</h3>
            </div>
            <Link className={styles.pill} href="/screener">+ Add stocks</Link>
          </div>
          <div className={styles.emptyState}>
            <p>No holdings yet. Use the screener to find halal stocks, then add them here.</p>
            <Link className={styles.primaryCta} href="/screener" style={{ marginTop: 12 }}>
              Find stocks &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* ── Watchlist ── */}
      <section className={`shellSection ${styles.featurePanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Watchlist</p>
            <h3>Stocks you&apos;re tracking</h3>
          </div>
        </div>
        <WatchlistPanel entries={watchlist} />
      </section>

      {/* ── Compliance Check ── */}
      <section className={`shellSection ${styles.featurePanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Compliance Check</p>
            <h3>Portfolio compliance</h3>
          </div>
        </div>
        <ComplianceCheckPanel checks={complianceCheck} />
      </section>

      {/* ── Research ── */}
      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Saved screens</p>
              <h3>Your screeners</h3>
            </div>
          </div>
          <SavedScreenerPanel
            allowCreate={true}
            gateMessage=""
            initialScreeners={savedScreeners}
            sectors={sectors}
          />
        </article>

        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Research Notes</p>
              <h3>Your research notes</h3>
            </div>
          </div>
          <ResearchNotePanel notes={researchNotes} />
        </article>
      </section>

      {/* ── Activity ── */}
      <section className={`shellSection ${styles.featurePanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Activity</p>
            <h3>Recent activity</h3>
          </div>
        </div>
        <ActivityFeedPanel events={activityFeed} />
      </section>

      {/* ── Ad: bottom of dashboard ── */}
      <AdUnit format="banner" />
    </main>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
