/* eslint-disable @next/next/no-img-element -- remote investor avatars from API */
import type { Metadata } from "next";
import Link from "next/link";
import { getSuperInvestor } from "@/lib/api";
import { notFound } from "next/navigation";
import styles from "./detail.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const inv = await getSuperInvestor(slug);
  if (!inv) return { title: "Investor Not Found" };
  return {
    title: `${inv.name} Portfolio — ${inv.title}`,
    description: `${inv.bio.slice(0, 160)}...`,
  };
}

export default async function InvestorDetailPage({ params }: Props) {
  const { slug } = await params;
  const inv = await getSuperInvestor(slug);
  if (!inv || !inv.holdings || inv.holdings.length === 0) notFound();

  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/super-investors">Super Investors</Link>
          <span>/</span>
          <span>{inv.name}</span>
        </nav>
        <header className={styles.header}>
          {inv.image_url ? (
            <img src={inv.image_url} alt={inv.name} className={styles.avatarImg} />
          ) : (
            <div className={styles.avatar}>{inv.name.charAt(0)}</div>
          )}
          <h1 className={styles.name}>{inv.name}</h1>
          <p className={styles.investorTitle}>{inv.title}</p>
          <div className={styles.tags}>
            <span className={styles.tag}>{inv.country}</span>
            <span className={styles.tag}>{inv.investment_style}</span>
          </div>
          <p className={styles.bio}>{inv.bio}</p>
        </header>
        <h2 className={styles.sectionTitle}>Holdings ({inv.holdings.length})</h2>
        <div className={styles.list}>
          {inv.holdings.map((h, i) => (
            <Link key={h.symbol} href={`/stocks/${h.symbol}`} className={styles.row}>
              <span className={styles.rowNum}>{i + 1}</span>
              <div className={styles.rowBody}>
                <span className={styles.rowSymbol}>{h.symbol}</span>
                <span className={styles.rowName}>{h.name}</span>
              </div>
              <span className={styles.rowWeight}>{h.weight_pct}%</span>
              <span className={styles.rowExchange}>{h.exchange}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
