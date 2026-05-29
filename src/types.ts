export type TrackSource = 'local' | 'radio';

export interface Track {
  id: string;
  source: TrackSource;
  title: string;
  artist?: string;
  url: string;
  // Metadata for LCD
  bitrate?: number;
  sampleRate?: number;
  codec?: string;
  channels?: string;
  // Local object URL for playing
  file?: File;
  duration?: number;
}

export type PlaybackState = 'playing' | 'paused' | 'stopped';
export type BufferState = 'buffering' | 'ready' | 'stalled';
export type ConnectionState = 'connected' | 'reconnecting' | 'offline';
