import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — Barakfi",
  description:
    "How Barakfi collects, uses, stores, and protects your personal data.",
  alternates: { canonical: "https://barakfi.in/privacy" },
};

const sections = [
  {
    id: "collect",
    num: "01",
    title: "Data We Collect",
    paragraphs: [
      "We collect the minimum data needed to run BarakFi accounts, save watchlists, support report usage, and improve the service.",
    ],
    table: {
      headers: ["Data Category", "Details", "Source"],
      rows: [
        ["Identity Data", "Full name, email address, profile picture", "Clerk authentication"],
        ["Authentication Data", "Session identifiers and login timestamps", "Clerk"],
        ["Watchlist Data", "Saved stocks and related actions", "User-provided"],
        ["Screening History", "Viewed stocks and usage records", "Automatically collected"],
        ["Usage Data", "Pages visited, features used, device/browser", "Analytics and server logs"],
      ],
    },
  },
  {
    id: "use",
    num: "02",
    title: "How We Use Your Data",
    bullets: [
      "Service delivery: to provide personalised watchlists, usage tracking, and account features.",
      "Account management: to secure your profile and communicate essential updates.",
      "Analytics and improvement: to understand usage patterns and improve the product.",
      "Legal compliance: to comply with lawful obligations and enforce our terms.",
    ],
  },
  {
    id: "thirdparty",
    num: "03",
    title: "Third-Party Services",
    table: {
      headers: ["Service", "Provider", "Purpose", "Data Shared"],
      rows: [
        ["Authentication", "Clerk", "User sign-in and session management", "Name, email, auth identifiers"],
        ["Market Data", "Public exchange and quote providers", "Stock prices and financial data", "No personal user data"],
        ["Analytics", "Product analytics providers", "Usage analytics and feature tracking", "Usage events and device/browser info"],
      ],
    },
    paragraphs: [
      "We do not sell your personal data. We only share the minimum data required for these providers to perform their functions.",
    ],
  },
  {
    id: "security",
    num: "04",
    title: "Storage and Security",
    bullets: [
      "Data is stored on managed infrastructure with access controls and encrypted transport.",
      "Production access is limited and operational access is logged.",
      "No method of transmission or storage is perfectly secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    id: "rights",
    num: "05",
    title: "Your Rights",
    bullets: [
      "You may request access to the personal data we hold about you.",
      "You may request correction of inaccurate profile data.",
      "You may request export of your account data.",
      "You may request deletion of your account data, subject to lawful retention needs.",
    ],
  },
  {
    id: "retention",
    num: "06",
    title: "Data Retention",
    paragraphs: [
      "We retain personal data only as long as necessary to operate BarakFi, comply with legal obligations, resolve disputes, and enforce our agreements.",
    ],
  },
  {
    id: "cookies",
    num: "07",
    title: "Cookies and Similar Technologies",
    paragraphs: [
      "BarakFi and its providers may use cookies or similar technologies for session handling, analytics, and security. You can control cookies through your browser settings.",
    ],
  },
  {
    id: "updates",
    num: "08",
    title: "Policy Updates",
    paragraphs: [
      "We may update this Privacy Policy from time to time. Continued use of the service after changes take effect means you accept the revised policy.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      pageTitle="Privacy"
      titleAccent="Policy"
      eyebrow="How BarakFi handles your data"
      heroText="This policy explains what personal information BarakFi collects, why we use it, and the choices available to you when using the service."
      headerLabel="Privacy Policy"
      effectiveText="Effective date: 1 April 2026"
      navItems={[
        { id: "collect", label: "1. Data We Collect" },
        { id: "use", label: "2. How We Use Your Data" },
        { id: "thirdparty", label: "3. Third-Party Services" },
        { id: "security", label: "4. Storage and Security" },
        { id: "rights", label: "5. Your Rights" },
        { id: "retention", label: "6. Data Retention" },
        { id: "cookies", label: "7. Cookies" },
        { id: "updates", label: "8. Policy Updates" },
      ]}
      relatedLinks={[
        { href: "/terms", label: "Terms of Service" },
        { href: "/disclaimer", label: "Risk Disclaimer" },
      ]}
      sections={sections}
    />
  );
}
