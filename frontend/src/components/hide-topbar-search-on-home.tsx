"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function HideTopbarSearchOnHome() {
  const pathname = usePathname();
  const shouldHideTopbarSearch = pathname === "/" || pathname === "/screener";
  const isHome = pathname === "/";

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
    return () => {
      document.body.removeAttribute("data-hide-topbar-search");
      document.body.removeAttribute("data-home-v2");
    };
  }, [isHome, shouldHideTopbarSearch]);

  return null;
}
