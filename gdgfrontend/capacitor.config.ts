import type { CapacitorConfig } from "@capacitor/cli";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const BACKEND_HOSTNAME = BACKEND_URL
  ? new URL(BACKEND_URL).hostname
  : undefined;

const config: CapacitorConfig = {
  appId: "com.lostfound.app",
  appName: "reclaim",
  webDir: "out",

  server: {
    cleartext: false,

    allowNavigation: BACKEND_HOSTNAME ? [BACKEND_HOSTNAME] : [],
  },
};

export default config;
