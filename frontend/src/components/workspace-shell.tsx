import styles from "@/app/page.module.css";
import ws from "./workspace-hero.module.css";
import { ResearchNotePanel } from "@/components/research-note-panel";
import { ComplianceCheckPanel } from "@/components/compliance-check-panel";
import { WatchlistPanel } from "@/components/watchlist-panel";
import { PortfolioDashboard } from "@/components/portfolio-dashboard";
import { AddHoldingButton } from "@/components/add-holding-modal";
import { PortfolioTabs } from "@/components/portfolio-tabs";
import { BrokerConnectButton } from "@/components/broker-connect-modal";
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
          <h2 className="shellH2">Can&apos;t load your data right now</h2>
          <p className="shellSub">Try refreshing in a few seconds.</p>
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
            We&apos;ll set up your portfolio so you can track halal stocks.
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
    throw new Error("Signed-in Clerk user is required.");
  }

  const sessionToken = await authState.getToken();
  if (!sessionToken) {
    throw new Error("Unable to retrieve session token.");
  }

  const workspace = await loadWorkspaceForUser({
    email,
    displayName: clerkUser.firstName || clerkUser.fullName || "Investor",
    authSubject: clerkUser.id,
    sessionToken,
  });

  if (workspace === undefined) return <BackendUnavailableState />;
  if (!workspace) return <OnboardingRequiredState />;

  const actor = { authSubject: clerkUser.id, email };
  const alerts = await getAuthenticatedAlerts(sessionToken, actor).catch(() => []);

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

  const allStocks = await getStocks().catch(() => []);
  const stockOptions = allStocks.map((s) => ({ symbol: s.symbol, name: s.name }));

  const urgentAlerts = alerts.filter((a) => a.level === "critical" || a.level === "warning");
  const firstName = user.display_name.split(" ")[0];
  const totalHoldings = dashboard.holding_count;
  const halalPct = totalHoldings > 0 ? Math.round((dashboard.halal_holdings / totalHoldings) * 100) : 0;
  const hasHoldings = activePortfolio?.holdings && activePortfolio.holdings.length > 0;

  return (
    <main className="shellPage">
      {/* ── Compact header with metrics ── */}
      <div className={ws.dashHeader}>
        <div className={ws.dashHeaderLeft}>
          <h1 className={ws.dashTitle}>{firstName}&apos;s Portfolio</h1>
          <div className={ws.dashActions}>
            <AddHoldingButton stocks={stockOptions} />
            <BrokerConnectButton />
            <Link href="/screener" className={ws.actionBtn}>
              Screen stocks
            </Link>
            <Link href="/watchlist" className={ws.actionBtn}>
              Watchlist ({dashboard.watchlist_count})
            </Link>
            <Link href="/tools" className={ws.actionBtn}>
              Calculators
            </Link>
          </div>
        </div>

        {totalHoldings > 0 && (
          <div className={ws.metricsRow}>
            <div className={ws.metricChip}>
              <span className={ws.metricChipLabel}>Value</span>
              <span className={ws.metricChipValue}>{formatCurrency(dashboard.portfolio_market_value)}</span>
            </div>
            <div className={ws.metricChip}>
              <span className={ws.metricChipLabel}>Halal</span>
              <span className={`${ws.metricChipValue} ${halalPct >= 80 ? ws.metricGood : halalPct >= 50 ? ws.metricWarn : ws.metricBad}`}>
                {halalPct}%
              </span>
            </div>
            <div className={ws.metricChip}>
              <span className={ws.metricChipLabel}>Holdings</span>
              <span className={ws.metricChipValue}>{totalHoldings}</span>
            </div>
            {dashboard.non_compliant_holdings > 0 && (
              <div className={`${ws.metricChip} ${ws.metricChipAlert}`}>
                <span className={ws.metricChipLabel}>Flagged</span>
                <span className={`${ws.metricChipValue} ${ws.metricBad}`}>{dashboard.non_compliant_holdings}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Alerts ── */}
      {urgentAlerts.length > 0 && (
        <section className={ws.alertsSection}>
          {urgentAlerts.slice(0, 3).map((alert) => (
            <div className={`${ws.alertCard} ${alert.level === "critical" ? ws.alertCritical : ws.alertWarning}`} key={`${alert.level}-${alert.title}`}>
              <span className={ws.alertIcon}>{alert.level === "critical" ? "!" : "\u26A0"}</span>
              <div>
                <strong className={ws.alertTitle}>{alert.title}</strong>
                <p className={ws.alertMsg}>{alert.message}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Portfolio Tabs (Stocks / Mutual Funds / Gold) ── */}
      <PortfolioTabs>
        {hasHoldings ? (
          <PortfolioDashboard
            holdings={activePortfolio.holdings}
            screeningStatuses={screeningStatuses}
            portfolioName={activePortfolio.name || "Portfolio"}
          />
        ) : (
          <section className={ws.emptySection}>
            <div className={ws.emptyCard}>
              <span className={ws.emptyIcon}>&#x1F4BC;</span>
              <h3 className={ws.emptyTitle}>No holdings yet</h3>
              <p className={ws.emptyDesc}>
                Add stocks you own or connect your broker to import holdings automatically.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <AddHoldingButton stocks={stockOptions} />
                <BrokerConnectButton />
                <Link className={ws.actionBtn} href="/screener">
                  Browse screener
                </Link>
              </div>
            </div>
          </section>
        )}
      </PortfolioTabs>

      {/* ── Watchlist ── */}
      {watchlist.length > 0 && (
        <section className={`shellSection ${styles.featurePanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Watchlist</p>
              <h3>Tracking {watchlist.length} stock{watchlist.length !== 1 ? "s" : ""}</h3>
            </div>
            <Link className={styles.pill} href="/watchlist">View all</Link>
          </div>
          <WatchlistPanel entries={watchlist} />
        </section>
      )}

      {/* ── Compliance alerts ── */}
      {complianceCheck.length > 0 && (
        <section className={`shellSection ${styles.featurePanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Rebalancing</p>
              <h3>Compliance alerts ({complianceCheck.length})</h3>
            </div>
          </div>
          <ComplianceCheckPanel checks={complianceCheck} />
        </section>
      )}

      {/* ── Research notes ── */}
      {researchNotes.length > 0 && (
        <section className={`shellSection ${styles.featurePanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Research</p>
              <h3>Your notes ({researchNotes.length})</h3>
            </div>
          </div>
          <ResearchNotePanel notes={researchNotes} />
        </section>
      )}
    </main>
  );
}
