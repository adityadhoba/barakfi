"use client";

import { useEffect } from "react";

/**
 * Adds a subtle bounce animation to the page when the user tries to scroll
 * past the top or bottom boundary. Works cross-browser via CSS classes on
 * <html>. Respects prefers-reduced-motion.
 */
export function useScrollBounce() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let bouncing = false;
    let lastY = window.scrollY;

    function triggerBounce(dir: "up" | "down") {
      if (bouncing) return;
      bouncing = true;
      document.documentElement.classList.add(`scroll-bounce-${dir}`);
      setTimeout(() => {
        document.documentElement.classList.remove(`scroll-bounce-${dir}`);
        bouncing = false;
      }, 400);
    }

    function onWheel(e: WheelEvent) {
      const atTop = window.scrollY <= 0;
      const atBottom =
        window.scrollY + window.innerHeight >= document.body.scrollHeight - 2;

      if (atTop && e.deltaY < 0) triggerBounce("up");
      if (atBottom && e.deltaY > 0) triggerBounce("down");
    }

    let touchStartY = 0;
    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0]?.clientY ?? 0;
      lastY = window.scrollY;
    }
    function onTouchMove(e: TouchEvent) {
      const dy = (e.touches[0]?.clientY ?? 0) - touchStartY;
      const atTop = window.scrollY <= 0;
      const atBottom =
        window.scrollY + window.innerHeight >= document.body.scrollHeight - 2;

      if (atTop && dy > 30) triggerBounce("up");
      if (atBottom && dy < -30) triggerBounce("down");
      lastY = window.scrollY;
    }

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
}
