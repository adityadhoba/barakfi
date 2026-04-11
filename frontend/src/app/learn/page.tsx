import type { Metadata } from "next";
import Link from "next/link";
import s from "./learn.module.css";

export const metadata: Metadata = {
  title: "Learn — halal investing & NSE/BSE screening",
  description:
    "Index of BarakFi learn articles: what halal investing means, how Shariah stock screening works on Indian exchanges, case studies like Reliance, and how to use the screener responsibly — with links into live stock pages.",
};

export default function LearnIndexPage() {
  return (
    <main className={s.page}>
      <p className={s.kicker}>Education</p>
      <h1 className={s.h1}>Learn halal investing in India</h1>
      <p className={s.prose}>
        Practical, plain-language articles on how Shariah-aligned equity screening works for Indian listings, what the
        ratios mean, and how to use BarakFi alongside qualified scholars and advisors.
      </p>
      <ul className={s.indexList}>
        <li>
          <Link href="/learn/what-is-halal-investing">What is halal investing?</Link>
        </li>
        <li>
          <Link href="/learn/halal-stocks-india">Halal stocks in India (NSE &amp; BSE)</Link>
        </li>
        <li>
          <Link href="/learn/is-reliance-halal">Is Reliance halal? — case study</Link>
        </li>
        <li>
          <Link href="/learn/top-halal-stocks-india">Large-cap names investors often screen</Link>
        </li>
      </ul>
    </main>
  );
}
