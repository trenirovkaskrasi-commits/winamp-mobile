import { create } from "zustand";
import { Track, PlaybackState } from "../types";
import {
  savePlaylist,
  saveSetting,
  loadPlaylist,
  loadSetting,
} from "../lib/db";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { Playlist } from "@mustafaj/capacitor-plugin-playlist";

interface PlayerState {
  playlist: Track[];
  currentTrackIndex: number;
  playbackState: PlaybackState;
  bufferState: import("../types").BufferState;
  connectionState: import("../types").ConnectionState;
  volume: number;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  isRepeat: boolean;

  seekTo: number | null;

  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showImport: boolean;
  setShowImport: (show: boolean) => void;
  showExport: boolean;
  setShowExport: (show: boolean) => void;
  // Actions
  addTracks: (tracks: Track[]) => void;
  playTrack: (index: number) => void;
  playNext: () => void;
  playPrev: () => void;
  togglePlayPause: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setBufferState: (state: import("../types").BufferState) => void;
  setConnectionState: (state: import("../types").ConnectionState) => void;
  clearPlaylist: () => void;
  removeTrack: (index: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  updateTrackMetadata: (index: number, updates: Partial<Track>) => void;
  setSeekTo: (t: number | null) => void;

  // List Ops
  sortPlaylistByTitle: () => void;
  sortPlaylistByArtist: () => void;
  reversePlaylist: () => void;
  removeDuplicates: () => void;
  randomizePlaylist: () => void;

  initStore: () => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  playlist: [],
  currentTrackIndex: -1,
  playbackState: "stopped",
  bufferState: "ready",
  connectionState: "offline",
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  isShuffle: false,
  isRepeat: false,
  seekTo: null,
  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
  showImport: false,
  setShowImport: (show) => set({ showImport: show }),
  showExport: false,
  setShowExport: (show) => set({ showExport: show }),

  addTracks: (tracks) =>
    set((state) => ({ playlist: [...state.playlist, ...tracks] })),

  playTrack: (index) =>
    set((state) => {
      if (Capacitor.isNativePlatform()) {
         Playlist.playTrackByIndex({ index }).catch(console.error);
         return state;
      }
      return {
        currentTrackIndex: index,
        playbackState: "playing",
        currentTime: 0,
        duration: 0,
      };
    }),

  playNext: () =>
    set((state) => {
      if (state.playlist.length === 0) return state;

      let nextIndex = state.currentTrackIndex + 1;
      if (state.isShuffle) {
        nextIndex = Math.floor(Math.random() * state.playlist.length);
      } else if (nextIndex >= state.playlist.length) {
        if (state.isRepeat) {
          nextIndex = 0;
        } else {
          if (Capacitor.isNativePlatform()) {
              Playlist.pause().catch(console.error);
              return state;
          }
          return { playbackState: "stopped", currentTime: 0 };
        }
      }
      
      if (Capacitor.isNativePlatform()) {
          Playlist.playTrackByIndex({ index: nextIndex }).catch(console.error);
          return state;
      }
      return {
        currentTrackIndex: nextIndex,
        playbackState: "playing",
        currentTime: 0,
        duration: 0,
      };
    }),

  playPrev: () =>
    set((state) => {
      if (state.playlist.length === 0) return state;
      let prevIndex = state.currentTrackIndex - 1;
      if (prevIndex < 0) prevIndex = state.playlist.length - 1;
      
      if (Capacitor.isNativePlatform()) {
          Playlist.playTrackByIndex({ index: prevIndex }).catch(console.error);
          return state;
      }
      return {
        currentTrackIndex: prevIndex,
        playbackState: "playing",
        currentTime: 0,
        duration: 0,
      };
    }),

  togglePlayPause: () =>
    set((state) => {
      if (Capacitor.isNativePlatform()) {
         if (state.currentTrackIndex === -1 && state.playlist.length > 0) {
             Playlist.playTrackByIndex({ index: 0 }).catch(console.error);
         } else if (state.playbackState === "playing") {
             Playlist.pause().catch(console.error);
         } else {
             Playlist.play().catch(console.error);
         }
         return state; // Do not mutate state here; let NativeAudioEngine sync it via native events
      }
      
      if (state.currentTrackIndex === -1 && state.playlist.length > 0) {
        return { currentTrackIndex: 0, playbackState: "playing" };
      }
      const nextState =
        state.playbackState === "playing" ? "paused" : "playing";
      return { playbackState: nextState };
    }),

  stop: () => 
    set((state) => {
      if (Capacitor.isNativePlatform()) {
          Playlist.pause().catch(console.error);
          Playlist.seekTo({ position: 0 }).catch(console.error);
          return state;
      }
      return { playbackState: "stopped", currentTime: 0 };
    }),

  setVolume: (volume) => set({ volume }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setPlaybackState: (playbackState) => set({ playbackState }),
  setBufferState: (bufferState) => set({ bufferState }),
  setConnectionState: (connectionState) => set({ connectionState }),

  clearPlaylist: () =>
    set((state) => {
      state.playlist.forEach((t) => {
        if (t.source === "local" && t.url && !t.url.includes("winamp_music")) {
           URL.revokeObjectURL(t.url);
        }
      });
      return { playlist: [], currentTrackIndex: -1, playbackState: "stopped" };
    }),
  removeTrack: (index) =>
    set((state) => {
      const newPlaylist = [...state.playlist];
      const removed = newPlaylist.splice(index, 1)[0];
      if (removed && removed.source === "local" && removed.url) {
         if (!removed.url.includes("winamp_music")) {
            URL.revokeObjectURL(removed.url);
         }
      }
      let newIndex = state.currentTrackIndex;
      if (index < state.currentTrackIndex) {
        newIndex--;
      } else if (index === state.currentTrackIndex) {
        newIndex = -1; // Need logic to handle this gracefully if it's currently playing
      }
      return { playlist: newPlaylist, currentTrackIndex: newIndex };
    }),

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),

  updateTrackMetadata: (index, updates) =>
    set((state) => {
      const newPlaylist = [...state.playlist];
      if (newPlaylist[index]) {
        newPlaylist[index] = { ...newPlaylist[index], ...updates };
      }
      return { playlist: newPlaylist };
    }),

  setSeekTo: (t) => set({ seekTo: t }),

  sortPlaylistByTitle: () =>
    set((state) => {
      const sorted = [...state.playlist].sort((a, b) =>
        a.title.localeCompare(b.title),
      );
      return { playlist: sorted };
    }),

  sortPlaylistByArtist: () =>
    set((state) => {
      const sorted = [...state.playlist].sort((a, b) =>
        (a.artist || "Unknown").localeCompare(b.artist || "Unknown"),
      );
      return { playlist: sorted };
    }),

  reversePlaylist: () =>
    set((state) => ({ playlist: [...state.playlist].reverse() })),

  removeDuplicates: () =>
    set((state) => {
      const seen = new Set();
      const newPlaylist = state.playlist.filter((t) => {
        const key = `${t.title}-${t.artist}-${t.source}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { playlist: newPlaylist };
    }),

  randomizePlaylist: () =>
    set((state) => {
      const shuffled = [...state.playlist];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { playlist: shuffled };
    }),

  initStore: async () => {
    try {
      const playlist = await loadPlaylist();
      // regenerate blob urls for stored files
      playlist.forEach((t) => {
        if (t.file) {
          try {
            // We no longer pre-generate object URLs to save memory
            // t.url = URL.createObjectURL(t.file);
            t.url = "";
          } catch (err) {
            console.error("Failed to create object URL for track", t, err);
          }
        }
      });

      const volume = await loadSetting("volume", 0.8);
      const isShuffle = await loadSetting("isShuffle", false);
      const isRepeat = await loadSetting("isRepeat", false);
      set({ playlist, volume, isShuffle, isRepeat });
    } catch (error) {
      console.error("Failed to initialize store", error);
    }
  },
}));

usePlayerStore.subscribe((state, prevState) => {
  if (state.playlist !== prevState.playlist) {
    savePlaylist(state.playlist).catch((e) =>
      console.warn("Failed to save playlist to idb", e),
    );
  }
  if (state.volume !== prevState.volume) {
    saveSetting("volume", state.volume).catch((e) =>
      console.warn("Failed to save volume", e),
    );
  }
  if (state.isShuffle !== prevState.isShuffle) {
    saveSetting("isShuffle", state.isShuffle).catch((e) =>
      console.warn("Failed to save isShuffle", e),
    );
  }
  if (state.isRepeat !== prevState.isRepeat) {
    saveSetting("isRepeat", state.isRepeat).catch((e) =>
      console.warn("Failed to save isRepeat", e),
    );
  }
});
