import type { Metadata } from "next";
import { HomeDashboard } from "@/components/home-dashboard";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Halal stock screener for India — NSE & BSE Shariah compliance",
  description:
    "Check halal stocks using standard Shariah criteria with transparent ratios, watchlists, calculators, and learn guides for NSE and BSE listings — educational only (not a religious ruling or personalised advice).",
  alternates: { canonical: "https://barakfi.in/" },
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <main className="shellPage">
      <HomeDashboard />
    </main>
  );
}
