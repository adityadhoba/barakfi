/** Format API `as_of` (ISO or similar) for display in trust UI */
export function formatQuoteAsOf(iso: string | undefined | null): string | null {
  if (!iso || !iso.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export function quoteSourceLabel(source: string | undefined): string {
  const s = (source || "").toLowerCase();
  if (s.includes("nse")) return "NSE (public)";
  if (s.includes("yahoo")) return "Yahoo Finance";
  return source || "Market data";
}
