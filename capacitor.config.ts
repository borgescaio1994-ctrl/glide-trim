import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.barberbuddy.app',
  appName: 'Barber Buddy',
  webDir: 'dist',
  plugins: {
    App: {
      allowMixedContent: true
    },
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
