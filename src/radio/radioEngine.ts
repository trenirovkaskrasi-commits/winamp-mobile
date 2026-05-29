import { ReconnectManager } from "./reconnectManager";
import { IcyParser } from "./icyParser";
import { Capacitor } from '@capacitor/core';
import { Playlist } from '@mustafaj/capacitor-plugin-playlist';

type RadioEvent =
  | { type: "metadata"; data: Record<string, string> }
  | { type: "bufferState"; state: "buffering" | "ready" | "stalled" }
  | { type: "connectionState"; state: "connected" | "reconnecting" | "offline" }
  | { type: "error"; error: any };

export class RadioEngine {
  private audioEl: HTMLAudioElement;
  private reconnectManager = new ReconnectManager();
  private abortController: AbortController | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private onEvent: (evt: RadioEvent) => void;
  private isPlaying = false;
  private lastTime = 0;
  private stallCount = 0;
  private listeners: { type: string; fn: EventListener }[] = [];

  private playlistListener: any = null;

  constructor(audioEl: HTMLAudioElement, onEvent: (evt: RadioEvent) => void) {
    this.audioEl = audioEl;
    this.onEvent = onEvent;

    const onPlaying = () => this.setBufferState("ready");
    const onWaiting = () => this.setBufferState("buffering");
    const onStalled = () => this.setBufferState("stalled");

    this.audioEl.addEventListener("playing", onPlaying);
    this.audioEl.addEventListener("waiting", onWaiting);
    this.audioEl.addEventListener("stalled", onStalled);

    this.listeners.push({ type: "playing", fn: onPlaying });
    this.listeners.push({ type: "waiting", fn: onWaiting });
    this.listeners.push({ type: "stalled", fn: onStalled });

    if (Capacitor.isNativePlatform()) {
      Playlist.initialize().catch(console.error);
      this.playlistListener = Playlist.addListener('status', (status: any) => {
        console.log("[RadioEngine] Native status received:", status);
        const val = status.value;
        if (!val) return;

        if (status.msgType === 100) { // RMXSTATUS_TRACK_CHANGED
          // Native Track changed
        } else if (val.status === 'playing') {
          this.isPlaying = true;
          this.setConnectionState("connected");
          this.setBufferState("ready");
        } else if (val.status === 'loading' || status.msgType === 25) { // RMXSTATUS_BUFFERING
          this.setBufferState("buffering");
        } else if (val.status === 'paused' || val.status === 'stopped') {
          this.isPlaying = false;
        } else if (val.status === 'error' || status.msgType === 5) { // RMXSTATUS_ERROR
          this.setConnectionState("offline");
          this.setBufferState("stalled");
        }
      });
    }
  }

  private setConnectionState(state: "connected" | "reconnecting" | "offline") {
    this.onEvent({ type: "connectionState", state });
  }

  private setBufferState(state: "buffering" | "ready" | "stalled") {
    this.onEvent({ type: "bufferState", state });
  }

  private isInitializing = false;

  async play(url: string) {
    if (this.isInitializing) {
      console.warn(
        "[RadioEngine] play() called while initializing, ignoring to prevent loop.",
      );
      return;
    }

    try {
      this.isInitializing = true;

      // Anti-click transition: fade out over 50ms before swapping src
      const originalVolume = this.audioEl.volume;
      if (!this.audioEl.paused && this.audioEl.src) {
        const fadeSteps = 5;
        const fadeDuration = 50;
        const stepTime = fadeDuration / fadeSteps;
        const stepVol = originalVolume / fadeSteps;

        for (let i = 0; i < fadeSteps; i++) {
          this.audioEl.volume = Math.max(0, this.audioEl.volume - stepVol);
          await new Promise((r) => setTimeout(r, stepTime));
        }
      }

      // IMPLEMENT PROPER STREAM TEARDOWN BEFORE SETTING NEXT
      this.audioEl.pause();
      this.audioEl.src = "";
      this.audioEl.removeAttribute("src");
      this.audioEl.load();

      // Restore original volume instantly for the next stream
      this.audioEl.volume = originalVolume;

      this.stop();
      this.isPlaying = true;

      console.log(`[RadioEngine] play() called with dynamic URL: ${url}`);
      await this.connect(url);
    } finally {
      // SECURE SEMAPHORE RESET
      this.isInitializing = false;
    }
  }

  private async connect(url: string) {
    if (!this.isPlaying) {
      return;
    }

    this.abortController = new AbortController();
    this.setConnectionState("connected");
    this.setBufferState("buffering");

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        console.log(`[RadioEngine] Setting Native Playlist src = ${url}`);
        await Playlist.clearAllItems();
        await Playlist.addItem({
          item: {
            trackId: 'radio-stream',
            assetUrl: url,
            title: 'Radio Station',
            artist: 'Streaming...'
          }
        });
        await Playlist.play();
        this.setConnectionState("connected");
      } catch (err) {
        console.error(`[RadioEngine] Native connect() threw:`, err);
        this.handleConnectionDrop(url);
      }
      return;
    }

    let processedUrl = url;
    if (url.startsWith("http://")) {
      processedUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
    }

    try {
      console.log(`[RadioEngine] Setting audioEl.src = ${processedUrl}`);
      this.audioEl.src = processedUrl;
      this.audioEl.load();

      const playPromise = this.audioEl.play();
      if (playPromise !== undefined) {
        await playPromise.catch((err) =>
          console.warn(
            "[RadioEngine] Playback aborted or interrupted:",
            err.message,
          ),
        );
      }

      if (this.isPlaying) {
        this.setConnectionState("connected");
      }
    } catch (err) {
      console.error(`[RadioEngine] connect() threw:`, err);
      if (err instanceof Error && err.name !== "AbortError") {
        this.handleConnectionDrop(url);
      }
    }
  }

  private handleConnectionDrop(url: string) {
    if (!this.isPlaying) return;

    console.error(
      "[RadioEngine] Stream dropped. Reconnect is TEMPORARILY DISABLED for debugging.",
    );
    this.setConnectionState("offline");
    this.setBufferState("stalled");
    this.onEvent({
      type: "error",
      error: new Error("Radio connection lost (Reconnect Disabled)"),
    });
  }

  stop() {
    this.isPlaying = false;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (Capacitor.isNativePlatform()) {
      Playlist.pause().catch(console.error);
    }

    this.audioEl.pause();
    this.audioEl.removeAttribute("src");
    this.audioEl.load();
    this.setConnectionState("offline");
    this.setBufferState("ready");
  }

  destroy() {
    this.stop();
    this.listeners.forEach((l) =>
      this.audioEl.removeEventListener(l.type, l.fn),
    );
    this.listeners = [];
    if (this.playlistListener) {
      this.playlistListener.then((l: any) => l.remove()).catch(console.error);
    }
  }
}
