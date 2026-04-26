"use client";

import Link from "next/link";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    title: "Track screened stocks",
    desc: "Save any NSE stock from the screener to your personal watchlist and revisit it in one tap.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: "Compliance change alerts",
    desc: "Know immediately when a stock's Shariah compliance status changes after a data refresh.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3.75h3m-6.75-5.25v.008h.008V9m-.008 0H6.75M6.75 12v.008h.008V12m-.008 0H6.75M6.75 15.75v.008h.008v-.008H6.75z" />
      </svg>
    ),
    title: "Synced across devices",
    desc: "Your watchlist follows your BarakFi account — access it on desktop, tablet, or mobile.",
  },
];

/**
 * Full-page branded landing for anonymous users who navigate to /watchlist.
 * Two-column on desktop (feature pitch left, auth card right), stacked on mobile.
 */
export function WatchlistPublicLanding() {
  return (
    <main
      className="min-h-[calc(100vh-56px)] px-4 py-12 sm:py-16"
      style={{ background: "var(--bg)" }}
    >
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">

        {/* ── Left column: pitch ── */}
        <div className="flex flex-col gap-8">
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "var(--emerald-dim)",
                color: "var(--emerald)",
                border: "1px solid var(--emerald-border)",
              }}
            >
              Free with account
            </span>
            <h1
              className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: "var(--text)" }}
            >
              Your personal Shariah&nbsp;watchlist
            </h1>
            <p
              className="mt-3 text-base leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Browse the screener freely — no account needed. Create a free BarakFi account to save
              stocks, track compliance changes, and pick up where you left off on any device.
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span
                  className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "var(--emerald-dim)", color: "var(--emerald)" }}
                >
                  <span className="h-5 w-5">{f.icon}</span>
                </span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                    {f.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {f.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Prefer to explore first?{" "}
            <Link
              href="/screener"
              className="font-medium underline-offset-4 hover:underline transition-colors"
              style={{ color: "var(--emerald)" }}
            >
              Open the screener
            </Link>
          </p>
        </div>

        {/* ── Right column: auth card ── */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--line)",
          }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
              Sign in to your watchlist
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              You can browse the screener and all stock pages without an account. Saving requires a
              free BarakFi profile so your list stays synced.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/sign-in?redirect_url=%2Fwatchlist"
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors cursor-pointer"
              style={{
                background: "var(--emerald)",
                color: "#fff",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background = "var(--emerald-hover)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background = "var(--emerald)")
              }
            >
              Sign in
            </Link>

            <Link
              href="/sign-up?redirect_url=%2Fwatchlist"
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors cursor-pointer"
              style={{
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--line-strong)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-soft)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              Create free account
            </Link>
          </div>

          <div
            className="mt-6 rounded-xl p-4"
            style={{ background: "var(--bg-soft)", border: "1px solid var(--line)" }}
          >
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              BarakFi accounts are free. We never sell your data. The screening methodology is
              educational — not a fatwa or financial advice.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
