import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export function InstallAppTile() {
  const { isInstallable, installPWA } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={installPWA}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl shadow-lg font-medium transition-all transform active:scale-95"
      >
        <Download className="w-5 h-5" />
        <span>Install App</span>
      </button>
    </div>
  );
}
