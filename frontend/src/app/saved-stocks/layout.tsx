import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved stocks",
  description:
    "View stocks you saved on this device for quick access to BarakFi halal screening. Saved lists stay local to your browser; sign in to sync a cloud watchlist across sessions. Indian NSE/BSE-focused screener — educational only, not investment advice.",
};

export default function SavedStocksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
