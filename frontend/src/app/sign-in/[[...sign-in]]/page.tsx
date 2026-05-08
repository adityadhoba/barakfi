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
          title: "Always free",
          body: "No subscription. No credit card. BarakFi is free to use while we build the workflow.",
        },
      ]}
      stats={[
        { value: "527", label: "Stocks covered" },
        { value: "4", label: "Screening standards" },
        { value: "Free", label: "Always" },
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
