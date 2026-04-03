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
          <h2 className="authSidebarTitle">Start investing with confidence</h2>
          <p className="authSidebarDesc">
            Create your free account in seconds. No credit card required.
          </p>
          <div className="authFeatures">
            <div className="authFeature">
              <span className="authFeatureIcon">&#x2315;</span>
              <span>Screen 100+ Indian stocks for Shariah compliance</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon">&#x2606;</span>
              <span>Build and track your personal watchlist</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon">&#x25A6;</span>
              <span>Log decisions and manage your halal portfolio</span>
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
            S&amp;P + AAOIFI methodology &middot; Free forever
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
            },
          }}
        />
      </div>
    </div>
  );
}
