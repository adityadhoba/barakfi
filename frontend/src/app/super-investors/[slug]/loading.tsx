import s from "../detail.module.css";

export default function SuperInvestorLoading() {
  return (
    <main className={s.container}>
      <nav className={s.breadcrumb}>
        <div style={{ width: "60px", height: "12px", background: "var(--ink3)", borderRadius: "4px" }} />
      </nav>

      <div className={s.hero}>
        <div className={s.headerMeta}>
          <div
            className={s.avatar}
            style={{
              background: "linear-gradient(135deg, #5ec486 0%, #34d399 100%)",
            }}
          />
        </div>
        <div className={s.header}>
          <div className={s.headerContent}>
            <div>
              <div style={{ width: "280px", height: "44px", background: "var(--ink3)", borderRadius: "8px", marginBottom: "12px" }} />
              <div style={{ width: "160px", height: "16px", background: "var(--ink3)", borderRadius: "4px" }} />
            </div>
            <div className={s.tags}>
              <div style={{ width: "100px", height: "32px", background: "var(--ink3)", borderRadius: "999px" }} />
              <div style={{ width: "100px", height: "32px", background: "var(--ink3)", borderRadius: "999px" }} />
            </div>
            <div style={{ width: "100%", height: "14px", background: "var(--ink3)", borderRadius: "4px", marginBottom: "8px" }} />
            <div style={{ width: "95%", height: "14px", background: "var(--ink3)", borderRadius: "4px" }} />
            <div className={s.stats}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={s.stat}>
                  <div style={{ width: "60px", height: "24px", background: "var(--ink3)", borderRadius: "4px" }} />
                  <div style={{ width: "70px", height: "12px", background: "var(--ink3)", borderRadius: "4px", marginTop: "4px" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={s.portfolio}>
        <h2 className={s.sectionTitle} style={{ width: "200px", height: "28px", background: "var(--ink3)", borderRadius: "4px", marginBottom: "32px" }} />
        <div className={s.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={s.row} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className={s.rowHeader} style={{ display: "flex", justifyContent: "space-between" }}>
                <div className={s.rowBody} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ width: "60px", height: "13px", background: "var(--ink3)", borderRadius: "4px" }} />
                  <div style={{ width: "100%", height: "12px", background: "var(--ink3)", borderRadius: "4px" }} />
                </div>
                <div style={{ width: "30px", height: "12px", background: "var(--ink3)", borderRadius: "4px" }} />
              </div>
              <div className={s.rowFooter} style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: "80px", height: "12px", background: "var(--ink3)", borderRadius: "4px" }} />
                <div style={{ width: "60px", height: "12px", background: "var(--ink3)", borderRadius: "4px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
