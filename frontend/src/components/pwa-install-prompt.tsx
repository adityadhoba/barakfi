"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./pwa-install-prompt.module.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "barakfi_pwa_install_dismissed";

function readDismissedSession(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return Boolean(sessionStorage.getItem(DISMISS_KEY));
  } catch {
    return false;
  }
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissedSession);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (readDismissedSession()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setDeferred(null);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setVisible(false);
    setDeferred(null);
  }, [deferred]);

  if (dismissed || !visible || !deferred) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Install Barakfi">
      <div className={styles.inner}>
        <div className={styles.text}>
          <strong className={styles.title}>Install Barakfi</strong>
          <span className={styles.sub}>Add to your home screen for quick access to the screener.</span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.install} onClick={install}>
            Install
          </button>
          <button type="button" className={styles.later} onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
