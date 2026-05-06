"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function HideTopbarSearchOnHome() {
  const pathname = usePathname();
  const isStockPage = pathname.startsWith("/stocks/");
  const shouldHideTopbarSearch = pathname === "/" || pathname === "/screener" || isStockPage;
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

    return () => {
      document.body.removeAttribute("data-hide-topbar-search");
      document.body.removeAttribute("data-home-v2");
      document.body.removeAttribute("data-screener-v2");
      document.body.removeAttribute("data-stock-v2");
    };
  }, [isHome, isScreener, isStock, shouldHideTopbarSearch]);

  return null;
}
