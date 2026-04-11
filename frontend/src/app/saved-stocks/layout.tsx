import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watchlist — Barakfi",
  description: "Stocks saved on this device from your halal checks.",
};

export default function SavedStocksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
