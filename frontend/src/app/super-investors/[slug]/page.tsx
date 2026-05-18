/* eslint-disable @next/next/no-img-element -- remote investor avatars from API */
import type { Metadata } from "next";
import Link from "next/link";
import { getSuperInvestor } from "@/lib/api";
import { notFound } from "next/navigation";
import { GlobalMarketTicker } from "@/components/global-market-ticker";
import { GlobalNavBar } from "@/components/global-nav-bar";
import styles from "./detail.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const inv = await getSuperInvestor(slug);
  if (!inv) {
    return {
      title: "Investor Not Found",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${inv.name} Portfolio — ${inv.title}`,
    description: inv.bio.slice(0, 160),
    alternates: { canonical: `/super-investors/${slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function InvestorDetailPage({ params }: Props) {
  const { slug } = await params;
  const inv = await getSuperInvestor(slug);
  if (!inv || !inv.holdings || inv.holdings.length === 0) notFound();

  const holdingCount = inv.holdings.length;
  const totalWeight = inv.holdings.reduce((sum, h) => sum + (h.weight_pct || 0), 0);
  const avgWeight = holdingCount > 0 ? (totalWeight / holdingCount).toFixed(1) : 0;

  return (
    <>
      <GlobalMarketTicker />
      <GlobalNavBar />
      <main className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/super-investors">Super Investors</Link>
        <span>/</span>
        <span>{inv.name}</span>
      </nav>

      <div className={styles.hero}>
        <div className={styles.headerMeta}>
          {inv.image_url ? (
            <img src={inv.image_url} alt={inv.name} className={styles.avatarImg} />
          ) : (
            <div className={styles.avatar}>{inv.name.charAt(0)}</div>
          )}
        </div>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <h1 className={styles.name}>{inv.name}</h1>
              <p className={styles.investorTitle}>{inv.title}</p>
            </div>
            <div className={styles.tags}>
              <span className={styles.tag}>{inv.country}</span>
              <span className={styles.tag}>{inv.investment_style}</span>
            </div>
            <p className={styles.bio}>{inv.bio}</p>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <p className={styles.statValue}>{holdingCount}</p>
                <p className={styles.statLabel}>Holdings</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statValue}>{totalWeight.toFixed(1)}%</p>
                <p className={styles.statLabel}>Total Weight</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statValue}>{avgWeight}%</p>
                <p className={styles.statLabel}>Avg Weight</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.portfolio}>
        <h2 className={styles.sectionTitle}>Portfolio Holdings</h2>
        <div className={styles.list}>
          {inv.holdings.map((h, i) => (
            <Link key={h.symbol} href={`/stocks/${h.symbol}`} className={styles.row}>
              <div className={styles.rowHeader}>
                <div className={styles.rowBody}>
                  <span className={styles.rowSymbol}>{h.symbol}</span>
                  <span className={styles.rowName}>{h.name}</span>
                </div>
                <span className={styles.rowNum}>#{i + 1}</span>
              </div>
              <div className={styles.rowFooter}>
                <span className={styles.rowWeight}>{h.weight_pct}% weight</span>
                <span className={styles.rowExchange}>{h.exchange}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
    </>
  );
}
