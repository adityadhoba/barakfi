import type { Metadata } from "next";
import { NotificationsShell } from "@/components/notifications-shell";

export const metadata: Metadata = {
  title: "Alerts — Barakfi",
  description:
    "Signed-in alerts for BarakFi: screening updates, compliance signals, and research activity tied to your watchlist and portfolio tools — private authenticated view, not meant for search engine indexing.",
  robots: { index: false, follow: true },
};

export default function NotificationsPage() {
  return <NotificationsShell />;
}
