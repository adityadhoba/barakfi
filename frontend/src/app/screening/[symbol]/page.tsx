"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useScreening } from "@/contexts/screening-context";
import styles from "./screening.module.css";

type ScreenRedirectState =
  | { kind: "loading" }
  | { kind: "limit_exhausted"; message: string; redirectUrl?: string }
  | { kind: "error"; message: string };

export default function ScreeningRedirectPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const router = useRouter();
  const { unlockDetails } = useScreening();
  const [state, setState] = useState<ScreenRedirectState>({ kind: "loading" });

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    const decoded = decodeURIComponent(symbol);

    async function openDetails() {
      const result = await unlockDetails(decoded);
      if (!active) return;

      if (result.kind === "granted") {
        router.replace(`/stocks/${encodeURIComponent(decoded)}`);
        return;
      }

      if (result.kind === "redirect") {
        router.replace(result.url);
        return;
      }

      if (result.kind === "limit_exhausted") {
        setState({
          kind: "limit_exhausted",
          message: result.message,
          redirectUrl: result.redirectUrl,
        });
        return;
      }

      setState({ kind: "error", message: result.message });
    }

    void openDetails();
    return () => {
      active = false;
    };
  }, [router, symbol, unlockDetails]);

  if (state.kind === "limit_exhausted") {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Daily limit reached</h1>
          <p className={styles.subtitle}>{state.message}</p>
          <div className={styles.actions}>
            {state.redirectUrl ? (
              <Link href={state.redirectUrl} className={styles.ctaBtn}>
                Join Early Access
              </Link>
            ) : null}
            <Link href="/screener" className={styles.secondaryBtn}>
              Back to screener
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Couldn&apos;t open details</h1>
          <p className={styles.subtitle}>{state.message}</p>
          <button type="button" className={styles.ctaBtn} onClick={() => router.back()}>
            Go back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          Opening <span className={styles.symbol}>{decodeURIComponent(symbol as string)}</span>
        </h1>
        <p className={styles.subtitle}>
          We&apos;re taking you to the detailed compliance breakdown.
        </p>
        <div className={styles.steps}>
          <div className={`${styles.step} ${styles.stepActive}`}>
            <span className={styles.stepIcon}>↗</span>
            <span className={styles.stepLabel}>Preparing stock details</span>
            <span className={styles.stepSpinner} />
          </div>
        </div>
      </div>
    </main>
  );
}
