import Link from "next/link";
import type { ReactNode } from "react";
import { DM_Serif_Display } from "next/font/google";
import { EditorialChrome } from "@/components/editorial-chrome";
import styles from "./legal-shell.module.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

type LegalSection = {
  id: string;
  num: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  warning?: string;
  table?: {
    headers: string[];
    rows: string[][];
  };
};

type LegalCard = {
  flag: string;
  tone: "red" | "amber" | "gold";
  title: string;
  body: string;
  icon: ReactNode;
};

function ToneClass(tone: LegalCard["tone"]) {
  return tone === "red" ? styles.cardFlagRed : tone === "amber" ? styles.cardFlagAmber : styles.cardFlagGold;
}

function IconToneClass(tone: LegalCard["tone"]) {
  return tone === "red" ? styles.cardIconRed : tone === "amber" ? styles.cardIconAmber : styles.cardIconGold;
}

export function LegalShell({
  pageTitle,
  titleAccent,
  eyebrow,
  heroText,
  heroRisk = false,
  navItems,
  relatedLinks,
  sections,
  cards,
  headerLabel,
  effectiveText,
}: {
  pageTitle: string;
  titleAccent?: string;
  eyebrow: string;
  heroText: string;
  heroRisk?: boolean;
  navItems: Array<{ id: string; label: string }>;
  relatedLinks?: Array<{ href: string; label: string }>;
  sections: LegalSection[];
  cards?: LegalCard[];
  headerLabel?: string;
  effectiveText?: string;
}) {
  return (
    <EditorialChrome>
      <div className={styles.page}>
        <section className={`${styles.hero} ${heroRisk ? styles.heroRisk : ""}`}>
          <div className={`${styles.eyebrow} ${heroRisk ? styles.eyebrowRisk : ""}`}>{eyebrow}</div>
          <h1 className={`${styles.title} ${heroRisk ? styles.titleRisk : ""} ${serif.className}`}>
            {pageTitle}
            {titleAccent ? <><br /><em>{titleAccent}</em></> : null}
          </h1>
          <p className={styles.subtitle}>{heroText}</p>
        </section>

        {cards?.length ? (
          <section className={styles.cards}>
            {cards.map((card) => (
              <article key={card.title} className={styles.card}>
                <div className={`${styles.cardFlag} ${ToneClass(card.tone)}`}>{card.flag}</div>
                <div className={`${styles.cardIcon} ${IconToneClass(card.tone)}`}>{card.icon}</div>
                <h2 className={`${styles.cardTitle} ${serif.className}`}>{card.title}</h2>
                <p className={styles.cardBody}>{card.body}</p>
              </article>
            ))}
          </section>
        ) : null}

        <div className={styles.wrap}>
          <aside className={styles.nav}>
            <div className={styles.navLabel}>On this page</div>
            {navItems.map((item, index) => (
              <Link key={item.id} href={`#${item.id}`} className={`${styles.navLink} ${index === 0 ? styles.activeLink : ""}`}>
                {item.label}
              </Link>
            ))}
            {relatedLinks?.length ? (
              <>
                <div className={styles.navDivider} />
                <div className={styles.navOther}>Related</div>
                {relatedLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={`${styles.navLink} ${styles.otherLink}`}>
                    {link.label} →
                  </Link>
                ))}
              </>
            ) : null}
          </aside>

          <main className={styles.content}>
            {headerLabel || effectiveText ? (
              <header>
                {headerLabel ? <div className={styles.headerLabel}>{headerLabel}</div> : null}
                {effectiveText ? <p className={styles.effectiveText}>{effectiveText}</p> : null}
              </header>
            ) : null}

            {sections.map((section) => (
              <section key={section.id} id={section.id} className={styles.section}>
                <div className={styles.sectionNum}>{section.num}</div>
                <h2 className={`${styles.sectionTitle} ${serif.className}`}>{section.title}</h2>
                {section.warning ? <div className={styles.warningBox}><p className={styles.prose}><strong>{section.warning}</strong></p></div> : null}
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)} className={styles.prose}>{paragraph}</p>
                ))}
                {section.table ? (
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>{section.table.headers.map((header) => <th key={header}>{header}</th>)}</tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, idx) => (
                        <tr key={`${section.id}-${idx}`}>
                          {row.map((cell, cellIdx) => <td key={`${idx}-${cellIdx}`}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {section.bullets?.length ? (
                  <ul className={styles.list}>
                    {section.bullets.map((bullet) => <li key={bullet.slice(0, 48)}>{bullet}</li>)}
                  </ul>
                ) : null}
              </section>
            ))}
          </main>
        </div>
      </div>
    </EditorialChrome>
  );
}
