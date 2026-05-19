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
import { getChromeRouteFlags } from "@/lib/chrome-routes";

export function GlobalAppChrome() {
  const pathname = usePathname();
  const { hideGlobalChrome } = getChromeRouteFlags(pathname);

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
