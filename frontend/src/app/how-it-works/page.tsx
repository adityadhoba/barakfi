import type { Metadata } from "next";
import Link from "next/link";
import styles from "./how-it-works.module.css";

export const metadata: Metadata = {
  title: "How it Works — Halal Screening & Trust | Barakfi",
  description:
    "Plain-language overview of Shariah stock screening: what we check, debt ratio, non-halal income, and how to use results responsibly.",
};

export default function HowItWorksPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to home
        </Link>

        <header>
          <h1 className={styles.heroTitle}>How it works</h1>
          <p className={styles.lead}>
            Barakfi helps you see how a company lines up with common Shariah equity rules—using public
            numbers and clear checks. Here is what that means in everyday language.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="halal-screening-heading">
          <h2 id="halal-screening-heading" className={styles.sectionTitle}>
            What is halal screening?
          </h2>
          <p className={styles.prose}>
            For stocks, &ldquo;halal screening&rdquo; usually means asking: is most of this company&apos;s
            business allowed in Islam, and are its finances within limits set by recognised Shariah
            standards? We do not decide if you should buy or sell. We highlight red flags and pass/fail
            style signals so you can research further or speak with a qualified scholar or advisor.
          </p>
          <p className={styles.prose}>Typical checks include:</p>
          <ul className={styles.list}>
            <li>
              <strong className={styles.proseStrong}>Business activity</strong> — avoiding core revenue
              from clearly non-permissible sectors (for example alcohol, conventional banking, gambling),
              depending on the rule set.
            </li>
            <li>
              <strong className={styles.proseStrong}>Financial ratios</strong> — limits on debt,
              interest-related income, and sometimes other balance-sheet items, compared to caps in each
              methodology.
            </li>
            <li>
              <strong className={styles.proseStrong}>Multiple views</strong> — we can compare several
              published methodologies so you see where analysts agree and where opinions differ.
            </li>
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="debt-ratio-heading">
          <h2 id="debt-ratio-heading" className={styles.sectionTitle}>
            What is debt ratio?
          </h2>
          <p className={styles.prose}>
            In simple terms, the <strong className={styles.proseStrong}>debt ratio</strong> in screening
            measures how large the company&apos;s interest-bearing debt is compared to a benchmark—often
            market capitalisation or total assets, depending on the standard.
          </p>
          <p className={styles.prose}>
            If debt is high relative to that benchmark, the stock may fail a screen, because Islamic
            finance generally discourages investing in firms that rely heavily on riba-based borrowing.
            The exact percentage limit and the denominator differ between methodologies; our methodology
            page lists those details.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="non-halal-income-heading">
          <h2 id="non-halal-income-heading" className={styles.sectionTitle}>
            What is non-halal income?
          </h2>
          <p className={styles.prose}>
            <strong className={styles.proseStrong}>Non-halal income</strong> (often called
            non-permissible or impure income) is revenue the company earns from activities or sources
            that do not comply with Shariah business rules—outside of ordinary, permissible operations.
          </p>
          <p className={styles.prose}>
            Screens usually look at how large that income is compared to total revenue. A small share may
            be acceptable under some standards; above a set threshold, the company may be flagged for
            review or treated as non-compliant. Interest income is often checked separately with its own
            limit, because it is a distinct type of concern.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="disclaimer-heading">
          <h2 id="disclaimer-heading" className={styles.sectionTitle}>
            Important disclaimer
          </h2>
          <div className={styles.disclaimerBox}>
            <p>This is automated screening and not financial or religious advice.</p>
          </div>
          <p className={`${styles.prose} ${styles.afterDisclaimer}`}>
            Results depend on the quality and timeliness of public data. Always confirm material
            decisions with a qualified financial professional and, for religious rulings, with a
            scholar you trust.
          </p>
        </section>

        <nav className={styles.links} aria-label="Related pages">
          <Link href="/methodology">Full methodology &amp; thresholds →</Link>
          <Link href="/disclaimer">Risk disclaimer →</Link>
        </nav>
      </div>
    </main>
  );
}
