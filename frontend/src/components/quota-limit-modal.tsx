"use client";

import { useRouter } from "next/navigation";
import styles from "./limit-modal.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
};

export function QuotaLimitModal({
  isOpen,
  onClose,
  message = "You've used all 50 monthly full report credits.",
}: Props) {
  const router = useRouter();

  if (!isOpen) return null;

  const handlePremium = () => {
    router.push("/premium");
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>
          {message}
        </h3>
        <p className={styles.description}>
          Access resets next month. Join the waitlist for unlimited premium access.
        </p>

        <button
          type="button"
          onClick={handlePremium}
          className={styles.btnPrimary}
        >
          Join Premium Waitlist
        </button>
      </div>
    </div>
  );
}
