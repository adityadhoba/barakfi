"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  label: string;
  className?: string;
};

export function TopbarLink({ href, label, className = "ghostLink" }: Props) {
  const pathname = usePathname();
  const path = href.split("?")[0] ?? href;
  const isActive = path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <Link
      className={`${className} ${isActive ? "ghostLinkActive" : ""}`}
      href={href}
    >
      {label}
    </Link>
  );
}
