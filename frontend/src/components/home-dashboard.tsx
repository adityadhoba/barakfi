import { ProductCheckHome } from "@/components/product-check-home";
import styles from "./home-dashboard.module.css";

/**
 * Homepage: minimal product entry (search-first). Rich marketing sections live
 * on other routes; keep this component so `page.tsx` routing stays unchanged.
 */
export function HomeDashboard() {
  return (
    <div className={styles.home}>
      <ProductCheckHome />
    </div>
  );
}
