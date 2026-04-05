"use client";

import {
  HiOutlineCheckCircle,
  HiOutlineGlobeAlt,
  HiOutlineQuestionMarkCircle,
  HiOutlineXCircle,
} from "react-icons/hi2";
import styles from "./home-dashboard.module.css";

export function StatIconUniverse() {
  return (
    <span className={`${styles.statIcon} ${styles.statIconSvg}`} aria-hidden>
      <HiOutlineGlobeAlt size={22} strokeWidth={1.75} />
    </span>
  );
}

export function StatIconHalal() {
  return (
    <span className={`${styles.statIcon} ${styles.statIconHalal} ${styles.statIconSvg}`} aria-hidden>
      <HiOutlineCheckCircle size={22} strokeWidth={1.75} />
    </span>
  );
}

export function StatIconCautious() {
  return (
    <span className={`${styles.statIcon} ${styles.statIconReview} ${styles.statIconSvg}`} aria-hidden>
      <HiOutlineQuestionMarkCircle size={22} strokeWidth={1.75} />
    </span>
  );
}

export function StatIconAvoid() {
  return (
    <span className={`${styles.statIcon} ${styles.statIconFail} ${styles.statIconSvg}`} aria-hidden>
      <HiOutlineXCircle size={22} strokeWidth={1.75} />
    </span>
  );
}
