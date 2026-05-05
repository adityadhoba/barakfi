"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function HideTopbarSearchOnHome() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    if (isHome) {
      document.body.setAttribute("data-hide-topbar-search", "");
      document.body.setAttribute("data-home-v2", "");
    } else {
      document.body.removeAttribute("data-hide-topbar-search");
      document.body.removeAttribute("data-home-v2");
    }
    return () => {
      document.body.removeAttribute("data-hide-topbar-search");
      document.body.removeAttribute("data-home-v2");
    };
  }, [isHome]);

  return null;
}
