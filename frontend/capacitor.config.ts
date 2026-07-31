import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bj.moncomptoir.pos',
  appName: 'Mon Comptoir',
  webDir: 'dist',
  backgroundColor: '#0f766e',
  android: {
    allowMixedContent: true,
    captureInput: true,
    alwaysAllowZoom: false,
  },
  server: {
    androidScheme: 'http',
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false,
    },
  },
};

export default config;
