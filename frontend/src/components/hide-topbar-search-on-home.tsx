"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function HideTopbarSearchOnHome() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    if (isHome) {
      document.body.setAttribute("data-hide-topbar-search", "");
    } else {
      document.body.removeAttribute("data-hide-topbar-search");
    }
    return () => document.body.removeAttribute("data-hide-topbar-search");
  }, [isHome]);

  return null;
}
