"use client";

import { useEffect, useState } from "react";

/**
 * Shows whether NSE market is currently open or closed.
 * NSE hours: Mon-Fri 9:15 AM - 3:30 PM IST (UTC+5:30)
 * Pre-market: 9:00 AM - 9:15 AM IST
 */

type MarketState = "open" | "pre-market" | "closed";

function getMarketState(): MarketState {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);

  const day = ist.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return "closed";

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Pre-market: 9:00 - 9:15
  if (totalMinutes >= 540 && totalMinutes < 555) return "pre-market";
  // Market open: 9:15 - 15:30
  if (totalMinutes >= 555 && totalMinutes < 930) return "open";

  return "closed";
}

function formatIST(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const STATE_CONFIG: Record<MarketState, { label: string; dotClass: string }> = {
  open: { label: "Market Open", dotClass: "marketDotOpen" },
  "pre-market": { label: "Pre-Market", dotClass: "marketDotPre" },
  closed: { label: "Market Closed", dotClass: "marketDotClosed" },
};

export function MarketStatus() {
  const [state, setState] = useState<MarketState>(getMarketState);
  const [time, setTime] = useState(formatIST);

  useEffect(() => {
    const interval = setInterval(() => {
      setState(getMarketState());
      setTime(formatIST());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const cfg = STATE_CONFIG[state];

  return (
    <div className="marketStatus" aria-label={`NSE ${cfg.label}`}>
      <span className={`marketDot ${cfg.dotClass}`} aria-hidden="true" />
      <span className="marketLabel">{cfg.label}</span>
      {time && <span className="marketTime">{time} IST</span>}
    </div>
  );
}
