import type { Metadata } from "next";
import Link from "next/link";
import styles from "./tools.module.css";

export const metadata: Metadata = {
  title: "Islamic Finance Tools — Purification & Zakat Calculator | Barakfi",
  description:
    "Free purification calculator and zakat calculator for halal investors. Calculate how much to donate from dividends and zakat on your stock portfolio.",
  keywords: [
    "purification calculator",
    "zakat calculator",
    "Islamic finance calculator",
    "halal investment tools",
    "dividend purification",
    "zakat on stocks",
    "Islamic finance tools India",
    "halal tools",
    "shariah calculator",
  ],
  alternates: { canonical: "https://barakfi.in/tools" },
};

const tools = [
  {
    href: "/tools/purification",
    emoji: "💰",
    title: "Purification Calculator",
    description:
      "Calculate the non-permissible portion of your dividends and determine how much to donate for Shariah compliance.",
    badge: "Free",
  },
  {
    href: "/tools/zakat",
    emoji: "❤️",
    title: "Zakat Calculator",
    description:
      "Calculate zakat on your equity portfolio, gold, savings, and other assets based on current Nisab values.",
    badge: "Free",
  },
  {
    href: "/compare",
    emoji: "⚖️",
    title: "Compare Stocks",
    description:
      "Compare Shariah compliance of multiple stocks side by side. See how different companies stack up.",
    badge: "Free",
  },
  {
    href: "/request-coverage",
    emoji: "📋",
    title: "Request Coverage",
    description:
      "Can't find a stock? Request us to add and screen it. We'll notify you when it's available.",
    badge: "Free",
  },
];

export default function ToolsPage() {
  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/" className={styles.breadcrumbLink}>Home</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>Tools</span>
        </nav>

        <header className={styles.header}>
          <span className={styles.kicker}>Free Tools</span>
          <h1 className={styles.title}>Islamic Finance Tools</h1>
          <p className={styles.subtitle}>
            Everything you need for compliant investing. No login required, always free.
          </p>
        </header>

        <div className={styles.grid}>
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className={styles.card}>
              <div className={styles.cardIcon}>
                <span>{tool.emoji}</span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitleRow}>
                  <h2 className={styles.cardTitle}>{tool.title}</h2>
                  <span className={styles.cardBadge}>{tool.badge}</span>
                </div>
                <p className={styles.cardDesc}>{tool.description}</p>
              </div>
              <span className={styles.cardArrow}>→</span>
            </Link>
          ))}
        </div>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Need more tools?</h2>
          <p className={styles.ctaDesc}>
            We&apos;re building more Islamic finance tools. Have a suggestion?{" "}
            <Link href="/feedback" className={styles.ctaLink}>Let us know</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
