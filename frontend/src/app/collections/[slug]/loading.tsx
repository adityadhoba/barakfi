import s from "../detail.module.css";
import ls from "@/app/loading.module.css";

export default function CollectionLoading() {
  return (
    <main className={s.container}>
      <nav className={s.breadcrumb}>
        <div style={{ width: "60px", height: "12px", background: "var(--ink3)", borderRadius: "4px" }} />
      </nav>

      <header className={s.hero}>
        <div className={s.iconBadge} style={{ background: "linear-gradient(135deg, rgba(126, 200, 160, 0.15), rgba(94, 196, 134, 0.08))" }} />
        <div>
          <div style={{ width: "280px", height: "44px", background: "var(--ink3)", borderRadius: "8px", marginBottom: "16px" }} />
          <div style={{ width: "100%", maxWidth: "500px", height: "16px", background: "var(--ink3)", borderRadius: "4px", marginBottom: "12px" }} />
          <div style={{ width: "85%", maxWidth: "450px", height: "16px", background: "var(--ink3)", borderRadius: "4px", marginBottom: "24px" }} />
          <div style={{ width: "140px", height: "28px", background: "var(--ink3)", borderRadius: "999px" }} />
        </div>
      </header>

      <div className={s.grid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={s.card} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ width: "40px", height: "12px", background: "var(--ink3)", borderRadius: "4px" }} />
            <div style={{ width: "60px", height: "16px", background: "var(--ink3)", borderRadius: "4px" }} />
            <div style={{ width: "100%", height: "14px", background: "var(--ink3)", borderRadius: "4px" }} />
            <div style={{ width: "85%", height: "14px", background: "var(--ink3)", borderRadius: "4px" }} />
          </div>
        ))}
      </div>
    </main>
  );
}
