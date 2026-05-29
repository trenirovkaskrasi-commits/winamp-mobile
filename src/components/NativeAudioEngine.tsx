import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useShallow } from 'zustand/react/shallow';
import { Playlist } from '@mustafaj/capacitor-plugin-playlist';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function NativeAudioEngine() {
  const { 
    playlist, 
    currentTrackIndex, 
    playbackState, 
    volume, 
    seekTo,
    togglePlayPause,
    setCurrentTime,
    setDuration,
    setPlaybackState,
    setBufferState,
    setConnectionState,
    updateTrackMetadata,
    setSeekTo,
  } = usePlayerStore(useShallow(state => ({
    playlist: state.playlist,
    currentTrackIndex: state.currentTrackIndex,
    playbackState: state.playbackState,
    volume: state.volume,
    seekTo: state.seekTo,
    togglePlayPause: state.togglePlayPause,
    setCurrentTime: state.setCurrentTime,
    setDuration: state.setDuration,
    setPlaybackState: state.setPlaybackState,
    setBufferState: state.setBufferState,
    setConnectionState: state.setConnectionState,
    updateTrackMetadata: state.updateTrackMetadata,
    setSeekTo: state.setSeekTo,
  })));

  const isInitialized = useRef(false);
  const skipNextSync = useRef(false);
  const stateTimeout = useRef<any>(null);

  // Initialize and listen to native events
  useEffect(() => {
    let listener: any = null;

    const init = async () => {
      try {
        await Playlist.initialize();
        isInitialized.current = true;
        
        listener = await Playlist.addListener('status', (status: any) => {
          const val = status.value;
          if (!val) return;

          if (status.msgType === 100) { // RMXSTATUS_TRACK_CHANGED
            const newIndex = val.currentIndex;
            if (newIndex >= 0 && newIndex !== usePlayerStore.getState().currentTrackIndex) {
               skipNextSync.current = true;
               usePlayerStore.setState({ currentTrackIndex: newIndex });
            }
          } else if (val.status === 'playing') {
            if (stateTimeout.current) clearTimeout(stateTimeout.current);
            setPlaybackState('playing');
            setConnectionState('connected');
            setBufferState('ready');
            
            // BUG 2 FIX: Explicitly force volume back to maximum to overwrite Android's permanent Audio Focus ducking
            // This ensures Shoutcast/Icecast radio streams regain full volume after a notification is dismissed.
            Playlist.setPlaybackVolume({ volume: usePlayerStore.getState().volume }).catch(console.error);
          } else if (val.status === 'paused' || val.status === 'stopped') {
            if (stateTimeout.current) clearTimeout(stateTimeout.current);
            stateTimeout.current = setTimeout(() => {
                setPlaybackState(val.status === 'stopped' ? 'stopped' : 'paused');
            }, 150); // Debounce to prevent LCD flicker during gapless track transition
          } else if (val.status === 'loading' || status.msgType === 25) { // BUFFERING
            setBufferState('buffering');
          } else if (val.status === 'error' || status.msgType === 5) {
            setConnectionState('offline');
            setBufferState('stalled');
          }

          if (val.currentPosition !== undefined && val.currentPosition >= 0) {
              setCurrentTime(val.currentPosition);
          }
          if (val.duration !== undefined && val.duration > 0) {
              setDuration(val.duration);
          }
        });
      } catch (e) {
        console.error("[NativeAudioEngine] Init error", e);
      }
    };
    init();

    // Polling interval for currentTime and duration (Bug 6 fix)
    const interval = setInterval(async () => {
      const state = usePlayerStore.getState();
      if (state.playbackState === 'playing') {
         try {
           const pos = await Playlist.getPosition();
           const dur = await Playlist.getDuration();
           if (pos && pos.value >= 0) state.setCurrentTime(pos.value);
           if (dur && dur.value > 0) state.setDuration(dur.value);
         } catch (e) {
           // ignore
         }
      }
    }, 1000);

    // App state listener for resuming (Bug 3 & 4 sync fix)
    const appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
       if (isActive) {
           // On resume, force a dummy volume update or position query to wake up the plugin
           // or just rely on the background queued events.
           try {
              const pos = await Playlist.getPosition();
              if (pos && pos.value >= 0) usePlayerStore.getState().setCurrentTime(pos.value);
           } catch(e) {}
       }
    });

    return () => {
      if (listener) listener.remove();
      clearInterval(interval);
      appStateListener.then(l => l.remove()).catch(console.error);
      Playlist.release().catch(console.error);
    };
  }, []);

  const prevPlaylistRef = useRef<any[]>([]);

  // Sync Playlist changes
  useEffect(() => {
    if (!isInitialized.current) return;
    
    const syncPlaylist = async () => {
      try {
        const prev = prevPlaylistRef.current;
        const current = playlist;
        
        let isAppendOnly = false;
        if (current.length > prev.length && prev.length > 0) {
            isAppendOnly = true;
            for (let i = 0; i < prev.length; i++) {
                if (prev[i].id !== current[i].id) {
                    isAppendOnly = false;
                    break;
                }
            }
        }

        const toNativeItem = (track: any) => ({
          trackId: track.id,
          assetUrl: track.url,
          title: track.title || 'Unknown Title',
          artist: track.artist || 'Unknown Artist',
          album: track.album || '',
          isStream: track.source === 'radio'
        });

        if (isAppendOnly) {
            const newItems = current.slice(prev.length).map(toNativeItem);
            await Playlist.addAllItems({ items: newItems });
            console.log("[NativeAudioEngine] Appended items natively:", newItems.length);
        } else {
            const nativeItems = current.map(toNativeItem);
            const shouldStartPaused = playbackState !== 'playing';
            
            await Playlist.setPlaylistItems({
              items: nativeItems,
              options: { retainPosition: true, startPaused: shouldStartPaused }
            });
            console.log("[NativeAudioEngine] Playlist synced natively (full replace)");
        }
        
        prevPlaylistRef.current = current;
      } catch (e) {
         console.error("[NativeAudioEngine] setPlaylistItems error", e);
      }
    };
    
    syncPlaylist();
  }, [playlist]);

  // Sync Current Track Index
  useEffect(() => {
    if (!isInitialized.current) return;
    
    if (skipNextSync.current) {
        skipNextSync.current = false;
        return; // index changed by native event, do not trigger native playTrackByIndex
    }
    
    if (currentTrackIndex >= 0 && currentTrackIndex < playlist.length) {
       Playlist.playTrackByIndex({ index: currentTrackIndex, position: 0 }).catch(console.error);
    } else {
       Playlist.pause().catch(console.error);
    }
  }, [currentTrackIndex]);

  // Sync Playback State
  useEffect(() => {
    if (!isInitialized.current) return;
    
    if (playbackState === 'playing') {
       Playlist.play().catch(console.error);
    } else if (playbackState === 'paused') {
       Playlist.pause().catch(console.error);
    } else if (playbackState === 'stopped') {
       Playlist.pause().catch(console.error); // Playlist plugin uses pause for stop usually
    }
  }, [playbackState]);

  // Sync Volume
  useEffect(() => {
    if (!isInitialized.current) return;
    Playlist.setPlaybackVolume({ volume }).catch(console.error);
  }, [volume]);

  // Handle Seeking
  useEffect(() => {
    if (!isInitialized.current || seekTo === null) return;
    Playlist.seekTo({ position: seekTo }).catch(console.error);
    setSeekTo(null);
  }, [seekTo]);

  return <></>;
}
