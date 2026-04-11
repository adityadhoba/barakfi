import { StockCheckHero } from "@/components/stock-check-hero";
import styles from "./product-check-home.module.css";

export function ProductCheckHome() {
  return (
    <section className={styles.strip} aria-labelledby="product-check-heading">
      <div className={styles.inner}>
        <h1 id="product-check-heading" className={styles.title}>
          Check if any stock is Halal instantly
        </h1>
        <p className={styles.sub}>Shariah-compliant stock screening in seconds</p>
        <StockCheckHero
          variant="hero"
          placeholder="Search Reliance, TCS, Tesla"
          submitLabel="Check Halal Status"
        />
      </div>
    </section>
  );
}
