import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign Up — Barakfi",
  description: "Create your free account to screen, track, and invest in Shariah-compliant Indian stocks.",
};

export default function SignUpPage() {
  return (
    <div className="authPage">
      <div className="authSidebar">
        <div className="authSidebarInner">
          <Link href="/" className="authLogo">Barakfi</Link>
          <h2 className="authSidebarTitle">Start investing with confidence</h2>
          <p className="authSidebarDesc">
            Create your free account in seconds. No credit card required.
          </p>
          <div className="authFeatures">
            <div className="authFeature">
              <span className="authFeatureIcon">&#x2315;</span>
              <span>Screen 60+ Indian stocks for Shariah compliance</span>
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
          <p className="authSidebarFooter">
            Join disciplined investors across India.
          </p>
        </div>
      </div>
      <div className="authMain">
        <SignUp
          appearance={{
            elements: {
              rootBox: { width: "100%", maxWidth: "440px" },
              card: {
                borderRadius: "16px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
                border: "1px solid var(--line)",
                background: "var(--panel)",
              },
              headerTitle: {
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              },
              formButtonPrimary: {
                background: "var(--emerald)",
                borderRadius: "10px",
                fontWeight: 600,
                transition: "background 150ms ease",
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
