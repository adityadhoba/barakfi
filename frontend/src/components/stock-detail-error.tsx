"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./stock-detail-error.module.css";

export function StockDetailError({ message }: { message: string }) {
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <main className="shellPage">
      <div className={styles.wrap}>
        <h1 className={styles.title}>Unable to load stock</h1>
        <p className={styles.body}>{message}</p>
        {offline && (
          <p className={styles.offline} role="status">
            You appear to be offline. Reconnect to the internet, then try again.
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className="emptyStateCta" onClick={() => router.refresh()}>
            Try again
          </button>
          <Link href="/screener" className="ghostButtonLink">
            Open Screener
          </Link>
          <Link href="/" className="ghostButtonLink">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
