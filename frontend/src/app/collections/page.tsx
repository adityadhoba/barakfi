import type { Metadata } from "next";
import Link from "next/link";
import { getCollections } from "@/lib/api";
import styles from "./collections.module.css";
import { CollectionIcon } from "@/components/collection-icon";
import collectionsExtras from "./collections-icons.module.css";

export const metadata: Metadata = {
  title: "Halal Stock Collections — Curated Shariah-Compliant Baskets",
  description: "Explore curated halal stock collections. Thematic baskets of Shariah-compliant stocks across sectors, markets, and investment styles.",
  alternates: { canonical: "https://barakfi.in/collections" },
};

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Collections</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.kicker}>Curated Baskets</span>
          <h1 className={styles.title}>Halal Stock Collections</h1>
          <p className={styles.subtitle}>
            Explore thematic groups of Shariah-compliant stocks across sectors, markets, and investment styles.
          </p>
        </header>

        <div className={styles.grid}>
          {collections.map((coll) => (
            <Link key={coll.slug} href={`/collections/${coll.slug}`} className={styles.card}>
              <CollectionIcon slug={coll.slug} className={collectionsExtras.cardIconWrap} />
              <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>{coll.name}</h2>
                <p className={styles.cardDesc}>{coll.description}</p>
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.cardCount}>{coll.stock_count} stocks</span>
                <span className={styles.cardArrow}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
