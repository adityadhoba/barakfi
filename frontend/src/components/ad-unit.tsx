"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import styles from "./ad-unit.module.css";

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "";

const FORMAT_CONFIG = {
  banner: { width: 728, height: 90, format: "horizontal" },
  rectangle: { width: 300, height: 250, format: "rectangle" },
  responsive: { width: undefined, height: undefined, format: "auto" },
} as const;

type AdFormat = keyof typeof FORMAT_CONFIG;

interface AdUnitProps {
  /** Ad format: "banner" (728x90), "rectangle" (300x250), or "responsive" (auto) */
  format?: AdFormat;
  /** Google AdSense ad slot ID for this placement */
  slot?: string;
  /** Optional className for the outer wrapper */
  className?: string;
}

/**
 * Reusable Google AdSense ad unit.
 * Renders a placeholder when the AdSense client ID is not configured (dev mode).
 * Loads the AdSense script once via next/script.
 */
export function AdUnit({ format = "responsive", slot, className }: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  const config = FORMAT_CONFIG[format];
  const resolvedSlot =
    slot ??
    (format === "banner"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER
      : format === "rectangle"
        ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE
        : process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER) ??
    "";

  useEffect(() => {
    if (!AD_CLIENT || !resolvedSlot || pushed.current) return;
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle;
      if (adsbygoogle) {
        adsbygoogle.push({});
        pushed.current = true;
      }
    } catch {
      // AdSense not loaded yet or blocked — silently ignore
    }
  }, [resolvedSlot]);

  const wrapperClass = [
    styles.adWrapper,
    format === "banner" ? styles.adBanner : format === "rectangle" ? styles.adRectangle : styles.adResponsive,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Dev mode placeholder when no client ID is configured
  if (!AD_CLIENT) {
    return (
      <aside className={wrapperClass} aria-label="Advertisement">
        <span className={styles.adLabel}>Ad</span>
        <div className={styles.adContent}>
          <div className={styles.adPlaceholder}>
            Ad placeholder ({format === "responsive" ? "auto" : `${config.width}x${config.height}`})
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <Script
        id="adsense-script"
        strategy="lazyOnload"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`}
        crossOrigin="anonymous"
      />
      <aside className={wrapperClass} aria-label="Advertisement">
        <span className={styles.adLabel}>Ad</span>
        <div className={styles.adContent}>
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{
              display: "block",
              width: config.width ? `${config.width}px` : "100%",
              height: config.height ? `${config.height}px` : "auto",
            }}
            data-ad-client={AD_CLIENT}
            data-ad-slot={resolvedSlot}
            data-ad-format={config.format}
            data-full-width-responsive={format === "responsive" ? "true" : undefined}
          />
        </div>
      </aside>
    </>
  );
}
