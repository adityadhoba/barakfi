import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { MobileNavProvider } from "@/components/mobile-nav-context";
import { ToastProvider } from "@/components/toast";
import { NavProgress } from "@/components/nav-progress";
import { ScreeningProvider } from "@/contexts/screening-context";
import { HideTopbarSearchOnHome } from "@/components/hide-topbar-search-on-home";
import { GlobalAppChrome } from "@/components/global-app-chrome";
import "./globals.css";
import "./shell.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://barakfi.in"),
  title: {
    default: "BarakFi — Check Halal Stocks with Shariah Screening",
    template: "%s | BarakFi",
  },
  description:
    "Screen Indian stocks for Shariah compliance. Free for 5 stocks or 50/month with account. BarakFi uses S&P, AAOIFI, and FTSE methodologies with debt, interest, and receivables analysis. Educational tool, not a religious ruling.",
  keywords: [
    "halal stocks India",
    "shariah compliant stocks India",
    "halal stock screening India",
    "Islamic finance India",
    "shariah stock screener India",
    "halal stock screener",
    "Muslim-friendly stock screening India",
    "halal equity screening",
    "NSE halal stocks",
    "Barakfi",
    "shariah stock analysis India",
    "halal portfolio tracker",
    "Islamic stock screening",
    "shariah screening India",
    "halal mutual funds India",
    "zakat calculator India",
    "purification calculator stocks",
    "AAOIFI compliant stocks",
    "FTSE shariah index India",
    "halal trading India",
    "Islamic stock screener India",
    "Muslim friendly stocks NSE",
    "riba-free stock screening India",
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
      "Check halal stocks with Shariah-style screening for Indian equities (NSE & BSE): Shariah Compliant, Requires Review, or Not Compliant with clear ratio context.",
    type: "website",
    locale: "en_IN",
    siteName: "Halal Stock Checker",
    url: "https://barakfi.in",
    images: [{ url: "https://barakfi.in/og-image.png", width: 1200, height: 630, alt: "Halal Stock Checker — compliance status in seconds" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Halal Stock Checker — compliance status in seconds",
    description: "Check halal stocks using standard Shariah screening criteria.",
    images: ["https://barakfi.in/og-image.png"],
  },
  // Explicit default so Google never infers noindex for public pages (GSC may cache older crawls).
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
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
  name: "BarakFi",
  url: "https://barakfi.in",
  description:
    "BarakFi helps you check halal stocks using standard Shariah screening criteria with transparent ratio-level context (S&P Shariah, AAOIFI, FTSE-style ratios).",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Free stock screening checks",
  },
  creator: {
    "@type": "Organization",
    name: "Barakfi",
    url: "https://barakfi.in",
  },
  featureList: [
    "Instant compliance status for stocks",
    "Check halal stocks using S&P Shariah, AAOIFI, FTSE-style ratios",
    "160+ NSE stocks and more",
    "Purification calculator",
    "Zakat calculator",
    "Stock comparison tool",
    "Real-time market data",
    "Watchlist & alerts",
  ],
  screenshot: "https://barakfi.in/og-image.png",
  keywords: "halal stock checker, check halal stocks, shariah stock screening, halal stocks India, NSE halal stocks, Barakfi",
  inLanguage: "en-IN",
  audience: {
    "@type": "Audience",
    audienceType: "Muslim stock researchers in India",
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
  description: "Halal Stock Checker — check halal stocks with transparent Shariah screening ratios.",
  foundingDate: "2026",
  knowsAbout: [
    "Shariah stock screening",
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
  name: "BarakFi",
  alternateName: ["BarakFi Halal Stock Screener", "BarakFi India"],
  url: "https://barakfi.in",
  description: "Check halal stocks and view methodology-based compliance status",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://barakfi.in/screener?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
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
  const signInUrl =
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ||
    "/sign-in";
  const signUpUrl =
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ||
    "/sign-up";
  const afterSignOutUrl =
    process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL || "/";

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://img.logo.dev" crossOrigin="" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="google-adsense-account" content="ca-pub-1863162701433616" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      </head>
      <body suppressHydrationWarning>
        <ClerkProvider
          signInUrl={signInUrl}
          signUpUrl={signUpUrl}
          afterSignOutUrl={afterSignOutUrl}
          signInFallbackRedirectUrl="/workspace"
          signUpFallbackRedirectUrl="/onboarding"
          signInForceRedirectUrl="/workspace"
          signUpForceRedirectUrl="/onboarding"
        >
          <ThemeProvider>
            <MobileNavProvider>
            <Suspense fallback={null}>
              <NavProgress />
            </Suspense>
            <HideTopbarSearchOnHome />
            <a className="skipToContent" href="#main-content">Skip to content</a>
            <GlobalAppChrome />
            <ToastProvider>
              <ScreeningProvider>
              <Suspense fallback={null}>
                <AnalyticsProvider>
                  <div id="main-content" role="main" aria-label="Page content">
                    {children}
                  </div>
                </AnalyticsProvider>
              </Suspense>
              </ScreeningProvider>
            </ToastProvider>
            </MobileNavProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
