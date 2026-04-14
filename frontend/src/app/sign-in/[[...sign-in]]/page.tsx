import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Sign In — Barakfi",
  description:
    "Sign in to BarakFi to sync your Shariah-compliant watchlist, research notes, and stock screening tools for Indian equities (NSE & BSE). Clerk-secured authentication — private page, not intended for search indexing.",
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <div className="authPage">
      <div className="authSidebar authSidebarGradient">
        <div className="authSidebarInner">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={28} showText variant="light" />
          </Link>
          <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "9999px", background: "rgba(255,255,255,0.12)", fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "0.02em", marginBottom: "16px" }}>
            Shariah Stock Screening
          </div>
          <h2 className="authSidebarTitle">Assalamu Alaikum — welcome to Barakfi</h2>
          <p className="authSidebarDesc">
            Sign in to access your screened stocks dashboard, watchlist, and screening results for NSE and BSE-listed Indian equities.
          </p>
          <div className="authFeatures">
            <div className="authFeature">
              <span className="authFeatureIcon">&#x2713;</span>
              <span>Screen Indian stocks with transparent Shariah-style ratios</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon">&#x2606;</span>
              <span>Track Shariah compliance across your watchlist</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon">&#x25A6;</span>
              <span>Free purification and zakat calculators</span>
            </div>
          </div>

          {/* Testimonial */}
          <div className="authTestimonial">
            <p className="authTestimonialQuote">
              &ldquo;Finally, a screening tool that shows me exactly why a stock is classified this way — with real financial data, not just opinions.&rdquo;
            </p>
            <span className="authTestimonialAttr">— Early beta user, Mumbai</span>
          </div>

          <p className="authSidebarFooter">
            370+ stocks screened across 3 global exchanges
          </p>
        </div>
      </div>
      <div className="authMain">
        <SignIn
          appearance={{
            elements: {
              rootBox: { width: "100%", maxWidth: "440px" },
              card: {
                borderRadius: "20px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                border: "1px solid var(--line)",
                background: "var(--panel)",
              },
              headerTitle: {
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              },
              headerSubtitle: {
                color: "var(--text-secondary)",
              },
              formFieldInput: {
                borderRadius: "10px",
                background: "var(--bg-soft)",
                fontSize: "0.9rem",
              },
              formButtonPrimary: {
                background: "var(--emerald)",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.9rem",
                padding: "12px 0",
                transition: "all 150ms ease",
              },
              footerActionLink: {
                color: "var(--emerald)",
              },
              footer: {
                "& > *:last-child": { display: "none" },
              },
              internal: {
                display: "none",
              },
              badge: {
                display: "none",
              },
              dividerLine: {
                background: "var(--line)",
              },
              socialButtonsBlockButton: {
                borderRadius: "10px",
                border: "1px solid var(--line)",
                background: "var(--bg-soft)",
                transition: "all 150ms ease",
              },
            },
          }}
        />
      </div>
    </div>
  );
}
