import type { Metadata } from "next";
import Link from "next/link";
import s from "../../request-coverage/request.module.css";

export const metadata: Metadata = {
  title: "Access denied — Barakfi",
  description:
    "This BarakFi admin console URL is restricted to authorised operator accounts. If you reached this page by mistake, return to the public halal stock screener; for access requests, contact the team through normal support channels.",
  robots: { index: false, follow: true },
};

export default function AdminForbiddenPage() {
  return (
    <main className="shellPage">
      <div className={s.container} style={{ maxWidth: 560 }}>
        <h1 className={s.title} style={{ marginTop: 24 }}>Admin access required</h1>
        <p className={s.subtitle}>
          Your account does not have permission to view the admin console. If you believe this is a mistake,
          contact the team.
        </p>
        <Link href="/" className={s.ctaButton} style={{ display: "inline-flex", marginTop: 16 }}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
