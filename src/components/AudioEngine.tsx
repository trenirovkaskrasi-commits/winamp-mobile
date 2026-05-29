import { Capacitor } from '@capacitor/core';
import { WebAudioEngine } from './WebAudioEngine';
import { NativeAudioEngine } from './NativeAudioEngine';

export function AudioEngine() {
  if (Capacitor.isNativePlatform()) {
    return <NativeAudioEngine />;
  }
  return <WebAudioEngine />;
}
