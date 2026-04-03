import styles from "@/app/page.module.css";
import ws from "./workspace-hero.module.css";
import { ResearchNotePanel } from "@/components/research-note-panel";
import { ComplianceCheckPanel } from "@/components/compliance-check-panel";
import { WatchlistPanel } from "@/components/watchlist-panel";
import { PortfolioDashboard } from "@/components/portfolio-dashboard";
import { PurificationCalculator } from "@/components/purification-calculator";
import { ZakatCalculator } from "@/components/zakat-calculator";
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
import { Logo } from "@/components/logo";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
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
          <Logo size={36} showText={false} />
          <h2 className="shellH2" style={{ marginTop: 16 }}>Welcome to Barakfi</h2>
          <p className="shellSub">
            Let&apos;s set up your workspace. We&apos;ll create your portfolio and watchlist so you can start tracking halal stocks.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.primaryCta} href="/onboarding">Get started</Link>
            <Link className={styles.secondaryCta} href="/screener">Browse stocks first</Link>
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
    dashboard,
    research_notes: researchNotes,
    portfolios,
    compliance_check: complianceCheck,
    watchlist,
    user,
  } = workspace;

  const activePortfolio = portfolios[0];
  const holdingSymbols = activePortfolio?.holdings?.map((h) => h.stock.symbol) || [];
  const screeningResults = holdingSymbols.length > 0
    ? await getBulkScreeningResults(holdingSymbols).catch(() => [])
    : [];
  const screeningStatuses = screeningResults.map((r) => ({ symbol: r.symbol, status: r.status }));

  const urgentAlerts = alerts.filter((a) => a.level === "critical" || a.level === "warning");
  const firstName = user.display_name.split(" ")[0];

  const totalHoldings = dashboard.holding_count;
  const halalPct = totalHoldings > 0 ? Math.round((dashboard.halal_holdings / totalHoldings) * 100) : 0;
  const hasHoldings = activePortfolio?.holdings && activePortfolio.holdings.length > 0;

  return (
    <main className="shellPage">
      {/* ── Hero: Clean greeting + key stats ── */}
      <section className={ws.heroSection}>
        <div className={ws.heroLeft}>
          <h1 className={ws.heroTitle}>{greeting()}, {firstName}</h1>
          <p className={ws.heroSub}>
            {totalHoldings > 0
              ? `${totalHoldings} holding${totalHoldings > 1 ? "s" : ""} · ${dashboard.watchlist_count} watchlist · ${researchNotes.length} note${researchNotes.length !== 1 ? "s" : ""}`
              : "Start by screening stocks and adding them to your watchlist."}
          </p>
          <div className={ws.quickActions}>
            <Link href="/screener" className={ws.actionBtnPrimary}>
              <span className={ws.actionIcon}>&#x25CB;</span> Screen stocks
            </Link>
            <Link href="/watchlist" className={ws.actionBtn}>
              Watchlist
            </Link>
          </div>
        </div>

        {/* Key metrics — only show if user has holdings */}
        {totalHoldings > 0 && (
          <div className={ws.metricsGrid}>
            <div className={ws.metricCard}>
              <span className={ws.metricLabel}>Portfolio Value</span>
              <span className={ws.metricValue}>{formatCurrency(dashboard.portfolio_market_value)}</span>
            </div>
            <div className={ws.metricCard}>
              <span className={ws.metricLabel}>Halal Compliance</span>
              <span className={`${ws.metricValue} ${halalPct >= 80 ? ws.metricGood : halalPct >= 50 ? ws.metricWarn : ws.metricBad}`}>
                {halalPct}%
              </span>
              <div className={ws.complianceBar}>
                <div
                  className={`${ws.complianceFill} ${halalPct >= 80 ? ws.fillGood : halalPct >= 50 ? ws.fillWarn : ws.fillBad}`}
                  style={{ width: `${halalPct}%` }}
                />
              </div>
            </div>
            <div className={ws.metricCard}>
              <span className={ws.metricLabel}>Halal</span>
              <span className={`${ws.metricValue} ${ws.metricGood}`}>{dashboard.halal_holdings}</span>
            </div>
            {dashboard.non_compliant_holdings > 0 && (
              <div className={ws.metricCard}>
                <span className={ws.metricLabel}>Needs Attention</span>
                <span className={`${ws.metricValue} ${ws.metricBad}`}>{dashboard.non_compliant_holdings}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Alerts ── */}
      {urgentAlerts.length > 0 && (
        <section className={ws.alertsSection}>
          {urgentAlerts.slice(0, 3).map((alert) => (
            <div className={`${ws.alertCard} ${alert.level === "critical" ? ws.alertCritical : ws.alertWarning}`} key={`${alert.level}-${alert.title}`}>
              <span className={ws.alertIcon}>{alert.level === "critical" ? "!" : "⚠"}</span>
              <div>
                <strong className={ws.alertTitle}>{alert.title}</strong>
                <p className={ws.alertMsg}>{alert.message}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Portfolio Holdings ── */}
      {hasHoldings ? (
        <section className="shellSection">
          <PortfolioDashboard
            holdings={activePortfolio.holdings}
            screeningStatuses={screeningStatuses}
            portfolioName={activePortfolio.name || "Portfolio"}
          />
        </section>
      ) : (
        <section className={ws.emptySection}>
          <div className={ws.emptyCard}>
            <span className={ws.emptyIcon}>&#x1F4BC;</span>
            <h3 className={ws.emptyTitle}>No holdings yet</h3>
            <p className={ws.emptyDesc}>
              Use the screener to find Shariah-compliant stocks, add them to your watchlist, then build your portfolio.
            </p>
            <Link className={ws.actionBtnPrimary} href="/screener">
              Find halal stocks &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* ── Watchlist (always visible) ── */}
      <section className={`shellSection ${styles.featurePanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Watchlist</p>
            <h3>Stocks you&apos;re tracking ({watchlist.length})</h3>
          </div>
          <Link className={styles.pill} href="/watchlist">View all</Link>
        </div>
        <WatchlistPanel entries={watchlist} />
      </section>

      {/* ── Islamic Finance Tools ── */}
      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel} style={{ padding: 0, border: "none", background: "none" }}>
          <PurificationCalculator />
        </article>
        <article className={styles.featurePanel} style={{ padding: 0, border: "none", background: "none" }}>
          <ZakatCalculator
            portfolioValue={dashboard.portfolio_market_value}
            holdingCount={totalHoldings}
          />
        </article>
      </section>

      {/* ── Compliance + Research (side by side) ── */}
      {(complianceCheck.length > 0 || researchNotes.length > 0) && (
        <section className={`shellSection ${styles.featureGrid}`}>
          {complianceCheck.length > 0 && (
            <article className={styles.featurePanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.kicker}>Compliance</p>
                  <h3>Rebalancing alerts</h3>
                </div>
              </div>
              <ComplianceCheckPanel checks={complianceCheck} />
            </article>
          )}

          {researchNotes.length > 0 && (
            <article className={styles.featurePanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.kicker}>Research</p>
                  <h3>Your notes ({researchNotes.length})</h3>
                </div>
              </div>
              <ResearchNotePanel notes={researchNotes} />
            </article>
          )}
        </section>
      )}
    </main>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
