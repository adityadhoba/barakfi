import type { Metadata } from "next";
import Link from "next/link";
import { getCollection } from "@/lib/api";
import { notFound } from "next/navigation";
import { GlobalMarketTicker } from "@/components/global-market-ticker";
import { GlobalNavBar } from "@/components/global-nav-bar";
import styles from "./detail.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const coll = await getCollection(slug);
  if (!coll) {
    return {
      title: "Collection Not Found",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${coll.name} — Halal Stock Collection`,
    description: coll.description,
    alternates: { canonical: `/collections/${slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const coll = await getCollection(slug);
  if (!coll) notFound();

  return (
    <>
      <GlobalMarketTicker />
      <GlobalNavBar />
      <main className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/collections">Collections</Link>
        <span>/</span>
        <span>{coll.name}</span>
      </nav>
      <header className={styles.hero}>
        <div className={styles.iconBadge}>{coll.icon}</div>
        <h1 className={styles.title}>{coll.name}</h1>
        <p className={styles.desc}>{coll.description}</p>
        <span className={styles.count}>{coll.stocks.length} stocks</span>
      </header>
      <div className={styles.grid}>
        {coll.stocks.map((stock, i) => (
          <Link key={stock.symbol} href={`/stocks/${stock.symbol}`} className={styles.card}>
            <span className={styles.cardNum}>{i + 1}</span>
            <span className={styles.cardSymbol}>{stock.symbol}</span>
            <span className={styles.cardName}>{stock.name}</span>
            <div className={styles.cardFooter}>
              <span className={styles.cardSector}>{stock.sector}</span>
              <span className={styles.cardExchange}>{stock.exchange}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
    </>
  );
}
