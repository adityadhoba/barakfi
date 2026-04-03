"use client";

import { useState } from "react";
import styles from "./broker-connect-modal.module.css";

const BROKERS = [
  { id: "zerodha", name: "Zerodha", domain: "zerodha.com", color: "#387ed1" },
  { id: "groww", name: "Groww", domain: "groww.in", color: "#00d09c" },
  { id: "angel_one", name: "Angel One", domain: "angelone.in", color: "#ff6b35" },
  { id: "upstox", name: "Upstox", domain: "upstox.com", color: "#6c3bff" },
  { id: "hdfc_sky", name: "HDFC SKY", domain: "hdfcsky.com", color: "#004c8f" },
  { id: "motilal", name: "Motilal Oswal", domain: "motilaloswal.com", color: "#e31837" },
  { id: "paytm", name: "Paytm Money", domain: "paytmmoney.com", color: "#00baf2" },
  { id: "fivepaisa", name: "5paisa", domain: "5paisa.com", color: "#3f51b5" },
] as const;

const STEPS = [
  {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "Broker Login",
    desc: "You authorize read-only access to your holdings.",
  },
  {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: "Holdings Import",
    desc: "We securely pull your portfolio positions.",
  },
  {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Shariah Screening",
    desc: "Each holding is instantly screened for compliance.",
  },
];

export function BrokerConnectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.connectTrigger}
        onClick={() => setOpen(true)}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.07a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.07" />
        </svg>
        Connect Broker
      </button>
      {open && <BrokerModal onClose={() => setOpen(false)} />}
    </>
  );
}

function BrokerModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedBroker = BROKERS.find((b) => b.id === selected);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className={styles.headerKicker}>Import your holdings on</p>
            <h3 className={styles.headerTitle}>Barakfi</h3>
          </div>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {selected && selectedBroker ? (
          <div className={styles.selectedView}>
            {/* Broker logo */}
            <div className={styles.selectedLogoWrap}>
              <img
                src={`https://cdn.brandfetch.io/${selectedBroker.domain}/w/256/h/256`}
                alt={selectedBroker.name}
                width={56}
                height={56}
                className={styles.selectedLogo}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = "1";
                    img.src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${selectedBroker.domain}&size=64`;
                  } else {
                    img.style.display = "none";
                  }
                }}
              />
            </div>
            <h4 className={styles.selectedName}>{selectedBroker.name}</h4>

            <div className={styles.comingSoonBadgeLg}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Coming Soon
            </div>

            <p className={styles.selectedDesc}>
              We&apos;re working on integrating {selectedBroker.name}. Leave your email to get notified when it&apos;s ready.
            </p>

            {!submitted ? (
              <div className={styles.notifyForm}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.notifyInput}
                />
                <button
                  type="button"
                  className={styles.notifyBtn}
                  disabled={!email.includes("@")}
                  onClick={() => setSubmitted(true)}
                >
                  Notify Me
                </button>
              </div>
            ) : (
              <div className={styles.notifySuccess}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                We&apos;ll notify you at <strong>{email}</strong>
              </div>
            )}

            <button
              type="button"
              className={styles.backBtn}
              onClick={() => { setSelected(null); setEmail(""); setSubmitted(false); }}
            >
              &larr; All brokers
            </button>
          </div>
        ) : (
          <>
            <h4 className={styles.sectionTitle}>Select your broker</h4>
            <div className={styles.brokerGrid}>
              {BROKERS.map((broker) => (
                <button
                  key={broker.id}
                  type="button"
                  className={styles.brokerCard}
                  onClick={() => setSelected(broker.id)}
                >
                  <div className={styles.brokerLogoWrap}>
                    <img
                      src={`https://cdn.brandfetch.io/${broker.domain}/w/256/h/256`}
                      alt={broker.name}
                      width={36}
                      height={36}
                      className={styles.brokerLogo}
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.dataset.fallback) {
                          img.dataset.fallback = "1";
                          img.src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${broker.domain}&size=64`;
                        } else {
                          img.style.display = "none";
                          const parent = img.parentElement;
                          if (parent) {
                            parent.style.background = broker.color;
                            parent.style.color = "#fff";
                            parent.textContent = broker.name.charAt(0);
                          }
                        }
                      }}
                    />
                  </div>
                  <span className={styles.brokerName}>{broker.name}</span>
                  <span className={styles.comingSoonBadge}>Coming Soon</span>
                </button>
              ))}
            </div>

            <div className={styles.divider}>
              <span>How does this work?</span>
            </div>

            <div className={styles.stepsList}>
              {STEPS.map((step, i) => (
                <div key={i} className={styles.stepRow}>
                  <div className={styles.stepIcon}>{step.icon}</div>
                  <div>
                    <strong className={styles.stepTitle}>{step.title}</strong>
                    <p className={styles.stepDesc}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.footer}>
              <p>Don&apos;t have a broker account?</p>
              <a
                href="https://zerodha.com/open-account"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                Open an account online &rarr;
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
