import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
  description:
    "One-time account setup for BarakFi after you sign in — provisions your profile for the halal stock screener and tools. Private flow; search engines should not index this page.",
  robots: { index: false, follow: true },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
