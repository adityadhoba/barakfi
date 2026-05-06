"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./topbar-dropdown.module.css";

type DropdownItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
};

type Props = {
  label: string;
  basePath: string;
  items: DropdownItem[];
};

export function TopbarDropdown({ label, basePath, items }: Props) {
  const pathname = usePathname();
  const isActive = pathname === basePath || pathname.startsWith(`${basePath}/`);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const clearCloseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearCloseTimeout();
    setOpen(true);
  }, [clearCloseTimeout]);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => () => clearCloseTimeout(), [clearCloseTimeout]);

  return (
    <div
      ref={ref}
      className={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.triggerRow}>
        <Link
          href={basePath}
          className={`ghostLink ${isActive ? "ghostLinkActive" : ""} ${styles.triggerLink}`}
        >
          {label}
        </Link>
        <button
          type="button"
          className={`ghostLink ${isActive ? "ghostLinkActive" : ""} ${styles.triggerCaret}`}
          onClick={(e) => {
            e.preventDefault();
            setOpen((p) => !p);
          }}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={`${label} menu`}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          >
            <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && (
        <div className={styles.menu} role="menu">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className={`${styles.item} ${pathname === item.href ? styles.itemActive : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
              <span className={styles.itemLabel}>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
