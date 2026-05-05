import s from "./loading.module.css";

export default function HomeLoading() {
  return (
    <div className="shellPage">
      <div className={s.homeV2Loading}>
        <div className={s.loadingTicker}>
          <div className={s.loadingTickerTrack}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={s.loadingTickerItem} />
            ))}
          </div>
        </div>

        <section className={s.loadingHeroSplit}>
          <div className={s.loadingHeroLeft}>
            <div className={s.loadingPill} />
            <div className={s.loadingTitleBlock} />
            <div className={s.loadingCopyLine} />
            <div className={s.loadingCopyLineShort} />
            <div className={s.loadingCtaRow}>
              <div className={s.loadingBtnPrimary} />
              <div className={s.loadingBtnText} />
            </div>
          </div>
          <div className={s.loadingHeroRight}>
            <div className={s.loadingBigStat} />
            <div className={s.loadingMetricGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={s.loadingMetricCell} />
              ))}
            </div>
          </div>
        </section>

        <section className={s.loadingStatement}>
          <div className={s.loadingStatementLeft} />
          <div className={s.loadingStatementRight} />
        </section>

        <section className={s.loadingPillars}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={s.loadingPillarRow}>
              <div className={s.loadingPillarNum} />
              <div className={s.loadingPillarTitle} />
              <div className={s.loadingPillarBody} />
            </div>
          ))}
        </section>

        <section className={s.loadingTableSection}>
          <div className={s.loadingTableLeft} />
          <div className={s.loadingTableRight}>
            <div className={s.loadingTableHead} />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={s.loadingTableRow} />
            ))}
          </div>
        </section>

        <section className={s.loadingClosing}>
          <div className={s.loadingClosingLeft} />
          <div className={s.loadingClosingRight} />
        </section>

        <section className={s.loadingFooter}>
          <div className={s.loadingFooterBrand} />
          <div className={s.loadingFooterCols}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={s.loadingFooterCol} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
