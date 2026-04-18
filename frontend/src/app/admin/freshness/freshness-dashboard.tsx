"use client";

import React, { useEffect, useState } from "react";
import type { FreshnessReport, JobRun } from "@/lib/api-v1";
import { fetchFreshnessV1, fetchJobRunsV1 } from "@/lib/api-v1";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtext,
  variant = "neutral",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "neutral" | "good" | "warn" | "error";
}) {
  const variantClass = {
    neutral: "border-zinc-700/50 bg-zinc-800/50",
    good: "border-emerald-500/30 bg-emerald-500/10",
    warn: "border-amber-500/30 bg-amber-500/10",
    error: "border-red-500/30 bg-red-500/10",
  }[variant];

  const valueClass = {
    neutral: "text-zinc-100",
    good: "text-emerald-400",
    warn: "text-amber-400",
    error: "text-red-400",
  }[variant];

  return (
    <div className={`rounded-xl border p-4 ${variantClass}`}>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      {subtext && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job health row
// ---------------------------------------------------------------------------

function JobHealthRow({
  job,
}: {
  job: { job_name: string; last_success?: string | null; total_runs: number };
}) {
  const lastSuccessDate = job.last_success ? new Date(job.last_success) : null;
  const hoursAgo = lastSuccessDate
    ? Math.round((Date.now() - lastSuccessDate.getTime()) / (1000 * 60 * 60))
    : null;

  const stale = hoursAgo === null || hoursAgo > 25;

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0">
      <div>
        <p className="text-sm font-medium text-zinc-200 font-mono">
          {job.job_name}
        </p>
        <p className="text-xs text-zinc-500">
          {job.total_runs} total runs
        </p>
      </div>
      <div className="text-right">
        {lastSuccessDate ? (
          <>
            <p className="text-xs text-zinc-400">
              {lastSuccessDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
            </p>
            <p className={`text-xs font-medium ${stale ? "text-amber-400" : "text-emerald-400"}`}>
              {hoursAgo}h ago
            </p>
          </>
        ) : (
          <p className="text-xs text-zinc-600">Never run</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Failure row
// ---------------------------------------------------------------------------

function FailureRow({
  failure,
}: {
  failure: { job_name: string; status: string; started_at?: string | null; error?: Record<string, unknown> | null };
}) {
  const [showError, setShowError] = useState(false);

  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-red-400 uppercase">{failure.status}</span>
          <span className="text-sm font-medium text-zinc-200 font-mono">{failure.job_name}</span>
        </div>
        {failure.started_at && (
          <span className="text-xs text-zinc-500">
            {new Date(failure.started_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
          </span>
        )}
      </div>
      {failure.error && (
        <>
          <button
            onClick={() => setShowError(!showError)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showError ? "Hide error" : "Show error"}
          </button>
          {showError && (
            <pre className="mt-2 text-xs text-red-300 bg-red-950/30 rounded p-2 overflow-auto max-h-32">
              {JSON.stringify(failure.error, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job runs table
// ---------------------------------------------------------------------------

function JobRunsTable({ runs }: { runs: JobRun[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-xs text-zinc-500 py-2 pr-4">Job</th>
            <th className="text-left text-xs text-zinc-500 py-2 pr-4">Status</th>
            <th className="text-left text-xs text-zinc-500 py-2 pr-4">Started</th>
            <th className="text-left text-xs text-zinc-500 py-2 pr-4">Duration</th>
            <th className="text-right text-xs text-zinc-500 py-2">Attempts</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const started = run.started_at ? new Date(run.started_at) : null;
            const finished = run.finished_at ? new Date(run.finished_at) : null;
            const durationMs = started && finished ? finished.getTime() - started.getTime() : null;
            const durationStr = durationMs !== null
              ? durationMs > 60000
                ? `${Math.round(durationMs / 60000)}m`
                : `${Math.round(durationMs / 1000)}s`
              : "—";

            const statusClass = {
              succeeded: "text-emerald-400",
              failed: "text-red-400",
              dead_letter: "text-red-600",
              running: "text-blue-400",
              queued: "text-zinc-400",
            }[run.status] ?? "text-zinc-400";

            return (
              <tr key={run.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                <td className="py-2 pr-4 font-mono text-xs text-zinc-300">{run.job_name}</td>
                <td className={`py-2 pr-4 text-xs font-semibold uppercase ${statusClass}`}>
                  {run.status}
                </td>
                <td className="py-2 pr-4 text-xs text-zinc-500">
                  {started
                    ? started.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                    : "—"}
                </td>
                <td className="py-2 pr-4 text-xs text-zinc-500">{durationStr}</td>
                <td className="py-2 text-right text-xs text-zinc-500">{run.attempt_count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard component
// ---------------------------------------------------------------------------

export function FreshnessDashboard({ serviceToken }: { serviceToken: string }) {
  const [freshness, setFreshness] = useState<FreshnessReport | null>(null);
  const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [fr, jr] = await Promise.all([
          fetchFreshnessV1(serviceToken),
          fetchJobRunsV1(serviceToken),
        ]);
        setFreshness(fr);
        setJobRuns(jr);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load freshness data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [serviceToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Loading pipeline status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-red-400">
        <p className="font-medium mb-1">Failed to load freshness data</p>
        <p className="text-sm opacity-80">{error}</p>
        <p className="text-xs text-zinc-500 mt-2">
          This endpoint requires a valid INTERNAL_SERVICE_TOKEN.
        </p>
      </div>
    );
  }

  if (!freshness) return null;

  const { universe, job_health, recent_failures, as_of } = freshness;

  return (
    <div className="space-y-8">
      {/* Universe stats */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
          Universe Coverage
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Active Issuers"
            value={universe.total_active_issuers}
            variant="neutral"
          />
          <StatCard
            label="Screened Today"
            value={universe.screened_today}
            variant={universe.screened_today > 0 ? "good" : "warn"}
          />
          <StatCard
            label="Stale Screening"
            value={universe.stale_screening}
            variant={universe.stale_screening === 0 ? "good" : universe.stale_screening < 10 ? "warn" : "error"}
            subtext=">7 days old"
          />
          <StatCard
            label="Missing Fundamentals"
            value={universe.missing_fundamentals}
            variant={universe.missing_fundamentals === 0 ? "good" : "warn"}
          />
        </div>
      </section>

      {/* Job health */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
          Pipeline Job Health
        </h2>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
          {job_health.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No job runs recorded yet. Run the pipeline to see health status.
            </p>
          ) : (
            <div>
              {job_health.map((job) => (
                <JobHealthRow key={job.job_name} job={job} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent failures */}
      {recent_failures.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-4">
            Recent Failures (last 24h)
          </h2>
          <div className="space-y-3">
            {recent_failures.map((f, i) => (
              <FailureRow key={i} failure={f} />
            ))}
          </div>
        </section>
      )}

      {/* Job runs table */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
          Recent Job Runs
        </h2>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
          {jobRuns.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No job runs found.
            </p>
          ) : (
            <JobRunsTable runs={jobRuns} />
          )}
        </div>
      </section>

      {/* Footer */}
      <div className="text-xs text-zinc-600 text-right">
        Data as of {new Date(as_of).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
      </div>
    </div>
  );
}
