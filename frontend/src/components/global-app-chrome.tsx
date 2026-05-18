"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { MarketTicker } from "@/components/market-ticker";
import { SiteHeader } from "@/components/layout/site-header";
import { TopbarSearchLauncher } from "@/components/topbar-search-launcher";
import { TopbarSearch } from "@/components/topbar-search";
import { MobileDrawer } from "@/components/mobile-drawer";
import { TopbarAuthDeferred } from "@/components/topbar-auth-deferred";
import { BottomNav } from "@/components/bottom-nav";
import { TopbarScroll } from "@/components/topbar-scroll";

export function GlobalAppChrome() {
  const pathname = usePathname();
  const isStockPage = pathname.startsWith("/stocks/");
  const isCollectionDetail = pathname.startsWith("/collections/");
  const isSuperInvestorDetail = pathname.startsWith("/super-investors/");
  const isAbout = pathname === "/about-us";
  const isAccount = pathname === "/account";
  const isExplore = pathname === "/explore";
  const isTools = pathname === "/tools";
  const isWatchlist = pathname === "/watchlist";
  const isTrending = pathname === "/trending";
  const isMethodology = pathname === "/methodology";
  const isLegal = pathname === "/disclaimer" || pathname === "/privacy" || pathname === "/terms";
  const isAuthRoute = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isLearn = pathname.startsWith("/learn");

  const hideGlobalChrome =
    pathname === "/" ||
    pathname === "/screener" ||
    isStockPage ||
    isCollectionDetail ||
    isSuperInvestorDetail ||
    isAbout ||
    isAccount ||
    isExplore ||
    isWatchlist ||
    isTrending ||
    isMethodology ||
    isLegal ||
    isAuthRoute ||
    isLearn;

  if (hideGlobalChrome) {
    return null;
  }

  return (
    <>
      <MarketTicker />
      <SiteHeader>
        <Link className="wordmark" href="/" style={{ textDecoration: "none" }}>
          <Logo size={28} showText />
        </Link>

        <div className="topbarSearchSlot">
          <TopbarSearchLauncher />
          <TopbarSearch />
        </div>

        <MobileDrawer />

        <TopbarAuthDeferred />
      </SiteHeader>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      <TopbarScroll />
    </>
  );
}
