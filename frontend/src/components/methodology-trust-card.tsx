import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Trust-first methodology callout (Tailwind + shadcn). */
export function MethodologyTrustCard() {
  return (
    <Card className="border-[var(--line)] bg-[var(--bg-elevated)]/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[var(--text)]">How we screen</CardTitle>
        <CardDescription className="text-[var(--text-secondary)]">
          Results are rules-based research screens from public data — not investment advice or a religious ruling.
          Methodology version {process.env.NEXT_PUBLIC_METHODOLOGY_VERSION || "2026.04.2"} (S&amp;P-style primary profile).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href="/methodology">Read methodology</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/shariah-compliance">Compliance overview</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
