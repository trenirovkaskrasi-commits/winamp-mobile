import React, { useState, useEffect } from "react";
import { usePlayerStore } from "../store/playerStore";
import { Track } from "../types";
import { loadSetting, saveSetting } from "../lib/db";
import { SavedPlaylist } from "./PlaylistModals";
import { App as CapacitorApp } from "@capacitor/app";
export function LocalMusicModal({
  onClose,
  onAddFiles,
  onAddFolder,
}: {
  onClose: () => void;
  onAddFiles: () => void;
  onAddFolder: () => void;
}) {
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [view, setView] = useState<"menu" | "rename" | "delete">("menu");
  const [inputValue, setInputValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { clearPlaylist, addTracks } = usePlayerStore();

  useEffect(() => {
    const listener = CapacitorApp.addListener("backButton", () => {
      onClose();
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, [onClose]);

  useEffect(() => {
    loadSetting("saved_playlists", []).then((data) => {
      setPlaylists(
        data.filter(
          (p: SavedPlaylist) => p.category === "local" || !p.category,
        ),
      );
    });
  }, []);

  const savePlaylistsData = async (newData: SavedPlaylist[]) => {
    setPlaylists(newData);
    const allPlaylists: SavedPlaylist[] = await loadSetting(
      "saved_playlists",
      [],
    );
    const others = allPlaylists.filter(
      (p: SavedPlaylist) => p.category === "radio",
    );
    await saveSetting("saved_playlists", [...others, ...newData]);
  };

  const handleLoad = (id: string) => {
    const p = playlists.find((p) => p.id === id);
    if (!p) return;
    clearPlaylist();
    const tracksToLoad = p.tracks.map((t) => {
      if (t.source === "local" && t.file) {
        return { ...t, url: "" };
      }
      return t;
    });
    addTracks(tracksToLoad);
    onClose();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setView("delete");
  };

  const confirmDelete = () => {
    if (!editingId) return;
    savePlaylistsData(playlists.filter((p) => p.id !== editingId));
    setView("menu");
    setEditingId(null);
  };

  const startRename = (
    id: string,
    currentName: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingId(id);
    setInputValue(currentName);
    setView("rename");
  };

  const handleRename = () => {
    if (!inputValue.trim() || !editingId) return;
    const newData = playlists.map((p) =>
      p.id === editingId ? { ...p, name: inputValue.trim() } : p,
    );
    savePlaylistsData(newData);
    setView("menu");
    setEditingId(null);
    setInputValue("");
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="winamp-panel w-full max-w-sm flex flex-col p-4 gap-4">
        <div className="flex justify-between items-center text-[#e4e4e7] font-sans font-bold tracking-wider relative border-b border-[#27272a] pb-2">
          <span>LOCAL MUSIC</span>
          <button
            onClick={onClose}
            className="winamp-btn w-6 h-6 items-center justify-center text-xs hidden sm:flex"
          >
            X
          </button>
        </div>

        {view === "menu" && (
          <>
            <div className="flex gap-2 font-mono text-xs">
              <button
                onClick={() => {
                  onAddFiles();
                  onClose();
                }}
                className="winamp-btn flex-1 py-3 text-center tracking-widest font-bold"
              >
                ADD FILES
              </button>
              <button
                onClick={() => {
                  if (
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                      navigator.userAgent,
                    )
                  ) {
                    alert(
                      "Добавянето на цели директории не се поддържа от мобилни браузъри. Моля, маркирайте няколко файла едновременно чрез 'ADD FILES'.",
                    );
                    onAddFiles();
                  } else {
                    onAddFolder();
                  }
                  onClose();
                }}
                className="winamp-btn flex-1 py-3 text-center tracking-widest font-bold"
              >
                ADD FOLDER
              </button>
            </div>

            <div className="text-[#39ff14] font-bold mt-2 pb-1 border-b border-[#39ff14]/30 text-xs">
              SAVED LOCAL PLAYLISTS
            </div>
            <div className="flex flex-col gap-2 font-mono text-[#39ff14]">
              {playlists.length === 0 ? (
                <div className="opacity-50 italic text-xs mb-2">
                  No local playlists.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto winamp-scrollbar flex flex-col gap-1 pr-1 p-1">
                  {playlists.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center hover:bg-[#0000a8] group p-1 cursor-pointer"
                      onClick={() => handleLoad(p.id)}
                    >
                      <span className="truncate flex-1 text-[16px] sm:text-[18px]">
                        {p.name}{" "}
                        <span className="opacity-50 text-[10px]">
                          ({p.tracks.length})
                        </span>
                      </span>
                      <div className="flex gap-2 shrink-0 opacity-100 items-center justify-center">
                        <button
                          onClick={(e) => startRename(p.id, p.name, e)}
                          className="winamp-btn px-2 sm:px-3 py-1 font-bold tracking-widest text-[10px] sm:text-xs"
                        >
                          RENAME
                        </button>
                        <button
                          onClick={(e) => handleDelete(p.id, e)}
                          className="winamp-btn px-2 sm:px-3 py-1 font-bold tracking-widest text-[10px] sm:text-xs text-red-500"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {view === "rename" && (
          <div className="flex flex-col gap-2 font-mono text-[#39ff14]">
            <div className="text-xs mb-1">Enter new name for playlist:</div>
            <input
              type="text"
              className="winamp-input mb-2 font-sans"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleRename} className="winamp-btn px-4 py-1">
                Rename
              </button>
              <button
                onClick={() => {
                  setView("menu");
                  setEditingId(null);
                  setInputValue("");
                }}
                className="winamp-btn px-4 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {view === "delete" && (
          <div className="flex flex-col gap-3 font-mono text-[#39ff14] items-center text-center p-4">
            <div className="text-sm font-bold text-red-500 bg-red-950/30 p-2 border border-red-500/50 w-full mb-2">
              Delete this playlist?
            </div>
            <div className="text-xs mb-4 opacity-80">
              This action cannot be undone.
            </div>
            <div className="flex gap-4 w-full">
              <button
                onClick={confirmDelete}
                className="winamp-btn flex-1 py-3 text-red-500 font-bold"
              >
                YES, DELETE
              </button>
              <button
                onClick={() => {
                  setView("menu");
                  setEditingId(null);
                }}
                className="winamp-btn flex-1 py-3 font-bold"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
