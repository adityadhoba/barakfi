import type { Metadata } from "next";
import { AccountShell } from "@/components/account-shell";

export const metadata: Metadata = {
  title: "Account — Barakfi",
  description:
    "Manage your BarakFi investor profile, notification preferences, and security settings for the India-focused halal stock screener and tools — authenticated account area, not intended for public search results.",
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return <AccountShell />;
}
