"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Slim top-loading progress bar — like YouTube / GitHub.
 * Shows during page navigation to give instant feedback.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    setVisible(true);
    setProgress(0);
    // Animate to ~70% quickly, then slow down
    let p = 0;
    const tick = () => {
      p += Math.max(2, (90 - p) * 0.08);
      if (p >= 90) p = 90;
      setProgress(p);
      if (p < 90) {
        timerRef.current = setTimeout(tick, 100);
      }
    };
    timerRef.current = setTimeout(tick, 50);
  }, []);

  const done = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, []);

  // Detect navigation changes — completing the bar is a response to URL change (external system)
  useEffect(() => {
    done(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname, searchParams, done]);

  // Intercept link clicks to start the bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;
      if (target.getAttribute("target") === "_blank") return;
      // Same page check
      if (href === pathname) return;
      start();
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname, start]);

  if (!visible && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,
        zIndex: 9999,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--emerald)",
          borderRadius: "0 2px 2px 0",
          transition: progress === 100 ? "width 0.2s ease" : "width 0.4s ease-out",
          boxShadow: "0 0 8px var(--emerald-dim)",
        }}
      />
    </div>
  );
}
