import type { Metadata } from "next";
import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Halal stock screener for India — NSE & BSE Shariah compliance",
  description:
    "Screen Indian stocks for Shariah-aligned investing: live halal, doubtful, and haram labels with financial ratios, watchlists, calculators, and long-form learn guides — focused on NSE and BSE listings with transparent methodology (not a fatwa or personalised advice).",
};

export default function Home() {
  return (
    <main className="shellPage">
      <HomeDashboard />
    </main>
  );
}
