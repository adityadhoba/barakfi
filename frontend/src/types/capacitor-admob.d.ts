/**
 * Type stub for @capacitor-community/admob.
 * This package is only installed in native Capacitor builds.
 * The runtime code uses dynamic imports and gracefully handles its absence.
 */
declare module "@capacitor-community/admob" {
  export const AdMob: {
    initialize(options: { initializeForTesting?: boolean }): Promise<void>;
    showBanner(options: {
      adId: string;
      adSize: unknown;
      position: unknown;
      margin?: number;
      isTesting?: boolean;
    }): Promise<void>;
    hideBanner(): Promise<void>;
    prepareInterstitial(options: {
      adId: string;
      isTesting?: boolean;
    }): Promise<void>;
    showInterstitial(): Promise<void>;
  };

  export const BannerAdSize: {
    ADAPTIVE_BANNER: unknown;
    SMART_BANNER: unknown;
    BANNER: unknown;
  };

  export const BannerAdPosition: {
    BOTTOM_CENTER: unknown;
    TOP_CENTER: unknown;
  };
}
