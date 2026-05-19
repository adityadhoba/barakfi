"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getChromeRouteFlags } from "@/lib/chrome-routes";

export function HideTopbarSearchOnHome() {
  const pathname = usePathname();
  const flags = getChromeRouteFlags(pathname);

  useEffect(() => {
    if (flags.hideTopbarSearch) {
      document.body.setAttribute("data-hide-topbar-search", "");
    } else {
      document.body.removeAttribute("data-hide-topbar-search");
    }

    return () => {
      document.body.removeAttribute("data-hide-topbar-search");
    };
  }, [pathname]);

  return null;
}
