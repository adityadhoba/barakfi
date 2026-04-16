import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Sign Up — Barakfi",
  description:
    "Create your free BarakFi account to sync a Shariah-aware watchlist, save research notes, and use calculators built for Indian Muslim investors screening NSE and BSE equities — private sign-up flow, not for search indexing.",
  robots: { index: false, follow: true },
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
            Built for Indian Equity Screening
          </div>
          <h2 className="authSidebarTitle">Create your BarakFi account</h2>
          <p className="authSidebarDesc">
            Start with a free account to save screened stocks, compare ideas, and keep research notes across devices.
          </p>
          <div className="authFeatures">
            <div className="authFeature">
              <span className="authFeatureIcon" aria-hidden>DF</span>
              <span>Data-first screening with transparent ratio logic</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon" aria-hidden>MS</span>
              <span>Multi-standard methodology checks per stock</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon" aria-hidden>PT</span>
              <span>Portfolio tracking plus purification and zakat tools</span>
            </div>
          </div>

          {/* Trust badges */}
          <div className="authTestimonial">
            <p className="authTestimonialQuote">
              &ldquo;I can see the exact reasons behind each verdict before making a decision.&rdquo;
            </p>
            <span className="authTestimonialAttr">— Early beta user, Hyderabad</span>
          </div>

          <p className="authSidebarFooter">
            370+ Indian listings covered across NSE and BSE
          </p>
        </div>
      </div>
      <div className="authMain">
        <div className="authMobileIntro">
          <Link href="/" style={{ textDecoration: "none", marginBottom: "10px", display: "inline-flex" }}>
            <Logo size={32} showText />
          </Link>
          <p className="authMobileIntroText">
            Create your account to unlock synced screening history and watchlist tracking.
          </p>
        </div>
        <SignUp
          appearance={{
            layout: {
              logoImageUrl: "/brand/barakfi-logo-mark.svg",
              logoPlacement: "inside",
            },
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
              logoImage: {
                width: "52px",
                height: "52px",
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
              footerActionText: {
                color: "var(--text-tertiary)",
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
