import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.promptgallery.app",
  appName: "Prompt Gallery",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;