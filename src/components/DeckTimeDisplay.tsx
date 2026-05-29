import React from 'react';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../lib/utils';
import { useShallow } from 'zustand/react/shallow';

export function DeckTimeDisplay({ lcdTextClass }: { lcdTextClass: string }) {
  const currentTime = usePlayerStore(state => state.currentTime);
  const timeDisplay = formatTime(currentTime);

  return (
    <div className={`absolute top-2 left-2 sm:top-3 sm:left-3 font-mono text-lg sm:text-xl tracking-widest z-10 ${lcdTextClass}`} style={{ lineHeight: 1 }}>
      {timeDisplay}
    </div>
  );
}
