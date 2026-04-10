/**
 * Rank stocks for autocomplete: best match first (exact ticker, prefix, then name).
 */

export type StockMatchRow = { symbol: string; name: string; sector?: string };

export function stockMatchScore(
  symbol: string,
  name: string,
  sector: string | undefined,
  queryRaw: string,
): number {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return 0;

  const sym = symbol.toLowerCase();
  const nm = name.toLowerCase();
  const sec = (sector ?? "").toLowerCase();

  let score = 0;
  if (sym === q) score += 100_000;
  if (nm === q) score += 95_000;
  if (sym.startsWith(q)) score += 50_000 + Math.max(0, 200 - sym.length);
  if (nm.startsWith(q)) score += 40_000;

  const symIdx = sym.indexOf(q);
  if (symIdx !== -1) score += 25_000 - symIdx;
  const nmIdx = nm.indexOf(q);
  if (nmIdx !== -1) score += 15_000 - Math.min(nmIdx, 1000);
  if (sec.includes(q)) score += 5_000;

  return score;
}

export function rankStocksForQuery<T extends StockMatchRow>(
  items: T[],
  queryRaw: string,
  limit: number,
): T[] {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return [];

  return [...items]
    .map((item) => ({
      item,
      score: stockMatchScore(item.symbol, item.name, item.sector, q),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.symbol.localeCompare(b.item.symbol, undefined, { sensitivity: "base" }),
    )
    .slice(0, limit)
    .map(({ item }) => item);
}

export function matchHighlightChunks(
  haystack: string,
  needleRaw: string,
): { text: string; match: boolean }[] {
  const needle = needleRaw.trim();
  if (!needle || !haystack) return [{ text: haystack, match: false }];

  const lowerH = haystack.toLowerCase();
  const lowerN = needle.toLowerCase();
  const chunks: { text: string; match: boolean }[] = [];
  let i = 0;

  while (i < haystack.length) {
    const idx = lowerH.indexOf(lowerN, i);
    if (idx === -1) {
      chunks.push({ text: haystack.slice(i), match: false });
      break;
    }
    if (idx > i) chunks.push({ text: haystack.slice(i, idx), match: false });
    const end = idx + needle.length;
    chunks.push({ text: haystack.slice(idx, end), match: true });
    i = end;
  }

  return chunks;
}
