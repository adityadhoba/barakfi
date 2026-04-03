import type { Metadata, Viewport } from "next";
import {
  ClerkProvider,
  UserButton,
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { BottomNav } from "@/components/bottom-nav";
import { MobileDrawer } from "@/components/mobile-drawer";
import { TopbarLink } from "@/components/topbar-link";
import { TopbarSearch } from "@/components/topbar-search";
import { TopbarScroll } from "@/components/topbar-scroll";
import { ToastProvider } from "@/components/toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavProgress } from "@/components/nav-progress";
import { MarketTicker } from "@/components/market-ticker";
import { AdminLink } from "@/components/admin-link";
import { Logo } from "@/components/logo";
import "./globals.css";
import "./shell.css";

export const metadata: Metadata = {
  title: "Barakfi — Shariah-Compliant Indian Equity Research",
  description:
    "Screen, track, and invest in Shariah-compliant Indian stocks with confidence. Built for disciplined investors who care about compliance and trust.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Barakfi",
  },
  openGraph: {
    title: "Barakfi",
    description: "Shariah-compliant Indian equity screening, portfolio management, and compliance tracking.",
    type: "website",
    locale: "en_IN",
    siteName: "Barakfi",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Barakfi — Screen. Research. Invest." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Barakfi",
    description: "Shariah-compliant Indian equity screening and portfolio management.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  const portfolioHref = userId ? "/workspace" : "/sign-in?redirect_url=/workspace";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Barakfi",
              url: "https://barakfi.in",
              description: "Screen, track, and invest in Shariah-compliant Indian stocks with confidence.",
              applicationCategory: "FinanceApplication",
              operatingSystem: "All",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "INR",
              },
              creator: {
                "@type": "Organization",
                name: "Barakfi",
              },
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ClerkProvider>
          <ThemeProvider>
            <NavProgress />
            <a className="skipToContent" href="#main-content">Skip to content</a>
            <MarketTicker />
            <header className="topbar" role="banner">
              <Link className="wordmark" href="/" style={{ textDecoration: "none" }}>
                <Logo size={28} showText />
              </Link>

              <TopbarSearch />

              <MobileDrawer />

              <div className="topbarActions">
                {!userId ? (
                  <>
                    <nav className="topbarNav" aria-label="Primary navigation">
                      <TopbarLink href="/screener" label="Screener" />
                      <TopbarLink href="/compare" label="Compare" />
                      <TopbarLink href="/watchlist" label="Watchlist" />
                      <TopbarLink href={portfolioHref} label="Portfolio" />
                    </nav>
                    <Link className="ghostButtonLink" href="/sign-in">
                      Log in
                    </Link>
                    <Link className="solidButtonLink" href="/sign-up">
                      Get started
                    </Link>
                    <ThemeToggle />
                  </>
                ) : (
                  <>
                    <nav className="topbarNav" aria-label="Primary navigation">
                      <TopbarLink href="/screener" label="Screener" />
                      <TopbarLink href="/compare" label="Compare" />
                      <TopbarLink href="/watchlist" label="Watchlist" />
                      <TopbarLink href={portfolioHref} label="Portfolio" />
                      <AdminLink />
                    </nav>
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: { width: 30, height: 30 },
                        },
                      }}
                    />
                    <ThemeToggle />
                  </>
                )}
              </div>
            </header>
            <ToastProvider>
              <AnalyticsProvider>
                <div id="main-content" role="main" aria-label="Page content">
                  {children}
                </div>
              </AnalyticsProvider>
              <BottomNav />
              <TopbarScroll />
            </ToastProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
