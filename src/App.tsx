import { useEffect } from 'react';
import { AudioEngine } from './components/AudioEngine';
import { Deck } from './components/Deck';
import { Playlist } from './components/Playlist';
import { SettingsModal } from './components/SettingsModal';
import { usePlayerStore } from './store/playerStore';
import { InstallAppTile } from './components/InstallAppTile';

export default function App() {
  const initStore = usePlayerStore(state => state.initStore);
  
  useEffect(() => {
    initStore();
  }, [initStore]);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex items-center justify-center lg:justify-start lg:items-start sm:p-4 overflow-hidden bg-black">
      <AudioEngine />
      <InstallAppTile />
      
      {/* Main Amp Chassis */}
      <div className="w-full max-w-[400px] flex flex-col relative z-10 mx-auto lg:mx-10 mt-safe h-full sm:h-auto gap-2 sm:gap-4 p-2 sm:p-0">
        <div className="flex-none shrink-0 sm:h-auto flex flex-col">
          <Deck />
        </div>
        <div className="flex-1 min-h-0 sm:flex-none sm:h-[500px] flex flex-col pb-2 sm:pb-0 overflow-hidden">
          <Playlist />
        </div>
      </div>
      
      <SettingsModal />
    </div>
  );
}

