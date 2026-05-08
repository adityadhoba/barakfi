import Link from "next/link";
import { DM_Serif_Display } from "next/font/google";
import { LocalMarketingNav } from "@/components/local-marketing-nav";
import styles from "./auth-editorial-shell.module.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

const TICKER_ITEMS = [
  { label: "NIFTY 50", value: "23,842.75", change: "+0.54%", positive: true },
  { label: "SENSEX", value: "78,553.20", change: "+0.54%", positive: true },
  { label: "NIFTY BANK", value: "51,236.80", change: "−0.17%", positive: false },
  { label: "NIFTY IT", value: "33,156.40", change: "+0.75%", positive: true },
  { label: "NIFTY PHARMA", value: "19,872.35", change: "+0.28%", positive: true },
  { label: "NIFTY AUTO", value: "23,145.90", change: "−0.48%", positive: false },
  { label: "NIFTY FMCG", value: "56,234.15", change: "+0.32%", positive: true },
  { label: "INDIA VIX", value: "13.42", change: "−2.75%", positive: false },
];

type Feature = {
  title: string;
  body: string;
};

type Stat = {
  value: string;
  label: string;
};

type Props = {
  mode: "sign-in" | "sign-up";
  eyebrow: string;
  heading: React.ReactNode;
  description: React.ReactNode;
  features: Feature[];
  stats: Stat[];
  cardEyebrow: string;
  cardTitle: string;
  cardSub: React.ReactNode;
  children: React.ReactNode;
};

export function AuthEditorialShell({
  mode,
  eyebrow,
  heading,
  description,
  features,
  stats,
  cardEyebrow,
  cardTitle,
  cardSub,
  children,
}: Props) {
  const isSignUp = mode === "sign-up";

  return (
    <div className={styles.shell}>
      <section className={styles.ticker} aria-label="Live market tape">
        <div className={styles.track}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
            <span className={styles.item} key={`${item.label}-${index}`}>
              <b>{item.label}</b> {item.value}{" "}
              <span className={item.positive ? styles.up : styles.down}>{item.change}</span>
            </span>
          ))}
        </div>
      </section>

      <LocalMarketingNav activeAuth={mode} />

      <main className={`${styles.page} ${isSignUp ? styles.pageSignUp : styles.pageSignIn}`}>
        <section
          className={`${styles.left} ${isSignUp ? styles.leftSignUp : ""} ${isSignUp ? styles.leftGradient : ""}`}
        >
          <div className={styles.leftTop}>
            <div className={styles.eyebrow}>{eyebrow}</div>
            <h1 className={`${styles.heading} ${serif.className}`}>{heading}</h1>
            <p className={styles.desc}>{description}</p>

            <div className={styles.features}>
              {features.map((feature) => (
                <div className={styles.featureRow} key={feature.title}>
                  <span className={styles.featureDot} aria-hidden />
                  <div>
                    <div className={styles.featureTitle}>{feature.title}</div>
                    <div className={styles.featureSub}>{feature.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.leftBottom} ${isSignUp ? styles.statsThree : styles.stats}`}>
            {stats.map((stat) => (
              <div className={styles.stat} key={stat.label}>
                <div className={`${styles.statNumber} ${serif.className}`}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.right} ${isSignUp ? styles.rightSignUp : ""}`}>
          <div className={styles.mobileIntro}>
            <div className={styles.eyebrow}>{eyebrow}</div>
            <p className={styles.mobileIntroText}>{description}</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardEyebrow}>{cardEyebrow}</div>
            <div className={`${styles.cardTitle} ${serif.className}`}>{cardTitle}</div>
            <div className={styles.cardSub}>{cardSub}</div>
            {children}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>© 2025 BarakFi · Secure Clerk authentication for your screening workspace</div>
        <div className={styles.footerRight}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </div>
      </footer>
    </div>
  );
}
