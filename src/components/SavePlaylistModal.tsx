import React, { useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { generateId } from '../lib/utils';
import { loadSetting, saveSetting } from '../lib/db';
import { SavedPlaylist } from './PlaylistModals';

export function SavePlaylistModal({ onClose }: { onClose: () => void }) {
  const [inputValue, setInputValue] = useState('');
  const [saved, setSaved] = useState(false);
  const { playlist } = usePlayerStore();

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    
    // Determine category based on majority of tracks
    let localCount = 0;
    let radioCount = 0;
    playlist.forEach(t => {
      if (t.source === 'local') localCount++;
      else radioCount++;
    });
    const category = localCount >= radioCount ? 'local' : 'radio';

    const newPlaylist: SavedPlaylist = {
      id: generateId(),
      name: inputValue.trim(),
      category,
      tracks: [...playlist]
    };
    
    const playlists: SavedPlaylist[] = await loadSetting('saved_playlists', []);
    await saveSetting('saved_playlists', [...playlists, newPlaylist]);
    
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="winamp-panel w-full max-w-sm flex flex-col p-4 gap-4">
        <div className="flex justify-between items-center text-[#e4e4e7] font-sans font-bold tracking-wider relative border-b border-[#27272a] pb-2">
          <span>SAVE PLAYLIST</span>
          <button onClick={onClose} className="winamp-btn w-6 h-6 flex items-center justify-center text-xs">X</button>
        </div>
        
        <div className="flex flex-col gap-2 font-mono text-[#39ff14]">
          {saved ? (
            <div className="text-center py-6 text-sm animate-pulse">
              PLAYLIST SAVED!
            </div>
          ) : (
            <>
               <div className="text-xs">Enter playlist name:</div>
               
               <div className="text-[10px] opacity-70 mb-1">
                 Saving to: {(() => {
                   let localCount = 0;
                   let radioCount = 0;
                   playlist.forEach(t => {
                     if (t.source === 'local') localCount++;
                     else radioCount++;
                   });
                   return (localCount >= radioCount ? 'LOCAL MUSIC' : 'ONLINE RADIO');
                 })()} section
               </div>
    
               <input 
                 type="text" 
                 className="winamp-input mb-2 font-sans" 
                 value={inputValue}
                 onChange={e => setInputValue(e.target.value)}
                 autoFocus
               />
               <div className="flex gap-2">
                 <button onClick={handleSave} className="winamp-btn px-4 py-1">Save</button>
                 <button onClick={onClose} className="winamp-btn px-4 py-1">Cancel</button>
               </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
