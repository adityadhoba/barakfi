import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Sign Up — Barakfi",
  description:
    "Create your free BarakFi account to sync a Shariah-aware watchlist, save research notes, and use stock screening tools for NSE and BSE equities — private sign-up flow, not for search indexing.",
  robots: { index: false, follow: true },
};

export default function SignUpPage() {
  return (
    <div className="authPage">
      <div className="authSidebar authSidebarGradient">
        <div className="authSidebarInner">
          <div className="authLeftEyebrow">SHARIAH STOCK SCREENER · INDIA</div>
          <h2 className="authSidebarTitle">
            Screen with <em>clarity.</em><br />Screen with conscience.
          </h2>
          <p className="authSidebarDesc">
            BarakFi screens 527 NSE &amp; BSE stocks against Shariah compliance criteria, so you know exactly where you stand, every quarter.
          </p>
          <div className="authFeatures">
            <div className="authFeature">
              <span className="authFeatureIcon" aria-hidden></span>
              <span>Clear verdicts, no guesswork — Compliant, Requires Review, or Not Compliant — grounded in transparent methodology.</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon" aria-hidden></span>
              <span>Watchlist &amp; status alerts — Track stocks you save and keep an eye on compliance status changes over time.</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon" aria-hidden></span>
              <span>Zakat &amp; purification tools — Use BarakFi&apos;s calculators to estimate Zakat and purification amounts for screened holdings.</span>
            </div>
          </div>
        </div>
        <div className="authSidebarStats">
          <div className="authSidebarStat">
            <div className="authSidebarStatNum">527+</div>
            <div className="authSidebarStatLabel">Stocks Screened</div>
          </div>
          <div className="authSidebarStat" style={{ paddingLeft: 24 }}>
            <div className="authSidebarStatNum">4×</div>
            <div className="authSidebarStatLabel">Updated Yearly</div>
          </div>
          <div className="authSidebarStat" style={{ paddingLeft: 24 }}>
            <div className="authSidebarStatNum">Free.</div>
            <div className="authSidebarStatLabel">Always</div>
          </div>
        </div>
      </div>
      <div className="authMain">
        <SignUp
          appearance={{
            layout: {
              logoImageUrl: "/brand/barakfi-logo-mark.svg",
              logoPlacement: "inside",
            },
            elements: {
              rootBox: { width: "100%", maxWidth: "440px" },
              card: {
                background: "#091410",
                border: "1px solid rgba(230,226,216,0.1)",
                borderRadius: "0",
                boxShadow: "none",
              },
              headerTitle: {
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontWeight: "400",
                fontSize: "34px",
                color: "#e6e2d8",
                letterSpacing: "-0.01em",
              },
              headerSubtitle: {
                color: "rgba(230,226,216,0.58)",
                fontSize: "13px",
              },
              logoImage: {
                width: "52px",
                height: "52px",
              },
              formFieldInput: {
                background: "#112318",
                border: "1px solid rgba(230,226,216,0.1)",
                borderRadius: "0",
                color: "#e6e2d8",
                fontSize: "13.5px",
              },
              formButtonPrimary: {
                background: "#e6e2d8",
                color: "#091410",
                borderRadius: "0",
                fontWeight: "500",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: "12px",
              },
              footerActionLink: {
                color: "#7ec8a0",
              },
              footerActionText: {
                color: "rgba(230,226,216,0.58)",
              },
              badge: {
                display: "none",
              },
              dividerLine: {
                background: "rgba(230,226,216,0.1)",
              },
              socialButtonsBlockButton: {
                background: "#e6e2d8",
                color: "#091410",
                borderRadius: "0",
                border: "none",
                fontWeight: "500",
                letterSpacing: "0.08em",
              },
            },
          }}
        />
      </div>
    </div>
  );
}
