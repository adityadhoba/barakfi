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
          criteria, so you know where a company stands before you save it.
        </>
      }
      features={[
        {
          title: "Clear verdicts, no guesswork",
          body: "Compliant, Requires Review, or Not Compliant — grounded in transparent methodology.",
        },
        {
          title: "Understand why a stock is flagged",
          body: "See business-screen and ratio context before you decide what deserves more research.",
        },
        {
          title: "Save stocks for later",
          body: "Create a synced watchlist and continue your screening workflow across sessions and devices.",
        },
      ]}
      stats={[
        { value: "527", label: "Stocks screened" },
        { value: "4", label: "Screening standards" },
        { value: "Free", label: "To start" },
      ]}
      cardEyebrow="Create account"
      cardTitle="Get started"
      cardSub={
        <>
          Join BarakFi to sync your watchlist and research workflow. Already have an account?{" "}
          <Link href="/sign-in">Log in</Link>.
        </>
      }
    >
      <div className={styles.clerkSignUp}>
        <SignUp
          appearance={{
            layout: {
              logoPlacement: "none",
              socialButtonsVariant: "iconButton",
            },
            elements: {
              rootBox: { width: "100%", maxWidth: "400px" },
              card: { background: "transparent", boxShadow: "none", border: "none", padding: "0" },
              header: { display: "none" },
              footerActionLink: { color: "#7ec8a0" },
              footerActionText: { color: "rgba(230, 226, 216, 0.58)" },
              formFieldInputShowPasswordButton: { color: "rgba(230, 226, 216, 0.58)" },
            },
          }}
        />
      </div>
    </AuthEditorialShell>
  );
}
