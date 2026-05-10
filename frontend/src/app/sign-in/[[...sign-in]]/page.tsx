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
          <div className="authLeftEyebrow">WELCOME BACK</div>
          <h2 className="authSidebarTitle">
            Your halal<br />portfolio starts<br /><em>here.</em>
          </h2>
          <p className="authSidebarDesc">
            Sign in to access your personal watchlist, track compliance changes, and keep your screening workflow in one place.
          </p>
          <div className="authFeatures">
            <div className="authFeature">
              <span className="authFeatureIcon" aria-hidden></span>
              <span>Compliance Watchlist — Save any of 527 screened NSE &amp; BSE stocks and monitor their status over time.</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon" aria-hidden></span>
              <span>Track status changes — Review when a saved stock moves from Compliant to Requires Review — or back.</span>
            </div>
            <div className="authFeature">
              <span className="authFeatureIcon" aria-hidden></span>
              <span>Always free — No subscription. No credit card. BarakFi is free to use while we build the workflow.</span>
            </div>
          </div>
        </div>
        <div className="authSidebarStats">
          <div className="authSidebarStat">
            <div className="authSidebarStatNum">527</div>
            <div className="authSidebarStatLabel">Stocks covered</div>
          </div>
          <div className="authSidebarStat" style={{ paddingLeft: 24 }}>
            <div className="authSidebarStatNum">4</div>
            <div className="authSidebarStatLabel">Screening standards</div>
          </div>
          <div className="authSidebarStat" style={{ paddingLeft: 24 }}>
            <div className="authSidebarStatNum">Free</div>
            <div className="authSidebarStatLabel">Always</div>
          </div>
        </div>
      </div>
      <div className="authMain">
        <SignIn
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
