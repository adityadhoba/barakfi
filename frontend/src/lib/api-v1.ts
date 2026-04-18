/**
 * API v1 client — ISIN-first, provenance-first architecture.
 *
 * Typed client for the new /api/v1/* endpoints.
 * All responses follow the envelope format: { success, data, error }.
 *
 * These endpoints are backed by official NSE/BSE data sources.
 * When a paid data provider is integrated, these types remain stable —
 * the backend will add enrichment without changing the public contract.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const SourceRefSchema = z.object({
  label: z.string(),
  url: z.string().nullable().optional(),
  hash: z.string().nullable().optional(),
});

export const CheckResultSchema = z.object({
  key: z.string(),
  status: z.enum(["pass", "fail", "review_required", "insufficient_data"]),
  value: z.number().nullable().optional(),
  threshold: z.number().nullable().optional(),
  formula: z.string().nullable().optional(),
  reason: z.string(),
  source_refs: z.array(SourceRefSchema).default([]),
  quality_flags: z.array(z.string()).default([]),
});

export const FreshnessSchema = z.object({
  financials_as_of: z.string().nullable().optional(),
  price_as_of: z.string().nullable().optional(),
  stale: z.boolean(),
});

export const BasisSchema = z.object({
  financials_basis: z.string().nullable().optional(),
  financial_snapshot_date: z.string().nullable().optional(),
  market_cap_basis: z.string().nullable().optional(),
  business_activity_basis: z.string().nullable().optional(),
});

export const ExplainabilitySchema = z.object({
  overall_status: z.enum(["pass", "fail", "review_required", "insufficient_data"]),
  short_reason: z.string(),
  detailed_reason: z.string(),
  methodology_version: z.string().nullable().optional(),
  disclosure: z.string().nullable().optional(),
  basis: BasisSchema.nullable().optional(),
  checks: z.array(CheckResultSchema).default([]),
  last_updated: z.string().nullable().optional(),
  freshness: FreshnessSchema.nullable().optional(),
});

export const ScreeningV1Schema = z.object({
  overall_status: z.enum(["pass", "fail", "review_required", "insufficient_data"]),
  short_reason: z.string(),
  detailed_reason: z.string().default(""),
  explainability: ExplainabilitySchema.nullable().optional(),
  last_updated: z.string().nullable().optional(),
  screened_at: z.string().nullable().optional(),
  methodology_version: z.string().nullable().optional(),
  disclosure: z.string().nullable().optional(),
  freshness: FreshnessSchema.nullable().optional(),
});

export const FundamentalsV1Schema = z.object({
  snapshot_date: z.string().nullable().optional(),
  basis: z.string().nullable().optional(),
  total_debt: z.number().nullable().optional(),
  cash_and_equivalents: z.number().nullable().optional(),
  revenue: z.number().nullable().optional(),
  net_income: z.number().nullable().optional(),
  ebitda: z.number().nullable().optional(),
  market_cap: z.number().nullable().optional(),
  shares_outstanding: z.number().nullable().optional(),
  currency: z.string().default("INR"),
  source_refs: z.array(SourceRefSchema).default([]),
  completeness_score: z.number().nullable().optional(),
});

export const PriceV1Schema = z.object({
  close: z.number().nullable().optional(),
  trade_date: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

export const MasterV1Schema = z.object({
  isin: z.string(),
  symbol: z.string().nullable().optional(),
  exchange_code: z.string().nullable().optional(),
  name: z.string(),
  legal_name: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  coverage_universe: z.string().nullable().optional(),
  lifecycle_status: z.string().nullable().optional(),
  bse_scrip_code: z.string().nullable().optional(),
  listing_date: z.string().nullable().optional(),
  listing_status: z.string().nullable().optional(),
});

export const StockDetailV1Schema = z.object({
  master: MasterV1Schema,
  screening: ScreeningV1Schema,
  fundamentals: FundamentalsV1Schema.nullable().optional(),
  price: PriceV1Schema.nullable().optional(),
  provenance_note: z.string().nullable().optional(),
});

export const UniverseItemSchema = MasterV1Schema.extend({
  screening_status: z.enum(["pass", "fail", "review_required", "insufficient_data"]),
  last_screened_at: z.string().nullable().optional(),
});

export const UniverseResponseSchema = z.object({
  items: z.array(UniverseItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  scope: z.string(),
});

export const JobRunSchema = z.object({
  id: z.number(),
  job_name: z.string(),
  status: z.string(),
  started_at: z.string().nullable().optional(),
  finished_at: z.string().nullable().optional(),
  attempt_count: z.number(),
  metrics: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const FreshnessReportSchema = z.object({
  as_of: z.string(),
  universe: z.object({
    total_active_issuers: z.number(),
    screened_today: z.number(),
    stale_screening: z.number(),
    missing_fundamentals: z.number(),
  }),
  job_health: z.array(
    z.object({
      job_name: z.string(),
      last_success: z.string().nullable().optional(),
      total_runs: z.number(),
    })
  ),
  recent_failures: z.array(
    z.object({
      job_name: z.string(),
      status: z.string(),
      started_at: z.string().nullable().optional(),
      error: z.record(z.string(), z.unknown()).nullable().optional(),
    })
  ),
});

// ---------------------------------------------------------------------------
// TypeScript inferred types
// ---------------------------------------------------------------------------

export type SourceRef = z.infer<typeof SourceRefSchema>;
export type CheckResult = z.infer<typeof CheckResultSchema>;
export type Freshness = z.infer<typeof FreshnessSchema>;
export type Basis = z.infer<typeof BasisSchema>;
export type Explainability = z.infer<typeof ExplainabilitySchema>;
export type ScreeningV1 = z.infer<typeof ScreeningV1Schema>;
export type FundamentalsV1 = z.infer<typeof FundamentalsV1Schema>;
export type PriceV1 = z.infer<typeof PriceV1Schema>;
export type MasterV1 = z.infer<typeof MasterV1Schema>;
export type StockDetailV1 = z.infer<typeof StockDetailV1Schema>;
export type UniverseItem = z.infer<typeof UniverseItemSchema>;
export type UniverseResponse = z.infer<typeof UniverseResponseSchema>;
export type JobRun = z.infer<typeof JobRunSchema>;
export type FreshnessReport = z.infer<typeof FreshnessReportSchema>;

export type ScreeningStatus = "pass" | "fail" | "review_required" | "insufficient_data";

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? "" : "http://127.0.0.1:8001/api");

async function fetchV1<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const base = API_BASE.replace(/\/api\/?$/, "");
  const url = `${base}/api/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API v1 error ${res.status}: ${text}`);
  }

  const envelope = await res.json();
  if (!envelope.success) {
    throw new Error(envelope.error || "API v1 returned success=false");
  }
  return envelope.data as T;
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export async function fetchUniverseV1(
  scope = "nifty500",
  page = 1,
  pageSize = 50
): Promise<UniverseResponse> {
  const data = await fetchV1<unknown>(
    `/universe?scope=${scope}&page=${page}&page_size=${pageSize}`
  );
  return UniverseResponseSchema.parse(data);
}

export async function fetchStockDetailV1(
  exchange: string,
  symbol: string
): Promise<StockDetailV1> {
  const data = await fetchV1<unknown>(`/stocks/${exchange.toUpperCase()}/${symbol.toUpperCase()}`);
  return StockDetailV1Schema.parse(data);
}

export async function fetchStockHistoryV1(
  exchange: string,
  symbol: string,
  days = 30
): Promise<{
  symbol: string;
  exchange: string;
  isin: string;
  screening_history: Array<{
    screened_at: string;
    overall_status: ScreeningStatus;
    short_reason: string;
    methodology_version: string | null;
  }>;
  price_history: Array<{
    trade_date: string;
    close: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
    source: string;
  }>;
}> {
  return fetchV1(`/stocks/${exchange.toUpperCase()}/${symbol.toUpperCase()}/history?days=${days}`);
}

export async function fetchFreshnessV1(
  serviceToken: string
): Promise<FreshnessReport> {
  const data = await fetchV1<unknown>("/admin/freshness", {
    headers: { "X-Service-Token": serviceToken },
  });
  return FreshnessReportSchema.parse(data);
}

export async function fetchJobRunsV1(
  serviceToken: string,
  jobName?: string,
  status?: string
): Promise<JobRun[]> {
  const params = new URLSearchParams();
  if (jobName) params.set("job_name", jobName);
  if (status) params.set("status", status);
  const data = await fetchV1<unknown[]>(`/admin/job-runs?${params.toString()}`, {
    headers: { "X-Service-Token": serviceToken },
  });
  return z.array(JobRunSchema).parse(data);
}
