import { getBulkScreeningResults, getStocks } from "@/lib/api";

export type TopHalalPick = {
  symbol: string;
  name: string;
  score: number;
  status: "Halal" | "Doubtful" | "Haram";
};

const MIN_SHOW = 3;
const MAX_SHOW = 5;

/** Shown when API data is missing or sparse. */
export const MOCK_TOP_HALAL_TODAY: TopHalalPick[] = [
  { symbol: "TCS", name: "Tata Consultancy Services", score: 96, status: "Halal" },
  { symbol: "INFY", name: "Infosys", score: 94, status: "Halal" },
  { symbol: "HCLTECH", name: "HCL Technologies", score: 93, status: "Halal" },
  { symbol: "WIPRO", name: "Wipro", score: 91, status: "Halal" },
  { symbol: "TECHM", name: "Tech Mahindra", score: 90, status: "Halal" },
];

/**
 * Up to 5 HALAL names by screening_score (API). Pads with mock to at least 3 when needed.
 */
export async function getTopHalalPicksForHome(): Promise<TopHalalPick[]> {
  try {
    const stocks = await getStocks();
    if (stocks.length === 0) {
      return MOCK_TOP_HALAL_TODAY.slice(0, MAX_SHOW);
    }
    const symbols = stocks.map((s) => s.symbol);
    const screenings = await getBulkScreeningResults(symbols).catch(() => []);
    const map = new Map(screenings.map((r) => [r.symbol, r]));

    const halal: TopHalalPick[] = [];
    for (const s of stocks) {
      const sc = map.get(s.symbol);
      if (!sc || sc.status !== "HALAL") continue;
      const score = typeof sc.screening_score === "number" ? sc.screening_score : 0;
      halal.push({
        symbol: s.symbol,
        name: s.name,
        score,
        status: "Halal",
      });
    }

    halal.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ma = stocks.find((x) => x.symbol === a.symbol)?.market_cap ?? 0;
      const mb = stocks.find((x) => x.symbol === b.symbol)?.market_cap ?? 0;
      return mb - ma;
    });

    const picks = halal.slice(0, MAX_SHOW);
    if (picks.length >= MIN_SHOW) {
      return picks;
    }

    const seen = new Set(picks.map((p) => p.symbol));
    const padded: TopHalalPick[] = [...picks];
    for (const m of MOCK_TOP_HALAL_TODAY) {
      if (padded.length >= MIN_SHOW) break;
      if (seen.has(m.symbol)) continue;
      padded.push(m);
      seen.add(m.symbol);
    }
    return padded.slice(0, MAX_SHOW);
  } catch {
    return MOCK_TOP_HALAL_TODAY.slice(0, MAX_SHOW);
  }
}
