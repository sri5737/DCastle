'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setMessage('Install Deekshana Castle for faster access from your app drawer.');
    }

    function handleAppInstalled() {
      setInstallEvent(null);
      setDismissed(true);
      setMessage('Installed successfully. You can launch Deekshana Castle from your app drawer.');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const visible = useMemo(() => {
    if (dismissed) return false;
    if (isStandaloneDisplay()) return false;
    return installEvent !== null;
  }, [dismissed, installEvent]);

  async function handleInstall() {
    if (!installEvent) return;

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setMessage('Installing Deekshana Castle...');
    } else {
      setMessage('Install dismissed. You can still continue using the app in browser mode.');
    }
    setInstallEvent(null);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 px-4 md:bottom-6" role="status" aria-live="polite">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border bg-background/95 px-3 py-2 shadow">
        <p className="text-sm text-foreground">{message}</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={handleInstall}>
            Install
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
