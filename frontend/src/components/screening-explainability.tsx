"use client";

/**
 * ScreeningExplainability — detailed breakdown of a halal screening verdict.
 *
 * Displays:
 * - Overall status badge with colour coding
 * - Methodology version + disclosure
 * - Per-check details (value, threshold, reason, source links)
 * - Data freshness indicator
 * - Financial basis (annual_audited, quarterly_reported, etc.)
 * - Data quality flags
 *
 * Design: dark-background fintech card, following the existing site design language.
 */

import React from "react";
import Link from "next/link";
import type {
  Explainability,
  CheckResult,
  SourceRef,
  ScreeningStatus,
} from "@/lib/api-v1";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ScreeningStatus,
  { label: string; className: string; dotClass: string }
> = {
  pass: {
    label: "Halal",
    className:
      "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    dotClass: "bg-emerald-400",
  },
  fail: {
    label: "Non-Halal",
    className: "bg-red-500/15 text-red-400 border border-red-500/30",
    dotClass: "bg-red-400",
  },
  review_required: {
    label: "Review Required",
    className: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    dotClass: "bg-amber-400",
  },
  insufficient_data: {
    label: "Insufficient Data",
    className: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
    dotClass: "bg-zinc-400",
  },
};

export function StatusBadge({
  status,
  size = "md",
}: {
  status: ScreeningStatus;
  size?: "sm" | "md" | "lg";
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.insufficient_data;
  const sizeClass =
    size === "sm"
      ? "text-xs px-2 py-0.5"
      : size === "lg"
      ? "text-base px-4 py-1.5"
      : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Freshness indicator
// ---------------------------------------------------------------------------

export function FreshnessIndicator({
  freshness,
}: {
  freshness?: { financials_as_of?: string | null; price_as_of?: string | null; stale?: boolean } | null;
}) {
  if (!freshness) return null;

  const isStale = freshness.stale;

  return (
    <div
      className={`flex items-center gap-2 text-xs rounded-md px-3 py-2 ${
        isStale
          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50"
      }`}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>
        {isStale ? "Data may be stale. " : ""}
        {freshness.financials_as_of && (
          <>Financials as of <strong>{freshness.financials_as_of}</strong>. </>
        )}
        {freshness.price_as_of && (
          <>Price as of <strong>{freshness.price_as_of}</strong>.</>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source link
// ---------------------------------------------------------------------------

function SourceLink({ ref: sourceRef }: { ref: SourceRef }) {
  if (!sourceRef.url) {
    return (
      <span className="text-zinc-500 text-xs">{sourceRef.label}</span>
    );
  }
  return (
    <a
      href={sourceRef.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
    >
      {sourceRef.label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Check row
// ---------------------------------------------------------------------------

function CheckRow({ check }: { check: CheckResult }) {
  const statusConfig = {
    pass: { label: "Pass", class: "text-emerald-400", bgClass: "bg-emerald-500/10 border-emerald-500/20" },
    fail: { label: "Fail", class: "text-red-400", bgClass: "bg-red-500/10 border-red-500/20" },
    review_required: { label: "Review", class: "text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/20" },
    insufficient_data: { label: "No Data", class: "text-zinc-400", bgClass: "bg-zinc-700/20 border-zinc-700/40" },
  }[check.status] ?? { label: check.status, class: "text-zinc-400", bgClass: "bg-zinc-700/20 border-zinc-700/40" };

  const checkLabels: Record<string, string> = {
    business_activity: "Business Activity",
    debt_ratio: "Debt Ratio",
    cash_ratio: "Cash Ratio",
    non_compliant_income_ratio: "Non-Compliant Income",
  };

  return (
    <div className={`rounded-lg border p-4 ${statusConfig.bgClass}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">
            {checkLabels[check.key] ?? check.key}
          </span>
          {check.quality_flags.length > 0 && (
            <div className="flex gap-1">
              {check.quality_flags.slice(0, 2).map((flag) => (
                <span
                  key={flag}
                  className="text-xs bg-zinc-700/60 text-zinc-400 px-1.5 py-0.5 rounded"
                >
                  {flag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wide ${statusConfig.class}`}>
          {statusConfig.label}
        </span>
      </div>

      {(check.value !== null && check.value !== undefined) && (
        <div className="flex items-center gap-3 mb-2 text-xs text-zinc-400">
          <span>
            Value: <strong className="text-zinc-200">{check.value.toFixed(4)}</strong>
          </span>
          {check.threshold !== null && check.threshold !== undefined && (
            <span>
              Threshold: <strong className="text-zinc-200">{check.threshold.toFixed(4)}</strong>
            </span>
          )}
          {check.formula && (
            <span className="font-mono text-zinc-500">{check.formula}</span>
          )}
        </div>
      )}

      <p className="text-xs text-zinc-400 leading-relaxed mb-2">{check.reason}</p>

      {check.source_refs.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs text-zinc-600">Sources:</span>
          {check.source_refs.map((ref, i) => (
            <SourceLink key={i} ref={ref} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data basis badge
// ---------------------------------------------------------------------------

function BasisBadge({ basis }: { basis?: string | null }) {
  if (!basis) return null;

  const labels: Record<string, { label: string; class: string }> = {
    annual_audited: { label: "Annual Audited", class: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    quarterly_reported: { label: "Quarterly Reported", class: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    ttm_derived: { label: "TTM Derived", class: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    manual_review: { label: "Manual Review", class: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  };

  const cfg = labels[basis] ?? { label: basis, class: "text-zinc-400 bg-zinc-700/20 border-zinc-700/40" };

  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cfg.class}`}>
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface ScreeningExplainabilityProps {
  explainability: Explainability;
  showDisclosure?: boolean;
  showAllChecks?: boolean;
  className?: string;
}

export function ScreeningExplainability({
  explainability,
  showDisclosure = true,
  showAllChecks = true,
  className = "",
}: ScreeningExplainabilityProps) {
  const {
    overall_status,
    short_reason,
    detailed_reason,
    methodology_version,
    disclosure,
    basis,
    checks,
    freshness,
    last_updated,
  } = explainability;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header: overall status + methodology version */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={overall_status} size="lg" />
        {methodology_version && (
          <span className="text-xs text-zinc-500 font-mono">
            Methodology {methodology_version}
          </span>
        )}
        {basis && <BasisBadge basis={basis.financials_basis} />}
      </div>

      {/* Short reason */}
      <p className="text-sm text-zinc-300 leading-relaxed">{short_reason}</p>

      {/* Freshness indicator */}
      <FreshnessIndicator freshness={freshness} />

      {/* Basis details */}
      {basis && (basis.financial_snapshot_date || basis.business_activity_basis) && (
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          {basis.financial_snapshot_date && (
            <span>Financials as of: <strong className="text-zinc-400">{basis.financial_snapshot_date}</strong></span>
          )}
          {basis.business_activity_basis && (
            <span>Business activity: <strong className="text-zinc-400">{basis.business_activity_basis.replace(/_/g, " ")}</strong></span>
          )}
          {last_updated && (
            <span>Last updated: <strong className="text-zinc-400">{new Date(last_updated).toLocaleDateString("en-IN")}</strong></span>
          )}
        </div>
      )}

      {/* Per-check details */}
      {showAllChecks && checks.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-300">Screening Checks</h4>
          {checks.map((check) => (
            <CheckRow key={check.key} check={check} />
          ))}
        </div>
      )}

      {/* Disclosure */}
      {showDisclosure && disclosure && (
        <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/40 p-4">
          <p className="text-xs text-zinc-500 leading-relaxed italic">{disclosure}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact inline badge (for list views)
// ---------------------------------------------------------------------------

export function ScreeningStatusInline({
  status,
  methodologyVersion,
  lastUpdated,
}: {
  status: ScreeningStatus;
  methodologyVersion?: string | null;
  lastUpdated?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <StatusBadge status={status} size="sm" />
      {(methodologyVersion || lastUpdated) && (
        <p className="text-xs text-zinc-600">
          {methodologyVersion && `v${methodologyVersion}`}
          {methodologyVersion && lastUpdated && " · "}
          {lastUpdated && new Date(lastUpdated).toLocaleDateString("en-IN")}
        </p>
      )}
    </div>
  );
}
