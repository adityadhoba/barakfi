import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Risk Disclaimer — Barakfi",
  description:
    "Important risk disclaimers for Barakfi. Not SEBI registered. Screening results are not investment advice or certified Shariah opinions.",
  alternates: { canonical: "https://barakfi.in/disclaimer" },
};

const cards = [
  {
    flag: "Not Financial Advice",
    tone: "red" as const,
    title: "Not investment advice",
    body: "Nothing on BarakFi is a recommendation to buy, sell, or hold any security. BarakFi is not registered with SEBI or any other financial regulator. Screening results are for educational reference only.",
    icon: <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  },
  {
    flag: "Not a Fatwa",
    tone: "amber" as const,
    title: "Not a religious ruling",
    body: "BarakFi screening results do not constitute a fatwa or certified Shariah opinion from any recognised Islamic scholar, mufti, or Shariah supervisory board.",
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  },
  {
    flag: "Data Limitations",
    tone: "gold" as const,
    title: "Data may be incomplete",
    body: "Ratios are based on the most recently available audited annual reports and are updated quarterly. Data may not reflect the most recent financial disclosures. Always verify independently before making decisions.",
    icon: <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  },
];

const sections = [
  {
    id: "educational",
    num: "01",
    title: "Educational Purpose Only",
    paragraphs: [
      "BarakFi is an educational tool designed to help individuals understand Shariah-inspired financial screening criteria as applied to Indian equities. All content — including stock compliance statuses, financial ratios, and methodology documentation — is provided solely for informational and educational purposes.",
      "By using BarakFi, you acknowledge that you understand the limitations of the service and will not rely on it as the sole basis for any investment or religious decision.",
    ],
  },
  {
    id: "notsebi",
    num: "02",
    title: "Not SEBI Registered",
    warning:
      "BarakFi is not registered with the Securities and Exchange Board of India (SEBI) as an Investment Adviser, Research Analyst, or in any other capacity.",
    paragraphs: [
      "Nothing on this platform constitutes a research report, buy/sell/hold recommendation, or investment advisory service. Do not treat any content on BarakFi as investment advice.",
      "Consult a SEBI-registered investment adviser or financial professional before making investment decisions.",
    ],
  },
  {
    id: "notshariah",
    num: "03",
    title: "Not a Certified Shariah Opinion",
    paragraphs: [
      "BarakFi's compliance designations — Compliant, Requires Review, Not Compliant — are not fatwas and do not constitute certified Shariah opinions from any recognised Islamic scholar, mufti, or Shariah supervisory board.",
      "The screening methodology applies commonly referenced quantitative thresholds drawn from S&P Dow Jones, AAOIFI, FTSE, and Khatkhatay Independent standards for educational reference.",
    ],
    bullets: [
      "Different scholars may classify the same stock differently based on their methodology.",
      "Qualitative factors not captured by our ratios may affect a stock's permissibility.",
      "For personal investment decisions, you must consult a qualified Islamic scholar.",
    ],
  },
  {
    id: "accuracy",
    num: "04",
    title: "Data Accuracy & Currency",
    paragraphs: [
      "Financial data is sourced from audited annual reports filed with NSE and BSE. We update compliance ratios quarterly, but there will always be a lag between a company's latest financial position and our displayed ratios.",
      "We make reasonable efforts to ensure accuracy but cannot guarantee that all information is error-free, complete, or timely. Users should independently verify all data from primary sources before relying on it.",
    ],
  },
  {
    id: "investment",
    num: "05",
    title: "Investment Risk",
    paragraphs: [
      "Equity investments carry inherent risk. A stock being classified as Shariah Compliant does not indicate that it is a good investment, free from risk, or guaranteed to generate returns.",
      "All investments in equities may result in partial or complete loss of capital. The value of investments may go up or down based on market conditions.",
    ],
  },
  {
    id: "screening",
    num: "06",
    title: "Screening Limitations",
    bullets: [
      "Ratios are based on the latest audited reports, not necessarily the latest quarter.",
      "Corporate actions or business changes may shift a company before our next refresh cycle.",
      "Methodology updates may affect future classifications.",
    ],
  },
  {
    id: "liability",
    num: "07",
    title: "Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, BarakFi and its operators shall not be liable for any direct, indirect, incidental, special, or consequential damages arising out of your use of or inability to use the service.",
    ],
  },
  {
    id: "thirdparty",
    num: "08",
    title: "Third-Party Links and Sources",
    paragraphs: [
      "BarakFi may reference exchange filings, company disclosures, or third-party services. We are not responsible for the content, availability, or accuracy of those external resources.",
    ],
  },
  {
    id: "contact",
    num: "09",
    title: "Contact",
    paragraphs: [
      "If you have questions about this disclaimer or want to report a factual issue, please reach out through the BarakFi contact channels listed on the site.",
    ],
  },
];

export default function DisclaimerPage() {
  return (
    <LegalShell
      pageTitle="Risk"
      titleAccent="Disclaimer"
      eyebrow="Important — Please Read"
      heroText="BarakFi is an educational screening tool. It is not a SEBI-registered investment adviser, and its results are not a certified Shariah opinion. Please read the full disclaimer before using this service."
      heroRisk
      cards={cards}
      navItems={[
        { id: "educational", label: "1. Educational Purpose" },
        { id: "notsebi", label: "2. Not SEBI Registered" },
        { id: "notshariah", label: "3. Not Shariah-Certified" },
        { id: "accuracy", label: "4. Data Accuracy" },
        { id: "investment", label: "5. Investment Risk" },
        { id: "screening", label: "6. Screening Limitations" },
        { id: "liability", label: "7. Liability" },
        { id: "thirdparty", label: "8. Third-Party Links" },
        { id: "contact", label: "9. Contact" },
      ]}
      relatedLinks={[
        { href: "/terms", label: "Terms of Service" },
        { href: "/privacy", label: "Privacy Policy" },
      ]}
      sections={sections}
    />
  );
}
