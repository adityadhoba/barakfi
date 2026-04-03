"use client";

import { useState } from "react";

const SYMBOL_TO_DOMAIN: Record<string, string> = {
  // NIFTY 50
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
  LT: "larsentoubro.com",
  HCLTECH: "hcltech.com",
  AXISBANK: "axisbank.com",
  ASIANPAINT: "asianpaints.com",
  MARUTI: "marutisuzuki.com",
  SUNPHARMA: "sunpharma.com",
  TITAN: "titan.co.in",
  BAJFINANCE: "bajajfinserv.in",
  DMART: "dmartindia.com",
  NESTLEIND: "nestle.in",
  ULTRACEMCO: "ultratechcement.com",
  NTPC: "ntpclimited.com",
  WIPRO: "wipro.com",
  ADANIENT: "adani.com",
  ADANIPORTS: "adaniports.com",
  POWERGRID: "powergridindia.com",
  TATAMOTORS: "tatamotors.com",
  BAJAJFINSV: "bajajfinserv.in",
  ONGC: "ongcindia.com",
  JSWSTEEL: "jsw.in",
  TECHM: "techmahindra.com",
  COALINDIA: "coalindia.in",
  "M&M": "mahindra.com",
  MM: "mahindra.com",
  TATASTEEL: "tatasteel.com",
  INDUSINDBK: "indusind.com",
  HINDALCO: "hindalco.com",
  GRASIM: "grasim.com",
  CIPLA: "cipla.com",
  BRITANNIA: "britannia.co.in",
  DRREDDY: "drreddys.com",
  APOLLOHOSP: "apollohospitals.com",
  EICHERMOT: "eicher.in",
  HEROMOTOCO: "heromotocorp.com",
  DIVISLAB: "divislab.com",
  LTIM: "ltimindtree.com",
  BAJAJAUTO: "bajajauto.com",
  TRENT: "trentlimited.com",
  SHREECEM: "shreecement.com",
  PIDILITIND: "pidilite.com",
  SOLARINDS: "sfrp.com",
  // NIFTY NEXT 50
  HAL: "hal-india.co.in",
  BEL: "bel-india.in",
  IRCTC: "irctc.co.in",
  ZOMATO: "zomato.com",
  TATAPOWER: "tatapower.com",
  INDIGO: "goindigo.in",
  DLF: "dlf.in",
  GODREJPROP: "godrejproperties.com",
  DABUR: "dabur.com",
  MARICO: "marico.com",
  PERSISTENT: "persistent.com",
  COFORGE: "coforge.com",
  TATACONSUM: "tataconsumer.com",
  COLPAL: "colgatepalmolive.co.in",
  MCDOWELL: "diageo.com",
  MCDOWELL_N: "diageo.com",
  MCDOWNN: "diageo.com",
  MCDOWELLN: "diageo.com",
  PEL: "piramal.com",
  SIEMENS: "siemens.co.in",
  ABB: "abb.com",
  TORNTPHARM: "torrentpharma.com",
  AUROPHARMA: "aurobindo.com",
  LUPIN: "lupin.com",
  BIOCON: "biocon.com",
  HAVELLS: "havells.com",
  VOLTAS: "voltas.com",
  INDUSTOWER: "industower.com",
  MOTHERSON: "motherson.com",
  PIIND: "piindustries.com",
  NAUKRI: "naukri.com",
  PAGEIND: "pageindustries.com",
  MPHASIS: "mphasis.com",
  // Additional popular stocks
  HDFCLIFE: "hdfclife.com",
  POLYCAB: "polycab.com",
  DEEPAKNTR: "deepaknitrite.com",
  SBILIFE: "sbilife.co.in",
  IDFCFIRSTB: "idfcfirstbank.com",
  BANKBARODA: "bankofbaroda.in",
  PNB: "pnbindia.in",
  CANBK: "canarabank.com",
  FEDERALBNK: "federalbank.co.in",
  ICICIPRULI: "iciciprulife.com",
  // NIFTY Midcap 100 additions
  TATAELXSI: "tataelxsi.com",
  LTTS: "ltts.com",
  KPITTECH: "kpit.com",
  DIXON: "dixoninfo.com",
  KAYNES: "kaynestechnology.com",
  ALKEM: "alkemlabs.com",
  LAURUSLABS: "lauruslabs.com",
  IPCALAB: "ipcalabs.com",
  GLENMARK: "glenmarkpharma.com",
  NATCOPHARM: "natcopharma.co.in",
  BOSCHLTD: "bosch.in",
  BHARATFORG: "bharatforge.com",
  EXIDEIND: "exideindustries.com",
  BALKRISIND: "bfrubber.com",
  UPL: "upl-ltd.com",
  SRF: "srf.com",
  ATUL: "atul.co.in",
  NAVINFLUOR: "nfrind.com",
  CLEAN: "cleanscienceindia.com",
  VBL: "varunbeverages.com",
  GODREJCP: "godrejcp.com",
  BATAINDIA: "bata.in",
  EMAMILTD: "emamiltd.in",
  CUMMINSIND: "cumminsindia.com",
  THERMAX: "thermaxglobal.com",
  ASTRAL: "astralltd.com",
  APLAPOLLO: "aplapollo.com",
  SUPREMEIND: "supreme.co.in",
  OBEROIRLTY: "oberoirealty.com",
  PRESTIGE: "prestigeconstructions.com",
  BRIGADE: "brigadegroup.com",
  PHOENIXLTD: "thephoenixmills.com",
  IRFC: "irfc.nic.in",
  JIOFIN: "jiofinancialservices.com",
  TATACOMM: "tatacommunications.com",
  MAXHEALTH: "maxhealthcare.in",
  FORTIS: "fortishealthcare.com",
  LALPATHLAB: "lalpathlabs.com",
  INDIANHOTELS: "ihcltata.com",
  JUBLFOOD: "jubilantfoodworks.com",
  DEVYANI: "devyani.com",
  LICHSGFIN: "lichfl.com",
  MANAPPURAM: "manappuram.com",
  MUTHOOTFIN: "muthootfinance.com",
  CONCOR: "concorindia.co.in",
  NHPC: "nhpcindia.com",
  SJVN: "sjvn.nic.in",
  RECLTD: "recindia.nic.in",
  PFC: "pfcindia.com",
  IREDA: "ireda.in",
  SYNGENE: "syngeneintl.com",
  AJANTPHARM: "ajantpharma.com",
  GRANULES: "granulesindia.com",
  CROMPTON: "crompton.co.in",
  WHIRLPOOL: "whirlpoolindia.com",
  BLUESTARCO: "bluestarindia.com",
  ABCAPITAL: "adityabirlacapital.com",
  CHOLAFIN: "cholamandalam.com",
  SHRIRAMFIN: "shriramfinance.in",
  MFSL: "maxlifeinsurance.com",
  NIACL: "newindia.co.in",
  STARHEALTH: "starhealth.in",
  AMBUJACEM: "ambujacement.com",
  RAMCOCEM: "ramcocements.in",
  JKCEMENT: "jkcement.com",
  TVSMOTOR: "tvsmotor.com",
  ASHOKLEY: "ashokleyland.com",
  ESCORTS: "escortsgroup.com",
  HINDPETRO: "hindustanpetroleum.com",
  BPCL: "bharatpetroleum.in",
  IOC: "iocl.com",
  GAIL: "gailonline.com",
  VEDL: "vedantalimited.com",
  NMDC: "nmdc.co.in",
  NATIONALUM: "nalcoindia.com",
  BANDHANBNK: "bandhanbank.com",
  AUBANK: "aubank.in",
  RBLBANK: "rblbank.com",
  // Other common stocks
  SBICARD: "sbicard.com",
  ACC: "acclimited.com",
  LICI: "licindia.in",
  BERGEPAINT: "bergerpaints.com",
  PAYTM: "paytm.com",
  NYKAA: "nykaa.com",
  // Week 1 expansion
  DALBHARAT: "dfrlab.com",
  JSWENERGY: "jsw.in",
  ADANIGREEN: "adanigreenenergy.com",
  ADANIPOWER: "adanipower.com",
  ADANITRANS: "adanitransmission.com",
  POWERMECH: "powermechprojects.com",
  SUZLON: "suzlon.com",
  INOXWIND: "inoxwind.com",
  TTML: "tatateleservices.com",
  IDEA: "myvi.in",
  // Week 2 expansion
  ZYDUSLIFE: "zyduslife.com",
  MANKIND: "mankindpharma.com",
  PGHH: "pg.com",
  GODREJIND: "godrejindustries.com",
  // Week 3 expansion
  CENTURYTEX: "centurytextiles.com",
  GRINFRA: "grinfra.com",
  KFINTECH: "kfintech.com",
  CAMS: "camsonline.com",
  BSOFT: "birlasoft.com",
  HAPPSTMNDS: "happiest-minds.com",
  TANLA: "tanla.com",
  LATENTVIEW: "latentview.com",
  MASTEK: "mastek.com",
  ZENSAR: "zensar.com",
  // Week 4 expansion
  CUB: "cityunionbank.com",
  KARURVYSYA: "kvb.co.in",
  SOUTHBANK: "southindianbank.com",
  TMB: "tmb.in",
  EQUITASBNK: "equitasbank.com",
  APLLTD: "aplltd.com",
  JBCHEPHARM: "jbcpl.com",
  GLAXO: "gsk.com",
  PFIZER: "pfizer.com",
  PATANJALI: "patanjaliayurved.net",
  FINPIPE: "finpipe.com",
  NTPCGREEN: "ntpc.co.in",
};

function normalizeSymbol(symbol: string): string {
  return symbol
    .replace(/\.NS$/, "")
    .replace(/-/g, "")
    .toUpperCase();
}

function getLogoDomain(symbol: string): string | null {
  const clean = normalizeSymbol(symbol);
  return SYMBOL_TO_DOMAIN[clean] || SYMBOL_TO_DOMAIN[symbol.replace(/\.NS$/, "").toUpperCase()] || null;
}

function getLogoUrl(symbol: string): string | null {
  const domain = getLogoDomain(symbol);
  if (!domain) return null;
  return `https://cdn.brandfetch.io/${domain}/w/256/h/256`;
}

function getFallbackLogoUrl(symbol: string): string | null {
  const domain = getLogoDomain(symbol);
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
  className?: string;
};

export function StockLogo({ symbol, size = 32, status, className }: Props) {
  const [srcLevel, setSrcLevel] = useState(0);
  const logoUrl = getLogoUrl(symbol);
  const fallbackUrl = getFallbackLogoUrl(symbol);
  const initials = symbol.replace(/\.NS$/, "").replace(/-/g, "").slice(0, 2).toUpperCase();

  const currentSrc = srcLevel === 0 ? logoUrl : srcLevel === 1 ? fallbackUrl : null;

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
      src={currentSrc}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={className}
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
