"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only (same-origin /sw.js).
 * Provides offline fallback via public/sw.js + public/offline.html.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* non-fatal: e.g. HTTP on localhost */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
