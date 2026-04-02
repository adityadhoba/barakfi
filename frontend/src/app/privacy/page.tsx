import type { Metadata } from "next";
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy — Barakfi",
  description:
    "How Barakfi collects, uses, stores, and protects your personal data. Compliant with India's Digital Personal Data Protection Act 2023.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Hero */}
        <header className={styles.hero}>
          <Link href="/" className={styles.backLink}>
            &larr; Back to Home
          </Link>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.subtitle}>
            Your privacy matters to us. This policy explains how we collect, use, store, and
            protect your personal data when you use Barakfi.
          </p>
          <span className={styles.effectiveDate}>Effective Date: 1 April 2026</span>
        </header>

        {/* 1. Data We Collect */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Data We Collect</h2>
          <p className={styles.prose}>
            We collect data necessary to provide and improve the Service. The categories of
            data we collect include:
          </p>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Data Category</th>
                <th>Details</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Identity Data</strong></td>
                <td>Full name, email address, profile picture</td>
                <td>Clerk (authentication provider)</td>
              </tr>
              <tr>
                <td><strong>Authentication Data</strong></td>
                <td>OAuth tokens, session identifiers, login timestamps</td>
                <td>Clerk</td>
              </tr>
              <tr>
                <td><strong>Portfolio Data</strong></td>
                <td>Stocks added to portfolio, quantity, purchase price, transaction dates</td>
                <td>User-provided</td>
              </tr>
              <tr>
                <td><strong>Watchlist Data</strong></td>
                <td>Stocks added to watchlist, alert preferences</td>
                <td>User-provided</td>
              </tr>
              <tr>
                <td><strong>Screening History</strong></td>
                <td>Stocks screened, filter preferences, comparison history</td>
                <td>Automatically collected</td>
              </tr>
              <tr>
                <td><strong>Usage Data</strong></td>
                <td>Pages visited, features used, session duration, device type, browser</td>
                <td>PostHog (analytics)</td>
              </tr>
            </tbody>
          </table>
          <p className={styles.prose}>
            We do <strong>not</strong> collect your Aadhaar number, PAN card details, bank
            account numbers, demat account information, or trading credentials.
          </p>
        </section>

        {/* 2. How We Use Your Data */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. How We Use Your Data</h2>
          <p className={styles.prose}>
            We process your personal data for the following specific, lawful purposes:
          </p>
          <ul className={styles.legalList}>
            <li>
              <strong>Service Delivery:</strong> To provide personalised screening results,
              portfolio tracking, watchlist management, and compliance monitoring.
            </li>
            <li>
              <strong>Account Management:</strong> To create, maintain, and secure your account,
              and to communicate important account-related updates.
            </li>
            <li>
              <strong>Analytics and Improvement:</strong> To understand usage patterns, identify
              bugs, improve the screening algorithm, and enhance user experience.
            </li>
            <li>
              <strong>Legal Compliance:</strong> To comply with applicable laws, respond to
              lawful requests from government authorities, and enforce our Terms of Service.
            </li>
            <li>
              <strong>Communication:</strong> To send transactional emails (account alerts,
              compliance notifications) and, with your consent, product updates and educational
              content related to Shariah-compliant investing.
            </li>
          </ul>
          <p className={styles.prose}>
            We do <strong>not</strong> sell your personal data to third parties. We do not use
            your data for automated decision-making that produces legal effects concerning you.
          </p>
        </section>

        {/* 3. Third-Party Services */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Third-Party Services</h2>
          <p className={styles.prose}>
            We rely on the following third-party service providers to operate the platform.
            Each provider receives only the minimum data necessary to perform its function:
          </p>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Data Shared</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Authentication</strong></td>
                <td>Clerk Inc.</td>
                <td>User sign-up, login, session management</td>
                <td>Name, email, OAuth tokens</td>
              </tr>
              <tr>
                <td><strong>Market Data</strong></td>
                <td>Yahoo Finance (via public APIs)</td>
                <td>Stock prices, financial statements, market data</td>
                <td>No user data shared (server-side requests)</td>
              </tr>
              <tr>
                <td><strong>Analytics</strong></td>
                <td>PostHog Inc.</td>
                <td>Usage analytics, feature adoption tracking</td>
                <td>Anonymised usage events, device/browser info</td>
              </tr>
              <tr>
                <td><strong>Advertising (Web)</strong></td>
                <td>Google AdSense</td>
                <td>Display advertising to support the free service</td>
                <td>Cookies, IP address, browsing activity (collected by Google)</td>
              </tr>
              <tr>
                <td><strong>Advertising (Mobile)</strong></td>
                <td>Google AdMob</td>
                <td>Display advertising in the mobile app</td>
                <td>Device identifiers, ad interaction data (collected by Google)</td>
              </tr>
            </tbody>
          </table>
          <p className={styles.prose}>
            Each third-party provider is bound by their own privacy policies and applicable
            data protection regulations. We encourage you to review the privacy policies of
            Clerk, PostHog, and Google for details on how they handle your data.
          </p>
        </section>

        {/* 4. Data Storage & Security */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Data Storage and Security</h2>
          <p className={styles.prose}>
            We take the security of your data seriously and implement industry-standard
            measures to protect it:
          </p>
          <ul className={styles.legalList}>
            <li>
              <strong>Encryption at Rest:</strong> All personal data and portfolio information
              stored in our databases is encrypted using AES-256 encryption.
            </li>
            <li>
              <strong>Encryption in Transit:</strong> All communications between your browser
              and our servers are protected using TLS 1.2 or higher (HTTPS).
            </li>
            <li>
              <strong>Access Controls:</strong> Database access is restricted to authorised
              personnel with role-based access controls. Production data access is logged
              and audited.
            </li>
            <li>
              <strong>Infrastructure:</strong> Our servers are hosted on secure, SOC 2-compliant
              cloud infrastructure with automated backups and disaster recovery procedures.
            </li>
            <li>
              <strong>Incident Response:</strong> We maintain an incident response plan and will
              notify affected users within 72 hours of discovering a data breach, in accordance
              with the DPDPA 2023.
            </li>
          </ul>
          <p className={styles.prose}>
            While we employ robust security practices, no method of transmission over the
            internet or method of electronic storage is 100% secure. We cannot guarantee
            absolute security of your data.
          </p>
        </section>

        {/* 5. Your Rights under DPDPA 2023 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Your Rights (DPDPA 2023 Compliance)</h2>
          <p className={styles.prose}>
            Under India&apos;s Digital Personal Data Protection Act, 2023 (DPDPA), you have the
            following rights as a Data Principal:
          </p>
          <ul className={styles.legalList}>
            <li>
              <strong>Right to Access:</strong> You may request a summary of the personal data
              we hold about you, including how it is being processed and with whom it has been
              shared.
            </li>
            <li>
              <strong>Right to Correction:</strong> You may request correction of inaccurate or
              incomplete personal data. You can update most information directly through your
              account settings.
            </li>
            <li>
              <strong>Right to Erasure:</strong> You may request deletion of your personal data.
              Upon verification of your identity, we will delete your data within 30 days,
              subject to legal retention obligations.
            </li>
            <li>
              <strong>Right to Data Portability:</strong> You may request an export of your
              personal data in a commonly used, machine-readable format (JSON or CSV).
            </li>
            <li>
              <strong>Right to Withdraw Consent:</strong> Where processing is based on consent,
              you may withdraw consent at any time. This will not affect the lawfulness of
              processing carried out before withdrawal.
            </li>
            <li>
              <strong>Right to Grievance Redressal:</strong> You have the right to file a
              grievance with us. If not resolved to your satisfaction within 30 days, you may
              approach the Data Protection Board of India.
            </li>
          </ul>
          <p className={styles.prose}>
            To exercise any of these rights, please contact our Data Protection Officer at
            privacy@barakfi.in. We will respond to verified requests within 30 days.
          </p>
        </section>

        {/* 6. Cookies */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Cookie Policy</h2>
          <p className={styles.prose}>
            We use cookies and similar technologies for the following purposes:
          </p>
          <ul className={styles.legalList}>
            <li>
              <strong>Essential Cookies:</strong> Required for authentication, session management,
              and security. These cannot be disabled without affecting the Service.
            </li>
            <li>
              <strong>Preference Cookies:</strong> Store your theme preference (light/dark mode),
              language settings, and screening filter defaults.
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Used by PostHog to collect anonymised usage
              data. You can opt out of analytics tracking through your account settings.
            </li>
          </ul>
          <ul className={styles.legalList}>
            <li>
              <strong>Advertising Cookies:</strong> Google AdSense and AdMob may set cookies
              and use device identifiers to serve personalised ads based on your browsing
              activity and interests. Google&apos;s ad partners may use cookies for ad targeting
              in accordance with{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--emerald)' }}>Google&apos;s Privacy Policy</a>.
            </li>
          </ul>
          <p className={styles.prose}>
            You can opt out of personalised advertising by visiting{" "}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--emerald)' }}>Google Ads Settings</a> or by adjusting
            your device&apos;s ad tracking preferences. You may also use the{" "}
            <a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--emerald)' }}>NAI opt-out tool</a> to manage third-party
            ad network cookies.
          </p>
        </section>

        {/* 7. Data Retention */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Data Retention</h2>
          <p className={styles.prose}>
            We retain your personal data only for as long as necessary to fulfil the purposes
            described in this policy:
          </p>
          <ul className={styles.legalList}>
            <li>
              <strong>Active Accounts:</strong> Data is retained for the duration of your account
              and for 90 days after account deletion to allow for recovery requests.
            </li>
            <li>
              <strong>Analytics Data:</strong> Anonymised usage data is retained for up to 24
              months and then automatically purged.
            </li>
            <li>
              <strong>Support Records:</strong> Communications related to support requests are
              retained for 3 years after resolution.
            </li>
          </ul>
        </section>

        {/* 8. Children's Privacy */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Children&apos;s Privacy</h2>
          <p className={styles.prose}>
            Barakfi is not intended for individuals under the age of 18. We do not
            knowingly collect personal data from children. If we become aware that a user is
            under 18, we will promptly delete their account and associated data. If you believe
            a minor has registered on our platform, please contact us immediately at
            privacy@barakfi.in.
          </p>
        </section>

        {/* 9. International Data Transfers */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. International Data Transfers</h2>
          <p className={styles.prose}>
            Some of our third-party service providers (Clerk, PostHog) may process data outside
            of India. Where such transfers occur, we ensure that appropriate safeguards are in
            place, including contractual clauses that require the recipient to provide a level
            of data protection consistent with the DPDPA 2023. By using the Service, you
            consent to the transfer of your data to jurisdictions outside India where our service
            providers operate, subject to these safeguards.
          </p>
        </section>

        {/* 10. Changes to This Policy */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Changes to This Policy</h2>
          <p className={styles.prose}>
            We may update this Privacy Policy from time to time to reflect changes in our
            practices, technology, legal requirements, or other factors. Material changes will
            be communicated via email and/or a prominent notice on the platform at least 15 days
            before taking effect. The &quot;Effective Date&quot; at the top of this page indicates
            when the policy was last revised.
          </p>
        </section>

        {/* 11. Contact */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>11. Contact Us</h2>
          <p className={styles.prose}>
            For privacy-related enquiries, data access requests, or to exercise any of your
            rights under the DPDPA 2023:
          </p>
          <div className={styles.contactBox}>
            <p><strong>Data Protection Officer</strong></p>
            <p>Barakfi</p>
            <p>Email: <a href="mailto:privacy@barakfi.in">privacy@barakfi.in</a></p>
            <p>General Enquiries: <a href="mailto:support@barakfi.in">support@barakfi.in</a></p>
            <p>Registered Address: Mumbai, Maharashtra, India</p>
          </div>
          <p className={styles.prose}>
            We will acknowledge receipt of your request within 48 hours and provide a
            substantive response within 30 days.
          </p>
        </section>

        {/* Legal Nav */}
        <nav className={styles.legalNav} aria-label="Legal pages">
          <Link href="/terms" className={styles.legalNavLink}>Terms of Service</Link>
          <Link href="/disclaimer" className={styles.legalNavLink}>Risk Disclaimer</Link>
          <Link href="/shariah-compliance" className={styles.legalNavLink}>Shariah Compliance</Link>
          <Link href="/methodology" className={styles.legalNavLink}>Screening Methodology</Link>
        </nav>
      </div>
    </main>
  );
}
