import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Portfolio — Barakfi",
  description: "Portfolio workspace is coming soon while we improve the experience.",
};

export default function WorkspacePage() {
  return (
    <main className="shellPage">
      <section className="shellHeroSingle">
        <div className="shellCard">
          <span className="shellBadge">Coming soon</span>
          <h1 className="shellH1" style={{ marginTop: 12 }}>
            Portfolio
          </h1>
          <p className="shellSub">
            We&apos;re rebuilding the portfolio tracker for a better experience. Your watchlist and
            screener stay available in the meantime.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <Link href="/watchlist" className="solidButtonLink">
              Watchlist
            </Link>
            <Link href="/screener" className="ghostButtonLink">
              Screener
            </Link>
            <Link href="/" className="ghostButtonLink">
              Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
