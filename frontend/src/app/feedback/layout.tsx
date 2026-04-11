import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback",
  description:
    "Send product feedback, feature ideas, or data-quality reports to the BarakFi team. We read every message about the India-focused halal stock screener, calculators, and learn content — thank you for helping improve transparency for Muslim investors.",
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
