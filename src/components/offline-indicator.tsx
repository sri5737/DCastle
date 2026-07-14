'use client';

import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
      setShowBackOnline(true);
      window.setTimeout(() => {
        setShowBackOnline(false);
      }, 3_000);
    }

    function handleOffline() {
      setOnline(false);
      setShowBackOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !showBackOnline) {
    return null;
  }

  const text = online
    ? 'Back online. Live updates and saves are available again.'
    : 'You are offline. Cached screens stay available, but new submissions and updates need connection.';

  return (
    <div className="pointer-events-none sticky top-0 z-50 px-3 pt-2" role="status" aria-live="polite">
      <div className="mx-auto max-w-5xl rounded-md border bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm">
        {text}
      </div>
    </div>
  );
}
