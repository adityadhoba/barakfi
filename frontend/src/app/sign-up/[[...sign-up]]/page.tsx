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
      eyebrow="Start your account"
      heading={
        <>
          Create your
          <br />
          BarakFi <em>account</em>
        </>
      }
      description={
        <>
          Start with a free account to save screened stocks, compare ideas, and keep research notes
          across devices.
        </>
      }
      features={[
        {
          title: "Data-first screening",
          body: "Review ratio logic and methodology context before you decide on a stock.",
        },
        {
          title: "Persistent workflow",
          body: "Save watchlist names and pick up your research flow across sessions and devices.",
        },
        {
          title: "Future-ready tools",
          body: "Your account will connect screening history, export requests, and upcoming workflow tools.",
        },
      ]}
      stats={[
        { value: "Free", label: "Account tier to start" },
        { value: "25", label: "Watchlist slots" },
        { value: "50", label: "Monthly report opens" },
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
