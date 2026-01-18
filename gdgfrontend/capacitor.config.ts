import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lostfound.app",
  appName: "reclaim",
  webDir: "out",
  server: {
    cleartext: false,
    allowNavigation: ["campus-search-api-680513043824.us-central1.run.app"],
  },
};

export default config;
