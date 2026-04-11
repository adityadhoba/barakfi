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
import { TopbarSearchLauncher } from "@/components/topbar-search-launcher";
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
    default: "Halal Stock Checker — Check if a stock is Halal | Instant Halal status",
    template: "%s | Halal Stock Checker",
  },
  description:
    "BarakFi (Halal Stock Checker) helps you screen NSE and BSE-listed Indian equities for Shariah-style compliance in seconds — debt, non-permissible income, interest income, receivables, and cash tests with transparent methodology. Free educational tools; not a fatwa or personalised investment advice.",
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
    title: "Halal Stock Checker",
  },
  openGraph: {
    title: "Halal Stock Checker — Check if a stock is Halal",
    description:
      "Instant Shariah-style screening for Indian equities (NSE & BSE): halal, doubtful, or haram labels with clear financial ratios and methodology context — educational only.",
    type: "website",
    locale: "en_IN",
    siteName: "Halal Stock Checker",
    url: "https://barakfi.in",
    images: [{ url: "https://barakfi.in/og-image.png", width: 1200, height: 630, alt: "Halal Stock Checker — instant Halal status" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Halal Stock Checker — instant Halal status",
    description: "Check if a stock is Halal. Trusted ratios; simple result in seconds.",
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
  name: "Halal Stock Checker",
  url: "https://barakfi.in",
  description: "Check if a stock is Halal — instant Halal status using trusted financial screening (S&P Shariah, AAOIFI, FTSE).",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Free instant Halal status checks",
  },
  creator: {
    "@type": "Organization",
    name: "Barakfi",
    url: "https://barakfi.in",
  },
  featureList: [
    "Instant Halal status for stocks",
    "Halal check using S&P Shariah, AAOIFI, FTSE-style ratios",
    "160+ NSE stocks and more",
    "Purification calculator",
    "Zakat calculator",
    "Stock comparison tool",
    "Real-time market data",
    "Watchlist & alerts",
  ],
  screenshot: "https://barakfi.in/og-image.png",
  keywords: "halal stock checker, check if stock is halal, instant halal status, halal stocks India, NSE halal stocks, Barakfi",
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
  description: "Halal Stock Checker — check if a stock is Halal. Instant Halal status using S&P Shariah, AAOIFI, and FTSE-style ratios.",
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
  name: "Halal Stock Checker",
  alternateName: ["Barakfi", "Barakfi Halal Checker"],
  url: "https://barakfi.in",
  description: "Check if a stock is Halal — instant Halal status",
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
      name: "What is Halal Stock Checker?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Halal Stock Checker (Barakfi) helps you check if a stock is Halal and see instant Halal status. It uses trusted financial ratios aligned with standards such as S&P Shariah, AAOIFI, and FTSE/Maxis. It's free to use.",
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
        text: "Yes. Halal Stock Checker is free. You can check stocks, use calculators, and compare — all without payment.",
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
    { "@type": "ListItem", position: 2, name: "Stocks", item: "https://barakfi.in/screener" },
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

              <div className="topbarSearchSlot">
                <TopbarSearchLauncher />
                <TopbarSearch />
              </div>

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
