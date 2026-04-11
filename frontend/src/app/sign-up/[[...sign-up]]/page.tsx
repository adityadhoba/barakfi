import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Sign Up — Barakfi",
  description: "Create your free account to screen, track, and invest in Shariah-compliant Indian stocks.",
};

export default function SignUpPage() {
  return (
    <div className="authPage">
      <div className="authSidebar authSidebarGradient">
        <div className="authSidebarInner">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={28} showText variant="light" />
          </Link>
          <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "9999px", background: "rgba(255,255,255,0.12)", fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "0.02em", marginBottom: "16px" }}>
            Shariah-Compliant Investing
          </div>
          <h2 className="authSidebarTitle">Start Your Halal Journey</h2>
          <p className="authSidebarDesc">
            Create your free account to screen, track, and invest in Shariah-compliant stocks across Indian, US, and UK markets.
          </p>
          <div className="authFeatures">
            <div className="authFeature">
              <span className="authFeatureIcon">&#x2315;</span>
              <span>Screen 370+ stocks across NSE, NYSE, and LSE</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon">&#x2606;</span>
              <span>Track Shariah compliance across your portfolio</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon">&#x25A6;</span>
              <span>Free purification and zakat calculators</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon">&#x1F4CA;</span>
              <span>Interactive charts and real-time price data</span>
            </div>
          </div>

          {/* Trust badges */}
          <div className="authTestimonial">
            <p className="authTestimonialQuote">
              &ldquo;The compliance breakdown on each stock is exactly what I needed to invest with peace of mind.&rdquo;
            </p>
            <span className="authTestimonialAttr">— Early beta user, Hyderabad</span>
          </div>

          <p className="authSidebarFooter">
            370+ stocks screened across 3 global exchanges
          </p>
        </div>
      </div>
      <div className="authMain">
        <SignUp
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
