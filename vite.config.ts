import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        injectRegister: 'auto',
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.json',
        includeAssets: ['icon-192.png', 'icon-512.png', 'screenshot-mobile.png', 'screenshot-desktop.png'],
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
        },
        manifest: {
          id: "/",
          name: "Winamp Web Player",
          short_name: "WinampWeb",
          description: "A retro web-based audio player with live radio",
          start_url: "/",
          display: "standalone",
          background_color: "#000000",
          theme_color: "#000000",
          icons: [
            {
              src: "/icon-192.png",
              type: "image/png",
              sizes: "192x192",
              purpose: "any"
            },
            {
              src: "/icon-192.png",
              type: "image/png",
              sizes: "192x192",
              purpose: "maskable"
            },
            {
              src: "/icon-512.png",
              type: "image/png",
              sizes: "512x512",
              purpose: "any"
            },
            {
              src: "/icon-512.png",
              type: "image/png",
              sizes: "512x512",
              purpose: "maskable"
            }
          ],
          screenshots: [
            {
              src: "/screenshot-mobile.png",
              sizes: "320x640",
              type: "image/png"
            },
            {
              src: "/screenshot-desktop.png",
              sizes: "1280x720",
              type: "image/png",
              form_factor: "wide"
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
