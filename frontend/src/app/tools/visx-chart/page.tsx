import type { Metadata } from "next";
import { FinanceChartVisxDemo } from "@/components/ui/finance-chart-demo";

export const metadata: Metadata = {
  title: "Visx chart demo",
  robots: { index: false, follow: false },
};

/** Demo page for @visx area chart (shadcn-style /components/ui). Not linked in main nav by default. */
export default function VisxChartDemoPage() {
  return <FinanceChartVisxDemo />;
}
