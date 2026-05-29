import React, { useState, useEffect } from "react";
import { usePlayerStore } from "../store/playerStore";
import { Track } from "../types";
import { generateId } from "../lib/utils";
import { loadSetting, saveSetting } from "../lib/db";
import { HQ_STATIONS } from "../data/hqStations";
import { SavedPlaylist } from "./PlaylistModals";

import { searchRadioStations, RadioStation } from "../radio/radioBrowser";

export function OnlineRadioModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (t: Track) => void;
}) {
  const [tab, setTab] = useState<"search" | "playlists">("search");

  // Search state
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [results, setResults] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Playlists state
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [view, setView] = useState<"menu" | "rename" | "delete">("menu");
  const [inputValue, setInputValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    playlist: activePlaylist,
    clearPlaylist,
    addTracks,
  } = usePlayerStore();

  useEffect(() => {
    loadSetting("saved_playlists", []).then((data) => {
      setPlaylists(data.filter((p: SavedPlaylist) => p.category === "radio"));
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const search = async () => {
    setLoading(true);
    try {
      const data = await searchRadioStations({ name, tag });
      setResults(data);
    } catch (e) {
      console.error(e);
      alert("Radio search failed");
    } finally {
      setLoading(false);
    }
  };

  // Playlists logic
  const savePlaylistsData = async (newData: SavedPlaylist[]) => {
    setPlaylists(newData);
    const allPlaylists: SavedPlaylist[] = await loadSetting(
      "saved_playlists",
      [],
    );
    const others = allPlaylists.filter(
      (p: SavedPlaylist) => p.category !== "radio",
    );
    await saveSetting("saved_playlists", [...others, ...newData]);
  };

  const handleLoad = (id: string) => {
    const p = playlists.find((p) => p.id === id);
    if (!p) return;
    clearPlaylist();
    addTracks(p.tracks);
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

  const renderSearch = () => (
    <>
      <div className="flex flex-wrap gap-2 text-[#39ff14] font-mono text-xs">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Station Name"
          className="flex-1 min-w-[120px] lcd-bg p-2 outline-none placeholder-[#39ff14]/30"
          autoFocus
        />
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Genre (e.g. jazz, rock)"
          className="flex-1 min-w-[120px] lcd-bg p-2 outline-none placeholder-[#39ff14]/30"
        />
        <button
          onClick={search}
          className="winamp-btn px-4 py-2 font-bold w-full sm:w-auto"
        >
          {loading ? "..." : "SEARCH"}
        </button>
      </div>

      <div className="h-64 lcd-bg overflow-y-auto p-1 text-[#39ff14] font-mono text-xs">
        {loading ? (
          <div className="p-4 flex flex-col items-center justify-center h-full opacity-70 animate-pulse text-center">
            <div className="text-xl mb-2">⏳</div>
            <div>SEARCHING DATABASE...</div>
          </div>
        ) : results.length > 0 ? (
          results.map((station) => {
            const isAdded = activePlaylist.some(
              (t) => t.url === (station.url_resolved || station.url),
            );
            return (
              <div
                key={station.stationuuid}
                className={`flex justify-between items-center p-2 cursor-pointer group mb-[1px] ${isAdded ? "bg-[#0000a8] text-white" : "hover:bg-[#0000a8] hover:text-white"}`}
                onClick={() => {
                  if (isAdded) return;
                  onAdd({
                    id: generateId(),
                    source: "radio",
                    title: station.name || "Unknown Station",
                    artist: station.country || "Internet Radio",
                    url: station.url_resolved || station.url,
                    bitrate: station.bitrate,
                    codec: station.codec,
                  });
                  showToast(`Added: ${station.name}`);
                }}
              >
                <div className="flex flex-col overflow-hidden mr-2 whitespace-nowrap truncate w-full">
                  <span className="truncate">
                    {station.name}{" "}
                    {isAdded && (
                      <span className="opacity-70 ml-1">(Added)</span>
                    )}
                  </span>
                </div>
                <div className="whitespace-nowrap opacity-60 flex items-center gap-2">
                  {station.bitrate > 0 ? `${station.bitrate} kbps` : ""}
                </div>
              </div>
            );
          })
        ) : (
          !loading && (
            <div className="flex flex-col gap-1 p-2">
              <div className="text-center opacity-70 mb-2 pb-2 border-b border-[#39ff14]/30">
                Recommended HQ Stations
              </div>
              {HQ_STATIONS.map((station) => {
                const isAdded = activePlaylist.some(
                  (t) => t.url === station.url_resolved,
                );
                return (
                  <div
                    key={station.stationuuid}
                    className={`flex justify-between items-center p-2 cursor-pointer group mb-[1px] ${isAdded ? "bg-[#0000a8] text-white" : "hover:bg-[#0000a8] hover:text-white"}`}
                    onClick={() => {
                      if (isAdded) return;
                      onAdd({
                        id: generateId(),
                        source: "radio",
                        title: station.name || "Unknown Station",
                        artist: station.country || "Internet Radio",
                        url: station.url_resolved,
                        bitrate: station.bitrate,
                        codec: station.codec,
                      });
                      showToast(`Added: ${station.name}`);
                    }}
                  >
                    <div className="flex flex-col overflow-hidden mr-2 whitespace-nowrap truncate w-full">
                      <span className="truncate">
                        {station.name}{" "}
                        {isAdded && (
                          <span className="opacity-70 ml-1">(Added)</span>
                        )}
                      </span>
                    </div>
                    <div className="whitespace-nowrap opacity-60 flex items-center gap-2">
                      {station.bitrate > 0 ? `${station.bitrate} kbps` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </>
  );

  const renderPlaylists = () => {
    if (view === "rename") {
      return (
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
      );
    }
    if (view === "delete") {
      return (
        <div className="flex flex-col gap-3 font-mono text-[#39ff14] items-center text-center p-4">
          <div className="text-sm font-bold text-red-500 bg-red-950/30 p-2 border border-red-500/50 w-full mb-2">Delete this playlist?</div>
          <div className="text-xs mb-4 opacity-80">This action cannot be undone.</div>
          <div className="flex gap-4 w-full">
            <button onClick={confirmDelete} className="winamp-btn flex-1 py-3 text-red-500 font-bold">
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
      );
    }
    return (
      <div className="flex flex-col gap-2 font-mono text-[#39ff14]">
        {playlists.length === 0 ? (
          <div className="opacity-50 italic text-xs mb-2">
            No online radio playlists saved.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto winamp-scrollbar flex flex-col gap-1 pr-1 p-1">
            {playlists.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center hover:bg-[#0000a8] group p-1 cursor-pointer"
                onClick={() => handleLoad(p.id)}
              >
                <span className="truncate flex-1">
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
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="winamp-panel w-full max-w-xl flex flex-col p-4 gap-4">
        <div className="flex justify-between items-center text-[#e4e4e7] font-sans font-bold tracking-wider relative border-b border-[#27272a] pb-2">
          <span>ONLINE RADIO</span>
          {toastMsg && (
            <span className="absolute left-1/2 -translate-x-1/2 text-[#39ff14] text-sm animate-pulse whitespace-nowrap bg-black/80 px-2 py-1 rounded shadow-lg">
              {toastMsg}
            </span>
          )}
          <button
            onClick={onClose}
            className="winamp-btn w-6 h-6 flex items-center justify-center text-xs"
          >
            X
          </button>
        </div>

        <div className="flex gap-2 font-mono text-xs">
          <button
            className={`winamp-btn flex-1 py-1 ${tab === "search" ? "bg-[#e4e4e7] text-black shadow-none" : ""}`}
            onClick={() => setTab("search")}
          >
            SEARCH STATIONS
          </button>
          <button
            className={`winamp-btn flex-1 py-1 ${tab === "playlists" ? "bg-[#e4e4e7] text-black shadow-none" : ""}`}
            onClick={() => setTab("playlists")}
          >
            SAVED PLAYLISTS
          </button>
        </div>

        {tab === "search" ? renderSearch() : renderPlaylists()}
      </div>
    </div>
  );
}
