"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function HideTopbarSearchOnHome() {
  const pathname = usePathname();
  const isStockPage = pathname.startsWith("/stocks/");
  const isAbout = pathname === "/about-us";
  const isAccount = pathname === "/account";
  const isExplore = pathname === "/explore";
  const isTools = pathname === "/tools";
  const isWatchlist = pathname === "/watchlist";
  const shouldHideTopbarSearch = pathname === "/" || pathname === "/screener" || isStockPage || isAbout || isAccount || isExplore || isTools || isWatchlist;
  const isHome = pathname === "/";
  const isScreener = pathname === "/screener";
  const isStock = isStockPage;

  useEffect(() => {
    if (shouldHideTopbarSearch) {
      document.body.setAttribute("data-hide-topbar-search", "");
      if (isHome) {
        document.body.setAttribute("data-home-v2", "");
      } else {
        document.body.removeAttribute("data-home-v2");
      }
    } else {
      document.body.removeAttribute("data-hide-topbar-search");
      document.body.removeAttribute("data-home-v2");
    }

    if (isScreener) {
      document.body.setAttribute("data-screener-v2", "");
    } else {
      document.body.removeAttribute("data-screener-v2");
    }

    if (isStock) {
      document.body.setAttribute("data-stock-v2", "");
    } else {
      document.body.removeAttribute("data-stock-v2");
    }

    if (isAbout) {
      document.body.setAttribute("data-about-v2", "");
    } else {
      document.body.removeAttribute("data-about-v2");
    }

    if (isAccount) {
      document.body.setAttribute("data-account-v2", "");
    } else {
      document.body.removeAttribute("data-account-v2");
    }

    if (isExplore) {
      document.body.setAttribute("data-explore-v2", "");
    } else {
      document.body.removeAttribute("data-explore-v2");
    }

    if (isTools) {
      document.body.setAttribute("data-tools-v2", "");
    } else {
      document.body.removeAttribute("data-tools-v2");
    }

    if (isWatchlist) {
      document.body.setAttribute("data-watchlist-v2", "");
    } else {
      document.body.removeAttribute("data-watchlist-v2");
    }

    return () => {
      document.body.removeAttribute("data-hide-topbar-search");
      document.body.removeAttribute("data-home-v2");
      document.body.removeAttribute("data-screener-v2");
      document.body.removeAttribute("data-stock-v2");
      document.body.removeAttribute("data-about-v2");
      document.body.removeAttribute("data-account-v2");
      document.body.removeAttribute("data-explore-v2");
      document.body.removeAttribute("data-tools-v2");
      document.body.removeAttribute("data-watchlist-v2");
    };
  }, [isAbout, isAccount, isExplore, isHome, isScreener, isStock, isTools, isWatchlist, shouldHideTopbarSearch]);

  return null;
}
