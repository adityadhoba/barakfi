import type { Metadata } from "next";
import Link from "next/link";
import { getCollection } from "@/lib/api";
import { notFound } from "next/navigation";
import styles from "./detail.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const coll = await getCollection(slug);
  if (!coll) return { title: "Collection Not Found" };
  return {
    title: `${coll.name} — Halal Stock Collection`,
    description: coll.description,
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const coll = await getCollection(slug);
  if (!coll) notFound();

  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/collections">Collections</Link>
          <span>/</span>
          <span>{coll.name}</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.icon}>{coll.icon}</span>
          <h1 className={styles.title}>{coll.name}</h1>
          <p className={styles.desc}>{coll.description}</p>
          <span className={styles.count}>{coll.stocks.length} stocks</span>
        </header>
        <div className={styles.list}>
          {coll.stocks.map((stock, i) => (
            <Link key={stock.symbol} href={`/stocks/${stock.symbol}`} className={styles.row}>
              <span className={styles.rowNum}>{i + 1}</span>
              <div className={styles.rowBody}>
                <span className={styles.rowSymbol}>{stock.symbol}</span>
                <span className={styles.rowName}>{stock.name}</span>
              </div>
              <span className={styles.rowSector}>{stock.sector}</span>
              <span className={styles.rowExchange}>{stock.exchange}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
