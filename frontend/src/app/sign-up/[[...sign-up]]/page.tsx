import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { AuthEditorialShell } from "@/components/auth-editorial-shell";
import styles from "@/components/auth-editorial-shell.module.css";

export const metadata: Metadata = {
  title: "Sign Up — Barakfi",
  description:
    "Create your free BarakFi account to sync a Shariah-aware watchlist, save research notes, and use stock screening tools for NSE and BSE equities — private sign-up flow, not for search indexing.",
  robots: { index: false, follow: true },
};

export default function SignUpPage() {
  return (
    <AuthEditorialShell
      mode="sign-up"
      eyebrow="Shariah Stock Screener · India"
      heading={
        <>
          Screen with
          <br />
          <em>clarity.</em>
          <br />
          Screen with
          <br />
          conscience.
        </>
      }
      description={
        <>
          BarakFi screens <strong>527 NSE &amp; BSE stocks</strong> against Shariah compliance
          criteria, so you know exactly where you stand, every quarter.
        </>
      }
      features={[
        {
          title: "Clear verdicts, no guesswork",
          body: "Compliant, Requires Review, or Not Compliant — grounded in transparent methodology.",
        },
        {
          title: "Watchlist & status alerts",
          body: "Track stocks you save and keep an eye on compliance status changes over time.",
        },
        {
          title: "Zakat & purification tools",
          body: "Use BarakFi's calculators to estimate Zakat and purification amounts for screened holdings.",
        },
      ]}
      stats={[
        { value: "527+", label: "Stocks screened" },
        { value: "4×", label: "Updated yearly" },
        { value: "Free.", label: "Always" },
      ]}
      cardEyebrow=""
      cardTitle="Create your account"
      cardSub={
        <>
          Already have one? <Link href="/sign-in">Sign in →</Link>
        </>
      }
    >
      <div className={styles.clerkSignUp}>
        <SignUp
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
              socialButtonsProviderIcon: { width: "16px", height: "16px" },
              dividerRow: { margin: "4px 0 0" },
              dividerText: {
                fontSize: "11px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(230, 226, 216, 0.58)",
              },
              dividerLine: { background: "rgba(230, 226, 216, 0.08)" },
              formField: { marginBottom: "16px" },
              formFieldRow: { gap: "12px" },
              formFieldLabelRow: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "7px",
              },
              formFieldLabel: {
                fontSize: "11px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(230, 226, 216, 0.58)",
              },
              formFieldInput: {
                background: "rgba(230, 226, 216, 0.04)",
                border: "1px solid rgba(230, 226, 216, 0.08)",
                borderRadius: "0px",
                padding: "15px 18px",
                color: "#e6e2d8",
                fontSize: "16px",
                fontWeight: "300",
              },
              formFieldInputShowPasswordButton: { color: "rgba(230, 226, 216, 0.58)" },
              formButtonPrimary: {
                width: "100%",
                background: "#e6e2d8",
                color: "#091410",
                border: "none",
                borderRadius: "0px",
                padding: "17px 32px",
                fontSize: "13px",
                fontWeight: "500",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginTop: "4px",
              },
              footer: {
                marginTop: "24px",
                paddingTop: "20px",
                borderTop: "1px solid rgba(230, 226, 216, 0.08)",
                background: "transparent",
              },
              footerAction: { justifyContent: "center" },
              footerActionLink: { color: "#7ec8a0" },
              footerActionText: { color: "rgba(230, 226, 216, 0.58)", fontSize: "14px" },
            },
          }}
        />
      </div>
    </AuthEditorialShell>
  );
}
