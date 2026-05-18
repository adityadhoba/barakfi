"use client";

import { useRouter } from "next/navigation";
import styles from "./limit-modal.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function GuestLimitModal({ isOpen, onClose }: Props) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSignUp = () => {
    router.push("/sign-up");
    onClose();
  };

  const handleSignIn = () => {
    router.push("/sign-in");
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>
          You've used your 5 free screenings for today
        </h3>
        <p className={styles.description}>
          Create a free account to unlock 50 detailed stock screening reports every month.
        </p>

        <div className={styles.buttonsContainer}>
          <button
            type="button"
            onClick={handleSignUp}
            className={styles.btnPrimary}
          >
            Create Free Account
          </button>
          <button
            type="button"
            onClick={handleSignIn}
            className={styles.btnSecondary}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
