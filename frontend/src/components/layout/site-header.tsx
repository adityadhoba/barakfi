import type { ReactNode } from "react";

/**
 * App shell header — sticky top bar (pairs with global `shell.css` `.topbar`).
 * Tailwind utilities augment legacy layout without breaking CSS module pages.
 */
export function SiteHeader({ children }: { children: ReactNode }) {
  return (
    <header
      className="topbar flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--bg-elevated)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-elevated)]/80"
      role="banner"
    >
      {children}
    </header>
  );
}
