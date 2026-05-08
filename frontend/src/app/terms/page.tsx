import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service — Barakfi",
  description: "Terms governing the use of BarakFi.",
  alternates: { canonical: "https://barakfi.in/terms" },
};

const sections = [
  {
    id: "acceptance",
    num: "01",
    title: "Acceptance of Terms",
    paragraphs: [
      "By accessing or using BarakFi, you agree to be bound by these terms and any related policies referenced here.",
    ],
  },
  {
    id: "service",
    num: "02",
    title: "Service Description",
    paragraphs: [
      "BarakFi is an educational stock screening tool that applies publicly documented Shariah-inspired financial ratios to Indian equities listed on NSE and BSE.",
      "The service may include compliance status screening, watchlists, calculators, and research workflows.",
    ],
  },
  {
    id: "noadvice",
    num: "03",
    title: "Not Financial or Investment Advice",
    paragraphs: [
      "Nothing on BarakFi constitutes financial advice, investment advice, or a recommendation to buy, sell, or hold any security.",
      "BarakFi is not registered with SEBI or any other financial regulator. All content is provided for educational and informational purposes only.",
    ],
  },
  {
    id: "nofatwa",
    num: "04",
    title: "Not a Religious Ruling",
    paragraphs: [
      "BarakFi's screening results are not a fatwa and do not constitute a certified Shariah opinion from a qualified Islamic scholar or Shariah supervisory board.",
    ],
  },
  {
    id: "accounts",
    num: "05",
    title: "User Accounts",
    paragraphs: [
      "Certain features require a signed-in account. You are responsible for maintaining the confidentiality of your account and for activity that occurs under it.",
    ],
  },
  {
    id: "ip",
    num: "06",
    title: "Intellectual Property",
    paragraphs: [
      "All BarakFi content, design, code, and methodology documentation are the property of BarakFi or its licensors. Public exchange disclosures remain the property of their original sources.",
    ],
  },
  {
    id: "prohibited",
    num: "07",
    title: "Prohibited Use",
    bullets: [
      "Use the service for commercial redistribution without written consent.",
      "Scrape, crawl, or systematically extract data from the platform.",
      "Reverse-engineer or attempt to access the underlying codebase or infrastructure.",
      "Use the service to disseminate misleading financial or religious claims.",
    ],
  },
  {
    id: "data",
    num: "08",
    title: "Data Accuracy",
    paragraphs: [
      "BarakFi makes reasonable efforts to ensure data accuracy but cannot guarantee that all information is current, complete, or free of error.",
    ],
  },
  {
    id: "liability",
    num: "09",
    title: "Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, BarakFi and its operators shall not be liable for any direct, indirect, incidental, special, or consequential damages arising out of your use of the service.",
    ],
  },
  {
    id: "changes",
    num: "10",
    title: "Changes to Terms",
    paragraphs: [
      "We may update these terms from time to time. Continued use of the service after updates take effect constitutes acceptance of the revised terms.",
    ],
  },
  {
    id: "governing",
    num: "11",
    title: "Governing Law",
    paragraphs: [
      "These terms are governed by the laws of India, and disputes are subject to the exclusive jurisdiction of the courts of India.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalShell
      pageTitle="Terms of"
      titleAccent="Service"
      eyebrow="Rules for using BarakFi"
      heroText="These terms explain how BarakFi may be used, what the service does and does not provide, and the responsibilities accepted by users who access the platform."
      headerLabel="Terms of Service"
      effectiveText="Effective date: 1 April 2026"
      navItems={[
        { id: "acceptance", label: "1. Acceptance" },
        { id: "service", label: "2. Service" },
        { id: "noadvice", label: "3. Not Advice" },
        { id: "nofatwa", label: "4. Not a Fatwa" },
        { id: "accounts", label: "5. Accounts" },
        { id: "ip", label: "6. Intellectual Property" },
        { id: "prohibited", label: "7. Prohibited Use" },
        { id: "data", label: "8. Data Accuracy" },
        { id: "liability", label: "9. Liability" },
        { id: "changes", label: "10. Changes" },
        { id: "governing", label: "11. Governing Law" },
      ]}
      relatedLinks={[
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/disclaimer", label: "Risk Disclaimer" },
      ]}
      sections={sections}
    />
  );
}
