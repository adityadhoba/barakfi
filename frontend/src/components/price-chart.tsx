"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type ChartRange = "1mo" | "3mo" | "6mo" | "1y" | "5y";

const RANGES: { label: string; value: ChartRange; interval: string; ariaLabel: string }[] = [
  { label: "1M", value: "1mo", interval: "1d", ariaLabel: "1 month price range" },
  { label: "3M", value: "3mo", interval: "1d", ariaLabel: "3 month price range" },
  { label: "6M", value: "6mo", interval: "1d", ariaLabel: "6 month price range" },
  { label: "1Y", value: "1y", interval: "1wk", ariaLabel: "1 year price range" },
  { label: "5Y", value: "5y", interval: "1mo", ariaLabel: "5 year price range" },
];

export function PriceChart({ symbol, exchange }: { symbol: string; exchange?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [range, setRange] = useState<ChartRange>("6mo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async (r: ChartRange) => {
    const cfg = RANGES.find((x) => x.value === r) || RANGES[2];
    try {
      setLoading(true);
      setError(false);
      const qs = new URLSearchParams({ range: cfg.value, interval: cfg.interval });
      if (exchange) qs.set("exchange", exchange);
      const res = await fetch(`/api/chart/${encodeURIComponent(symbol)}?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return (data.candles || []) as Candle[];
    } catch {
      setError(true);
      return [];
    } finally {
      setLoading(false);
    }
  }, [symbol, exchange]);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    (async () => {
      const { createChart, ColorType, CrosshairMode } = await import("lightweight-charts");

      if (disposed || !containerRef.current) return;

      // Get CSS variable values for theming
      const cs = getComputedStyle(document.documentElement);
      const bg = cs.getPropertyValue("--panel").trim() || "#ffffff";
      const text = cs.getPropertyValue("--text-secondary").trim() || "#4b5563";
      const line = cs.getPropertyValue("--line").trim() || "#e5e7eb";
      const emerald = cs.getPropertyValue("--emerald").trim() || "#059669";

      // Remove old chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 320,
        layout: {
          background: { type: ColorType.Solid, color: bg },
          textColor: text,
          fontFamily: "Inter, -apple-system, sans-serif",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: line, style: 4 },
          horzLines: { color: line, style: 4 },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: text, width: 1, style: 3, labelBackgroundColor: emerald },
          horzLine: { color: text, width: 1, style: 3, labelBackgroundColor: emerald },
        },
        rightPriceScale: {
          borderColor: line,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: line,
          timeVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = chart;

      const areaSeries = chart.addAreaSeries({
        topColor: `${emerald}40`,
        bottomColor: `${emerald}05`,
        lineColor: emerald,
        lineWidth: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: emerald,
        crosshairMarkerBackgroundColor: "#fff",
      });

      const candles = await fetchData(range);
      if (!disposed && candles.length > 0) {
        const lineData = candles.map((c) => ({ time: c.time, value: c.close }));
        areaSeries.setData(lineData as never[]);
        chart.timeScale().fitContent();
      }

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0] && chartRef.current) {
          chartRef.current.applyOptions({
            width: entries[0].contentRect.width,
          });
        }
      });
      resizeObserver.observe(containerRef.current);

      (containerRef.current as HTMLDivElement & { __series?: unknown }).__series = areaSeries;

      return () => {
        resizeObserver.disconnect();
      };
    })();

    return () => {
      disposed = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
    // Only re-create chart on symbol change, not range
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // Handle range changes without recreating chart
  useEffect(() => {
    if (!chartRef.current || !containerRef.current) return;
    const series = (containerRef.current as HTMLDivElement & { __series?: { setData: (d: never[]) => void } }).__series;
    if (!series) return;

    (async () => {
      const candles = await fetchData(range);
      if (candles.length > 0) {
        const lineData = candles.map((c: Candle) => ({ time: c.time, value: c.close }));
        series.setData(lineData as never[]);
        chartRef.current?.timeScale().fitContent();
      }
    })();
  }, [range, fetchData]);

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-xl)",
        background: "var(--panel)",
        padding: "16px",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      {/* Range selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          Price Chart
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              aria-label={r.ariaLabel}
              aria-pressed={range === r.value}
              style={{
                padding: "4px 12px",
                borderRadius: 9999,
                border: `1px solid ${range === r.value ? "var(--emerald)" : "var(--line)"}`,
                background: range === r.value ? "var(--emerald-bg)" : "transparent",
                color: range === r.value ? "var(--emerald)" : "var(--text-secondary)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 150ms ease",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div style={{ position: "relative", minHeight: 320 }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              zIndex: 1,
              background: "var(--panel)",
              borderRadius: "var(--radius-lg)",
              fontSize: "0.84rem",
              color: "var(--text-tertiary)",
            }}
          >
            Loading chart...
          </div>
        )}
        {error && !loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              zIndex: 1,
              fontSize: "0.84rem",
              color: "var(--text-tertiary)",
            }}
          >
            Chart data unavailable for {symbol}
          </div>
        )}
        <div ref={containerRef} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }} />
      </div>
    </div>
  );
}
