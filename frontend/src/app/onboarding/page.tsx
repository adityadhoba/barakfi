import { bootstrapAuthenticatedUser } from "@/lib/api";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/page.module.css";

export default async function OnboardingPage() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;
  const token = await authState.getToken();

  if (!clerkUser || !email || !token) {
    redirect("/sign-in");
  }

  try {
    await bootstrapAuthenticatedUser(token, {
      email,
      displayName: clerkUser.firstName || clerkUser.fullName || "Investor",
      authProvider: "clerk",
      authSubject: clerkUser.id,
    }, {
      authSubject: clerkUser.id,
      email,
    });
  } catch {
    return (
      <main className="shellPage">
        <section className={styles.onboardingState}>
          <div className={styles.onboardingCard}>
            <p className="shellKicker">Setup issue</p>
            <h2 className="shellH2">We couldn&apos;t create your profile right now.</h2>
            <p className="shellSub">
              Your sign-in is working, but the backend service couldn&apos;t process the
              onboarding request. This is usually temporary — please try again.
            </p>
            <div className={styles.ctaRow}>
              <Link className={styles.primaryCta} href="/onboarding">
                Try again
              </Link>
              <Link className={styles.secondaryCta} href="/">
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  redirect("/watchlist");
}
