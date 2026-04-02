import type { Metadata } from "next";
import Link from "next/link";
import styles from "./terms.module.css";

export const metadata: Metadata = {
  title: "Terms of Service — Barakfi",
  description:
    "Terms and conditions governing the use of Barakfi, a Shariah-compliant Indian equity screening platform.",
};

export default function TermsOfServicePage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Hero */}
        <header className={styles.hero}>
          <Link href="/" className={styles.backLink}>
            &larr; Back to Home
          </Link>
          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.subtitle}>
            Please read these terms carefully before using Barakfi. By accessing or
            using our platform, you agree to be bound by these terms.
          </p>
          <span className={styles.effectiveDate}>Effective Date: 1 April 2026</span>
        </header>

        {/* 1. Service Description */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Service Description</h2>
          <p className={styles.prose}>
            Barakfi (&quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
            is an <strong>educational stock screening tool</strong> that helps users identify
            Indian equities listed on the National Stock Exchange (NSE) that may meet Shariah
            compliance criteria. The Service provides automated screening based on publicly
            available financial data and established Islamic finance methodologies.
          </p>
          <div className={styles.warningBox}>
            <p>
              <strong>Barakfi is NOT a registered Investment Advisor, Research Analyst,
              or Portfolio Manager under the Securities and Exchange Board of India (SEBI)
              regulations.</strong> The Service does not provide personalised investment advice,
              specific buy/sell recommendations, or portfolio management services. All screening
              results are for informational and educational purposes only.
            </p>
          </div>
        </section>

        {/* 2. Eligibility */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Eligibility</h2>
          <p className={styles.prose}>
            You must be at least 18 years of age and a resident of India (or legally permitted
            to access Indian equity market information in your jurisdiction) to use this Service.
            By registering an account, you represent and warrant that you meet these eligibility
            requirements.
          </p>
        </section>

        {/* 3. User Responsibilities */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. User Responsibilities</h2>
          <p className={styles.prose}>
            As a user of Barakfi, you acknowledge and agree to the following:
          </p>
          <ul className={styles.legalList}>
            <li>
              You will independently verify all screening results before making any investment
              decisions. Our automated screening is not a substitute for professional financial
              or Shariah advisory services.
            </li>
            <li>
              You will consult with a qualified SEBI-registered investment advisor and/or a
              certified Shariah scholar before acting on any information provided by the Service.
            </li>
            <li>
              You are solely responsible for all investment decisions you make. Barakfi
              bears no responsibility for any financial losses arising from the use of screening
              results.
            </li>
            <li>
              You will not use the Service for any unlawful purpose or in violation of any
              applicable Indian laws and regulations, including SEBI Act 1992, SEBI (Investment
              Advisers) Regulations 2013, and the Prevention of Money Laundering Act 2002.
            </li>
            <li>
              You will not scrape, reverse-engineer, or attempt to extract our proprietary
              screening algorithms, data processing logic, or backend infrastructure.
            </li>
            <li>
              You will provide accurate and truthful information when registering for an account
              and will keep your login credentials secure.
            </li>
          </ul>
        </section>

        {/* 4. Account Terms */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Account Terms</h2>
          <p className={styles.prose}>
            Account registration and authentication is managed through Clerk, a third-party
            identity provider. By creating an account, you agree to the following:
          </p>
          <ul className={styles.legalList}>
            <li>
              Your account credentials (email address, name, and authentication tokens) are stored
              and managed by Clerk Inc. in accordance with their privacy policy and security
              practices.
            </li>
            <li>
              Additional data such as portfolio holdings, watchlist selections, and screening
              history are stored on our servers to provide a personalised experience.
            </li>
            <li>
              You are responsible for maintaining the confidentiality of your account. You must
              notify us immediately at legal@barakfi.in if you become aware of any
              unauthorised access.
            </li>
            <li>
              We reserve the right to suspend or terminate accounts that violate these terms,
              engage in abusive behaviour, or are used for purposes inconsistent with the
              Service&apos;s intended use.
            </li>
          </ul>
        </section>

        {/* 5. Free Ad-Supported Service */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Free Ad-Supported Service</h2>
          <p className={styles.prose}>
            Barakfi is a completely free service. All features, including screening,
            portfolio tracking, research notes, compliance checks, and data exports, are
            available to all registered users at no cost.
          </p>
          <p className={styles.prose}>
            The Service is free and supported by advertising. You may see ads from Google
            AdSense (web) and Google AdMob (mobile). Ad content is provided by third parties
            and we do not control or endorse advertised products or services. By using Barakfi,
            you acknowledge and agree that advertisements may be displayed within the platform.
          </p>
        </section>

        {/* 6. Intellectual Property */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Intellectual Property</h2>
          <p className={styles.prose}>
            The screening methodology, algorithms, user interface design, source code, branding,
            and all content produced by Barakfi are proprietary and protected under
            the Indian Copyright Act 1957 and the Information Technology Act 2000. You may not:
          </p>
          <ul className={styles.legalList}>
            <li>
              Reproduce, distribute, or publicly display any part of the Service without prior
              written consent.
            </li>
            <li>
              Use our screening results or data outputs for commercial redistribution, including
              publishing on competing platforms, newsletters, or paid advisory services.
            </li>
            <li>
              Remove, alter, or obscure any copyright, trademark, or proprietary notices.
            </li>
          </ul>
          <p className={styles.prose}>
            Financial data sourced from third-party providers (including Yahoo Finance) remains
            the property of the respective data owners and is used under licence or fair-use
            provisions.
          </p>
        </section>

        {/* 7. Limitation of Liability */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Limitation of Liability</h2>
          <div className={styles.warningBox}>
            <p>
              <strong>To the maximum extent permitted by applicable Indian law, Barakfi,
              its founders, employees, and affiliates shall not be liable for any direct, indirect,
              incidental, special, consequential, or punitive damages</strong> arising out of or in
              connection with your use of the Service. This includes, without limitation, loss of
              profits, loss of data, investment losses, or business interruption.
            </p>
          </div>
          <p className={styles.prose}>
            We do not guarantee the accuracy, completeness, or timeliness of screening results.
            Financial data may be delayed, incomplete, or subject to revision by the upstream
            data providers. Screening classifications may change as new data becomes available
            or as our methodology is updated.
          </p>
          <p className={styles.prose}>
            In no event shall our total aggregate liability exceed INR 1,000.
          </p>
        </section>

        {/* 8. Disclaimer of Warranties */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Disclaimer of Warranties</h2>
          <p className={styles.prose}>
            The Service is provided on an <strong>&quot;AS IS&quot;</strong> and <strong>&quot;AS
            AVAILABLE&quot;</strong> basis without warranties of any kind, either express or
            implied, including but not limited to:
          </p>
          <ul className={styles.legalList}>
            <li>
              Implied warranties of merchantability, fitness for a particular purpose, or
              non-infringement.
            </li>
            <li>
              Any warranty that the Service will be uninterrupted, timely, secure, or error-free.
            </li>
            <li>
              Any warranty regarding the accuracy or reliability of Shariah compliance
              classifications.
            </li>
            <li>
              Any warranty that the Service complies with any specific Shariah standard or fatwa.
            </li>
          </ul>
        </section>

        {/* 9. Indemnification */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Indemnification</h2>
          <p className={styles.prose}>
            You agree to indemnify, defend, and hold harmless Barakfi and its
            directors, officers, employees, and agents from any claims, damages, losses,
            liabilities, costs, and expenses (including reasonable attorney&apos;s fees)
            arising out of your use of the Service, your violation of these terms, or your
            violation of any rights of a third party.
          </p>
        </section>

        {/* 10. Modifications to Terms */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Modifications to Terms</h2>
          <p className={styles.prose}>
            We reserve the right to modify these Terms of Service at any time. Material changes
            will be communicated via email to registered users and/or through a prominent notice
            on the platform at least 15 days before the changes take effect. Continued use of
            the Service after such changes constitutes acceptance of the updated terms.
          </p>
        </section>

        {/* 11. Governing Law and Jurisdiction */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>11. Governing Law and Jurisdiction</h2>
          <p className={styles.prose}>
            These Terms of Service shall be governed by and construed in accordance with the
            laws of India. Any disputes arising out of or relating to these terms or the Service
            shall be subject to the <strong>exclusive jurisdiction of the courts in Mumbai,
            Maharashtra, India</strong>.
          </p>
          <p className={styles.prose}>
            Before initiating any legal proceedings, the parties agree to attempt resolution
            through good-faith negotiation for a period of 30 days. If the dispute remains
            unresolved, either party may pursue arbitration under the Arbitration and
            Conciliation Act, 1996, with the seat of arbitration in Mumbai.
          </p>
        </section>

        {/* 12. Severability */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>12. Severability</h2>
          <p className={styles.prose}>
            If any provision of these Terms is held to be invalid or unenforceable, the
            remaining provisions shall continue in full force and effect. The invalid provision
            shall be modified to the minimum extent necessary to make it valid and enforceable.
          </p>
        </section>

        {/* 13. Contact */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>13. Contact Information</h2>
          <p className={styles.prose}>
            For questions, concerns, or legal notices regarding these Terms of Service, please
            contact us:
          </p>
          <div className={styles.contactBox}>
            <p><strong>Barakfi</strong></p>
            <p>Email: <a href="mailto:legal@barakfi.in">legal@barakfi.in</a></p>
            <p>Registered Address: Mumbai, Maharashtra, India</p>
          </div>
        </section>

        {/* Legal Nav */}
        <nav className={styles.legalNav} aria-label="Legal pages">
          <Link href="/privacy" className={styles.legalNavLink}>Privacy Policy</Link>
          <Link href="/disclaimer" className={styles.legalNavLink}>Risk Disclaimer</Link>
          <Link href="/shariah-compliance" className={styles.legalNavLink}>Shariah Compliance</Link>
          <Link href="/methodology" className={styles.legalNavLink}>Screening Methodology</Link>
        </nav>
      </div>
    </main>
  );
}
