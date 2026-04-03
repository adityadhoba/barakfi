"use client";

import { useState } from "react";

const LOGO_API_TOKEN = "sk_aYOWOXntQbavQkHYXXYJ_g";

const SYMBOL_TO_DOMAIN: Record<string, string> = {
  RELIANCE: "ril.com",
  TCS: "tcs.com",
  HDFCBANK: "hdfcbank.com",
  INFY: "infosys.com",
  ICICIBANK: "icicibank.com",
  HINDUNILVR: "hul.co.in",
  SBIN: "sbi.co.in",
  BHARTIARTL: "airtel.in",
  ITC: "itcportal.com",
  KOTAKBANK: "kotak.com",
  LT: "larsentoubro.com",
  AXISBANK: "axisbank.com",
  BAJFINANCE: "bajajfinserv.in",
  MARUTI: "marutisuzuki.com",
  ASIANPAINT: "asianpaints.com",
  HCLTECH: "hcltech.com",
  WIPRO: "wipro.com",
  SUNPHARMA: "sunpharma.com",
  TITAN: "titan.co.in",
  ULTRACEMCO: "ultratechcement.com",
  NESTLEIND: "nestle.in",
  BAJAJFINSV: "bajajfinserv.in",
  NTPC: "ntpc.co.in",
  POWERGRID: "powergrid.in",
  TATAMOTORS: "tatamotors.com",
  TATASTEEL: "tatasteel.com",
  ONGC: "ongcindia.com",
  JSWSTEEL: "jsw.in",
  M_M: "mahindra.com",
  "M&M": "mahindra.com",
  ADANIENT: "adani.com",
  ADANIPORTS: "adaniports.com",
  COALINDIA: "coalindia.in",
  TECHM: "techmahindra.com",
  INDUSINDBK: "indusind.com",
  DRREDDY: "drreddys.com",
  CIPLA: "cipla.com",
  DIVISLAB: "dfrlab.com",
  EICHERMOT: "eicher.in",
  GRASIM: "grasim.com",
  HEROMOTOCO: "heromotocorp.com",
  BRITANNIA: "britannia.co.in",
  APOLLOHOSP: "apollohospitals.com",
  SBILIFE: "sbilife.co.in",
  HDFCLIFE: "hdfclife.com",
  TATACONSUM: "tataconsumer.com",
  UPL: "upl-ltd.com",
  BPCL: "bharatpetroleum.in",
  HINDALCO: "hindalco.com",
  VEDL: "vedantalimited.com",
  IOC: "iocl.com",
  DABUR: "dabur.com",
  PIDILITIND: "pidilite.com",
  GODREJCP: "godrejcp.com",
  HAVELLS: "havells.com",
  TRENT: "trentlimited.com",
  ZOMATO: "zomato.com",
  PAYTM: "paytm.com",
  NYKAA: "nykaa.com",
  DMART: "dmartindia.com",
  IRCTC: "irctc.co.in",
  HAL: "hal-india.co.in",
  BEL: "bel-india.in",
  LICI: "licindia.in",
  BANKBARODA: "bankofbaroda.in",
  PNB: "pnbindia.in",
  CANBK: "canarabank.com",
  MARICO: "marico.com",
  BERGEPAINT: "bergerpaints.com",
  COLPAL: "colgatepalmolive.co.in",
  MCDOWELL: "diageo.com",
  BIOCON: "biocon.com",
  LUPIN: "lupin.com",
  AUROPHARMA: "aurobindo.com",
  TORNTPHARM: "torrentpharma.com",
  DLF: "dlf.in",
  OBEROIRLTY: "oberoirealty.com",
  GODREJPROP: "godrejproperties.com",
  MOTHERSON: "motherson.com",
  SHREECEM: "shreecement.com",
  AMBUJACEM: "ambujacement.com",
  ACC: "acclimited.com",
  INDIGO: "goindigo.in",
  BAJAJ_AUTO: "bajajauto.com",
  BAJAJAUTO: "bajajauto.com",
  TATAPOWER: "tatapower.com",
  GAIL: "gailonline.com",
  MUTHOOTFIN: "muthootfinance.com",
  CHOLAFIN: "cholamandalam.com",
  MANAPPURAM: "manappuram.com",
  PEL: "piramal.com",
  SBICARD: "sbicard.com",
  BANDHANBNK: "bandhanbank.com",
  IDFC: "idfcfirstbank.com",
  FEDERALBNK: "federalbank.co.in",
  RBLBANK: "rblbank.com",
  VOLTAS: "voltas.com",
  POLYCAB: "polycab.com",
  SIEMENS: "siemens.co.in",
  ABB: "abb.com",
  BOSCHLTD: "bosch.in",
  PAGEIND: "pageindustries.com",
  TATAELXSI: "tataelxsi.com",
  PERSISTENT: "persistent.com",
  LTIM: "ltimindtree.com",
  MPHASIS: "mphasis.com",
  COFORGE: "coforge.com",
};

function getLogoUrl(symbol: string): string | null {
  const clean = symbol.replace(/\.NS$/, "").toUpperCase();
  const domain = SYMBOL_TO_DOMAIN[clean];
  if (!domain) return null;
  return `https://img.logo.dev/${domain}?token=${LOGO_API_TOKEN}&size=64`;
}

function getAvatarColor(status?: string): string {
  if (status === "HALAL" || status === "COMPLIANT") return "var(--emerald)";
  if (status === "REQUIRES_REVIEW") return "var(--gold)";
  if (status === "NON_COMPLIANT") return "var(--red)";
  return "var(--text-tertiary)";
}

type Props = {
  symbol: string;
  size?: number;
  status?: string;
  className?: string;
};

export function StockLogo({ symbol, size = 32, status, className }: Props) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getLogoUrl(symbol);
  const initials = symbol.replace(/\.NS$/, "").slice(0, 2).toUpperCase();

  if (!logoUrl || imgError) {
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
          background: getAvatarColor(status),
          color: "#fff",
          fontWeight: 700,
          fontSize: size * 0.38,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={className}
      onError={() => setImgError(true)}
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
