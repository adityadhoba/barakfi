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
      eyebrow="Secure Access"
      heading={
        <>
          Sign in to your
          <br />
          BarakFi <em>screening workspace</em>
        </>
      }
      description={
        <>
          Track compliance updates, continue saved comparisons, and keep your research notes in one
          secure place.
        </>
      }
      features={[
        {
          title: "Research-backed checks",
          body: "Data-backed checks from published financial statements and transparent ratio evidence.",
        },
        {
          title: "Multi-standard screening",
          body: "Review methodology context across debt, interest income, receivables, and business screens.",
        },
        {
          title: "Synced workflow",
          body: "Keep your watchlist, screening history, and future workflow tools tied to one account.",
        },
      ]}
      stats={[
        { value: "370+", label: "Indian listings covered" },
        { value: "NSE · BSE", label: "Exchanges supported" },
      ]}
      cardEyebrow="Welcome back"
      cardTitle="Sign in"
      cardSub={
        <>
          Continue to your BarakFi account and synced watchlist. New here?{" "}
          <Link href="/sign-up">Create an account</Link>.
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
