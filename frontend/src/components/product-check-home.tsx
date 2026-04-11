import { StockCheckHero } from "@/components/stock-check-hero";
import styles from "./product-check-home.module.css";

export function ProductCheckHome() {
  return (
    <section className={styles.strip} aria-labelledby="product-check-heading">
      <div className={styles.inner}>
        <h1 id="product-check-heading" className={styles.title}>
          Find out if a stock is Halal in seconds
        </h1>
        <p className={styles.sub}>Instant Shariah compliance check for global stocks</p>
        <StockCheckHero />
      </div>
    </section>
  );
}
