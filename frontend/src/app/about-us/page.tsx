import type { Metadata } from "next";
import { HomeV2 } from "@/components/home-v2";

export const metadata: Metadata = {
  title: "About Us — Barakfi",
  description:
    "Learn how BarakFi screens Indian stocks for Shariah compliance with transparent methodology, live market context, and evidence-first verdicts.",
  alternates: { canonical: "/about-us" },
  robots: { index: true, follow: true },
};

export default async function AboutUsPage() {
  return (
    <HomeV2 />
  );
}
