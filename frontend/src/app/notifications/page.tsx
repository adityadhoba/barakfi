import type { Metadata } from "next";
import { NotificationsShell } from "@/components/notifications-shell";

export const metadata: Metadata = {
  title: "Alerts — Barakfi",
  description: "Priority alerts, compliance signals, and research activity — all in one place.",
};

export default function NotificationsPage() {
  return <NotificationsShell />;
}
