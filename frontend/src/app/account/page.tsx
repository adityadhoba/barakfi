import type { Metadata } from "next";
import { AccountShell } from "@/components/account-shell";

export const metadata: Metadata = {
  title: "Account — Barakfi",
  description: "Manage your investor profile, preferences, and security settings.",
};

export default function AccountPage() {
  return <AccountShell />;
}
