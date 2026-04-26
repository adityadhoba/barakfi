"use client";

import { useScrollBounce } from "@/hooks/use-scroll-bounce";

/** Mounts the scroll-bounce effect site-wide. Render once in root layout. */
export function ScrollBounce() {
  useScrollBounce();
  return null;
}
