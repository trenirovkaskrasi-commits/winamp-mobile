import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { TextZoom } from '@capacitor/text-zoom';
import { Capacitor } from '@capacitor/core';
import { BackgroundMode } from '@anuradev/capacitor-background-mode';

if (Capacitor.isNativePlatform()) {
  TextZoom.set({ value: 1 }).catch(console.error);
  
  // Enable background mode to prevent Android from sleeping the WebAudio engine
  BackgroundMode.checkNotificationsPermission().then(status => {
    if (status.notifications !== 'granted') {
      BackgroundMode.requestNotificationsPermission();
    }
  });

  BackgroundMode.checkBatteryOptimizations().then(status => {
    if (!status.enabled) {
      BackgroundMode.requestDisableBatteryOptimizations();
    }
  });
  
  BackgroundMode.enable().catch(console.error);
  BackgroundMode.setSettings({
    title: "Winamp",
    text: "Playing music...",
    resume: true,
    hidden: false
  }).catch(console.error);
}

if ('serviceWorker' in navigator) {
  // If we are in dev mode, we should unregister any old manual service workers
  // to avoid caching stale files in development. 
  // VitePWA will automatically handle production SW registration.
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
    // Clear old caches
    caches.keys().then(names => {
      for (let name of names) caches.delete(name);
    });
  });
}

// Global capture for beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredInstallPrompt = e;
  window.dispatchEvent(new Event('deferredpromptready'));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
