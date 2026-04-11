import styles from "@/app/screener.module.css";
import type { StockDetailsSeoPayload } from "@/lib/stock-seo-fetch";

export function StockSeoSection({ data }: { data: StockDetailsSeoPayload }) {
  const { name, status, score, highlights, consensus, confidence, seo } = data;
  const conf = confidence as { score?: number; level?: string };

  return (
    <section className={styles.stockSeoSection} aria-labelledby="stock-seo-heading">
      <h1 id="stock-seo-heading" className={styles.stockSeoH1}>
        Is {name} Halal?
      </h1>
      <p className={styles.stockSeoLead}>
        <span className={styles.stockSeoStatus}>{status}</span>
        <span className={styles.stockSeoScoreWrap}>
          <span className={styles.stockSeoScoreLabel}>Screen score</span>
          <strong className={styles.stockSeoScore}>{score}</strong>
          <span className={styles.stockSeoMuted}> / 100</span>
        </span>
      </p>

      {highlights?.length ? (
        <ul className={styles.stockSeoList}>
          {highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      ) : null}

      {consensus?.summary ? (
        <p className={styles.stockSeoConsensus}>
          <strong>Consensus:</strong> {consensus.summary}
          {consensus.total != null ? (
            <span className={styles.stockSeoMuted}>
              {" "}
              (pass {consensus.passed ?? "—"}, fail {consensus.failed ?? "—"}, review{" "}
              {consensus.doubtful ?? "—"})
            </span>
          ) : null}
        </p>
      ) : null}

      {conf?.level != null || conf?.score != null ? (
        <p className={styles.stockSeoConfidence}>
          <strong>Confidence:</strong> {conf.level ?? "—"}
          {conf.score != null ? <span className={styles.stockSeoMuted}> (trust {conf.score}/100)</span> : null}
        </p>
      ) : null}

      <div className={styles.stockSeoArticle}>
        <h2 className={styles.stockSeoH2}>Overview</h2>
        <p className={styles.stockSeoBody}>{seo.content}</p>
      </div>

      {seo.faq?.length ? (
        <div className={styles.stockSeoFaq}>
          <h2 className={styles.stockSeoH2}>FAQ</h2>
          <dl className={styles.stockSeoDl}>
            {seo.faq.map((item) => (
              <div key={item.question} className={styles.stockSeoFaqItem}>
                <dt className={styles.stockSeoDt}>{item.question}</dt>
                <dd className={styles.stockSeoDd}>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
