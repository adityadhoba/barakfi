import s from "../loading.module.css";

export default function NotificationsLoading() {
  return (
    <div className={s.loadingPage}>
      <div className={s.loadingHero}>
        <div className={s.loadingHeroMain} />
        <div className={s.loadingHeroSide} />
      </div>
      <div className={s.loadingGrid} style={{ marginTop: 24 }}>
        <div className={s.loadingPanelTall} />
        <div className={s.loadingPanelTall} />
      </div>
    </div>
  );
}
