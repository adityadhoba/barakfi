"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { getPublicApiBaseUrl } from "@/lib/api-base";
import styles from "./screening.module.css";

const apiBaseUrl = getPublicApiBaseUrl();

const STEPS = [
  { label: "Resolving listing", icon: "🔍", delay: 600 },
  { label: "Loading fundamentals", icon: "📊", delay: 900 },
  { label: "Applying Shariah rules", icon: "📐", delay: 1000 },
  { label: "Computing verdict", icon: "⚖️", delay: 700 },
] as const;

const MIN_DISPLAY_MS = 2800;

export default function ScreeningAnimationPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!symbol) return;

    const decoded = decodeURIComponent(symbol as string);
    const controller = new AbortController();

    const runScreen = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/screen/manual`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: decoded }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          if (res.status === 429) {
            setError("limit");
            return;
          }
          setError(d?.detail || "Screening failed");
          return;
        }
        const data = await res.json();
        setVerdict(data.screening?.status || "UNKNOWN");
      } catch {
        if (!controller.signal.aborted) setError("Network error");
      }
    };

    void runScreen();
    return () => controller.abort();
  }, [symbol]);

  useEffect(() => {
    if (prefersReduced) {
      setActiveStep(STEPS.length);
      return;
    }
    if (activeStep >= STEPS.length) return;
    const timer = setTimeout(() => setActiveStep((s) => s + 1), STEPS[activeStep].delay);
    return () => clearTimeout(timer);
  }, [activeStep, prefersReduced]);

  useEffect(() => {
    if (verdict && activeStep >= STEPS.length) {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      const timer = setTimeout(() => {
        router.push(`/stocks/${encodeURIComponent(symbol as string)}`);
      }, prefersReduced ? 0 : remaining);
      return () => clearTimeout(timer);
    }
  }, [verdict, activeStep, symbol, router, prefersReduced]);

  if (error === "limit") {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Daily limit reached</h1>
          <p className={styles.subtitle}>
            You&apos;ve used your free screenings for today.
          </p>
          <a href="/premium" className={styles.ctaBtn}>
            Join Early Access
          </a>
          <p className={styles.hint}>Come back tomorrow for more free screens.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Screening failed</h1>
          <p className={styles.subtitle}>{error}</p>
          <button className={styles.ctaBtn} onClick={() => router.back()}>
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
          Screening <span className={styles.symbol}>{decodeURIComponent(symbol as string)}</span>
        </h1>
        <div className={styles.steps}>
          {STEPS.map((step, i) => {
            const done = i < activeStep;
            const active = i === activeStep && activeStep < STEPS.length;
            return (
              <div
                key={step.label}
                className={`${styles.step} ${done ? styles.stepDone : ""} ${active ? styles.stepActive : ""}`}
              >
                <span className={styles.stepIcon}>{step.icon}</span>
                <span className={styles.stepLabel}>{step.label}</span>
                {done && <span className={styles.stepCheck}>✓</span>}
                {active && <span className={styles.stepSpinner} />}
              </div>
            );
          })}
        </div>
        {verdict && (
          <div className={styles.verdictRow}>
            <span
              className={`${styles.verdictBadge} ${
                verdict === "HALAL" ? styles.verdictHalal : verdict === "CAUTIOUS" ? styles.verdictCautious : styles.verdictFail
              }`}
            >
              {verdict === "HALAL" ? "Halal" : verdict === "CAUTIOUS" ? "Cautious" : "Non-Compliant"}
            </span>
            <span className={styles.redirectHint}>Redirecting to details…</span>
          </div>
        )}
      </div>
    </main>
  );
}
