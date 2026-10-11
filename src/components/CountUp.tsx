'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  format?: (n: number) => string;
  /** Changing this replays the count from 0. */
  replayKey?: number;
  duration?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts a number up from 0 when it mounts or `replayKey` changes. If `value`
 * changes mid-way (e.g. data finishes loading) it continues from what is
 * currently shown instead of jumping.
 */
export function CountUp({ value, format = (n) => String(n), replayKey = 0, duration = 1100 }: CountUpProps) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  const lastReplayRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      shownRef.current = value;
      setShown(value);
      return;
    }

    const replay = lastReplayRef.current !== replayKey;
    lastReplayRef.current = replayKey;
    const from = replay ? 0 : shownRef.current;
    if (from === value) {
      setShown(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (value - from) * easeOutCubic(t));
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, replayKey, duration]);

  return <>{format(shown)}</>;
}
