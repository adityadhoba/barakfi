"use client";

import { useState } from "react";
import { yahooFinanceBaseCandidates } from "@/lib/yahoo-symbol-aliases";

const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || "";

/**
 * Bump `NEXT_PUBLIC_LOGO_DEV_CACHE_BUST` when bypassing stale img.logo.dev CDN responses.
 * Stock logos use **only** `https://img.logo.dev/*` (domain + ticker); no favicon CDNs.
 */
const LOGO_DEV_CACHE_BUST = process.env.NEXT_PUBLIC_LOGO_DEV_CACHE_BUST || "2026-04-23";

const EXCHANGE_SUFFIX: Record<string, string> = {
  NSE: ".NS",
  BSE: ".BO",
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
  BAJAJFINSV: "bajajfinserv.in",
  BAJAJAUTO: "bajajauto.com",
  BEL: "bel-india.in",
  VEDL: "vedantalimited.com",
  HAL: "hal-india.co.in",
  TATASTEEL: "tatasteel.com",
  HINDALCO: "hindalco.com",
  EICHERMOT: "eicher.in",
  SBILIFE: "sbilife.co.in",
  GRASIM: "grasim.com",
  SHRIRAMFIN: "shriramfinance.in",
  TVSMOTOR: "tvsmotor.com",
  DIVISLAB: "divislabs.com",
  JIOFIN: "jio.com",
  ADANIGREEN: "adani.com",
  VBL: "varunbeverages.com",
  TORNTPHARM: "torrentpharma.com",
  LTIM: "ltimindtree.com",
  PFC: "pfcindia.com",
  ABB: "abb.com",
  PIDILITIND: "pidilite.com",
  DLF: "dlf.in",
  BANKBARODA: "bankofbaroda.in",
  CUMMINSIND: "cummins.com",
  TECHM: "techmahindra.com",
  MUTHOOTFIN: "muthootfinance.com",
  TRENT: "trentlimited.com",
  TATAPOWER: "tatapower.com",
  HDFCLIFE: "hdfclife.com",
  PNB: "pnbindia.in",
  IRFC: "irfc.co.in",
  SOLARINDS: "solarindustriesindia.com",
  BSE: "bseindia.com",
  CANBK: "canarabank.com",
  MOTHERSON: "motherson.com",
  INDUSTOWER: "industowers.com",
  SIEMENS: "siemens.com",
  LICI: "licindia.in",
  LUPIN: "lupin.com",
  POLYCAB: "polycab.com",
  AMBUJACEM: "ambujacement.com",
  TATACONSUM: "tataconsumer.com",
  "M&M": "mahindra.com",
  ADANIPOWER: "adani.com",
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
  GARDENREACH: "grse.in",
  MAZAGON: "mazdock.in",
  ZENSAR: "zensar.com",
  AUBANK: "aubank.in",
  FEDERALBNK: "federalbank.co.in",
  INDUSINDBK: "indusind.com",
  POWERMECH: "powermechprojects.com",
  IDFCFIRSTB: "idfcfirstbank.com",
  BANDHANBNK: "bandhanbank.com",
  UNIONBANK: "unionbankofindia.co.in",
  BANKINDIA: "bankofindia.co.in",
  INDIANB: "indianbank.in",
  CENTRALBK: "centralbankofindia.co.in",
  RBLBANK: "rblbank.com",
  YESBANK: "yesbank.in",
  CSBBANK: "csb.co.in",
  KARURVYSYA: "kvb.co.in",
  SOUTHBANK: "southindianbank.com",
  IOB: "iob.in",
  DCBBANK: "dcbbank.com",
  JKBANK: "jkbank.com",
  MAHABANK: "bankofmaharashtra.in",
  EQUITASBNK: "equitasbank.com",
  UJJIVANSFB: "ujjivansfb.in",
};

function normalizeSymbol(symbol: string): string {
  return symbol
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\.(NS|BO|L|IN)$/i, "")
    .replace(/-/g, "")
    .toUpperCase();
}

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** logo.dev `size` param: retina-friendly without always fetching 256px for small avatars */
function logoDevPixelSize(displaySize: number): number {
  return Math.min(128, Math.max(48, Math.round(displaySize * 2)));
}

function getTickerLogoUrl(symbol: string, displaySize: number, exchange?: string): string | null {
  if (!LOGO_DEV_TOKEN) return null;
  const clean = normalizeSymbol(symbol);
  const rawForYahoo = symbol.replace(/\.(NS|BO|L|IN)$/i, "").trim().toUpperCase();
  const yahooBase = yahooFinanceBaseCandidates(rawForYahoo)[0] ?? clean;
  const suffix = EXCHANGE_SUFFIX[(exchange || "NSE").toUpperCase()] ?? ".NS";
  const ticker = `${yahooBase}${suffix}`;
  const px = logoDevPixelSize(displaySize);
  return `https://img.logo.dev/ticker/${encodeURIComponent(ticker)}?token=${LOGO_DEV_TOKEN}&size=${px}&format=webp&cb=${encodeURIComponent(LOGO_DEV_CACHE_BUST)}`;
}

function getDomainLogoUrl(symbol: string, displaySize: number): string | null {
  if (!LOGO_DEV_TOKEN) return null;
  const clean = normalizeSymbol(symbol);
  const domain = SYMBOL_TO_DOMAIN[clean];
  if (!domain) return null;
  const px = logoDevPixelSize(displaySize);
  return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${LOGO_DEV_TOKEN}&size=${px}&format=webp&cb=${encodeURIComponent(LOGO_DEV_CACHE_BUST)}`;
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
};

export function StockLogo({ symbol, size = 32, status, exchange, className }: Props) {
  const [srcLevel, setSrcLevel] = useState(0);

  const cleanSym = normalizeSymbol(symbol);
  const hasCuratedDomain = Boolean(SYMBOL_TO_DOMAIN[cleanSym]);

  const tickerUrl = getTickerLogoUrl(symbol, size, exchange);
  const domainLogoUrl = getDomainLogoUrl(symbol, size);
  const initials = symbol.replace(/\.(NS|BO|L|IN)$/i, "").replace(/-/g, "").slice(0, 2).toUpperCase();

  // logo.dev only: domain endpoint first when curated (better brand match), then ticker.
  const sources = LOGO_DEV_TOKEN
    ? hasCuratedDomain && domainLogoUrl && tickerUrl
      ? uniqueUrls([domainLogoUrl, tickerUrl])
      : uniqueUrls([tickerUrl, domainLogoUrl])
    : [];
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
      decoding="async"
      loading="lazy"
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
