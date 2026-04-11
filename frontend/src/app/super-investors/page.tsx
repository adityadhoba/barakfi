/* eslint-disable @next/next/no-img-element -- remote investor avatars from API */
import type { Metadata } from "next";
import Link from "next/link";
import { getSuperInvestors } from "@/lib/api";
import styles from "./investors.module.css";

export const metadata: Metadata = {
  title: "Super Investors — Track Legendary Investor Portfolios",
  description: "Follow the portfolios of legendary investors like Warren Buffett, Rakesh Jhunjhunwala, and more. See their halal stock holdings.",
  alternates: { canonical: "https://barakfi.in/super-investors" },
};

export const dynamic = "force-dynamic";

export default async function SuperInvestorsPage() {
  const investors = await getSuperInvestors();

  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Super Investors</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.kicker}>Learn from the Best</span>
          <h1 className={styles.title}>Super Investors</h1>
          <p className={styles.subtitle}>
            Track the portfolios of legendary investors. See what the world&apos;s greatest minds are holding.
          </p>
        </header>

        <div className={styles.grid}>
          {investors.map((inv) => (
            <Link key={inv.slug} href={`/super-investors/${inv.slug}`} className={styles.card}>
              {inv.image_url ? (
                <img src={inv.image_url} alt={inv.name} className={styles.cardAvatarImg} />
              ) : (
                <div className={styles.cardAvatar}>{inv.name.charAt(0)}</div>
              )}
              <div className={styles.cardBody}>
                <h2 className={styles.cardName}>{inv.name}</h2>
                <p className={styles.cardTitle}>{inv.title}</p>
                <p className={styles.cardStyle}>{inv.investment_style}</p>
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.cardCountry}>{inv.country}</span>
                <span className={styles.cardHoldings}>{inv.holding_count} holdings</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
