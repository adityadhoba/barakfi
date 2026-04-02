import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.barakfi.app",
  appName: "Barakfi",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      showSpinner: false,
      backgroundColor: "#0a0f0a",
      androidSplashResourceName: "splash",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0f0a",
    },
    AdMob: {
      appId: process.env.NEXT_PUBLIC_ADMOB_APP_ID ?? "",
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0f0a",
  },
};

export default config;
