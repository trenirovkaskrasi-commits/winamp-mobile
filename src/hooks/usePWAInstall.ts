import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if the global variable already has the event
    if ((window as any).deferredInstallPrompt) {
      setDeferredPrompt((window as any).deferredInstallPrompt);
      setIsInstallable(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      // Optional: save it globally just in case
      (window as any).deferredInstallPrompt = promptEvent;
    };

    const handleAppInstalled = () => {
      // Log install to analytics
      console.log('PWA was installed');
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      setIsInstallable(false);
      (window as any).deferredInstallPrompt = null;
    };

    const handleGlobalPromptReady = () => {
      if ((window as any).deferredInstallPrompt) {
        setDeferredPrompt((window as any).deferredInstallPrompt);
        setIsInstallable(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('deferredpromptready', handleGlobalPromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('deferredpromptready', handleGlobalPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
    (window as any).deferredInstallPrompt = null;
  };

  return { isInstallable, installPWA };
}
