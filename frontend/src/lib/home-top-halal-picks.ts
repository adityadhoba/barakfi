import { unstable_cache } from "next/cache";
import { getBulkScreeningResults, getStocks } from "@/lib/api";

export type TopHalalPick = {
  symbol: string;
  name: string;
  score: number;
  status: "Halal" | "Doubtful" | "Haram";
  /** True when row comes from static fallback (API empty or fewer than 5 halal). */
  isMock?: boolean;
};

/** Static showcase rows when live data is unavailable or sparse. */
const MOCK_TOP_HALAL: TopHalalPick[] = [
  { symbol: "TCS", name: "Tata Consultancy Services", score: 96, status: "Halal", isMock: true },
  { symbol: "INFY", name: "Infosys", score: 94, status: "Halal", isMock: true },
  { symbol: "HCLTECH", name: "HCL Technologies", score: 93, status: "Halal", isMock: true },
  { symbol: "WIPRO", name: "Wipro", score: 91, status: "Halal", isMock: true },
  { symbol: "TECHM", name: "Tech Mahindra", score: 90, status: "Halal", isMock: true },
];

const REVALIDATE_SEC = 300; // 5 minutes — aligns with backend screening cache TTL

async function computeTopHalalPicks(): Promise<TopHalalPick[]> {
  try {
    const stocks = await getStocks();
    if (stocks.length === 0) {
      return MOCK_TOP_HALAL.slice(0, 5);
    }
    const symbols = stocks.map((s) => s.symbol);
    const screenings = await getBulkScreeningResults(symbols);
    const map = new Map(screenings.map((r) => [r.symbol, r]));

    const halalRows: TopHalalPick[] = [];
    for (const s of stocks) {
      const sc = map.get(s.symbol);
      if (!sc || sc.status !== "HALAL") continue;
      const score = typeof sc.screening_score === "number" ? sc.screening_score : 0;
      halalRows.push({
        symbol: s.symbol,
        name: s.name,
        score,
        status: "Halal",
      });
    }

    halalRows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ma = stocks.find((x) => x.symbol === a.symbol)?.market_cap ?? 0;
      const mb = stocks.find((x) => x.symbol === b.symbol)?.market_cap ?? 0;
      return mb - ma;
    });

    const picked = halalRows.slice(0, 5);
    if (picked.length >= 5) {
      return picked;
    }

    const seen = new Set(picked.map((p) => p.symbol));
    for (const m of MOCK_TOP_HALAL) {
      if (picked.length >= 5) break;
      if (seen.has(m.symbol)) continue;
      picked.push({ ...m, isMock: true });
      seen.add(m.symbol);
    }
    return picked;
  } catch {
    return MOCK_TOP_HALAL.slice(0, 5);
  }
}

/**
 * Cached server-side picks for the homepage (ISR-style, 5 min).
 * Live halal leaders when API works; padded or replaced with mock data as needed.
 */
export async function getTopHalalPicksForHome(): Promise<TopHalalPick[]> {
  return unstable_cache(computeTopHalalPicks, ["home-top-halal-picks-v1"], {
    revalidate: REVALIDATE_SEC,
  })();
}
