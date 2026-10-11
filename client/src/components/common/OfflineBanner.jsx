import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import './OfflineBanner.css';

export function OfflineBanner() {
  const [isServerDown, setIsServerDown] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkServerStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        setIsServerDown(false);
      } else {
        setIsServerDown(true);
      }
    } catch (err) {
      setIsServerDown(true);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkServerStatus();

    // Check periodically every 20 seconds
    const interval = setInterval(checkServerStatus, 20000);

    const handleOnline = () => checkServerStatus();
    const handleOffline = () => setIsServerDown(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isServerDown) return null;

  return (
    <div className="offline-banner" role="alert">
      <div className="offline-content">
        <AlertTriangle size={16} className="offline-icon" />
        <span>
          <strong>Local API Server Unreachable:</strong> Unable to connect to CarePulse local service at <code>http://localhost:5000</code>. Ensure <code>node src/server.js</code> or <code>npm run dev</code> is running.
        </span>
      </div>
      <button
        type="button"
        className="btn-retry-offline"
        onClick={checkServerStatus}
        disabled={checking}
      >
        <RefreshCw size={13} className={checking ? 'spin' : ''} />
        <span>{checking ? 'Checking...' : 'Retry Connection'}</span>
      </button>
    </div>
  );
}
