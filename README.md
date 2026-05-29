# Winamp Mobile (Capacitor & React) ⚡

A high-performance, fully functional Winamp clone for Android and Web. Built with modern web technologies (React, TailwindCSS, Zustand) but heavily optimized for Android using native ExoPlayer integration for flawless background playback and battery efficiency.

![Winamp Android Logo](./assets/logo.png)

## 🚀 Features

- **Iconic Winamp UI:** Faithful recreation of the classic Winamp interface including the Marquee ticker, LED time display, neon-styled progress bars, and authentic window borders.
- **Local MP3 Playback:** Browse your device's storage and load multiple MP3s into the playlist.
- **Live Internet Radio:** Built-in integration with the Radio Browser API, allowing you to search and play thousands of online radio stations globally.
- **Hybrid Architecture:** 
  - **PWA / Browser Mode:** Uses standard HTML5 `WebAudio` for playback when running in a web browser.
  - **Native Android Mode:** Automatically detects Android environment and switches to a deeply integrated native `ExoPlayer` backend.

## ⚙️ Native Android Optimizations

This project goes far beyond a standard WebView wrapper. To overcome the limitations of background task execution and battery drain typical in hybrid applications, the audio engine was completely re-architected for Android:

1. **Native ExoPlayer Backend:** The entire audio queue is passed directly to the Android OS. The browser's WebAudio API is completely bypassed.
2. **Gapless Playback:** Playlists are synced to the native layer. When a track finishes, the next track starts instantly at the OS level without having to wake up the JavaScript thread.
3. **Internal Data Sandboxing (Android 11+ Ready):** Picked local MP3 files are automatically cloned into the app's internal secure data directory (`Directory.Data`). This guarantees that playback won't suddenly fail with `Permission Denied` exceptions if the OS revokes temporary URI access upon app shutdown.
4. **Permanent Audio Focus Override:** Implemented a listener to intercept Android's native Audio Focus Ducking events. If the system permanently lowers (ducks) the volume of an online radio stream due to an incoming notification, the audio engine forcibly reinstates the correct volume immediately afterwards.
5. **Flawless Background Execution:** Music continues playing even when the device is locked or asleep (Doze Mode). It utilizes a persistent Android foreground service and `PowerManager.PARTIAL_WAKE_LOCK`.
6. **Low CPU & Battery Consumption:** Audio decoding is hardware-accelerated by the OS. The React UI acts purely as a remote control, resulting in near-zero CPU usage when the screen is off.
7. **Debounced UI Transitions:** Custom event-handling logic ensures that rapid gapless track changes do not cause UI flickering or state glitches.
8. **Custom User-Agent:** Online radio streams that typically block WebView traffic are bypassed by injecting a native `VLC/3.0.18` User-Agent directly into the ExoPlayer data source factory.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, TailwindCSS (v4), Zustand (State Management), Lucide React (Icons).
- **Mobile Engine:** Capacitor v8.
- **Native Audio Plugin:** `@mustafaj/capacitor-plugin-playlist` (forked/modified for optimal `DefaultDataSource` file fetching).
- **Metadata:** `music-metadata-browser` / `jsmediatags` for ID3 tag parsing.

## 📱 Build Instructions

### Prerequisites
- Node.js (v18+)
- Android Studio & Android SDK

### Setup
```bash
# Install dependencies
npm install

# Build the React frontend
npm run build

# Sync assets and code to the Android project
npx cap sync android
```

### Run on Device
```bash
# Open Android Studio to build and run
npx cap open android
```

## 📝 License
This project is for educational and nostalgic purposes. Winamp is a registered trademark of Radionomy / Llama Group.
