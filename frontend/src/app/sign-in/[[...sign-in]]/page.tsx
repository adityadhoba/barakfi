import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { AuthEditorialShell } from "@/components/auth-editorial-shell";
import styles from "@/components/auth-editorial-shell.module.css";

export const metadata: Metadata = {
  title: "Sign In — Barakfi",
  description:
    "Sign in to BarakFi to sync your Shariah-compliant watchlist, research notes, and stock screening tools for Indian equities (NSE & BSE). Clerk-secured authentication — private page, not intended for search indexing.",
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <AuthEditorialShell
      mode="sign-in"
      eyebrow="Welcome back"
      heading={
        <>
          Your halal
          <br />
          portfolio starts
          <br />
          <em>here.</em>
        </>
      }
      description={
        <>
          Sign in to access your personal watchlist, track compliance changes, and keep your
          screening workflow in one place.
        </>
      }
      features={[
        {
          title: "Compliance Watchlist",
          body: "Save any of 527 screened NSE & BSE stocks and monitor their status over time.",
        },
        {
          title: "Track status changes",
          body: "Review when a saved stock moves from Compliant to Requires Review — or back.",
        },
        {
          title: "Check 5 stocks free, then sign up for 50 monthly",
          body: "Create a free account to unlock 50 detailed stock screening reports per month.",
        },
      ]}
      stats={[
        { value: "527", label: "Stocks covered" },
        { value: "4", label: "Screening standards" },
        { value: "50", label: "Monthly/free account" },
      ]}
      cardEyebrow="Sign in"
      cardTitle="Welcome back"
      cardSub={
        <>
          Don&apos;t have an account? <Link href="/sign-up">Create one free →</Link>
        </>
      }
    >
      <div className={styles.clerkSignIn}>
        <SignIn
          appearance={{
            layout: {
              logoPlacement: "none",
              socialButtonsVariant: "blockButton",
            },
            variables: {
              fontFamily: "Inter, sans-serif",
              borderRadius: "0px",
              colorPrimary: "#7ec8a0",
              colorText: "#e6e2d8",
              colorTextSecondary: "rgba(230, 226, 216, 0.58)",
              colorBackground: "transparent",
              colorInputBackground: "rgba(230, 226, 216, 0.04)",
              colorInputText: "#e6e2d8",
            },
            elements: {
              rootBox: { width: "100%", maxWidth: "476px" },
              cardBox: { width: "100%", boxShadow: "none", background: "transparent", border: "none" },
              card: { background: "transparent", boxShadow: "none", border: "none", padding: "0", borderRadius: "0" },
              page: { width: "100%" },
              main: { width: "100%" },
              header: { display: "none" },
              socialButtonsBlockButton: {
                background: "#e6e2d8",
                color: "#091410",
                border: "none",
                borderRadius: "0px",
                padding: "17px 20px",
                fontSize: "13px",
                fontWeight: "500",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              },
              socialButtonsProviderIcon: { width: "18px", height: "18px" },
              dividerRow: { margin: "28px 0" },
              dividerText: {
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(230, 226, 216, 0.58)",
              },
              dividerLine: { background: "rgba(230, 226, 216, 0.1)" },
              formField: { marginBottom: "20px" },
              formFieldLabelRow: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "10px",
              },
              formFieldLabel: {
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(230, 226, 216, 0.58)",
              },
              formFieldInput: {
                background: "#112318",
                border: "1px solid rgba(230, 226, 216, 0.1)",
                borderRadius: "0px",
                padding: "15px 18px",
                color: "#e6e2d8",
                fontSize: "16px",
                fontWeight: "300",
                letterSpacing: "0.02em",
              },
              footerActionLink: { color: "#7ec8a0" },
              footerActionText: { color: "rgba(230, 226, 216, 0.58)", fontSize: "14px" },
              formFieldInputShowPasswordButton: { color: "rgba(230, 226, 216, 0.58)" },
              formButtonPrimary: {
                width: "100%",
                background: "#e6e2d8",
                color: "#091410",
                border: "none",
                borderRadius: "0px",
                padding: "17px 20px",
                fontSize: "13px",
                fontWeight: "500",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginTop: "8px",
              },
              footer: {
                marginTop: "24px",
                paddingTop: "20px",
                borderTop: "1px solid rgba(230, 226, 216, 0.1)",
                background: "transparent",
              },
              footerAction: { justifyContent: "center" },
              formFieldAction: { color: "rgba(230, 226, 216, 0.58)", fontSize: "12px", textDecoration: "none" },
            },
          }}
        />
      </div>
    </AuthEditorialShell>
  );
}
