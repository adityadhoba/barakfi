import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { BottomNav } from "@/components/bottom-nav";
import { MobileDrawer } from "@/components/mobile-drawer";
import { MobileNavProvider } from "@/components/mobile-nav-context";
import { TopbarSearch } from "@/components/topbar-search";
import { TopbarScroll } from "@/components/topbar-scroll";
import { ToastProvider } from "@/components/toast";
import { NavProgress } from "@/components/nav-progress";
import { MarketTicker } from "@/components/market-ticker";
import { Logo } from "@/components/logo";
import { TopbarAuth } from "@/components/topbar-auth";
import "./globals.css";
import "./shell.css";

export const metadata: Metadata = {
  title: {
    default: "Barakfi — Free Halal Stock Screener India | Shariah-Compliant Investing",
    template: "%s | Barakfi",
  },
  description:
    "India's #1 free halal stock screener. Screen 160+ NSE stocks for Shariah compliance using S&P, AAOIFI & FTSE methodologies. Track your halal portfolio, compare stocks, purification & zakat calculators. Built for Indian Muslim investors.",
  keywords: [
    "halal stocks India",
    "shariah compliant stocks India",
    "halal investment India",
    "Islamic finance India",
    "shariah stock screener India",
    "halal stock screener",
    "Muslim investments India",
    "halal equity screening",
    "NSE halal stocks",
    "Barakfi",
    "shariah compliant investing India",
    "halal portfolio tracker",
    "Islamic stock screening",
    "shariah screening India",
    "halal mutual funds India",
    "zakat calculator India",
    "purification calculator stocks",
    "AAOIFI compliant stocks",
    "FTSE shariah index India",
    "halal trading India",
    "Islamic investing app India",
    "Muslim friendly stocks NSE",
    "riba free investing India",
    "halal NIFTY stocks",
    "shariah compliant NSE stocks",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Barakfi",
  },
  openGraph: {
    title: "Barakfi — India's Free Halal Stock Screener | Screen 160+ NSE Stocks",
    description: "Screen Indian stocks for Shariah compliance using S&P, AAOIFI & FTSE methodologies. Track halal portfolios, compare stocks, calculate zakat & purification. Free, transparent, and built for Indian Muslim investors.",
    type: "website",
    locale: "en_IN",
    siteName: "Barakfi",
    url: "https://barakfi.in",
    images: [{ url: "https://barakfi.in/og-image.png", width: 1200, height: 630, alt: "Barakfi — Free Halal Stock Screener for Indian Investors" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Barakfi — India's Free Halal Stock Screener",
    description: "Screen 160+ NSE stocks for Shariah compliance. S&P, AAOIFI & FTSE methodologies. Free halal portfolio tracker for Indian investors.",
    images: ["https://barakfi.in/og-image.png"],
  },
  alternates: {
    canonical: "https://barakfi.in",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  other: {
    "google-site-verification": process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
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

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Barakfi",
  url: "https://barakfi.in",
  description: "India's free halal stock screener. Screen 160+ NSE stocks for Shariah compliance using S&P, AAOIFI, and FTSE methodologies. Track halal portfolios, compare stocks, and invest with confidence.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Free halal stock screening for Indian investors",
  },
  creator: {
    "@type": "Organization",
    name: "Barakfi",
    url: "https://barakfi.in",
  },
  featureList: [
    "Shariah stock screening using S&P, AAOIFI, FTSE methodologies",
    "160+ NSE stocks screened",
    "Halal portfolio tracker",
    "Purification calculator",
    "Zakat calculator",
    "Stock comparison tool",
    "Real-time market data",
    "Watchlist & alerts",
  ],
  screenshot: "https://barakfi.in/og-image.png",
  keywords: "halal stocks India, shariah compliant stocks, Islamic finance India, halal investment, NSE halal stocks, Barakfi, shariah stock screener",
  inLanguage: "en-IN",
  audience: {
    "@type": "Audience",
    audienceType: "Muslim investors in India",
    geographicArea: {
      "@type": "Country",
      name: "India",
    },
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Barakfi",
  url: "https://barakfi.in",
  logo: "https://barakfi.in/icons/icon-512.svg",
  description: "Shariah-compliant equity screening platform for the Indian stock market. Free halal stock screener using S&P, AAOIFI, and FTSE methodologies.",
  foundingDate: "2026",
  knowsAbout: [
    "Shariah-compliant investing",
    "Islamic finance",
    "Halal stock screening",
    "Indian stock market",
    "NSE stocks",
  ],
  sameAs: [],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Barakfi",
  alternateName: ["Barakfi Halal Screener", "Barakfi India"],
  url: "https://barakfi.in",
  description: "India's free halal stock screener for Shariah-compliant investing",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://barakfi.in/screener?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Barakfi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Barakfi is India's free halal stock screener. It screens 160+ NSE-listed Indian stocks for Shariah compliance using globally recognized methodologies including S&P, AAOIFI, and FTSE/Maxis standards. It's completely free to use and designed for Indian Muslim investors.",
      },
    },
    {
      "@type": "Question",
      name: "How does Shariah stock screening work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shariah stock screening evaluates companies against Islamic financial principles. Each stock is tested on 5 key financial ratios: debt-to-market-cap, cash & interest-bearing securities to market cap, accounts receivables to market cap, non-permissible income ratio, and sector/business activity screening. Stocks that pass all criteria are marked as Halal.",
      },
    },
    {
      "@type": "Question",
      name: "Is Barakfi free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Barakfi is completely free. You can screen stocks, track your halal portfolio, use the purification calculator, zakat calculator, and compare stocks — all without any payment.",
      },
    },
    {
      "@type": "Question",
      name: "What screening methodologies does Barakfi use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Barakfi uses three globally recognized Shariah screening methodologies: S&P Shariah Indices methodology, AAOIFI (Accounting and Auditing Organization for Islamic Financial Institutions) standards, and FTSE/Maxis Shariah methodology. Each has slightly different thresholds, giving you a comprehensive multi-standard compliance view.",
      },
    },
    {
      "@type": "Question",
      name: "How many Indian stocks does Barakfi screen?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Barakfi currently screens 160+ NSE-listed Indian stocks covering all major sectors including IT, pharma, auto, FMCG, cement, and more. The universe is continuously expanding.",
      },
    },
    {
      "@type": "Question",
      name: "What is a purification calculator?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A purification calculator helps halal investors determine the non-permissible portion of dividends they receive from stocks. Even Shariah-compliant companies may have a small percentage of income from non-halal sources, and this amount should be donated to charity (purification).",
      },
    },
    {
      "@type": "Question",
      name: "How do I calculate zakat on my stock investments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Barakfi's free zakat calculator helps you compute zakat on your equity portfolio, gold, savings, and other zakatable assets based on current Nisab values. The standard zakat rate is 2.5% of your total zakatable wealth held for one lunar year.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://barakfi.in" },
    { "@type": "ListItem", position: 2, name: "Screener", item: "https://barakfi.in/screener" },
    { "@type": "ListItem", position: 3, name: "Tools", item: "https://barakfi.in/tools" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="google-adsense-account" content="ca-pub-1863162701433616" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      </head>
      <body suppressHydrationWarning>
        <ClerkProvider>
          <ThemeProvider>
            <MobileNavProvider>
            <Suspense fallback={null}>
              <NavProgress />
            </Suspense>
            <a className="skipToContent" href="#main-content">Skip to content</a>
            <MarketTicker />
            <header className="topbar" role="banner">
              <Link className="wordmark" href="/" style={{ textDecoration: "none" }}>
                <Logo size={28} showText />
              </Link>

              <TopbarSearch />

              <MobileDrawer />

              <TopbarAuth />
            </header>
            <ToastProvider>
              <Suspense fallback={null}>
                <AnalyticsProvider>
                  <div id="main-content" role="main" aria-label="Page content">
                    {children}
                  </div>
                </AnalyticsProvider>
              </Suspense>
              <BottomNav />
              <TopbarScroll />
            </ToastProvider>
            </MobileNavProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
