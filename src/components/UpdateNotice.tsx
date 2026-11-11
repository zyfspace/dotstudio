'use client';

import { useEffect, useState } from 'react';

const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? '';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Tabs left open across a deploy keep running the old JavaScript, which can
 * break navigation against the new server. Poll the live build id and offer a
 * reload once it no longer matches the one this tab was built with.
 */
export function UpdateNotice() {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !CURRENT_BUILD || outdated) return;

    let cancelled = false;
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId } = (await res.json()) as { buildId?: string };
        if (!cancelled && buildId && buildId !== CURRENT_BUILD) setOutdated(true);
      } catch {
        // Offline or blocked: try again on the next tick.
      }
    };

    const timer = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [outdated]);

  if (!outdated) return null;

  return (
    <div className="update-notice" role="status" aria-live="polite">
      <span>A new version is available. Reload to keep everything working.</span>
      <button type="button" className="btn sm pri" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
