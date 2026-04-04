import type { Metadata } from "next";
import Link from "next/link";
import styles from "./academy.module.css";

export const metadata: Metadata = {
  title: "Academy — Learn Islamic Finance & Halal Investing",
  description: "Free educational resources on Islamic finance, Shariah-compliant investing, halal stocks, purification, zakat, and more.",
  alternates: { canonical: "https://barakfi.in/academy" },
};

const LESSONS = [
  {
    slug: "what-is-halal-investing",
    title: "What is Halal Investing?",
    summary: "An introduction to Islamic finance principles and how they apply to stock market investing.",
    level: "Beginner",
    readTime: "5 min",
  },
  {
    slug: "shariah-screening-explained",
    title: "Shariah Screening Explained",
    summary: "How stocks are evaluated for compliance using S&P, AAOIFI, and FTSE methodologies.",
    level: "Beginner",
    readTime: "8 min",
  },
  {
    slug: "understanding-financial-ratios",
    title: "Understanding Financial Ratios",
    summary: "Deep dive into the 5 key ratios used in Shariah screening: debt, receivables, cash, income purity.",
    level: "Intermediate",
    readTime: "10 min",
  },
  {
    slug: "dividend-purification",
    title: "Dividend Purification Guide",
    summary: "How to calculate and donate the non-permissible portion of dividend income from halal stocks.",
    level: "Intermediate",
    readTime: "6 min",
  },
  {
    slug: "zakat-on-investments",
    title: "Zakat on Stock Investments",
    summary: "Comprehensive guide to calculating zakat on shares, mutual funds, and other equity investments.",
    level: "Intermediate",
    readTime: "8 min",
  },
  {
    slug: "building-halal-portfolio",
    title: "Building a Halal Portfolio",
    summary: "Practical strategies for constructing a diversified Shariah-compliant investment portfolio.",
    level: "Advanced",
    readTime: "12 min",
  },
];

export default function AcademyPage() {
  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Academy</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.kicker}>Learn</span>
          <h1 className={styles.title}>Barakfi Academy</h1>
          <p className={styles.subtitle}>
            Free educational resources to help you understand Islamic finance and make confident investment decisions.
          </p>
        </header>

        <div className={styles.grid}>
          {LESSONS.map((lesson) => (
            <Link key={lesson.slug} href={`/academy/${lesson.slug}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardLevel}>{lesson.level}</span>
                <span className={styles.cardTime}>{lesson.readTime}</span>
              </div>
              <h2 className={styles.cardTitle}>{lesson.title}</h2>
              <p className={styles.cardSummary}>{lesson.summary}</p>
              <span className={styles.cardLink}>Start learning →</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
