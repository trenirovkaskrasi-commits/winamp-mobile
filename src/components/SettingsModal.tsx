import React, { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { WindowBorder } from './WindowBorder';
import { App as CapacitorApp } from "@capacitor/app";

export function SettingsModal() {
  const { showSettings, setShowSettings, setShowImport, setShowExport } = usePlayerStore();

  useEffect(() => {
    if (!showSettings) return;
    const listener = CapacitorApp.addListener("backButton", () => {
      setShowSettings(false);
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, [showSettings, setShowSettings]);

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-[360px] h-[460px]">
        <WindowBorder title="OPTIONS" className="w-full h-full" onClose={() => setShowSettings(false)}>
          <div className="flex flex-col h-full gap-4 p-3 sm:p-4">
            
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 p-2 bg-[#1a1a1f] border border-[#27272a] rounded">
              <button 
                onClick={() => {
                  setShowExport(true);
                  setShowSettings(false);
                }}
                className="winamp-btn flex-1 py-3 font-bold text-sm tracking-wide text-center uppercase"
              >
                EXPORT BACKUP
              </button>
              <button 
                onClick={() => {
                  setShowImport(true);
                  setShowSettings(false);
                }} 
                className="winamp-btn flex-1 py-3 font-bold text-sm tracking-wide text-center uppercase"
              >
                IMPORT BACKUP
              </button>
            </div>
            
            <a 
              href="https://github.com/trenirovkaskrasi-commits/winamp-mobile/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="winamp-btn shrink-0 w-full py-3 font-bold text-sm tracking-wide text-center uppercase flex items-center justify-center"
            >
              CHECK FOR UPDATES
            </a>

            <div className="flex-1 flex flex-col justify-center text-[#00E600] font-mono p-4 bg-[#000] border border-[#0f5132] rounded shadow-[inset_0_0_15px_rgba(0,230,0,0.15)] gap-3 uppercase font-bold tracking-wide overflow-hidden">
              <div className="border-b-2 border-[#0f5132] pb-2 text-center text-lg sm:text-xl text-[#39ff14]" style={{ textShadow: '0 0 5px rgba(57,255,20,0.5)' }}>ABOUT THE PROGRAM</div>
              <div className="flex flex-col gap-3 flex-1 justify-center text-xs sm:text-sm">
                <div className="flex justify-between items-center whitespace-nowrap"><span>VERSION:</span> <span className="text-right text-[#fff]">{import.meta.env.VITE_BUILD_DATE || '1.1.0'}</span></div>
                <div className="flex justify-between items-center whitespace-nowrap"><span>AUTHOR:</span> <span className="text-right text-[#fff]">K. IVANOV, AI STUDIO</span></div>
                <div className="flex justify-between items-start mt-2 border-t border-[#0f5132] pt-3"><span className="mt-1">DESCRIPTION:</span> <span className="text-right whitespace-normal leading-tight ml-2 text-[#fff]">WEB AUDIO PLAYER & RADIO</span></div>
              </div>
            </div>

            <a 
              href="https://revolut.me/krasimhih4" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="mt-auto winamp-btn shrink-0 w-full py-3 font-bold text-sm tracking-wide text-center uppercase flex items-center justify-center text-[#39ff14] hover:text-[#00E600] active:text-[#00E600] transition-colors"
              style={{ textShadow: '0 0 8px rgba(57,255,20,0.4)', border: '1px solid #27272a' }}
            >
              SUPPORT DEVELOPER VIA REVOLUT!
            </a>
            
          </div>
        </WindowBorder>
      </div>
    </div>
  );
}
