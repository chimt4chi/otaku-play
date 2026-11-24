import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

// Thin notice shown while the device has no connection. Cached browse data still works;
// streaming and live data need the network.
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff size={14} />
      <span>You're offline — showing saved content. Streaming needs a connection.</span>
    </div>
  );
}
