"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getChromeRouteFlags } from "@/lib/chrome-routes";
import { UNIFIED_UI_SHELL_ENABLED } from "@/lib/ui-migration-flags";

export function HideTopbarSearchOnHome() {
  const pathname = usePathname();
  const flags = getChromeRouteFlags(pathname);

  useEffect(() => {
    if (flags.hideTopbarSearch) {
      document.body.setAttribute("data-hide-topbar-search", "");
    } else {
      document.body.removeAttribute("data-hide-topbar-search");
    }

    if (UNIFIED_UI_SHELL_ENABLED) {
      document.body.setAttribute("data-ui-shell", "unified");
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
      return () => {
        document.body.removeAttribute("data-hide-topbar-search");
      };
    }

    document.body.setAttribute("data-ui-shell", "legacy");
    if (flags.isHome) document.body.setAttribute("data-home-v2", "");
    else document.body.removeAttribute("data-home-v2");
    if (flags.isScreener) document.body.setAttribute("data-screener-v2", "");
    else document.body.removeAttribute("data-screener-v2");
    if (flags.isStockPage) document.body.setAttribute("data-stock-v2", "");
    else document.body.removeAttribute("data-stock-v2");
    if (flags.isAbout) document.body.setAttribute("data-about-v2", "");
    else document.body.removeAttribute("data-about-v2");
    if (flags.isAccount) document.body.setAttribute("data-account-v2", "");
    else document.body.removeAttribute("data-account-v2");
    if (flags.isExplore) document.body.setAttribute("data-explore-v2", "");
    else document.body.removeAttribute("data-explore-v2");
    if (flags.isTools || flags.isCompare) document.body.setAttribute("data-tools-v2", "");
    else document.body.removeAttribute("data-tools-v2");
    if (flags.isWatchlist) document.body.setAttribute("data-watchlist-v2", "");
    else document.body.removeAttribute("data-watchlist-v2");
    if (flags.isTrending) document.body.setAttribute("data-trending-v2", "");
    else document.body.removeAttribute("data-trending-v2");
    if (flags.isMethodology) document.body.setAttribute("data-methodology-v2", "");
    else document.body.removeAttribute("data-methodology-v2");
    if (flags.isLegal) document.body.setAttribute("data-legal-v2", "");
    else document.body.removeAttribute("data-legal-v2");
    if (flags.isAuthRoute) document.body.setAttribute("data-auth-v2", "");
    else document.body.removeAttribute("data-auth-v2");

    return () => {
      document.body.removeAttribute("data-hide-topbar-search");
      document.body.removeAttribute("data-ui-shell");
    };
  }, [pathname]);

  return null;
}
