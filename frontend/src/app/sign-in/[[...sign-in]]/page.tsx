import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In — Barakfi",
  description: "Sign in to access your Shariah-compliant portfolio, watchlist, and research notes.",
};

export default function SignInPage() {
  return (
    <div className="authPage">
      <div className="authSidebar">
        <div className="authSidebarInner">
          <Link href="/" className="authLogo">Barakfi</Link>
          <h2 className="authSidebarTitle">Welcome back</h2>
          <p className="authSidebarDesc">
            Sign in to access your watchlist, portfolio, and screening results.
          </p>
          <div className="authFeatures">
            <div className="authFeature">
              <span className="authFeatureIcon">&#x2713;</span>
              <span>Track Shariah compliance across your portfolio</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon">&#x2606;</span>
              <span>Save stocks to your personal watchlist</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon">&#x25A6;</span>
              <span>Add research notes with reasoning</span>
            </div>
          </div>
          <p className="authSidebarFooter">
            Trusted by disciplined investors across India.
          </p>
        </div>
      </div>
      <div className="authMain">
        <SignIn
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
