/**
 * AdMob integration for Capacitor (mobile app).
 *
 * Uses @capacitor-community/admob plugin.
 * Only activates when running inside the Capacitor native shell.
 *
 * Banner ad: shown at the bottom of the screen.
 * Interstitial ad: shown every 5th screen view transition.
 */

const ADMOB_APP_ID = process.env.NEXT_PUBLIC_ADMOB_APP_ID ?? "";

// Track screen views for interstitial pacing
let screenViewCount = 0;
const INTERSTITIAL_EVERY_N = 5;

/** Check if running inside Capacitor native shell */
function isCapacitor(): boolean {
  return (
    typeof window !== "undefined" &&
    "Capacitor" in window &&
    (window as unknown as { Capacitor: { isNativePlatform?: () => boolean } }).Capacitor.isNativePlatform?.() === true
  );
}

/** Dynamically import the AdMob plugin (only available in native builds) */
async function getAdMob() {
  if (!isCapacitor()) return null;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    return AdMob;
  } catch {
    console.warn("[AdMob] Plugin not available — skipping.");
    return null;
  }
}

/**
 * Initialize AdMob. Call once at app startup (e.g., in a top-level useEffect).
 * No-ops on web.
 */
export async function initializeAdMob(): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob || !ADMOB_APP_ID) return;

  try {
    await AdMob.initialize({
      initializeForTesting: process.env.NODE_ENV !== "production",
    });
  } catch (err) {
    console.error("[AdMob] Initialization failed:", err);
  }
}

/**
 * Show a banner ad at the bottom of the screen.
 * Safe to call multiple times — the plugin handles deduplication.
 */
export async function showBannerAd(adId?: string): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;

  try {
    const { BannerAdSize, BannerAdPosition } = await import(
      "@capacitor-community/admob"
    );

    await AdMob.showBanner({
      adId: adId ?? "ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY",
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: process.env.NODE_ENV !== "production",
    });
  } catch (err) {
    console.error("[AdMob] Banner ad failed:", err);
  }
}

/**
 * Hide the banner ad.
 */
export async function hideBannerAd(): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;

  try {
    await AdMob.hideBanner();
  } catch {
    // Ignore — banner may not be showing
  }
}

/**
 * Prepare an interstitial ad for the next transition.
 */
async function prepareInterstitial(adId?: string): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;

  try {
    await AdMob.prepareInterstitial({
      adId: adId ?? "ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ",
      isTesting: process.env.NODE_ENV !== "production",
    });
  } catch (err) {
    console.error("[AdMob] Interstitial preparation failed:", err);
  }
}

/**
 * Track a screen view and show an interstitial ad every Nth view.
 * Call this on page transitions (e.g., in a route change handler).
 */
export async function trackScreenView(adId?: string): Promise<void> {
  if (!isCapacitor() || !ADMOB_APP_ID) return;

  screenViewCount += 1;

  if (screenViewCount % INTERSTITIAL_EVERY_N === 0) {
    const AdMob = await getAdMob();
    if (!AdMob) return;

    try {
      await prepareInterstitial(adId);
      await AdMob.showInterstitial();
    } catch (err) {
      console.error("[AdMob] Interstitial show failed:", err);
    }
  }

  // Pre-load the next interstitial in the background
  if (screenViewCount % INTERSTITIAL_EVERY_N === INTERSTITIAL_EVERY_N - 1) {
    prepareInterstitial(adId).catch(() => {});
  }
}
