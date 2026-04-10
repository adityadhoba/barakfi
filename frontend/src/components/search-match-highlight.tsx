import { matchHighlightChunks } from "@/lib/stock-search-rank";

type Props = {
  text: string;
  query: string;
  className?: string;
};

export function SearchMatchHighlight({ text, query, className }: Props) {
  const q = query.trim();
  if (!q) {
    return <span className={className}>{text}</span>;
  }
  const chunks = matchHighlightChunks(text, q);
  return (
    <span className={className}>
      {chunks.map((c, i) =>
        c.match ? (
          <mark key={i} className="searchMatchHighlight">
            {c.text}
          </mark>
        ) : (
          <span key={i}>{c.text}</span>
        ),
      )}
    </span>
  );
}
