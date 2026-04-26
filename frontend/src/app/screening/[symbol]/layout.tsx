import type { Metadata } from "next";
import type { ReactNode } from "react";

// The /screening/[symbol] page is a JS-only redirect page (paywall check).
// Googlebot cannot execute the JS redirect so we mark it noindex to prevent
// "redirect error" reports in Google Search Console.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ScreeningLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
