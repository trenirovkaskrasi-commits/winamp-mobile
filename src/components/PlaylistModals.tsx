import React, { useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { Track } from '../types';
import { generateId } from '../lib/utils';

export function ExportModal({ onClose }: { onClose: () => void }) {
  const handleExport = (type: string) => {
    const { playlist } = usePlayerStore.getState();
    let dataStr = '';
    let mimeType = '';
    let filename = '';

    if (type === 'json-playlist') {
      // Create JSON export excluding local blob urls
      const cleanList = playlist.map(t => ({ ...t, url: t.source === 'local' ? '' : t.url, file: undefined }));
      dataStr = JSON.stringify(cleanList, null, 2);
      mimeType = 'application/json';
      filename = 'playlist.json';
    } else if (type === 'm3u-playlist') {
      const cleanList = playlist.map(t => ({ ...t, url: t.source === 'local' ? '' : t.url }));
      dataStr = '#EXTM3U\n' + cleanList.map(t => `#EXTINF:${Math.round(t.duration || 0)},${t.artist ? t.artist + ' - ' : ''}${t.title}\n${t.url}`).join('\n');
      mimeType = 'audio/x-mpegurl';
      filename = 'playlist.m3u8';
    }
    
    if (!dataStr) return;
    
    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="winamp-panel w-full max-w-sm flex flex-col p-4 gap-4">
        <div className="flex justify-between items-center text-[#e4e4e7] font-sans font-bold tracking-wider relative border-b border-[#27272a] pb-2">
          <span>EXPORT PLAYLIST</span>
          <button onClick={onClose} className="winamp-btn w-6 h-6 flex items-center justify-center text-xs">X</button>
        </div>
        <div className="flex flex-col gap-2 font-mono text-[#39ff14]">
           <button onClick={() => handleExport('json-playlist')} className="text-left hover:bg-[#0000a8] p-1">Export Playlist (.json)</button>
           <button onClick={() => handleExport('m3u-playlist')} className="text-left hover:bg-[#0000a8] p-1">Export Playlist (.m3u8)</button>
        </div>
      </div>
    </div>
  );
}

export function ImportModal({ onClose }: { onClose: () => void }) {
  const addTracks = usePlayerStore(s => s.addTracks);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
             const newTracks = parsed.map(t => ({...t, id: generateId()}));
             addTracks(newTracks);
          }
        } catch (e) { alert("Invalid JSON format"); }
      } else if (file.name.endsWith('.m3u') || file.name.endsWith('.m3u8') || file.name.endsWith('.pls')) {
         // rudimentary m3u parser
         const lines = content.split('\n');
         const tracks: Track[] = [];
         let currentTrack: Partial<Track> = {};
         for (const line of lines) {
            const t = line.trim();
            if (!t || t.startsWith('#EXTM3U')) continue;
            if (t.startsWith('#EXTINF:')) {
               const parts = t.substring(8).split(',');
               const info = parts.length > 1 ? parts[1] : parts[0];
               currentTrack.title = info;
            } else if (!t.startsWith('#')) {
               currentTrack.url = t;
               currentTrack.id = generateId();
               currentTrack.source = 'radio';
               if (!currentTrack.title) currentTrack.title = t.split('/').pop() || 'Unknown stream';
               tracks.push(currentTrack as Track);
               currentTrack = {};
            }
         }
         if (tracks.length > 0) addTracks(tracks);
      }
      onClose();
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="winamp-panel w-full max-w-sm flex flex-col p-4 gap-4">
        <div className="flex justify-between items-center text-[#e4e4e7] font-sans font-bold tracking-wider relative border-b border-[#27272a] pb-2">
          <span>IMPORT PLAYLIST</span>
          <button onClick={onClose} className="winamp-btn w-6 h-6 flex items-center justify-center text-xs">X</button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json,.m3u,.m3u8,.pls" className="hidden" />
        <div className="text-[#39ff14] font-mono text-xs opacity-70 mb-2">Supported formats: m3u, m3u8, pls, json</div>
        <button onClick={() => fileInputRef.current?.click()} className="winamp-btn py-2">SELECT FILE TO IMPORT</button>
      </div>
    </div>
  );
}

export interface SavedPlaylist {
  id: string;
  name: string;
  category: 'local' | 'radio';
  tracks: Track[];
}
