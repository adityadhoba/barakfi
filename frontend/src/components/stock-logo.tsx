"use client";

import { useState } from "react";

const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || "";

const EXCHANGE_SUFFIX: Record<string, string> = {
  NSE: ".IN",
  BSE: ".IN",
  US: "",
  NYSE: "",
  NASDAQ: "",
  LSE: ".L",
  LON: ".L",
};

const SYMBOL_TO_DOMAIN: Record<string, string> = {
  RELIANCE: "ril.com",
  TCS: "tcs.com",
  HDFCBANK: "hdfcbank.com",
  ICICIBANK: "icicibank.com",
  INFY: "infosys.com",
  HINDUNILVR: "hul.co.in",
  ITC: "itcportal.com",
  SBIN: "sbi.co.in",
  BHARTIARTL: "airtel.in",
  KOTAKBANK: "kotak.com",
  CHOLAFIN: "cholamandalam.com",
  LT: "larsentoubro.com",
  HCLTECH: "hcltech.com",
  AXISBANK: "axisbank.com",
  ASIANPAINT: "asianpaints.com",
  MARUTI: "marutisuzuki.com",
  SUNPHARMA: "sunpharma.com",
  TITAN: "titan.co.in",
  WIPRO: "wipro.com",
  ADANIENT: "adani.com",
  ADANIPORTS: "adaniports.com",
  TATAMOTORS: "tatamotors.com",
  ONGC: "ongcindia.com",
  JSWSTEEL: "jsw.in",
  CIPLA: "cipla.com",
  DRREDDY: "drreddys.com",
  APOLLOHOSP: "apollohospitals.com",
  DMART: "dmartindia.com",
  ULTRACEMCO: "ultratechcement.com",
  NESTLEIND: "nestle.in",
  BAJFINANCE: "bajajfinserv.in",
  AAPL: "apple.com",
  MSFT: "microsoft.com",
  GOOGL: "google.com",
  AMZN: "amazon.com",
  NVDA: "nvidia.com",
  META: "meta.com",
  TSLA: "tesla.com",
  JPM: "jpmorganchase.com",
  V: "visa.com",
  MA: "mastercard.com",
  SHEL: "shell.com",
  AZN: "astrazeneca.com",
  ULVR: "unilever.com",
  BP: "bp.com",
  HSBA: "hsbc.com",
  GSK: "gsk.com",
  LODHA: "lodhagroup.com",
  SOBHA: "sobha.com",
  MINDACORP: "mindagroup.com",
  SUNTV: "sunnetwork.in",
  NETWORK18: "network18group.com",
  TV18BRDCST: "network18group.com",
  TATACHEM: "tatachemicals.com",
  BRITANNIA: "britannia.co.in",
  GODREJCP: "godrejcp.com",
  HAVELLS: "havells.com",
  INDIGO: "goindigo.in",
  ZOMATO: "zomato.com",
  PAYTM: "paytm.com",
  NYKAA: "nykaa.com",
  POLICYBZR: "pbpartners.com",
  CARTRADE: "cartrade.com",
  RVNL: "rvnl.org",
  IRCON: "ircon.org",
  COALINDIA: "coalindia.in",
  NTPC: "ntpc.co.in",
  POWERGRID: "powergrid.in",
  IOC: "iocl.com",
  BPCL: "bharatpetroleum.in",
  GAIL: "gailonline.com",
};

function normalizeSymbol(symbol: string): string {
  return symbol
    .replace(/\.(NS|BO|L|IN)$/i, "")
    .replace(/-/g, "")
    .toUpperCase();
}

function getTickerLogoUrl(symbol: string, exchange?: string): string {
  const clean = normalizeSymbol(symbol);
  const suffix = EXCHANGE_SUFFIX[(exchange || "NSE").toUpperCase()] ?? ".IN";
  const ticker = `${clean}${suffix}`;
  if (LOGO_DEV_TOKEN) {
    return `https://img.logo.dev/ticker/${ticker}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;
  }
  return `https://img.logo.dev/ticker/${ticker}?size=128&format=png`;
}

function getBrandfetchUrl(symbol: string): string | null {
  const clean = normalizeSymbol(symbol);
  const domain = SYMBOL_TO_DOMAIN[clean];
  if (!domain) return null;
  return `https://cdn.brandfetch.io/${domain}/w/256/h/256`;
}

function getFaviconUrl(symbol: string): string | null {
  const clean = normalizeSymbol(symbol);
  const domain = SYMBOL_TO_DOMAIN[clean];
  if (!domain) return null;
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`;
}

function getAvatarColor(status?: string): string {
  if (status === "HALAL" || status === "COMPLIANT") return "var(--emerald)";
  if (status === "CAUTIOUS") return "var(--gold)";
  if (status === "NON_COMPLIANT") return "var(--red)";
  return "var(--text-tertiary)";
}

type Props = {
  symbol: string;
  size?: number;
  status?: string;
  exchange?: string;
  className?: string;
  /** Above-the-fold hero: eager load + decode (reduces LCP delay for logos) */
  priority?: boolean;
};

export function StockLogo({ symbol, size = 32, status, exchange, className, priority = false }: Props) {
  const [srcLevel, setSrcLevel] = useState(0);

  const tickerUrl = getTickerLogoUrl(symbol, exchange);
  const brandfetchUrl = getBrandfetchUrl(symbol);
  const faviconUrl = getFaviconUrl(symbol);
  const initials = symbol.replace(/\.(NS|BO|L|IN)$/i, "").replace(/-/g, "").slice(0, 2).toUpperCase();

  const sources = [tickerUrl, brandfetchUrl, faviconUrl].filter(Boolean) as string[];
  const currentSrc = srcLevel < sources.length ? sources[srcLevel] : null;

  if (!currentSrc) {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: size > 28 ? 10 : 6,
          background: `linear-gradient(135deg, ${getAvatarColor(status)}, ${getAvatarColor(status)}dd)`,
          color: "#fff",
          fontWeight: 700,
          fontSize: size * 0.38,
          flexShrink: 0,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic multi-source logo fallbacks
    <img
      src={currentSrc}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      onError={() => setSrcLevel((prev) => prev + 1)}
      style={{
        borderRadius: size > 28 ? 10 : 6,
        objectFit: "contain",
        flexShrink: 0,
        background: "var(--bg-soft)",
        border: "1px solid var(--line)",
      }}
    />
  );
}
