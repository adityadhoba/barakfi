export const INDEX_OPTIONS = [
  { key: "all", label: "All Stocks" },
  { key: "nifty50", label: "NIFTY 50" },
  { key: "nifty100", label: "NIFTY 100" },
  { key: "nifty_midcap100", label: "Nifty Midcap 100" },
  { key: "nifty_smallcap100", label: "Nifty Smallcap 100" },
  { key: "nifty500", label: "NIFTY 500" },
] as const;

export type IndexKey = (typeof INDEX_OPTIONS)[number]["key"];

const NIFTY_50: string[] = [
  "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "HINDUNILVR", "ITC",
  "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "HCLTECH", "AXISBANK", "ASIANPAINT",
  "MARUTI", "SUNPHARMA", "TITAN", "BAJFINANCE", "DMART", "NESTLEIND",
  "ULTRACEMCO", "NTPC", "WIPRO", "ADANIENT", "ADANIPORTS", "POWERGRID",
  "TATAMOTORS", "BAJAJFINSV", "ONGC", "JSWSTEEL", "TECHM", "COALINDIA",
  "M&M", "TATASTEEL", "INDUSINDBK", "HINDALCO", "GRASIM", "CIPLA",
  "BRITANNIA", "DRREDDY", "APOLLOHOSP", "EICHERMOT", "HEROMOTOCO", "DIVISLAB",
  "LTIM", "BAJAJ-AUTO", "TRENT", "SHREECEM", "PIDILITIND", "SOLARINDS",
];

const NIFTY_NEXT_50: string[] = [
  "HAL", "BEL", "IRCTC", "ZOMATO", "TATAPOWER", "INDIGO", "DLF", "GODREJPROP",
  "DABUR", "MARICO", "PERSISTENT", "COFORGE", "TATACONSUM", "COLPAL",
  "MCDOWELL-N", "PEL", "SIEMENS", "ABB", "TORNTPHARM", "AUROPHARMA",
  "LUPIN", "BIOCON", "HAVELLS", "VOLTAS", "INDUSTOWER", "MOTHERSON",
  "PIIND", "NAUKRI", "PAGEIND", "MPHASIS", "HDFCLIFE", "POLYCAB",
  "DEEPAKNTR", "SBILIFE", "IDFCFIRSTB", "BANKBARODA", "PNB", "CANBK",
  "FEDERALBNK", "ICICIPRULI", "LICI", "PGHH", "GODREJIND", "JIOFIN",
  "IRFC", "CHOLAFIN", "SHRIRAMFIN", "JSWENERGY", "TVSMOTOR", "VBL",
];

const NIFTY_MIDCAP_100: string[] = [
  "TATAELXSI", "LTTS", "KPITTECH", "DIXON", "KAYNES",
  "ALKEM", "LAURUSLABS", "IPCALAB", "GLENMARK", "NATCOPHARM",
  "BOSCHLTD", "BHARATFORG", "EXIDEIND", "BALKRISIND",
  "UPL", "SRF", "ATUL", "NAVINFLUOR", "CLEAN",
  "GODREJCP", "BATAINDIA", "EMAMILTD",
  "CUMMINSIND", "THERMAX", "ASTRAL", "APLAPOLLO", "SUPREMEIND",
  "OBEROIRLTY", "PRESTIGE", "BRIGADE", "PHOENIXLTD",
  "TATACOMM", "MAXHEALTH", "FORTIS", "LALPATHLAB",
  "INDIANHOTELS", "JUBLFOOD", "DEVYANI",
  "LICHSGFIN", "MANAPPURAM", "MUTHOOTFIN",
  "CONCOR", "NHPC", "SJVN", "RECLTD", "PFC", "IREDA",
  "SYNGENE", "AJANTPHARM", "GRANULES",
  "CROMPTON", "WHIRLPOOL", "BLUESTARCO",
  "ABCAPITAL", "MFSL", "NIACL", "STARHEALTH",
  "AMBUJACEM", "RAMCOCEM", "JKCEMENT",
  "ASHOKLEY", "ESCORTS", "HINDPETRO", "BPCL", "IOC", "GAIL",
  "VEDL", "NMDC", "NATIONALUM",
  "BANDHANBNK", "AUBANK", "RBLBANK",
  "DALBHARAT", "CENTURYTEX", "KFINTECH", "CAMS",
  "ZYDUSLIFE", "MANKIND", "PATANJALI",
];

const NIFTY_SMALLCAP_100: string[] = [
  "BSOFT", "HAPPSTMNDS", "TANLA", "LATENTVIEW", "MASTEK", "ZENSAR",
  "CUB", "KARURVYSYA", "SOUTHBANK", "TMB", "EQUITASBNK",
  "FINPIPE", "APLLTD", "JBCHEPHARM", "GLAXO", "PFIZER",
  "POWERMECH", "SUZLON", "INOXWIND", "TTML", "IDEA",
  "ADANIGREEN", "ADANIPOWER", "ADANITRANS",
  "GRINFRA",
];

const nifty50Set = new Set(NIFTY_50);
const niftyNext50Set = new Set(NIFTY_NEXT_50);
const nifty100Set = new Set([...NIFTY_50, ...NIFTY_NEXT_50]);
const niftyMidcap100Set = new Set(NIFTY_MIDCAP_100);
const niftySmallcap100Set = new Set(NIFTY_SMALLCAP_100);
const nifty500Set = new Set([...NIFTY_50, ...NIFTY_NEXT_50, ...NIFTY_MIDCAP_100, ...NIFTY_SMALLCAP_100]);

export function getIndexMembership(symbol: string): string[] {
  const indices: string[] = [];
  if (nifty50Set.has(symbol)) indices.push("nifty50");
  if (niftyNext50Set.has(symbol)) indices.push("nifty_next50");
  if (nifty100Set.has(symbol)) indices.push("nifty100");
  if (niftyMidcap100Set.has(symbol)) indices.push("nifty_midcap100");
  if (niftySmallcap100Set.has(symbol)) indices.push("nifty_smallcap100");
  if (nifty500Set.has(symbol)) indices.push("nifty500");
  return indices;
}

/** Maps UI filter keys to API `index_memberships` codes from the backend. */
const API_INDEX_CODE: Record<string, string> = {
  nifty50: "NIFTY_50",
  nifty100: "NIFTY_100",
  nifty_midcap100: "NIFTY_MIDCAP_100",
  nifty_smallcap100: "NIFTY_SMALLCAP_100",
  nifty500: "NIFTY_500",
};

export function matchesIndex(symbol: string, indexKey: string, apiMemberships?: string[]): boolean {
  if (indexKey === "all") return true;
  const code = API_INDEX_CODE[indexKey];
  if (code && apiMemberships && apiMemberships.length > 0) {
    return apiMemberships.includes(code);
  }
  switch (indexKey) {
    case "nifty50": return nifty50Set.has(symbol);
    case "nifty100": return nifty100Set.has(symbol);
    case "nifty_midcap100": return niftyMidcap100Set.has(symbol);
    case "nifty_smallcap100": return niftySmallcap100Set.has(symbol);
    case "nifty500": return nifty500Set.has(symbol);
    default: return true;
  }
}
