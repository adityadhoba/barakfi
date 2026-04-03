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
import { TopbarDropdown } from "@/components/topbar-dropdown";
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
  title: {
    default: "Barakfi — Halal Stock Screener India | Shariah-Compliant Investing",
    template: "%s | Barakfi",
  },
  description:
    "India's free halal stock screener. Screen NSE stocks for Shariah compliance using S&P methodology. Track your halal portfolio, research companies, and invest with confidence.",
  keywords: [
    "halal stocks India",
    "shariah compliant stocks",
    "halal investment India",
    "Islamic finance India",
    "shariah stock screener",
    "halal stock screener",
    "Muslim investments India",
    "halal equity screening",
    "NSE halal stocks",
    "Barakfi",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Barakfi",
  },
  openGraph: {
    title: "Barakfi — India's Free Halal Stock Screener",
    description: "Screen Indian stocks for Shariah compliance. Track halal portfolios. Free, transparent, and built for Indian Muslim investors.",
    type: "website",
    locale: "en_IN",
    siteName: "Barakfi",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Barakfi — Halal Stock Screener for India" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Barakfi — India's Free Halal Stock Screener",
    description: "Screen Indian stocks for Shariah compliance. Free halal stock screener powered by S&P methodology.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://barakfi.in",
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
        <meta name="google-adsense-account" content="ca-pub-1863162701433616" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Barakfi",
              url: "https://barakfi.in",
              description: "India's free halal stock screener. Screen NSE stocks for Shariah compliance, track halal portfolios, and invest with confidence.",
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
                url: "https://barakfi.in",
              },
              keywords: "halal stocks India, shariah compliant stocks, Islamic finance India, halal investment, NSE halal stocks",
              inLanguage: "en-IN",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Barakfi",
              url: "https://barakfi.in",
              description: "Shariah-compliant equity screening platform for the Indian stock market.",
              foundingDate: "2026",
              sameAs: [],
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
                      <TopbarDropdown
                        label="Tools"
                        basePath="/tools"
                        items={[
                          { href: "/tools#purification", label: "Purification Calculator" },
                          { href: "/tools#zakat", label: "Zakat Calculator" },
                        ]}
                      />
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
                      <TopbarDropdown
                        label="Tools"
                        basePath="/tools"
                        items={[
                          { href: "/tools#purification", label: "Purification Calculator" },
                          { href: "/tools#zakat", label: "Zakat Calculator" },
                        ]}
                      />
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
