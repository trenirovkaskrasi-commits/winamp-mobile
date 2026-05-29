import React from 'react';
import { usePlayerStore } from '../store/playerStore';

export function DeckProgressBar({ lcdTextClass }: { lcdTextClass: string }) {
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);
  const playbackState = usePlayerStore(state => state.playbackState);
  const connectionState = usePlayerStore(state => state.connectionState);

  const percentage = (duration && duration !== Infinity) 
    ? (currentTime / duration) * 100 
    : (playbackState === 'playing' || connectionState === 'reconnecting' ? 100 : 0);

  return (
    <div className={`h-full w-full ${playbackState === 'playing' ? 'bg-current lcd-text-playing shadow-[0_0_8px_currentColor]' : playbackState === 'paused' ? 'bg-current lcd-text-paused' : 'bg-transparent'} transition-transform duration-150 origin-left`}
         style={{ transform: `scaleX(${percentage / 100})` }}>
    </div>
  );
}
