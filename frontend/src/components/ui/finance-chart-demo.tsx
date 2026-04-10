"use client";

import React, { useState, useEffect } from "react";
import { Component, background } from "@/components/ui/finance-chart";
import { cn } from "@/lib/utils";

/** Full-viewport demo for the visx finance chart (optional route under /tools/visx-chart). */
export function FinanceChartVisxDemo() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const chartWidth = dimensions.width;
  const chartHeight = dimensions.height;

  if (chartWidth === 0 || chartHeight === 0) {
    return (
      <div className={cn("flex h-screen w-screen items-center justify-center bg-gray-900 text-white")}>
        Loading chart…
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-screen w-screen items-center justify-center overflow-hidden")}
      style={{ backgroundColor: background }}
    >
      <Component width={chartWidth} height={chartHeight} />
    </div>
  );
}
