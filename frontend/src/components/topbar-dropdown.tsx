"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

type DropdownItem = {
  href: string;
  label: string;
};

type Props = {
  label: string;
  basePath: string;
  items: DropdownItem[];
};

export function TopbarDropdown({ label, basePath, items }: Props) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(basePath);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        className={`ghostLink ${isActive ? "ghostLinkActive" : ""}`}
        href={basePath}
        onClick={() => setOpen((p) => !p)}
        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, marginTop: 1 }}>
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: "50%",
            transform: "translateX(-50%)",
            minWidth: 200,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            padding: "6px 0",
            zIndex: 1000,
          }}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "10px 16px",
                fontSize: "0.82rem",
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 500,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-soft)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
