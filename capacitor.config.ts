import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.winamp.retro',
  appName: 'Winamp',
  webDir: 'dist',
  backgroundColor: '#121212',
  server: {
    cleartext: true
  }
};

export default config;
