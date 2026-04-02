import styles from "@/app/page.module.css";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getAuthenticatedGovernanceOverview, getAuthenticatedUniversePreview } from "@/lib/api";
import { GovernanceOverrideForm } from "@/components/governance-override-form";
import { GovernanceFeatureFlagForm } from "@/components/governance-feature-flag-form";
import { GovernanceReviewCaseForm } from "@/components/governance-review-case-form";
import { GovernanceReviewCaseUpdateForm } from "@/components/governance-review-case-update-form";
import { GovernanceSupportNoteForm } from "@/components/governance-support-note-form";
import { GovernanceUserStatusForm } from "@/components/governance-user-status-form";
import Link from "next/link";

function GovernanceDeniedState() {
  return (
    <main className="shellPage">
      <section className={styles.onboardingState}>
        <div className={styles.onboardingCard}>
          <p className="shellKicker">Access restricted</p>
          <h2 className="shellH2">Admin privileges required</h2>
          <p className="shellSub">
            This governance console is only available to administrators. Contact the founder
            if you need access.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.secondaryCta} href="/workspace">
              Back to workspace
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export async function GovernanceShell() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    throw new Error("Signed-in Clerk user is required to load governance.");
  }

  const actor = {
    authSubject: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || null,
  };

  let overview;
  let universePreview = null;
  try {
    [overview, universePreview] = await Promise.all([
      getAuthenticatedGovernanceOverview(token, actor),
      getAuthenticatedUniversePreview(token, "groww", 8, actor).catch(() => null),
    ]);
  } catch (error) {
    const status = (error as Error & { status?: number }).status;

    if (status === 403) return <GovernanceDeniedState />;

    if (status === 401) {
      return (
        <main className="shellPage">
          <section className={styles.onboardingState}>
            <div className={styles.onboardingCard}>
              <p className="shellKicker">Session expired</p>
              <h2 className="shellH2">Please sign in again</h2>
              <p className="shellSub">
                Your session could not be verified. Sign out and sign back in to restore access.
              </p>
              <div className={styles.ctaRow}>
                <Link className={styles.primaryCta} href="/sign-in">Sign in</Link>
                <Link className={styles.secondaryCta} href="/workspace">Workspace</Link>
              </div>
            </div>
          </section>
        </main>
      );
    }

    if (status === 404) {
      return (
        <main className="shellPage">
          <section className={styles.onboardingState}>
            <div className={styles.onboardingCard}>
              <p className="shellKicker">Setup required</p>
              <h2 className="shellH2">Complete onboarding first</h2>
              <p className="shellSub">
                Your account needs a backend profile before governance data can load.
              </p>
              <div className={styles.ctaRow}>
                <Link className={styles.primaryCta} href="/onboarding">Complete setup</Link>
                <Link className={styles.secondaryCta} href="/workspace">Workspace</Link>
              </div>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="shellPage">
        <section className={styles.onboardingState}>
          <div className={styles.onboardingCard}>
            <p className="shellKicker">Service unavailable</p>
            <h2 className="shellH2">Governance console is temporarily unavailable</h2>
            <p className="shellSub">
              The backend service isn&apos;t responding. Please try again in a moment.
            </p>
            <div className={styles.ctaRow}>
              <Link className={styles.primaryCta} href="/governance">Retry</Link>
              <Link className={styles.secondaryCta} href="/workspace">Workspace</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const activeFlags = overview.feature_flags.filter((f) => f.enabled).length;
  const inactiveUsers = overview.users.filter((u) => !u.is_active).length;

  return (
    <main className="shellPage">
      <section className="shellHero">
        <div className="shellCard">
          <p className="shellKicker">Admin console</p>
          <h1 className="shellH1">Governance &amp; operations</h1>
          <p className="shellSub">
            Manage review cases, compliance overrides, feature rollout,
            and user operations from this console.
          </p>
        </div>

        <div className="shellMetricCol">
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Rules</span>
            <strong>{overview.rule_versions.length}</strong>
            <p>Rule versions</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Overrides</span>
            <strong>{overview.overrides.length}</strong>
            <p>Manual decisions</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Flags</span>
            <strong>{activeFlags}</strong>
            <p>Active features</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Reviews</span>
            <strong>{overview.review_cases.length}</strong>
            <p>Open cases</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Users</span>
            <strong>{overview.users.length}</strong>
            <p>{inactiveUsers > 0 ? `${inactiveUsers} paused` : "All active"}</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.cardEyebrow}>Events</span>
            <strong>{overview.review_events.length}</strong>
            <p>Audit trail</p>
          </article>
        </div>
      </section>

      {/* ── Operations Forms ── */}
      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Compliance</p>
              <h3>Set override</h3>
            </div>
          </div>
          <GovernanceOverrideForm />
        </article>

      </section>

      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Features</p>
              <h3>Product flags</h3>
            </div>
          </div>
          <GovernanceFeatureFlagForm
            flags={overview.feature_flags.map((f) => ({
              code: f.code,
              name: f.name,
              enabled: f.enabled,
              rollout_stage: f.rollout_stage,
              notes: f.notes,
            }))}
          />
        </article>

        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Users</p>
              <h3>User status</h3>
            </div>
          </div>
          <GovernanceUserStatusForm
            users={overview.users.map((u) => ({
              auth_subject: u.auth_subject,
              display_name: u.display_name,
              is_active: u.is_active,
            }))}
          />
        </article>
      </section>

      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Review intake</p>
              <h3>Open review case</h3>
            </div>
          </div>
          <GovernanceReviewCaseForm />
        </article>

        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Review workflow</p>
              <h3>Update case</h3>
            </div>
          </div>
          <GovernanceReviewCaseUpdateForm
            cases={overview.review_cases.map((c) => ({
              id: c.id,
              symbol: c.stock.symbol,
              assigned_to: c.assigned_to,
              status: c.status,
              priority: c.priority,
              review_outcome: c.review_outcome,
            }))}
          />
        </article>
      </section>

      {/* ── Data Views ── */}
      {universePreview && (
        <section className={`shellSection ${styles.featurePanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Data</p>
              <h3>Universe preview</h3>
            </div>
            <span className={styles.pill}>{universePreview.total_candidates} candidates</span>
          </div>
          <div className={styles.simpleList}>
            <div className={styles.simpleRow}>
              <div>
                <strong>{universePreview.provider_label}</strong>
                <span>{universePreview.source_type.replaceAll("_", " ")}</span>
              </div>
              <p>{universePreview.notes[0]}</p>
            </div>
            {universePreview.instruments.slice(0, 5).map((item) => (
              <div className={styles.simpleRow} key={item.provider_key}>
                <div>
                  <strong>{item.symbol}</strong>
                  <span>{item.exchange} · {item.instrument_type}</span>
                </div>
                <p>{item.name} · {item.sector}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Review cases</p>
              <h3>Active queue</h3>
            </div>
          </div>
          <div className={styles.simpleList}>
            {overview.review_cases.length > 0 ? (
              overview.review_cases.map((item) => (
                <div className={styles.simpleRow} key={item.id}>
                  <div>
                    <strong>#{item.id} · {item.stock.symbol}</strong>
                    <span>
                      {item.status} · {item.priority}
                      {item.review_outcome ? ` · ${item.review_outcome.toLowerCase().replaceAll("_", " ")}` : ""}
                    </span>
                  </div>
                  <p>{item.summary}</p>
                </div>
              ))
            ) : (
              <p className={styles.emptyState}>No review cases.</p>
            )}
          </div>
        </article>

        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Overrides</p>
              <h3>Manual decisions</h3>
            </div>
          </div>
          <div className={styles.simpleList}>
            {overview.overrides.length > 0 ? (
              overview.overrides.map((item) => (
                <div className={styles.simpleRow} key={item.id}>
                  <div>
                    <strong>{item.stock.symbol}</strong>
                    <span className={
                      item.decided_status === "HALAL"
                        ? styles.statusPositive
                        : item.decided_status === "NON_COMPLIANT"
                          ? styles.statusCritical
                          : styles.statusWarning
                    }>
                      {item.decided_status.toLowerCase().replaceAll("_", " ")}
                    </span>
                  </div>
                  <p>{item.rationale}</p>
                </div>
              ))
            ) : (
              <p className={styles.emptyState}>No manual overrides.</p>
            )}
          </div>
        </article>
      </section>

      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Support</p>
              <h3>Internal notes</h3>
            </div>
          </div>
          <GovernanceSupportNoteForm
            users={overview.users.map((u) => ({
              auth_subject: u.auth_subject,
              display_name: u.display_name,
            }))}
          />
          {overview.support_notes.length > 0 && (
            <div className={styles.simpleList} style={{ marginTop: 16 }}>
              {overview.support_notes.map((item) => (
                <div className={styles.simpleRow} key={item.id}>
                  <div>
                    <strong>{item.user.display_name}</strong>
                    <span>{item.created_by}</span>
                  </div>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Audit trail</p>
              <h3>Recent actions</h3>
            </div>
          </div>
          <div className={styles.simpleList}>
            {overview.review_events.length > 0 ? (
              overview.review_events.slice(0, 10).map((item) => (
                <div className={styles.simpleRow} key={item.id}>
                  <div>
                    <strong>{item.action.replaceAll("_", " ")}</strong>
                    <span>{item.actor}</span>
                  </div>
                  <p>{item.note}</p>
                </div>
              ))
            ) : (
              <p className={styles.emptyState}>No audit events recorded.</p>
            )}
          </div>
        </article>
      </section>

      <section className={`shellSection ${styles.featureGrid}`}>
        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Feature map</p>
              <h3>Current rollout state</h3>
            </div>
          </div>
          <div className={styles.simpleList}>
            {overview.feature_flags.map((item) => (
              <div className={styles.simpleRow} key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span className={item.enabled ? styles.statusPositive : styles.statusNeutral}>
                    {item.enabled ? "enabled" : "disabled"} · {item.rollout_stage}
                  </span>
                </div>
                <p>{item.notes || item.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.featurePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Users</p>
              <h3>Account roster</h3>
            </div>
          </div>
          <div className={styles.simpleList}>
            {overview.users.map((item) => (
              <div className={styles.simpleRow} key={item.id}>
                <div>
                  <strong>{item.display_name}</strong>
                  <span className={item.is_active ? styles.statusPositive : styles.statusCritical}>
                    {item.is_active ? "active" : "paused"}
                  </span>
                </div>
                <p>{item.email}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
