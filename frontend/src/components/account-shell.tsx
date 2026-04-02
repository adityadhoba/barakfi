import styles from "@/app/page.module.css";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { getAuthenticatedAlerts, getAuthenticatedUser, getUserBySubject } from "@/lib/api";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

export async function AccountShell() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const sessionToken = await authState.getToken();

  if (!clerkUser || !sessionToken) {
    throw new Error("Signed-in Clerk user is required to load the account.");
  }

  const actor = {
    authSubject: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || null,
  };

  let backendUser;
  try {
    backendUser = await getAuthenticatedUser(sessionToken, actor);
  } catch {
    backendUser = await getUserBySubject(clerkUser.id);
  }

  const alerts = await getAuthenticatedAlerts(sessionToken, actor).catch(() => []);

  const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || backendUser.email;
  const firstName = backendUser.display_name.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <main className="shellPage">
      {/* Profile Header */}
      <section className="shellHeroSingle">
        <div className="shellCard">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--emerald)", color: "var(--bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem", fontWeight: 800, flexShrink: 0,
            }}>
              {initial}
            </div>
            <div>
              <h1 className="shellH1" style={{ marginBottom: 2 }}>
                {backendUser.display_name}
              </h1>
              <p className="shellSub" style={{ marginTop: 4 }}>
                {primaryEmail}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <span className={styles.pill}>Free plan</span>
            <span className={styles.pill}>
              {backendUser.is_active ? "Active" : "Inactive"}
            </span>
            {alerts.length > 0 && (
              <span className={styles.pill}>{alerts.length} alert{alerts.length > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className={`shellSection ${styles.featureGrid}`}>
        <Link
          href="/workspace"
          className={styles.featurePanel}
          style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
        >
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Portfolio</p>
              <h3>Your holdings →</h3>
            </div>
          </div>
          <p className={styles.heroText}>View and manage your portfolio and watchlist.</p>
        </Link>

        <Link
          href="/notifications"
          className={styles.featurePanel}
          style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
        >
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Alerts</p>
              <h3>Notifications →</h3>
            </div>
          </div>
          <p className={styles.heroText}>
            {alerts.length > 0
              ? `${alerts.length} alert${alerts.length > 1 ? "s" : ""} need your attention.`
              : "All clear — no alerts right now."}
          </p>
        </Link>

        <Link
          href="/governance"
          className={styles.featurePanel}
          style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
        >
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Admin</p>
              <h3>Governance console →</h3>
            </div>
          </div>
          <p className={styles.heroText}>Manage compliance rules and feature flags.</p>
        </Link>
      </section>

      {/* Settings */}
      <section className={`shellSection ${styles.featurePanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Preferences</p>
            <h3>Your settings</h3>
          </div>
        </div>
        <AccountSettingsForm
          initialSettings={{
            preferred_currency: backendUser.settings?.preferred_currency || "INR",
            risk_profile: backendUser.settings?.risk_profile || "moderate",
            notifications_enabled: backendUser.settings?.notifications_enabled ?? true,
            theme: backendUser.settings?.theme || "dark",
          }}
        />
      </section>

      {/* Security */}
      <section className={`shellSection ${styles.featurePanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Security</p>
            <h3>Your account is secure</h3>
          </div>
        </div>
        <div className={styles.checklist}>
          {[
            "Signed in securely with Google",
            "Session verified on every request",
            "Your data is encrypted and private",
          ].map((item) => (
            <div className={styles.checkItem} key={item}>
              <span className={styles.checkMark}>✓</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
