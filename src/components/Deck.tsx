import React from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useShallow } from 'zustand/react/shallow';
import { WinampTicker } from './WinampTicker';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { WindowBorder } from './WindowBorder';
import { DeckTimeDisplay } from './DeckTimeDisplay';
import { DeckProgressBar } from './DeckProgressBar';

export function Deck() {
  const { 
    playlist, currentTrackIndex, playbackState, bufferState, connectionState,
    playPrev, togglePlayPause, playNext, setSeekTo
  } = usePlayerStore(useShallow(state => ({
    playlist: state.playlist,
    currentTrackIndex: state.currentTrackIndex,
    playbackState: state.playbackState,
    bufferState: state.bufferState,
    connectionState: state.connectionState,
    playPrev: state.playPrev,
    togglePlayPause: state.togglePlayPause,
    playNext: state.playNext,
    setSeekTo: state.setSeekTo
  })));

  const currentTrack = playlist[currentTrackIndex];
  
  const kbpsValue = currentTrack?.bitrate ? `${currentTrack.bitrate}` : '192';
  const khzValue = currentTrack?.sampleRate ? `${Math.round(currentTrack.sampleRate / 1000)}` : '44';
  const channels = currentTrack?.channels || 'Stereo';
  
  const sanitizeTitle = (title: string) => title.replace(/^\d+[\s\.\-_:\/]+/, '').replace(/\.(mp3|wav|ogg|flac|aac)$/i, '');
  const cleanTitle = currentTrack ? sanitizeTitle(currentTrack.title) : '';
  const displayTitle = currentTrack ? `${currentTrackIndex >= 0 ? (currentTrackIndex + 1).toString().padStart(2, '0') : 1}. ${cleanTitle} ${currentTrack.artist ? `(${currentTrack.artist})` : ''}` : '';
  
  const lcdTextClass = (playbackState === 'playing' || bufferState === 'buffering' || connectionState === 'reconnecting') ? 'lcd-text-playing' : playbackState === 'paused' ? 'lcd-text-paused' : 'lcd-text-stopped';

  let statusText = 'STOPPED';
  if (playbackState === 'playing') {
      if (connectionState === 'reconnecting') {
          statusText = 'RECONN...';
      } else if (bufferState === 'buffering' || bufferState === 'stalled') {
          statusText = 'BUFFER';
      } else {
          statusText = currentTrack?.source === 'radio' ? 'ONLINE' : 'PLAYING';
      }
  } else if (playbackState === 'paused') {
      statusText = 'PAUSED';
  }

  // Helper functions for seek
  const seekBackward = () => {
    if (currentTrack?.source !== 'radio') {
      const state = usePlayerStore.getState();
      setSeekTo(Math.max(0, state.currentTime - 10));
    }
  };

  const seekForward = () => {
    if (currentTrack?.source !== 'radio') {
      const state = usePlayerStore.getState();
      const maxLen = (state.duration && state.duration !== Infinity) ? state.duration : Number.MAX_SAFE_INTEGER;
      setSeekTo(Math.min(maxLen, state.currentTime + 10));
    }
  };

  return (
    <WindowBorder title="WINAMP" titleClassName="text-amber-500" className="w-full flex-none flex flex-col">
      <div className="px-1 pb-1 flex flex-col">
        
        {/* LCD Screen */}
        <div className="lcd-bg w-full flex relative h-[140px] sm:h-[180px] justify-center items-center shrink-0">
            <div className="lcd-scanlines"></div>
            
            {/* Top Left */}
            <DeckTimeDisplay lcdTextClass={lcdTextClass} />
            
            {/* Top Right */}
            <div className={`absolute top-2 right-2 sm:top-3 sm:right-3 font-mono text-lg sm:text-xl tracking-widest flex items-center gap-1 z-10 ${lcdTextClass}`}>
                {kbpsValue}
                <span className="text-sm">kbps</span>
            </div>

            {/* Center Area */}
            <div 
              className="absolute left-2 right-2 sm:left-3 sm:right-3 flex items-center justify-center overflow-hidden z-10"
            >
                <div className={`font-mono text-4xl sm:text-6xl tracking-widest text-center uppercase leading-tight w-full ${lcdTextClass}`}>
                    <WinampTicker text={displayTitle || "NO FILE LOADED"} paused={playbackState !== 'playing'} />
                </div>
            </div>

            {/* Bottom Row Area */}
            <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex justify-between items-center z-10 gap-2">
               {/* Bottom Left */}
               <div className={`font-mono text-lg sm:text-xl tracking-widest ${lcdTextClass}`}>
                  {statusText}
               </div>
               
               {/* LED Progress Bar */}
               <div className="flex-1 h-2 sm:h-2.5 bg-[#166534]/30 rounded overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.5)] border border-[#166534]/40 mx-3 sm:mx-6">
                  <DeckProgressBar lcdTextClass={lcdTextClass} />
               </div>
               
               {/* Bottom Right */}
               <div className="flex items-center translate-x-1 sm:translate-x-1.5">
                 <span className={`font-mono text-lg sm:text-xl tracking-widest ${channels === 'Stereo' ? lcdTextClass : 'lcd-text-stopped'}`}>STEREO</span>
               </div>
            </div>
        </div>

        {/* Transport Controls */}
        <div className="flex gap-2 sm:gap-3 items-center justify-between mt-1 sm:mt-2 pb-1 px-1 shrink-0 w-full">
           <div className="flex gap-1 sm:gap-2 h-[46px] sm:h-[52px] w-full shrink-0">
              {/* Prev */}
              <button onClick={playPrev} className="winamp-btn flex-1 flex items-center justify-center shadow-lg"><SkipBack size={24} className="fill-current stroke-0 drop-shadow-md sm:w-6 sm:h-6" /></button>
              
              {/* Rewind */}
              <button onClick={seekBackward} className={`winamp-btn flex-1 flex items-center justify-center shadow-lg ${currentTrack?.source === 'radio' ? 'opacity-50' : ''}`}><Rewind size={24} className="fill-current stroke-0 drop-shadow-md sm:w-6 sm:h-6" /></button>
              
              {/* Play/Pause */}
              <button onClick={togglePlayPause} className="winamp-btn flex-1 flex items-center justify-center shadow-lg">
                {playbackState === 'playing' ? (
                  <Pause size={24} className="fill-current stroke-[0.5] drop-shadow-md sm:w-6 sm:h-6" />
                ) : (
                  <Play size={24} className="fill-current stroke-0 ml-[2px] drop-shadow-md sm:w-6 sm:h-6" />
                )}
              </button>
              
              {/* Fast Forward */}
              <button onClick={seekForward} className={`winamp-btn flex-1 flex items-center justify-center shadow-lg ${currentTrack?.source === 'radio' ? 'opacity-50' : ''}`}><FastForward size={24} className="fill-current stroke-0 drop-shadow-md sm:w-6 sm:h-6" /></button>
              
              {/* Next */}
              <button onClick={playNext} className="winamp-btn flex-1 flex items-center justify-center shadow-lg"><SkipForward size={24} className="fill-current stroke-0 drop-shadow-md sm:w-6 sm:h-6" /></button>
           </div>
        </div>
      </div>
    </WindowBorder>
  );
}
