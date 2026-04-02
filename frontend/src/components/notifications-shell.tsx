import styles from "@/app/page.module.css";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  getAuthenticatedActivityFeed,
  getAuthenticatedAlerts,
  type ActivityEvent,
  type Alert,
} from "@/lib/api";
import Link from "next/link";

function categorizeAlerts(alerts: Alert[]) {
  return {
    critical: alerts.filter((item) => item.level === "critical"),
    warning: alerts.filter((item) => item.level === "warning"),
    info: alerts.filter((item) => item.level === "info"),
    success: alerts.filter((item) => item.level === "success"),
  };
}

function filterActivity(events: ActivityEvent[], kind: string) {
  return events.filter((event) => event.kind === kind);
}

export async function NotificationsShell() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    throw new Error("Signed-in Clerk user is required to load notifications.");
  }

  const actor = {
    authSubject: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || null,
  };

  const [alerts, activityFeed] = await Promise.all([
    getAuthenticatedAlerts(token, actor).catch(() => []),
    getAuthenticatedActivityFeed(token, actor).catch(() => []),
  ]);

  const alertGroups = categorizeAlerts(alerts);
  const reviewEvents = filterActivity(activityFeed, "review_case");
  const screeningEvents = filterActivity(activityFeed, "screening");
  const decisionEvents = filterActivity(activityFeed, "decision");

  return (
    <main className="shellPage">
      <section className="shellHero">
        <div className="shellCard">
          <p className="shellKicker">Alerts &amp; activity</p>
          <h1 className="shellH1">
            Stay on top of what matters.
          </h1>
          <p className="shellSub">
            Priority alerts, compliance changes, and research activity — all in one view so
            you can act quickly without switching between modules.
          </p>
        </div>

        <div className="shellMetricCol">
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Plan</span>
            <strong>Free</strong>
            <p>Full access, ad-supported</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Critical</span>
            <strong>{alertGroups.critical.length}</strong>
            <p>Highest priority items</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Review events</span>
            <strong>{reviewEvents.length}</strong>
            <p>Governance changes</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Total signals</span>
            <strong>{alerts.length + activityFeed.length}</strong>
            <p>Combined activity</p>
          </article>
        </div>
      </section>

      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Priority</p>
              <h3>Alerts needing action</h3>
            </div>
            <span className={styles.pill}>
              {alertGroups.critical.length + alertGroups.warning.length} items
            </span>
          </div>
          <div className={styles.simpleList}>
            {[...alertGroups.critical, ...alertGroups.warning].map((item) => (
              <div className={styles.simpleRow} key={`${item.level}-${item.title}`}>
                <div>
                  <strong>{item.title}</strong>
                  <span className={item.level === "critical" ? styles.statusCritical : styles.statusWarning}>
                    {item.level}
                  </span>
                </div>
                <p>{item.message}</p>
              </div>
            ))}
            {alertGroups.critical.length + alertGroups.warning.length === 0 && (
              <p className={styles.emptyState}>No priority alerts right now — all clear.</p>
            )}
          </div>
        </article>

        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Review flow</p>
              <h3>Governance updates</h3>
            </div>
            <span className={styles.pill}>{reviewEvents.length} updates</span>
          </div>
          <div className={styles.simpleList}>
            {reviewEvents.map((item) => (
              <div className={styles.simpleRow} key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.level}</span>
                </div>
                <p>
                  {item.detail}{" "}
                  {item.symbol && (
                    <Link className={styles.inlineLink} href={`/stocks/${encodeURIComponent(item.symbol)}`}>
                      View {item.symbol} →
                    </Link>
                  )}
                </p>
              </div>
            ))}
            {reviewEvents.length === 0 && (
              <p className={styles.emptyState}>No governance updates to show.</p>
            )}
          </div>
        </article>
      </section>

      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Compliance</p>
              <h3>Screening activity</h3>
            </div>
          </div>
          <div className={styles.simpleList}>
            {screeningEvents.map((item) => (
              <div className={styles.simpleRow} key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.level}</span>
                </div>
                <p>
                  {item.detail}{" "}
                  {item.symbol && (
                    <Link className={styles.inlineLink} href={`/stocks/${encodeURIComponent(item.symbol)}`}>
                      View {item.symbol} →
                    </Link>
                  )}
                </p>
              </div>
            ))}
            {screeningEvents.length === 0 && (
              <p className={styles.emptyState}>No screening activity to show.</p>
            )}
          </div>
        </article>

        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Research</p>
              <h3>Research notes</h3>
            </div>
          </div>
          <div className={styles.simpleList}>
            {decisionEvents.map((item) => (
              <div className={styles.simpleRow} key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.level}</span>
                </div>
                <p>
                  {item.detail}{" "}
                  {item.symbol && (
                    <Link className={styles.inlineLink} href={`/stocks/${encodeURIComponent(item.symbol)}`}>
                      View {item.symbol} →
                    </Link>
                  )}
                </p>
              </div>
            ))}
            {decisionEvents.length === 0 && (
              <p className={styles.emptyState}>No decision activity yet.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
