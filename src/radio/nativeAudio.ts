import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

export interface NativeAudioPlugin {
  loadQueue(options: { urls: string[], startIndex: number }): Promise<void>;
  play(options: { url: string }): Promise<void>;
  playRadio(options: { url: string }): Promise<void>;
  playNext(): Promise<void>;
  playPrevious(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seekTo(options: { position: number }): Promise<void>;
  getCurrentPosition(): Promise<{ position: number; duration: number }>;
  setVolume(options: { volume: number }): Promise<void>;
  addListener(eventName: 'playbackStateChanged', listenerFunc: (info: { state: number }) => void): any;
  addListener(eventName: 'isPlayingChanged', listenerFunc: (info: { isPlaying: boolean, state: number }) => void): any;
  addListener(eventName: 'itemTransition', listenerFunc: (info: { itemIndex: number }) => void): any;
}

const NativeAudio = registerPlugin<NativeAudioPlugin>('NativeAudio');
export { NativeAudio };

export const isNativeAudioAvailable = () => false;
