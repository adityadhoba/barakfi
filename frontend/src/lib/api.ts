import { buildBackendHeaders, type BackendActor } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, unwrapBackendEnvelope } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

/**
 * Structured API error with status code and server detail.
 * Use this to show meaningful error messages in the UI.
 */
export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string, endpoint: string) {
    super(`API ${status}: ${detail} (${endpoint})`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object") {
      const o = body as Record<string, unknown>;
      if (o.error && typeof o.error === "object" && "message" in o.error) {
        const m = (o.error as { message?: string }).message;
        if (typeof m === "string" && m.length > 0) return m;
      }
      if ("detail" in o) {
        const d = o.detail;
        if (typeof d === "string") return d;
        if (d != null && typeof d === "object") return JSON.stringify(d);
      }
    }
    return response.statusText;
  } catch {
    return response.statusText;
  }
}

export type Dashboard = {
  owner_name: string;
  portfolio_count: number;
  watchlist_count: number;
  holding_count: number;
  portfolio_market_value: number;
  halal_holdings: number;
  non_compliant_holdings: number;
  requires_review_holdings: number;
  default_profile: string;
};

export type User = {
  id: number;
  email: string;
  display_name: string;
  auth_provider: string;
  auth_subject: string;
  is_active: boolean;
  settings?: {
    preferred_currency: string;
    risk_profile: string;
    notifications_enabled: boolean;
    theme: string;
  } | null;
};

export type EquityQuote = {
  symbol: string;
  exchange: string;
  last_price: number;
  previous_close: number | null;
  change: number | null;
  change_percent: number | null;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  source: string;
  as_of: string;
  disclaimer: string;
  currency?: string;
};

export type Stock = {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  market_cap: number;
  average_market_cap_36m: number;
  debt: number;
  revenue: number;
  total_business_income: number;
  interest_income: number;
  non_permissible_income: number;
  accounts_receivable: number;
  cash_and_equivalents: number;
  short_term_investments: number;
  fixed_assets: number;
  total_assets: number;
  price: number;
  currency: string;
  country: string;
  data_source: string;
  is_active: boolean;
  symbol_status?: string;
  canonical_symbol?: string | null;
  successor_symbol?: string | null;
  screening_blocked_reason?: string | null;
  latest_corporate_event?: {
    event_type: "merge" | "demerge" | "delisted" | "renamed" | "acquired";
    label: string;
    effective_date?: string | null;
    symbol: string;
    successor_symbol?: string | null;
    source?: string | null;
  } | null;
  /** When balance-sheet / income fundamentals were last written (ISO 8601), if known */
  fundamentals_updated_at?: string | null;
  beta?: number | null;
  dividend_yield?: number | null;
  pe_ratio?: number | null;
  eps?: number | null;
  week_52_high?: number | null;
  week_52_low?: number | null;
  avg_volume?: number | null;
  price_change_pct?: number | null;
  compliance_rating?: number | null;
  exchange_code?: string | null;
  is_etf?: boolean;
  index_memberships?: string[];
  /** API-computed fundamentals completeness hint */
  data_quality?: "high" | "medium" | "low" | null;
  /** Field keys that were zero or missing when computing screening ratios */
  fundamentals_fields_missing?: string[];
};

export type Holding = {
  id: number;
  quantity: number;
  average_buy_price: number;
  target_allocation_pct: number;
  thesis: string;
  stock: {
    symbol: string;
    name: string;
    price: number;
    sector: string;
    exchange?: string;
    currency?: string;
  };
};

export type Portfolio = {
  id: number;
  owner_name: string;
  name: string;
  base_currency: string;
  investment_objective: string;
  holdings: Holding[];
};

export type WatchlistEntry = {
  id: number;
  owner_name: string;
  notes: string;
  /** Latest research note line for this symbol (from GET /me/watchlist). */
  latest_research_summary?: string;
  stock: {
    symbol: string;
    name: string;
    price: number;
    sector: string;
    exchange?: string;
    currency?: string;
    country?: string;
  };
};

export type SavedScreener = {
  id: number;
  name: string;
  search_query: string;
  sector: string;
  status_filter: string;
  halal_only: boolean;
  notes: string;
  created_at: string;
};

export type ResearchNote = {
  id: number;
  note_type: string;
  summary: string;
  conviction: string;
  status_snapshot: string;
  notes: string;
  created_at: string;
  stock: {
    symbol: string;
    name: string;
    price: number;
    sector: string;
    exchange?: string;
    currency?: string;
  };
};

export type ComplianceCheck = {
  symbol: string;
  name: string;
  current_weight_pct: number;
  target_weight_pct: number;
  drift_pct: number;
  action: string;
  note: string;
};

export type Rulebook = {
  default_profile: string;
  profiles: Array<{
    code: string;
    label: string;
    description: string;
    hard_rules: string[];
    review_rules: string[];
    secondary_verification: string[];
  }>;
};

export type ConfidenceBulletTone = "success" | "warning" | "error";

export type ConfidenceBullet = {
  tone: ConfidenceBulletTone;
  text: string;
};

export type ScreeningResult = {
  symbol: string;
  name: string;
  profile: string;
  status: string;
  reasons: string[];
  manual_review_flags: string[];
  /** 0–100 methodology score from engine */
  screening_score: number;
  purification_ratio_pct: number | null;
  active_review_case: PublicReviewCase | null;
  recent_review_cases: PublicReviewCase[];
  breakdown: {
    debt_to_market_cap_ratio: number;
    debt_to_36m_avg_market_cap_ratio: number;
    interest_income_ratio: number;
    non_permissible_income_ratio: number;
    receivables_to_market_cap_ratio: number;
    cash_and_interest_bearing_to_assets_ratio: number;
    fixed_assets_to_total_assets_ratio: number | null;
    sector_allowed: boolean;
    debt_ratio_value?: number;
    debt_ratio_threshold?: number;
    receivables_ratio_value?: number;
    receivables_ratio_threshold?: number;
    cash_ib_ratio_threshold?: number;
  };
  confidence_bullets?: ConfidenceBullet[];
};

/** GET /api/check-stock — product-level halal check */
export type CheckStockResponse = {
  name: string;
  status: "Halal" | "Doubtful" | "Haram" | string;
  score: number;
  summary: string;
  details_available: boolean;
};

export type ScreeningLog = {
  id: number;
  profile_code: string;
  rule_version: string;
  status: string;
  triggered_reasons: string;
  manual_review_flags: string;
  stock: {
    symbol: string;
    name: string;
    price: number;
    sector: string;
    exchange?: string;
    currency?: string;
  };
};

export type AuthStrategy = {
  provider: string;
  google_enabled: boolean;
  backend_ready: boolean;
  frontend_ready: boolean;
  clerk_js_ready: boolean;
  notes: string[];
};

export type MarketDataStatus = {
  provider: string;
  provider_label: string;
  configured: boolean;
  is_live: boolean;
  mode: string;
  stock_count: number;
  universe_source: string;
  quote_source: string;
  capabilities: string[];
  blockers: string[];
  notes: string[];
};

export type FundamentalsStatus = {
  provider: string;
  provider_label: string;
  configured: boolean;
  is_live: boolean;
  mode: string;
  stock_count: number;
  statement_source: string;
  screening_readiness: string;
  capabilities: string[];
  blockers: string[];
  notes: string[];
  latest_fundamentals_updated_at: string | null;
  rows_with_timestamp: number;
  rows_missing_timestamp: number;
  stale: boolean;
  staleness_hours: number | null;
};

export type FundamentalsFreshnessSummary = {
  latest_fundamentals_updated_at: string | null;
  rows_with_timestamp: number;
  rows_missing_timestamp: number;
  stale: boolean;
  staleness_hours: number | null;
};

export type DataStackStatus = {
  market_data: MarketDataStatus;
  fundamentals: FundamentalsStatus;
  fundamentals_freshness: FundamentalsFreshnessSummary;
  ready_for_scaled_screening: boolean;
  readiness_gaps: string[];
};

export type Alert = {
  level: string;
  title: string;
  message: string;
};

export type ActivityEvent = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  created_at: string;
  level: string;
  symbol: string | null;
};


export type ComplianceQueueItem = {
  symbol: string;
  name: string;
  current_status: string;
  reason: string;
  action_required: string;
};

export type ComplianceOverride = {
  id: number;
  decided_status: string;
  rationale: string;
  decided_by: string;
  created_at: string;
  stock: {
    symbol: string;
    name: string;
    price: number;
    sector: string;
    exchange?: string;
    currency?: string;
  };
};


export type ComplianceReviewEvent = {
  id: number;
  action: string;
  note: string;
  actor: string;
  created_at: string;
};

export type PublicReviewCase = {
  id: number;
  assigned_to: string | null;
  status: string;
  priority: string;
  review_outcome: string | null;
  summary: string;
  latest_action: string | null;
  latest_note: string | null;
  updated_at: string;
  stock: {
    symbol: string;
    name: string;
    price: number;
    sector: string;
    exchange?: string;
    currency?: string;
  };
};

export type ComplianceReviewCase = {
  id: number;
  requested_by: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  review_outcome: string | null;
  summary: string;
  notes: string;
  created_at: string;
  updated_at: string;
  stock: {
    symbol: string;
    name: string;
    price: number;
    sector: string;
  };
  events: ComplianceReviewEvent[];
};

export type GovernanceOverview = {
  rule_versions: Array<{
    id: number;
    profile_code: string;
    version: string;
    status: string;
    approved_by: string | null;
    notes: string;
    effective_from: string;
    source_summary: string;
    created_at: string;
  }>;
  overrides: ComplianceOverride[];
  support_notes: Array<{
    id: number;
    note: string;
    created_by: string;
    created_at: string;
    user: User;
  }>;
  users: User[];
  feature_flags: Array<{
    id: number;
    code: string;
    name: string;
    description: string;
    enabled: boolean;
    rollout_stage: string;
    notes: string;
    updated_by: string | null;
    updated_at: string;
  }>;
  review_cases: ComplianceReviewCase[];
  review_events: ComplianceReviewEvent[];
};

export type NormalizedInstrument = {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  instrument_type: string;
  provider_key: string;
  currency: string;
  price_hint: number;
  data_source: string;
  import_readiness: string;
};

export type UniversePreview = {
  provider: string;
  provider_label: string;
  configured: boolean;
  source_type: string;
  dry_run_only: boolean;
  total_candidates: number;
  import_candidates: number;
  blockers: string[];
  notes: string[];
  instruments: NormalizedInstrument[];
};

export type WorkspaceBundle = {
  user: User;
  dashboard: Dashboard;
  portfolios: Portfolio[];
  watchlist: WatchlistEntry[];
  saved_screeners: SavedScreener[];
  research_notes: ResearchNote[];
  compliance_check: ComplianceCheck[];
  activity_feed: ActivityEvent[];
  review_cases: PublicReviewCase[];
};

/**
 * Generic API fetch wrapper with ISR caching and fallback support.
 * Used internally by all public API functions below.
 *
 * @template T The expected response type
 * @param path The API endpoint path (e.g., "/stocks", "/screen/INFY")
 * @param fallback Default value if request fails or returns non-200
 * @returns Parsed response or fallback value
 *
 * @internal
 */
type ApiFetchOptions = {
  revalidateSeconds?: number;
};

async function apiFetch<T>(path: string, fallback: T, options: ApiFetchOptions = {}): Promise<T> {
  // Render free tier cold starts can take 30-50s — use AbortController with generous timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const fetchInit: RequestInit & { next?: { revalidate: number } } = {
      signal: controller.signal,
    };
    if (typeof options.revalidateSeconds === "number") {
      fetchInit.next = { revalidate: options.revalidateSeconds };
    } else {
      fetchInit.cache = "no-store";
    }
    const response = await fetch(`${apiBaseUrl}${path}`, fetchInit);

    if (!response.ok) {
      const detail = await parseErrorDetail(response);
      console.error(`[api] ${response.status} on GET ${path}: ${detail}`);
      return fallback;
    }

    return unwrapBackendEnvelope<T>(await response.json());
  } catch (err) {
    console.error(`[api] Network error on GET ${path}:`, err);
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch all active stocks with their fundamental data.
 * Cached for 30 seconds to reduce backend load.
 *
 * @returns Array of all halal-eligible stocks (typically 50-500 depending on universe)
 * @example
 * const stocks = await getStocks();
 * stocks.forEach(s => console.log(s.symbol, s.sector));
 */
export type GetStocksOptions = {
  limit?: number;
  orderBy?: "symbol" | "market_cap_desc";
  revalidateSeconds?: number;
};

export function getStocks(options: GetStocksOptions = {}) {
  const params = new URLSearchParams();
  if (typeof options.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (options.orderBy) {
    params.set("order_by", options.orderBy);
  }
  const query = params.toString();
  const path = query ? `/stocks?${query}` : "/stocks";
  return apiFetch<Stock[]>(path, [], {
    revalidateSeconds: options.revalidateSeconds,
  });
}

/**
 * Fetch a single stock's fundamental data by symbol.
 * Includes balance sheet, income statement, market cap, etc.
 *
 * @param symbol Stock symbol (e.g., "INFY", "TCS") - case-insensitive
 * @returns Stock object with fundamentals, or null if not found
 * @example
 * const stock = await getStock("INFY");
 * if (stock) {
 *   console.log(stock.name, stock.debt, stock.market_cap);
 * }
 */
export function getStock(symbol: string) {
  return apiFetch<Stock | null>(`/stocks/${encodeURIComponent(symbol)}`, null);
}

export type IndexQuote = {
  name: string;
  value: number;
  change: number;
  change_percent: number;
  source: string;
  as_of: string;
};

/**
 * Fetch live NSE index values (NIFTY 50, BANK NIFTY, SENSEX, NIFTY MIDCAP 150).
 * Cached for 2 minutes as NSE updates indices every 15 minutes.
 *
 * @returns Array of index snapshots with current value and change %
 * @example
 * const indices = await getMarketIndices();
 * const nifty = indices.find(i => i.name === "NIFTY 50");
 * console.log(`NIFTY 50: ${nifty.value} (${nifty.change_percent}%)`);
 */
export async function getMarketIndices(): Promise<IndexQuote[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/market-data/indices`, {
      next: { revalidate: 120 },
    });
    if (!response.ok) return [];
    return unwrapBackendEnvelope<IndexQuote[]>(await response.json());
  } catch {
    return [];
  }
}

/**
 * Fetch a live equity quote (price snapshot) from NSE or Yahoo Finance.
 * Does NOT update the database; for real-time charts and quick price checks.
 * Uses public APIs with ~15 minute delay (NSE is official, Yahoo is fallback).
 *
 * @param symbol Stock symbol (e.g., "INFY")
 * @param provider Quote source: "nse_public" (official NSE), "yahoo_india" (fallback), or "auto_india" (try NSE first)
 * @returns Current price snapshot with day's high/low, 52-week range, volume; or null if unavailable
 * @example
 * const quote = await getEquityQuote("INFY", "auto_india");
 * if (quote) {
 *   console.log(`INFY: ₹${quote.last_price} (${quote.change_percent}%)`);
 *   console.log(`Day: ${quote.day_low} - ${quote.day_high}`);
 * }
 */
export async function getEquityQuote(
  symbol: string,
  provider:
    | "nse_public"
    | "yahoo_india"
    | "auto_india"
    | "yahoo_global"
    | "auto_global" = "auto_india",
  exchange?: string,
): Promise<EquityQuote | null> {
  try {
    const q = new URLSearchParams({ provider });
    if (exchange) q.set("exchange", exchange);
    const response = await fetch(
      `${apiBaseUrl}/market-data/quote/${encodeURIComponent(symbol)}?${q.toString()}`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return null;
    return unwrapBackendEnvelope<EquityQuote>(await response.json());
  } catch {
    return null;
  }
}

/**
 * Fetch the active Shariah compliance rulebook and available screening profiles.
 * Profiles define hard rules (automatic FAIL) and review rules (flag for manual override).
 * Cached for 30 seconds as rulebooks rarely change.
 *
 * @returns Rulebook with default profile and all available profiles (india_strict, india_moderate, etc.)
 * @example
 * const rulebook = await getRulebook();
 * console.log(`Default profile: ${rulebook.default_profile}`);
 * rulebook.profiles.forEach(p => console.log(`- ${p.label}: ${p.description}`));
 */
export function getRulebook() {
  return apiFetch<Rulebook>("/rulebook", {
    default_profile: "india_strict",
    profiles: [
      {
        code: "india_strict",
        label: "India Strict",
        description:
          "Strict Shariah screening profile anchored to your current rulebook and built for explainability.",
        hard_rules: ["Sector exclusions", "Debt cap", "Non-permissible income cap"],
        review_rules: ["Manual scholar review where source precision is limited"],
        secondary_verification: ["Cross-check with approved methodology before user-facing claims"],
      },
    ],
  });
}

/**
 * Fetch the audit log of all screening runs across all stocks.
 * Used for compliance and transparency (admin/governance view).
 * Cached for 30 seconds.
 *
 * @returns Array of screening log entries with stock symbol, profile, status, triggered rules
 */
export function getScreeningLogs() {
  return apiFetch<ScreeningLog[]>("/screening-logs", []);
}

/**
 * Evaluate a single stock's Shariah compliance against the active rulebook.
 * Returns detailed breakdown of debt ratios, income checks, sector screening, etc.
 * Cached for 30 seconds.
 *
 * @param symbol Stock symbol (e.g., "INFY")
 * @returns Screening result with status (PASS, FAIL, REVIEW), reasons, and financial breakdown; or null if stock not found
 * @example
 * const result = await getScreeningResult("INFY");
 * if (result) {
 *   console.log(`${result.symbol}: ${result.status}`);
 *   result.reasons.forEach(r => console.log(`  - ${r}`));
 * }
 */
export function getScreeningResult(symbol: string) {
  return apiFetch<ScreeningResult | null>(`/screen/${encodeURIComponent(symbol)}`, null);
}

export type MultiMethodologyResult = {
  symbol: string;
  name: string;
  consensus_status: string;
  screening_score: number;
  methodologies: Record<string, ScreeningResult>;
  summary: {
    halal_count: number;
    cautious_count: number;
    non_compliant_count: number;
    total: number;
  };
  confidence_bullets?: ConfidenceBullet[];
};

export function getMultiScreeningResult(symbol: string) {
  return apiFetch<MultiMethodologyResult | null>(`/screen/${encodeURIComponent(symbol)}/multi`, null);
}

export type ManualScreenResult = {
  symbol: string;
  name: string;
  is_prescreened: boolean;
  screening: ScreeningResult;
  multi: MultiMethodologyResult;
};

export async function manualScreenStock(symbol: string): Promise<ManualScreenResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${apiBaseUrl}/screen/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return unwrapBackendEnvelope<ManualScreenResult>(await response.json());
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Batch evaluate multiple stocks for Shariah compliance (much faster than N individual requests).
 * Evaluation runs in parallel on backend. Useful for screening 100+ stocks.
 * Cached for 30 seconds.
 *
 * @param symbols Array of stock symbols to screen (e.g., ["INFY", "TCS", "WIPRO"])
 * @returns Array of screening results in same order as input, or empty array if request fails
 * @example
 * const results = await getBulkScreeningResults(["INFY", "TCS", "WIPRO"]);
 * const halalStocks = results.filter(r => r.status === "PASS");
 * console.log(`${halalStocks.length} of ${results.length} stocks are HALAL`);
 */
export async function getBulkScreeningResults(symbols: string[]): Promise<ScreeningResult[]> {
  if (symbols.length === 0) return [];

  // Chunk into batches of 500 to stay within backend limits
  const CHUNK_SIZE = 500;
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
    chunks.push(symbols.slice(i, i + CHUNK_SIZE));
  }

  try {
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await fetch(`${apiBaseUrl}/screen/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunk),
          next: { revalidate: 60 },
        });
        if (!response.ok) return [];
        return unwrapBackendEnvelope<ScreeningResult[]>(await response.json());
      })
    );
    return results.flat();
  } catch {
    return [];
  }
}

/**
 * Compare Stocks page only: uses POST /compare/bulk (counts against daily compare quota).
 * Pass Clerk actor headers from a Server Component so quota applies per user/IP.
 */
export async function getCompareScreeningResults(
  symbols: string[],
  quotaHeaders?: HeadersInit,
): Promise<{ results: ScreeningResult[]; compareLimitReached: boolean }> {
  const sliced = symbols
    .slice(0, 3)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (sliced.length === 0) {
    return { results: [], compareLimitReached: false };
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  if (quotaHeaders) {
    new Headers(quotaHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/compare/bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify(sliced),
      cache: "no-store",
    });
    if (response.status === 429) {
      return { results: [], compareLimitReached: true };
    }
    if (!response.ok) {
      return { results: [], compareLimitReached: false };
    }
    const body: unknown = await response.json();
    const data = unwrapBackendEnvelope<ScreeningResult[]>(body);
    return {
      results: Array.isArray(data) ? data : [],
      compareLimitReached: false,
    };
  } catch {
    return { results: [], compareLimitReached: false };
  }
}

/**
 * Get authentication provider strategy and readiness status.
 * Used by home page to detect if Clerk is properly configured.
 * Cached for 30 seconds.
 *
 * @returns Authentication strategy with provider name (clerk), enabled features (google OAuth), and readiness flags
 */
export function getAuthStrategy() {
  return apiFetch<AuthStrategy>("/auth/strategy", {
    provider: "clerk",
    google_enabled: false,
    backend_ready: false,
    frontend_ready: false,
    clerk_js_ready: false,
    notes: [],
  });
}

/**
 * Get market data and fundamentals provider status (NSE, Groww, Upstox, seed data).
 * Shows which providers are configured, live, and their stock/statement coverage.
 * Used by admin dashboard to assess data quality readiness.
 * Cached for 30 seconds.
 *
 * @returns Data stack status with market data provider details, fundamentals source, and readiness assessment
 * @example
 * const status = await getDataStackStatus();
 * if (status.ready_for_scaled_screening) {
 *   console.log("Ready to screen production universe");
 * } else {
 *   console.log("Gaps:", status.readiness_gaps);
 * }
 */
export function getDataStackStatus() {
  return apiFetch<DataStackStatus>("/data-stack/status", {
    market_data: {
      provider: "seed",
      provider_label: "Seed dataset",
      configured: true,
      is_live: false,
      mode: "seed",
      stock_count: 0,
      universe_source: "database",
      quote_source: "seed_database",
      capabilities: ["demo universe", "local quote data"],
      blockers: [],
      notes: [],
    },
    fundamentals: {
      provider: "seed",
      provider_label: "Seed fundamentals",
      configured: true,
      is_live: false,
      mode: "seed",
      stock_count: 0,
      statement_source: "seed_database",
      screening_readiness: "limited_seed_readiness",
      capabilities: ["demo balance-sheet fields", "demo income fields"],
      blockers: [],
      notes: [],
      latest_fundamentals_updated_at: null,
      rows_with_timestamp: 0,
      rows_missing_timestamp: 0,
      stale: false,
      staleness_hours: null,
    },
    fundamentals_freshness: {
      latest_fundamentals_updated_at: null,
      rows_with_timestamp: 0,
      rows_missing_timestamp: 0,
      stale: false,
      staleness_hours: null,
    },
    ready_for_scaled_screening: false,
    readiness_gaps: [],
  });
}

/**
 * Get a user's complete workspace bundle (portfolios, watchlist, activity, compliance items).
 * Does NOT require authentication token - used for public user profiles.
 * Cached for 30 seconds (not personalized data).
 *
 * @param authSubject User's auth subject (Clerk user ID, e.g., "user_abc123xyz")
 * @returns Complete workspace with portfolios, holdings, watchlist, saved screeners, activity feed, review cases
 */
export async function getWorkspace(authSubject: string) {
  return apiFetch<WorkspaceBundle>(`/users/${encodeURIComponent(authSubject)}/workspace`, {
    user: {
      id: 0,
      email: "",
      display_name: "Investor",
      auth_provider: "clerk",
      auth_subject: authSubject,
      is_active: true,
      settings: null,
    },
    dashboard: {
      owner_name: "investor",
      portfolio_count: 1,
      watchlist_count: 2,
      holding_count: 0,
      portfolio_market_value: 0,
      halal_holdings: 0,
      non_compliant_holdings: 0,
      requires_review_holdings: 0,
      default_profile: "india_strict",
    },
    portfolios: [],
    watchlist: [],
    saved_screeners: [],
    research_notes: [],
    compliance_check: [],
    activity_feed: [],
    review_cases: [],
  });
}

/**
 * Get a user's profile by auth subject (public endpoint).
 * Does NOT require authentication token.
 * Cached for 30 seconds.
 *
 * @param authSubject User's auth subject (Clerk user ID)
 * @returns User profile with email, display name, auth provider, and settings (theme, currency, etc.)
 */
export async function getUserBySubject(authSubject: string) {
  return apiFetch<User>(`/users/${encodeURIComponent(authSubject)}`, {
    id: 0,
    email: "",
    display_name: "Investor",
    auth_provider: "clerk",
    auth_subject: authSubject,
    is_active: true,
    settings: null,
  });
}

/**
 * Get the authenticated user's complete workspace (portfolios, watchlist, screeners, compliance).
 * Requires valid Clerk JWT token. Not cached (cache: "no-store").
 * Call this on user login / dashboard load to fetch personalized data.
 *
 * @param token Clerk JWT token from useAuth().getToken()
 * @param actor Optional actor override for admin impersonation (requires admin token)
 * @returns User's complete workspace with all portfolio data, watchlist, activity, review cases
 * @throws Error if token is invalid or user not found
 * @example
 * const { getToken } = useAuth();
 * const token = await getToken();
 * const workspace = await getAuthenticatedWorkspace(token);
 * console.log(`Found ${workspace.portfolios.length} portfolios`);
 */
export async function getAuthenticatedWorkspace(token: string, actor?: BackendActor | null) {
  const response = await fetch(`${apiBaseUrl}/me/workspace`, {
    headers: buildBackendHeaders({ token, actor }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(response.status, detail, "/me/workspace");
  }

  return unwrapBackendEnvelope<WorkspaceBundle>(await response.json());
}

/**
 * Get the authenticated user's profile with settings (theme, currency, risk profile).
 * Requires valid Clerk JWT token. Not cached (cache: "no-store").
 *
 * @param token Clerk JWT token from useAuth().getToken()
 * @param actor Optional actor override for admin impersonation
 * @returns User object with email, display_name, auth_provider, settings
 * @throws Error if token is invalid or user not found
 */
export async function getAuthenticatedUser(token: string, actor?: BackendActor | null) {
  const response = await fetch(`${apiBaseUrl}/me`, {
    headers: buildBackendHeaders({ token, actor }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(response.status, detail, "/me");
  }

  return unwrapBackendEnvelope<User>(await response.json());
}

/**
 * Get alerts for the authenticated user (price changes, compliance flags, subscription alerts).
 * Not cached. Used by dashboard to show real-time alerts.
 *
 * @param token Clerk JWT token
 * @param actor Optional actor override for admin
 * @returns Array of alerts with level (INFO, WARNING, ERROR) and messages
 * @throws Error if token invalid
 */
export async function getAuthenticatedAlerts(token: string, actor?: BackendActor | null) {
  const response = await fetch(`${apiBaseUrl}/me/alerts`, {
    headers: buildBackendHeaders({ token, actor }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(response.status, detail, "/me/alerts");
  }

  return unwrapBackendEnvelope<Alert[]>(await response.json());
}

/**
 * Get user's activity feed (portfolio updates, screening results, compliance reviews).
 * Not cached. Shows recent events and actions.
 *
 * @param token Clerk JWT token
 * @param actor Optional actor override for admin
 * @returns Array of activity events with kind (portfolio_updated, stock_screened, etc.), title, detail, timestamp
 * @throws Error if token invalid
 */
export async function getAuthenticatedActivityFeed(token: string, actor?: BackendActor | null) {
  const response = await fetch(`${apiBaseUrl}/me/activity-feed`, {
    headers: buildBackendHeaders({ token, actor }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(response.status, detail, "/me/activity-feed");
  }

  return unwrapBackendEnvelope<ActivityEvent[]>(await response.json());
}

/**
 * Get the user's compliance review queue (stocks pending manual review).
 * Stocks appear here if they fail automated screening but may be halal on closer inspection.
 * Not cached. Requires "manual_review" entitlement (premium feature).
 *
 * @param token Clerk JWT token
 * @param actor Optional actor override for admin
 * @returns Array of compliance queue items with stock, current status, reason for review, action required
 * @throws Error if token invalid or user lacks "manual_review" entitlement (403)
 * @example
 * const queue = await getAuthenticatedComplianceQueue(token);
 * queue.forEach(item => {
 *   console.log(`${item.symbol}: ${item.current_status} - Action: ${item.action_required}`);
 * });
 */
export async function getAuthenticatedComplianceQueue(token: string, actor?: BackendActor | null) {
  const response = await fetch(`${apiBaseUrl}/me/compliance-queue`, {
    headers: buildBackendHeaders({ token, actor }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(response.status, detail, "/me/compliance-queue");
  }

  return unwrapBackendEnvelope<ComplianceQueueItem[]>(await response.json());
}

/**
 * Get complete governance overview (admin-only endpoint).
 * Shows all rule versions, overrides, users, subscriptions, feature flags, and review cases.
 * Used by governance dashboard for compliance auditing and rule management.
 * Not cached. Requires admin authentication.
 *
 * @param token Admin's Clerk JWT token
 * @param actor Optional actor override (very rare)
 * @returns Governance overview with all regulatory artifacts, user data, review cases, and feature controls
 * @throws Error if token invalid or user is not admin (403)
 */
export async function getAuthenticatedGovernanceOverview(token: string, actor?: BackendActor | null) {
  const response = await fetch(`${apiBaseUrl}/admin/governance/overview`, {
    headers: buildBackendHeaders({ token, actor }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(response.status, detail, "/admin/governance/overview");
  }

  return unwrapBackendEnvelope<GovernanceOverview>(await response.json());
}

/**
 * Get a preview of stock universe from a market data provider (NSE, Groww, Upstox).
 * Shows which stocks can be imported and their import readiness.
 * Admin-only endpoint. Not cached. Used by admin data stack management page.
 *
 * @param token Admin's Clerk JWT token
 * @param provider Data provider ("nse", "groww", "upstox") - defaults to "groww"
 * @param limit Max instruments to preview (defaults to 8 for quick scan)
 * @param actor Optional actor override
 * @returns Universe preview with provider config, import candidates, blockers, and sample instruments
 * @throws Error if token invalid or user not admin (403)
 */
export async function getAuthenticatedUniversePreview(
  token: string,
  provider = "groww",
  limit = 8,
  actor?: BackendActor | null,
) {
  const response = await fetch(
    `${apiBaseUrl}/admin/data-stack/universe-preview?provider=${encodeURIComponent(provider)}&limit=${limit}`,
    {
      headers: buildBackendHeaders({ token, actor }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(response.status, detail, "/admin/data-stack/universe-preview");
  }

  return unwrapBackendEnvelope<UniversePreview>(await response.json());
}

/**
 * Get the authenticated user's watchlist (stocks they're tracking).
 * Not cached. Watchlist entries include user notes for each stock.
 *
 * @param token Clerk JWT token
 * @param actor Optional actor override for admin
 * @returns Array of watchlist entries with stock details and user notes
 * @throws Error if token invalid
 * @example
 * const watchlist = await getAuthenticatedWatchlist(token);
 * watchlist.forEach(entry => {
 *   console.log(`${entry.stock.symbol}: ${entry.notes}`);
 * });
 */
export async function getAuthenticatedWatchlist(token: string, actor?: BackendActor | null) {
  const response = await fetch(`${apiBaseUrl}/me/watchlist`, {
    headers: buildBackendHeaders({ token, actor }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(response.status, detail, "/me/watchlist");
  }

  return unwrapBackendEnvelope<WatchlistEntry[]>(await response.json());
}

/**
 * Initialize a new user on first login (bootstrap user record in backend).
 * Call this once per user to create their database record linked to Clerk auth.
 * Not cached. Should be called from Clerk webhook or first login handler.
 *
 * @param token Clerk JWT token from new user
 * @param payload User info from Clerk (email, displayName, authProvider, authSubject)
 * @param actor Optional actor override (rare, should be null for new users)
 * @returns Created User object with id assigned
 * @throws Error if user already exists or token invalid
 * @example
 * const { user } = useUser();
 * const { getToken } = useAuth();
 * if (user && isNewUser) {
 *   const token = await getToken();
 *   const backendUser = await bootstrapAuthenticatedUser(token, {
 *     email: user.primaryEmailAddress?.emailAddress || "",
 *     displayName: user.firstName || "User",
 *     authProvider: "clerk",
 *     authSubject: user.id,
 *   });
 *   console.log("Backend user created:", backendUser.id);
 * }
 */
export async function bootstrapAuthenticatedUser(
  token: string,
  payload: {
    email: string;
    displayName: string;
    authProvider: string;
    authSubject: string;
  },
  actor?: BackendActor | null,
) {
  const response = await fetch(`${apiBaseUrl}/me/bootstrap`, {
    method: "POST",
    headers: buildBackendHeaders({ token, actor, contentType: true }),
    body: JSON.stringify({
      email: payload.email,
      display_name: payload.displayName,
      auth_provider: payload.authProvider,
      auth_subject: payload.authSubject,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(response.status, detail, "/me/bootstrap");
  }

  return unwrapBackendEnvelope<User>(await response.json());
}

export type TrendingStock = {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  country: string;
  price: number;
  market_cap: number;
  currency: string;
};

export type Collection = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  stock_count: number;
};

export type CollectionDetail = Collection & {
  stocks: TrendingStock[];
};

export type SuperInvestorSummary = {
  id: number;
  name: string;
  slug: string;
  title: string;
  bio: string;
  country: string;
  investment_style: string;
  image_url: string;
  holding_count: number;
};

export type SuperInvestorDetail = SuperInvestorSummary & {
  holdings: Array<{
    symbol: string;
    name: string;
    sector: string;
    exchange: string;
    price: number;
    market_cap: number;
    weight_pct: number;
  }>;
};

export async function getTrending(category: string = "popular", exchange?: string, limit: number = 20): Promise<TrendingStock[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (exchange) params.set("exchange", exchange);
  return apiFetch(`/trending/${category}?${params}`, []);
}

export async function getCollections(): Promise<Collection[]> {
  return apiFetch("/collections", []);
}

export async function getCollection(slug: string): Promise<CollectionDetail | null> {
  return apiFetch(`/collections/${slug}`, null);
}

export async function getSuperInvestors(): Promise<SuperInvestorSummary[]> {
  return apiFetch("/super-investors", []);
}

export async function getSuperInvestor(slug: string): Promise<SuperInvestorDetail | null> {
  return apiFetch(`/super-investors/${slug}`, null);
}

export type ETFListItem = {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  price: number;
  market_cap: number;
  halal_pct?: number | null;
  status?: string | null;
  holdings_count?: number | null;
};

export type ETFHoldingsRow = {
  symbol: string;
  name: string;
  weight_pct: number | null;
  status: string;
  rating: number | null;
  mapped: boolean;
  underlying_symbol?: string;
  underlying_exchange?: string;
};

export type ETFDetail = {
  symbol: string;
  name: string;
  exchange: string;
  halal_pct: number | null;
  cautious_pct?: number | null;
  non_compliant_pct?: number | null;
  unknown_pct?: number | null;
  total_holdings_checked: number;
  halal_count: number;
  non_compliant_count: number;
  cautious_count: number;
  unknown_count: number;
  status: string;
  holdings: ETFHoldingsRow[];
  holdings_as_of: string | null;
  holdings_source?: string;
  data_note?: string;
};

export async function getETFs(exchange?: string): Promise<ETFListItem[]> {
  const params = exchange ? `?exchange=${encodeURIComponent(exchange)}` : "";
  return apiFetch(`/etfs${params}`, []);
}

export function getETFDetail(symbol: string, exchange?: string) {
  const q = exchange ? `?exchange=${encodeURIComponent(exchange)}` : "";
  return apiFetch<ETFDetail | null>(`/etfs/${encodeURIComponent(symbol)}${q}`, null);
}

export async function getComplianceHistory(symbol: string): Promise<Array<{ status: string; profile_code: string; recorded_at: string }>> {
  return apiFetch(`/compliance-history/${symbol}`, []);
}

export async function getInvestmentMetrics(symbol: string): Promise<Record<string, number>> {
  return apiFetch(`/metrics/${symbol}`, {});
}
