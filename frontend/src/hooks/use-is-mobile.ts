"use client";

import { useEffect, useState } from "react";

const QUERY = "(max-width: 960px)";

/**
 * True when viewport matches mobile/tablet breakpoint (screener sidebar breakpoint).
 */
export function useIsMobileSidebarBreakpoint(): boolean {
  const [m, setM] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setM(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return m;
}

const CARD_QUERY = "(max-width: 640px)";

/** Screener: show result cards instead of table */
export function useIsMobileScreenerCardLayout(): boolean {
  const [m, setM] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(CARD_QUERY);
    const update = () => setM(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return m;
}
