import type { Metadata } from "next";
import { HomeDashboard } from "@/components/home-dashboard";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Halal stock screener for India — NSE & BSE Shariah compliance",
  description:
    "Check halal stocks using standard Shariah criteria, transparent ratios, watchlists, calculators, and learn guides for NSE and BSE listings. See methodology-based compliance outcomes in a clear, educational format.",
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <main className="shellPage">
      <HomeDashboard />
    </main>
  );
}
