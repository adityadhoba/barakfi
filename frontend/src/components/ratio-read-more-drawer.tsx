"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ratio-read-more-drawer.module.css";

type Props = {
  label: string;
  shortText: string;
  fullText: string;
  thresholdText: string;
};

export function RatioReadMoreDrawer({ label, shortText, fullText, thresholdText }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open]);

  return (
    <>
      <span className={styles.inlineWrap}>
        <span>{shortText}</span>{" "}
        <button
          type="button"
          className={styles.inlineLink}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          Read more
        </button>
      </span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className={styles.overlay} role="presentation" onClick={() => setOpen(false)}>
            <aside
              className={styles.drawer}
              role="dialog"
              aria-modal="true"
              aria-label={`${label} details`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.drawerHeader}>
                <h3 className={styles.drawerTitle}>{label}</h3>
                <button
                  type="button"
                  className={styles.closeBtn}
                  aria-label="Close details"
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </div>
              <p className={styles.drawerBody}>{fullText}</p>
              <p className={styles.drawerThreshold}>
                <strong>Screen threshold:</strong> {thresholdText}
              </p>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
