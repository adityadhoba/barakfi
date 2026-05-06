"use client";

import { StockPageRouteShell } from "@/components/stock-page-route-shell";
import { StockDetailError } from "@/components/stock-detail-error";

export default function StockRouteError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const message = error.message.includes("not found")
    ? "This stock could not be found. It may have been delisted or the symbol is incorrect."
    : "We ran into a problem fetching this stock's data. This is usually temporary.";

  return (
    <StockPageRouteShell>
      <StockDetailError message={message} />
    </StockPageRouteShell>
  );
}
