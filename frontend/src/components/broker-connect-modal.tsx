"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { HiOutlineArrowLeft, HiOutlineBuildingLibrary, HiOutlineChartBar } from "react-icons/hi2";
import { Logo } from "@/components/logo";
import styles from "./broker-connect-modal.module.css";

const PRIMARY_BROKERS = [
  { id: "fivepaisa", name: "5paisa", domain: "5paisa.com", color: "#3f51b5" },
  { id: "angel_one", name: "Angel One", domain: "angelone.in", color: "#ff6b35" },
  { id: "groww", name: "Groww", domain: "groww.in", color: "#00d09c" },
  { id: "hdfc_sky", name: "HDFC SKY", domain: "hdfcsky.com", color: "#004c8f" },
  { id: "motilal", name: "Motilal Oswal", domain: "motilaloswal.com", color: "#e31837" },
  { id: "paytm", name: "Paytm Money", domain: "paytmmoney.com", color: "#00baf2" },
  { id: "upstox", name: "Upstox", domain: "upstox.com", color: "#6c3bff", live: true as const },
  { id: "zerodha", name: "Zerodha", domain: "zerodha.com", color: "#387ed1" },
] as const;

const EXTRA_BROKERS = [
  { id: "icici", name: "ICICI Direct", domain: "icicidirect.com", color: "#f58220" },
  { id: "kotak", name: "Kotak Securities", domain: "kotaksecurities.com", color: "#004b8d" },
  { id: "axis", name: "Axis Direct", domain: "axisdirect.in", color: "#97144d" },
] as const;

const HOW_STEPS = [
  {
    key: "login",
    circleClass: styles.howCircleBlue,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    text: "After you log in with your broker and confirm, we can sync your holdings.",
  },
  {
    key: "funds",
    circleClass: styles.howCircleGold,
    icon: (
      <span className={styles.rupeeIcon} aria-hidden>
        ₹
      </span>
    ),
    text: "We only request read access. Trades and funds stay with your broker.",
  },
  {
    key: "done",
    circleClass: styles.howCircleGreen,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
    text: "Your demat positions help us screen each holding for Shariah compliance.",
  },
];

type BrokerId = (typeof PRIMARY_BROKERS)[number]["id"] | (typeof EXTRA_BROKERS)[number]["id"];
type FlowStep = "asset" | "brokers" | "mf";

function parseUpstoxAuthorizeError(status: number, data: Record<string, unknown>): string {
  const detail = data.detail;
  if (typeof detail === "string") {
    if (status === 404) {
      return "Broker connect is not available on this server yet. Deploy the latest API or check NEXT_PUBLIC_API_BASE_URL.";
    }
    if (status === 503) {
      return detail;
    }
    return detail;
  }
  if (Array.isArray(detail) && detail[0] && typeof (detail[0] as { msg?: string }).msg === "string") {
    return (detail[0] as { msg: string }).msg;
  }
  if (typeof data.error === "string") {
    return data.error;
  }
  if (status === 404) {
    return "Not found — confirm the API is deployed and NEXT_PUBLIC_API_BASE_URL points to your FastAPI /api base.";
  }
  return "Could not start Upstox login.";
}

function BrokerLogo({
  broker,
}: {
  broker: { domain: string; name: string; color: string };
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic brand logos with onError fallback */}
      <img
        src={`https://cdn.brandfetch.io/${broker.domain}/w/256/h/256`}
        alt=""
        width={40}
        height={40}
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
    </>
  );
}

export function BrokerConnectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.connectTrigger} onClick={() => setOpen(true)}>
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
  const { isSignedIn, getToken } = useAuth();
  const [step, setStep] = useState<FlowStep>("asset");
  const [assetChoice, setAssetChoice] = useState<"stocks" | "mutual_funds">("stocks");
  const [selected, setSelected] = useState<BrokerId | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [upstoxLoading, setUpstoxLoading] = useState(false);
  const [upstoxErr, setUpstoxErr] = useState<string | null>(null);

  const allBrokers = [...PRIMARY_BROKERS, ...(showMore ? EXTRA_BROKERS : [])];
  const selectedBroker =
    PRIMARY_BROKERS.find((b) => b.id === selected) ||
    EXTRA_BROKERS.find((b) => b.id === selected);

  function resetBrokerState() {
    setSelected(null);
    setShowMore(false);
    setEmail("");
    setSubmitted(false);
    setUpstoxErr(null);
  }

  async function startUpstoxOAuth() {
    setUpstoxErr(null);
    setUpstoxLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setUpstoxErr("Please sign in to connect Upstox.");
        setUpstoxLoading(false);
        return;
      }
      const res = await fetch("/api/me/integrations/upstox/authorize-url", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setUpstoxErr(parseUpstoxAuthorizeError(res.status, data));
        setUpstoxLoading(false);
        return;
      }
      const url = data.url;
      if (typeof url === "string" && url.length > 0) {
        window.location.href = url;
        return;
      }
      setUpstoxErr("Invalid response from server.");
    } catch {
      setUpstoxErr("Network error. Try again.");
    }
    setUpstoxLoading(false);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalShell} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalWide}>
          <aside className={styles.leftPane} aria-label="How broker connect works">
            <p className={styles.leftTitle}>How does this work?</p>
            <ul className={styles.howList}>
              {HOW_STEPS.map((s) => (
                <li key={s.key} className={styles.howRow}>
                  <div className={`${styles.howCircle} ${s.circleClass}`}>{s.icon}</div>
                  <p className={styles.howText}>{s.text}</p>
                </li>
              ))}
            </ul>
          </aside>

          <div className={styles.rightPane}>
            <div className={styles.rightTop}>
              <div className={styles.brandRow}>
                <Logo size={32} showText />
                <p className={styles.brandTagline}>
                  Trade, track and manage investments on <strong>Barakfi</strong>.
                </p>
              </div>
              <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {step === "asset" && (
              <div className={styles.flowStep}>
                <h2 className={styles.mainHeading}>Import your portfolio</h2>
                <p className={styles.flowSub}>Choose what you want to connect first.</p>
                <div className={styles.assetChoices}>
                  <button
                    type="button"
                    className={`${styles.assetCard} ${assetChoice === "stocks" ? styles.assetCardActive : ""}`}
                    onClick={() => setAssetChoice("stocks")}
                  >
                    <HiOutlineChartBar className={styles.assetCardIcon} size={28} strokeWidth={1.5} aria-hidden />
                    <span className={styles.assetCardTitle}>Stocks</span>
                    <span className={styles.assetCardHint}>Connect your broker to sync demat holdings</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.assetCard} ${assetChoice === "mutual_funds" ? styles.assetCardActive : ""}`}
                    onClick={() => setAssetChoice("mutual_funds")}
                  >
                    <HiOutlineBuildingLibrary className={styles.assetCardIcon} size={28} strokeWidth={1.5} aria-hidden />
                    <span className={styles.assetCardTitle}>Mutual funds</span>
                    <span className={styles.assetCardHint}>CAS / statement based import (coming to Barakfi)</span>
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.flowContinue}
                  onClick={() => {
                    resetBrokerState();
                    if (assetChoice === "stocks") setStep("brokers");
                    else setStep("mf");
                  }}
                >
                  Continue
                </button>
              </div>
            )}

            {step === "mf" && (
              <div className={styles.flowStep}>
                <button type="button" className={styles.flowBack} onClick={() => setStep("asset")}>
                  <HiOutlineArrowLeft size={18} aria-hidden /> Back
                </button>
                <h2 className={styles.mainHeading}>Mutual funds</h2>
                <p className={styles.mfIntro}>
                  Barakfi doesn&apos;t import mutual funds yet. You can use these services for your consolidated
                  account statement; we may integrate MF APIs later.
                </p>
                <ul className={styles.mfModalList}>
                  <li>
                    <a href="https://www.mfcentral.com/" target="_blank" rel="noopener noreferrer">
                      MF Central
                    </a>
                    <span> — official CAS access</span>
                  </li>
                  <li>
                    <a href="https://mfapis.in/" target="_blank" rel="noopener noreferrer">
                      MFAPIs.in
                    </a>
                    <span> — free MF data API for developers</span>
                  </li>
                </ul>
              </div>
            )}

            {step === "brokers" && selected && selectedBroker ? (
              <div className={styles.detailBody}>
                <button
                  type="button"
                  className={styles.flowBack}
                  onClick={() => {
                    resetBrokerState();
                  }}
                >
                  <HiOutlineArrowLeft size={18} aria-hidden /> All brokers
                </button>
                <h2 className={styles.mainHeading}>Login with your broker</h2>
                <div className={styles.selectedCard}>
                  <div className={styles.selectedLogoWrap}>
                    <BrokerLogo broker={selectedBroker} />
                  </div>
                  <h3 className={styles.selectedName}>{selectedBroker.name}</h3>

                  {"live" in selectedBroker && selectedBroker.live ? (
                    <>
                      <p className={styles.selectedDesc}>
                        You&apos;ll sign in on Upstox, then return to Barakfi. We store an encrypted access token to
                        import holdings when sync is enabled.
                      </p>
                      {!isSignedIn ? (
                        <p className={styles.hint}>Sign in to Barakfi first, then connect Upstox.</p>
                      ) : (
                        <>
                          {upstoxErr && <p className={styles.errorText}>{upstoxErr}</p>}
                          <button
                            type="button"
                            className={styles.primaryBtn}
                            disabled={upstoxLoading}
                            onClick={() => void startUpstoxOAuth()}
                          >
                            {upstoxLoading ? "Opening Upstox…" : "Continue with Upstox"}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <span className={styles.comingSoonBadgeLg}>Coming soon</span>
                      <p className={styles.selectedDesc}>
                        We&apos;re working on integrating {selectedBroker.name}. Leave your email to get notified when
                        it&apos;s ready.
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
                          We&apos;ll notify you at <strong>{email}</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : step === "brokers" ? (
              <>
                <button type="button" className={styles.flowBack} onClick={() => { resetBrokerState(); setStep("asset"); }}>
                  <HiOutlineArrowLeft size={18} aria-hidden /> Back
                </button>
                <h2 className={styles.mainHeading}>Login with your broker</h2>
                <div className={styles.brokerGrid}>
                  {allBrokers.map((broker) => (
                    <button
                      key={broker.id}
                      type="button"
                      className={styles.brokerCard}
                      onClick={() => setSelected(broker.id as BrokerId)}
                    >
                      <div className={styles.brokerLogoWrap}>
                        <BrokerLogo broker={broker} />
                      </div>
                      <span className={styles.brokerName}>{broker.name}</span>
                      {"live" in broker && broker.live ? (
                        <span className={styles.availableBadge}>Available</span>
                      ) : (
                        <span className={styles.comingSoonBadge}>Soon</span>
                      )}
                    </button>
                  ))}
                </div>
                {!showMore && (
                  <button type="button" className={styles.moreLink} onClick={() => setShowMore(true)}>
                    + 3 more
                  </button>
                )}

                <div className={styles.dividerLine}>
                  <span>Don&apos;t have a broker account?</span>
                </div>
                <a
                  href="https://zerodha.com/open-account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.outlineBtn}
                >
                  Open an account online
                </a>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
