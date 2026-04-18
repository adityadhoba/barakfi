import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Marketing + auth CTA for anonymous users (browse screener freely; saving requires sign-in).
 */
export function WatchlistPublicLanding() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Watchlist</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Track screened names, get compliance updates when fundamentals refresh, and jump back to deep ratio
          pages — private to your account.
        </p>
      </div>

      <Card className="border-[var(--line)] bg-[var(--bg-elevated)]">
        <CardHeader>
          <CardTitle className="text-lg">Sign in to save stocks</CardTitle>
          <CardDescription>
            You can still browse the screener and stock pages without an account. Saving a watchlist uses your BarakFi
            profile so lists stay synced across devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/sign-in?redirect_url=%2Fwatchlist">Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/sign-up?redirect_url=%2Fwatchlist">Create account</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-[var(--text-tertiary)]">
        Prefer to explore first?{" "}
        <Link href="/screener" className="font-medium text-[var(--emerald)] underline-offset-4 hover:underline">
          Open the screener
        </Link>
      </p>
    </main>
  );
}
