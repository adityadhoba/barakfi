"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useMobileNav } from "@/components/mobile-nav-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import s from "./mobile-drawer.module.css";

const MobileDrawerBody = dynamic(
  () => import("./mobile-drawer-body").then((m) => m.MobileDrawerBody),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 flex-col px-4 py-6 text-sm text-[var(--text-secondary)]">Loading…</div>
    ),
  }
);

export function MobileDrawer() {
  const { isOpen, setOpen } = useMobileNav();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <>
      <button
        className={s.hamburger}
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        type="button"
      >
        <span className={s.hamburgerIcon}>☰</span>
      </button>

      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b border-[var(--line)] px-6 py-4 text-left">
            <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
          </SheetHeader>

          <MobileDrawerBody pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
