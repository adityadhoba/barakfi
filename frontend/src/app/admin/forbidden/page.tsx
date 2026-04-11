import Link from "next/link";
import s from "../../request-coverage/request.module.css";

export const metadata = { title: "Access denied — Barakfi" };

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
