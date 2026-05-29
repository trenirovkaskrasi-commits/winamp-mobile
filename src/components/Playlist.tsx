import React, { useRef, useState } from "react";
import { usePlayerStore } from "../store/playerStore";
import { formatTime, cn, generateId } from "../lib/utils";
import { WindowBorder } from "./WindowBorder";
import { Track } from "../types";
import { ExportModal, ImportModal } from "./PlaylistModals";
import { SavePlaylistModal } from "./SavePlaylistModal";
import { LocalMusicModal } from "./LocalMusicModal";
import { OnlineRadioModal } from "./OnlineRadioModal";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

let globalMetadataWorker: Worker | null = null;
if (typeof window !== "undefined") {
  globalMetadataWorker = new Worker(
    new URL("../workers/metadata.worker.ts", import.meta.url),
    { type: "module" },
  );
  globalMetadataWorker.onmessage = (e) => {
    const { trackId, updates, success } = e.data;
    if (success) {
      const fullList = usePlayerStore.getState().playlist;
      const idx = fullList.findIndex((t) => t.id === trackId);
      if (idx !== -1) {
        usePlayerStore.getState().updateTrackMetadata(idx, updates);
      }
    }
  };
}

function useContainerSize(ref: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

import { useShallow } from "zustand/react/shallow";

export function Playlist() {
  const {
    playlist,
    currentTrackIndex,
    playTrack,
    removeTrack,
    clearPlaylist,
    addTracks,
    stop,
    playNext,
    playPrev,
    sortPlaylistByTitle,
    sortPlaylistByArtist,
    reversePlaylist,
    removeDuplicates,
    randomizePlaylist,
    showImport,
    setShowImport,
    showExport,
    setShowExport,
    updateTrackMetadata,
    setShowSettings,
  } = usePlayerStore(
    useShallow((state) => ({
      playlist: state.playlist,
      currentTrackIndex: state.currentTrackIndex,
      playTrack: state.playTrack,
      removeTrack: state.removeTrack,
      clearPlaylist: state.clearPlaylist,
      addTracks: state.addTracks,
      stop: state.stop,
      playNext: state.playNext,
      playPrev: state.playPrev,
      sortPlaylistByTitle: state.sortPlaylistByTitle,
      sortPlaylistByArtist: state.sortPlaylistByArtist,
      reversePlaylist: state.reversePlaylist,
      removeDuplicates: state.removeDuplicates,
      randomizePlaylist: state.randomizePlaylist,
      showImport: state.showImport,
      setShowImport: state.setShowImport,
      showExport: state.showExport,
      setShowExport: state.setShowExport,
      updateTrackMetadata: state.updateTrackMetadata,
      setShowSettings: state.setShowSettings,
    })),
  );

  const [showLocalMusic, setShowLocalMusic] = useState(false);
  const [showOnlineRadio, setShowOnlineRadio] = useState(false);
  const [showSavePlaylist, setShowSavePlaylist] = useState(false);
  const [showListOpts, setShowListOpts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerSize(containerRef);

  const virtualizer = useVirtualizer({
    count: playlist.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 24,
    overscan: 5,
  });

  const handleAddFilesNative = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // @ts-ignore
        const result = await FilePicker.pickFiles({
          types: ["audio/*"],
          multiple: true,
        });
        
        // Ensure sandbox directory exists
        try {
          await Filesystem.mkdir({ path: 'winamp_music', directory: Directory.Data, recursive: true });
        } catch(e) {}
        
        const newTracks: Track[] = [];
        for (const f of result.files) {
          if (!f.path) continue;
          
          const id = generateId();
          // Keep the original extension but prefix with unique ID to avoid collisions
          const safeName = `winamp_music/${id}_${f.name}`;
          
          await Filesystem.copy({
            from: f.path,
            to: safeName,
            toDirectory: Directory.Data
          });
          
          const uriResult = await Filesystem.getUri({
            path: safeName,
            directory: Directory.Data
          });
          
          newTracks.push({
            id: id,
            source: "local",
            title: f.name.replace(/\.[^/.]+$/, ""),
            url: uriResult.uri, // This is a permanent file:// URI
            file: undefined,
          });
        }
        
        if (newTracks.length > 0) addTracks(newTracks);
      } catch (e) {
        console.error("Error adding native files:", e);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    handleFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const handleFiles = (files: File[]) => {
    const audioFiles = files.filter((f) => {
      const t = f.type.toLowerCase();
      const n = f.name.toLowerCase();
      // On some Android browsers, the mime type might be missing or incomplete, so check extension as well
      return (
        t.startsWith("audio/") ||
        t.startsWith("video/") ||
        t.startsWith("application/ogg") ||
        n.endsWith(".mp3") ||
        n.endsWith(".flac") ||
        n.endsWith(".wav") ||
        n.endsWith(".m4a") ||
        n.endsWith(".ogg") ||
        n.endsWith(".aac") ||
        n.endsWith(".wma")
      );
    });

    const newTracks: Track[] = audioFiles.map((origFile) => {
      const file = new File([origFile], origFile.name, { type: origFile.type });
      return {
        id: generateId(),
        source: "local",
        title: file.name.replace(/\.[^/.]+$/, ""),
        url: "", // Object URL will be generated only when playing by the audio engine
        file: file,
      };
    });

    if (newTracks.length > 0) {
      addTracks(newTracks);

      // parse ID3 in worker
      newTracks.forEach((track) => {
        if (globalMetadataWorker) {
          globalMetadataWorker.postMessage({
            trackId: track.id,
            file: track.file,
          });
        }
      });
    } else if (files.length > 0) {
      alert(
        "Не бяха намерени разпознати аудио файлове.\nИмена: " +
          files.map((f) => f.name + " (" + f.type + ")").join(", "),
      );
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const traverseFileTree = async (entry: any, fileList: File[]) => {
    if (entry) {
      if (entry.isFile) {
        await new Promise<void>((resolve) => {
          entry.file((f: File) => {
            fileList.push(f);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries = await new Promise<any[]>((resolve) => {
          dirReader.readEntries((results: any) => resolve(results));
        });
        for (const e of entries) {
          await traverseFileTree(e, fileList);
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.items) {
      const dropFiles: File[] = [];
      const promises = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === "file") {
          const entry = item.webkitGetAsEntry();
          promises.push(traverseFileTree(entry, dropFiles));
        }
      }
      await Promise.all(promises);
      handleFiles(dropFiles);
    } else {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const track = playlist[index];
    const isActive = index === currentTrackIndex;
    const trackIndexStr = (index + 1).toString() + ".";
    const sanitizeTitle = (title: string) => title.replace(/^\d+[\s\.\-_:\/]+/, '').replace(/\.(mp3|wav|ogg|flac|aac)$/i, '');
    const cleanTitle = sanitizeTitle(track.title);

    const [swipeOffset, setSwipeOffset] = useState(0);
    const startX = useRef<number | null>(null);
    const startY = useRef<number | null>(null);
    const isSwiping = useRef(false);

    const handlePointerDown = (e: React.PointerEvent) => {
      // Ignore right clicks
      if (e.button !== 0) return;
      startX.current = e.clientX;
      startY.current = e.clientY;
      isSwiping.current = false;
      // Capture the pointer so that we keep getting events even if the pointer moves outside the element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (startX.current === null || startY.current === null) return;

      const diffX = startX.current - e.clientX;
      const diffY = startY.current - e.clientY;

      if (!isSwiping.current) {
        // threshold to distinguish swipe from simple click/scroll
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
          isSwiping.current = true;
        } else if (Math.abs(diffY) > 10) {
          // It's probably a vertical scroll
          startX.current = null;
          return;
        }
      }

      if (isSwiping.current) {
        if (diffX > 0) {
          setSwipeOffset(Math.min(diffX, 80));
        } else {
          setSwipeOffset(0);
        }
      }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      if (startX.current === null) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (swipeOffset > 40) {
        removeTrack(index);
      }
      setSwipeOffset(0);
      startX.current = null;
      startY.current = null;
      isSwiping.current = false;
    };

    return (
      <div
        style={style}
        className="relative overflow-hidden cursor-pointer group select-none touch-pan-y"
        onDoubleClick={() => playTrack(index)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Action Background */}
        <div className="absolute inset-y-0 right-0 w-[80px] bg-red-600 flex items-center justify-end pr-4 text-white font-bold text-xs tracking-widest pointer-events-none">
          DEL
        </div>

        {/* Track UI */}
        <div
          className={cn(
            "flex flex-row items-center justify-between px-1 font-mono text-[13px] sm:text-[15px] h-full w-full transition-transform",
            isActive
              ? "bg-[#0000a8] text-white"
              : "text-[#39ff14] hover:bg-[#0000a8]/30",
            "bg-[#000] sm:bg-transparent",
          )}
          style={{ transform: `translateX(-${swipeOffset}px)` }}
        >
          <div className="flex items-center gap-1 overflow-hidden h-full w-full">
            <span className="min-w-[20px] sm:min-w-[24px] text-right shrink-0 mr-1 opacity-80">
              {trackIndexStr}
            </span>
            <span className="truncate flex-1">
              {cleanTitle} {track.artist ? `- ${track.artist}` : ""}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTrack(index);
              }}
              className="winamp-btn px-1 sm:px-2 py-[1px] text-[10px] hidden sm:group-hover:block ml-1 shrink-0 h-[18px]"
            >
              DEL
            </button>
            <span className="shrink-0 pl-2 pr-1 pt-[1px] text-[10px] sm:text-[12px] sm:group-hover:hidden opacity-80">
              {track.duration ? formatTime(track.duration) : "0:00"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <WindowBorder
      title="PLAYLIST"
      titleClassName="text-amber-500"
      className="w-full h-full flex flex-col pb-1"
    >
      <div
        className="flex-1 px-3 pt-2 pb-3 min-h-0 flex flex-col h-full relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-[#0000a8]/80 z-50 flex items-center justify-center border-4 border-dashed border-[#39ff14] m-2 pointer-events-none">
            <span className="text-[#39ff14] font-bold tracking-widest text-lg font-sans">
              ПУСНЕТЕ ТУК
            </span>
          </div>
        )}
        <div className="flex-1 lcd-bg mb-[6px] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 flex flex-row">
            <div className="flex-1 p-[2px]" ref={containerRef}>
              {playlist.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <span className="text-[#39ff14] font-mono text-sm opacity-50">
                    Playlist Empty
                  </span>
                </div>
              ) : (
                height > 0 &&
                width > 0 && (
                  <div
                    ref={scrollRef}
                    className="winamp-scrollbar h-full w-full overflow-auto"
                  >
                    <div
                      style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      {virtualizer.getVirtualItems().map((virtualItem) => (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <Row
                            index={virtualItem.index}
                            style={{ height: "100%" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
            {/* Fake scrollbar trough (only for visuals since native handles real scrolling) */}
            <div className="hidden sm:flex w-5 winamp-inner-panel flex-col p-[2px] opacity-0 pointer-events-none"></div>
          </div>
        </div>

        {/* Hidden Inputs */}
        <input
          type="file"
          multiple
          accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac,.wma"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          type="file"
          multiple
          ref={folderInputRef}
          {...{ webkitdirectory: "true", directory: "" }}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* Bottom Panel Buttons */}
        <div className="flex w-full h-[46px] sm:h-[52px] gap-1 sm:gap-2 mt-2 px-1 shrink-0">
          <button
            onClick={() => setShowLocalMusic(true)}
            className="winamp-btn flex-1 font-bold text-[11px] sm:text-xs tracking-wide p-0 flex items-center justify-center shadow-lg"
          >
            MUSIC
          </button>
          <button
            onClick={() => setShowOnlineRadio(true)}
            className="winamp-btn flex-1 font-bold text-[11px] sm:text-xs tracking-wide p-0 flex items-center justify-center shadow-lg"
          >
            RADIO
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="winamp-btn flex-1 font-bold text-[11px] sm:text-xs tracking-wide p-0 flex items-center justify-center shadow-lg"
          >
            OPTIONS
          </button>
          <button
            onClick={clearPlaylist}
            className="winamp-btn flex-1 font-bold text-[11px] sm:text-xs tracking-wide p-0 flex items-center justify-center shadow-lg"
          >
            CLEAR
          </button>
          <button
            onClick={() => setShowSavePlaylist(true)}
            className="winamp-btn flex-1 font-bold text-[11px] sm:text-xs tracking-wide p-0 flex items-center justify-center shadow-lg text-amber-500 hover:text-amber-400"
          >
            SAVE
          </button>
        </div>
      </div>

      {showListOpts && (
        <div className="absolute right-4 bottom-[50px] winamp-panel p-[2px] flex flex-col gap-[1px] w-32 z-40 justify-center items-stretch font-sans text-xs shadow-2xl">
          <button
            onClick={() => {
              sortPlaylistByTitle();
              setShowListOpts(false);
            }}
            className="hover:bg-[#0000a8] text-[#e4e4e7] px-2 py-2 text-left"
          >
            Sort by title
          </button>
          <button
            onClick={() => {
              sortPlaylistByArtist();
              setShowListOpts(false);
            }}
            className="hover:bg-[#0000a8] text-[#e4e4e7] px-2 py-2 text-left"
          >
            Sort by artist
          </button>
          <button
            onClick={() => {
              reversePlaylist();
              setShowListOpts(false);
            }}
            className="hover:bg-[#0000a8] text-[#e4e4e7] px-2 py-2 text-left"
          >
            Reverse order
          </button>
          <button
            onClick={() => {
              randomizePlaylist();
              setShowListOpts(false);
            }}
            className="hover:bg-[#0000a8] text-[#e4e4e7] px-2 py-2 text-left"
          >
            Shuffle list
          </button>
          <button
            onClick={() => {
              removeDuplicates();
              setShowListOpts(false);
            }}
            className="hover:bg-[#0000a8] text-[#e4e4e7] px-2 py-2 text-left border-t border-[#111] mt-1 pt-2"
          >
            Remove duplicate
          </button>
        </div>
      )}

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showLocalMusic && (
        <LocalMusicModal
          onClose={() => setShowLocalMusic(false)}
          onAddFiles={handleAddFilesNative}
          onAddFolder={() => folderInputRef.current?.click()}
        />
      )}
      {showOnlineRadio && (
        <OnlineRadioModal
          onClose={() => setShowOnlineRadio(false)}
          onAdd={(t) => addTracks([t])}
        />
      )}
      {showSavePlaylist && (
        <SavePlaylistModal onClose={() => setShowSavePlaylist(false)} />
      )}
    </WindowBorder>
  );
}
