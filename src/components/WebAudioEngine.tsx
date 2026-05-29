import { useEffect, useRef } from "react";
import { usePlayerStore } from "../store/playerStore";
import { useShallow } from "zustand/react/shallow";
import { RadioEngine } from "../radio/radioEngine";

export function WebAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const radioEngineRef = useRef<RadioEngine | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const {
    playlist,
    currentTrackIndex,
    playbackState,
    volume,
    seekTo,
    playNext,
    playPrev,
    togglePlayPause,
    setCurrentTime,
    setDuration,
    setPlaybackState,
    setBufferState,
    setConnectionState,
    updateTrackMetadata,
    setSeekTo,
  } = usePlayerStore(
    useShallow((state) => ({
      playlist: state.playlist,
      currentTrackIndex: state.currentTrackIndex,
      playbackState: state.playbackState,
      volume: state.volume,
      seekTo: state.seekTo,
      playNext: state.playNext,
      playPrev: state.playPrev,
      togglePlayPause: state.togglePlayPause,
      setCurrentTime: state.setCurrentTime,
      setDuration: state.setDuration,
      setPlaybackState: state.setPlaybackState,
      setBufferState: state.setBufferState,
      setConnectionState: state.setConnectionState,
      updateTrackMetadata: state.updateTrackMetadata,
      setSeekTo: state.setSeekTo,
    })),
  );

  // Setup refs properly and instantiate RadioEngine
  useEffect(() => {
    if (!audioRef.current) return;

    radioEngineRef.current = new RadioEngine(audioRef.current, (event) => {
      const state = usePlayerStore.getState();
      const track = state.playlist[state.currentTrackIndex];
      if (!track || track.source !== "radio") return;

      if (event.type === "metadata") {
        if (event.data.StreamTitle) {
          updateTrackMetadata(state.currentTrackIndex, {
            title: event.data.StreamTitle,
          });
        }
      } else if (event.type === "bufferState") {
        setBufferState(event.state);
      } else if (event.type === "connectionState") {
        setConnectionState(event.state);
        if (event.state === "connected") {
          setPlaybackState("playing");
        } else if (event.state === "reconnecting") {
          setPlaybackState("playing");
        }
      } else if (event.type === "error") {
        setPlaybackState("stopped");
      }
    });

    const audio = audioRef.current;

    let lastTimeUpdate = 0;
    const onTimeUpdate = () => {
      if (!audio) return;
      const now = performance.now();
      // Throttle exact time store updates to reduce React lifecycle thrashing,
      // DOM visual update can be more frequent if needed, but store should be ~2-3hz
      if (now - lastTimeUpdate < 400) return;
      lastTimeUpdate = now;

      const state = usePlayerStore.getState();
      const track = state.playlist[state.currentTrackIndex];
      setCurrentTime(audio.currentTime);
      if (track && track.source !== "radio") {
        setBufferState("ready");
      }
    };

    const onDurationChange = () => {
      setDuration(audio.duration);
      const state = usePlayerStore.getState();
      const track = state.playlist[state.currentTrackIndex];
      if (
        track &&
        track.source === "local" &&
        (track.duration === undefined || track.duration !== audio.duration)
      ) {
        updateTrackMetadata(state.currentTrackIndex, {
          duration: audio.duration,
        });
      }
    };

    const onEnded = () => {
      const state = usePlayerStore.getState();
      const track = state.playlist[state.currentTrackIndex];
      if (!track) return;
      if (track.source === "local") {
        playNext();

        // Synchronous autoplay bypass for Doze/Background mode
        const newState = usePlayerStore.getState();
        const nextTrack = newState.playlist[newState.currentTrackIndex];
        
        if (nextTrack && nextTrack.source === 'local' && nextTrack.id !== track.id) {
             currentUrlRef.current = nextTrack.id; // Prevent useEffect from recreating blob
             if (activeBlobUrlRef.current) {
                 URL.revokeObjectURL(activeBlobUrlRef.current);
                 activeBlobUrlRef.current = null;
             }
             
             let targetUrl = nextTrack.url || "";
             if (nextTrack.file) {
                 targetUrl = URL.createObjectURL(nextTrack.file);
                 activeBlobUrlRef.current = targetUrl;
             }
             audio.src = targetUrl;
             audio.load();
             audio.play().catch((e) => console.warn("Sync play failed:", e));
             
             // Update MediaSession for the new track
             if ("mediaSession" in navigator) {
                 navigator.mediaSession.metadata = new MediaMetadata({
                     title: nextTrack.title,
                     artist: nextTrack.artist || "Unknown Artist",
                 });
             }
        }
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      if (radioEngineRef.current) {
        radioEngineRef.current.destroy();
      }
    };
  }, [
    playNext,
    setCurrentTime,
    setDuration,
    setPlaybackState,
    setBufferState,
    setConnectionState,
    updateTrackMetadata,
  ]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Handle stream metadata SSE
  useEffect(() => {
    const currentTrack = playlist[currentTrackIndex];
    if (!currentTrack || currentTrack.source !== "radio") return;

    let mediaUrl = currentTrack.url;
    let eventSource: EventSource | null = null;
    if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
      eventSource = new EventSource(
        `/api/proxy-meta?url=${encodeURIComponent(currentTrack.url)}`,
      );
      eventSource.onmessage = (e) => {
        try {
          const meta = JSON.parse(e.data);
          if (meta.StreamTitle) {
            updateTrackMetadata(currentTrackIndex, { title: meta.StreamTitle });
          }
        } catch (err) {}
      };
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [currentTrackIndex, playlist, updateTrackMetadata]);

  // Track playing / pausing
  const activeBlobUrlRef = useRef<string | null>(null);

  const cleanupActiveBlob = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrackIndex >= 0 && currentTrackIndex < playlist.length) {
      const track = playlist[currentTrackIndex];
      const isNewTrack = currentUrlRef.current !== track.id;

      if (isNewTrack) {
        currentUrlRef.current = track.id; // use ID to track instead of URL properly

        // Clean up previous blob URL if any to prevent memory leaks in mobile GC
        cleanupActiveBlob();

        if (track.source === "radio") {
          if (radioEngineRef.current) {
            radioEngineRef.current.play(track.url);
          }
        } else {
          if (radioEngineRef.current) radioEngineRef.current.stop();

          // Generate object URL just-in-time for local playback
          let targetUrl = track.url || "";
          if (track.file) {
            targetUrl = URL.createObjectURL(track.file);
            activeBlobUrlRef.current = targetUrl;
          }

          audio.src = targetUrl;
          audio.load(); // Forces decode engine to bypass complex sub-graphs
        }
      }

      if (track.source === "local") {
        if (playbackState === "playing") {
          audio.play().catch((e) => {
            if (e.name !== "AbortError") setPlaybackState("stopped");
          });
        } else if (playbackState === "paused") {
          audio.pause();
        } else if (playbackState === "stopped") {
          audio.pause();
          audio.currentTime = 0;
          // Clear URL to fully drop decode
          cleanupActiveBlob();
          audio.removeAttribute("src");
          audio.load();
        }
      } else {
        if (playbackState === "paused" || playbackState === "stopped") {
          if (radioEngineRef.current) radioEngineRef.current.stop();
          currentUrlRef.current = null;
        } else if (playbackState === "playing" && !isNewTrack && !audio.src) {
          let mediaUrl = track.url;
          if (radioEngineRef.current) radioEngineRef.current.play(mediaUrl);
        }
      }

      if ("mediaSession" in navigator && isNewTrack) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist || "Unknown Artist",
        });

        navigator.mediaSession.setActionHandler("play", () =>
          togglePlayPause(),
        );
        navigator.mediaSession.setActionHandler("pause", () =>
          togglePlayPause(),
        );
        navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
        navigator.mediaSession.setActionHandler("previoustrack", () =>
          playPrev(),
        );
      }

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState =
          playbackState === "playing"
            ? "playing"
            : playbackState === "paused"
              ? "paused"
              : "none";
      }
    } else {
      if (radioEngineRef.current) radioEngineRef.current.stop();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      cleanupActiveBlob();
      currentUrlRef.current = null;
    }

    // Explicit cleanup when component unmounts
    return () => {
      // Do not cleanup blob on simple re-renders, only managed within effect bounds appropriately
    };
  }, [currentTrackIndex, playlist, playbackState]);

  // Handle seeking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekTo === null) return;
    const track = playlist[currentTrackIndex];
    if (track && track.source === "local") {
      audio.currentTime = seekTo;
    }
    setSeekTo(null);
  }, [seekTo, setSeekTo, currentTrackIndex, playlist]);

  return <audio ref={audioRef} preload="auto" className="hidden" />;
}
