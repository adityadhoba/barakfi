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
  const isTrending = pathname === "/trending";
  const isMethodology = pathname === "/methodology";
  const isLegal = pathname === "/disclaimer" || pathname === "/privacy" || pathname === "/terms";
  const isAuthRoute = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const shouldHideTopbarSearch = pathname === "/" || pathname === "/screener" || isStockPage || isAbout || isAccount || isExplore || isTools || isWatchlist || isTrending || isMethodology || isLegal || isAuthRoute;
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

    if (isTrending) {
      document.body.setAttribute("data-trending-v2", "");
    } else {
      document.body.removeAttribute("data-trending-v2");
    }

    if (isMethodology) {
      document.body.setAttribute("data-methodology-v2", "");
    } else {
      document.body.removeAttribute("data-methodology-v2");
    }

    if (isLegal) {
      document.body.setAttribute("data-legal-v2", "");
    } else {
      document.body.removeAttribute("data-legal-v2");
    }

    if (isAuthRoute) {
      document.body.setAttribute("data-auth-v2", "");
    } else {
      document.body.removeAttribute("data-auth-v2");
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
      document.body.removeAttribute("data-trending-v2");
      document.body.removeAttribute("data-methodology-v2");
      document.body.removeAttribute("data-legal-v2");
      document.body.removeAttribute("data-auth-v2");
    };
  }, [isAbout, isAccount, isAuthRoute, isExplore, isHome, isLegal, isMethodology, isScreener, isStock, isTools, isTrending, isWatchlist, shouldHideTopbarSearch]);

  return null;
}
