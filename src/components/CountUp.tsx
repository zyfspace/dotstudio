'use client';

import React, { useEffect, useLayoutEffect, useRef } from 'react';

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
 *
 * Frames write straight to the text node rather than through React state, so
 * an animation costs no re-renders and stays smooth on slow phones. React
 * never renders children into the span, so the two never conflict.
 */
export function CountUp({ value, format = (n) => String(n), replayKey = 0, duration = 1100 }: CountUpProps) {
  const elRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(0);
  const lastReplayRef = useRef<number | null>(null);
  const mountRef = useRef<{ at: number; replayKey: number } | null>(null);
  const formatRef = useRef(format);
  formatRef.current = format;

  const paint = (n: number) => {
    shownRef.current = n;
    if (elRef.current) elRef.current.textContent = formatRef.current(n);
  };

  // Show the starting number before the first paint
  useLayoutEffect(() => {
    paint(shownRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const replay = lastReplayRef.current !== replayKey;
    lastReplayRef.current = replayKey;

    if (reduceMotion) {
      paint(value);
      return;
    }

    const from = replay ? 0 : shownRef.current;
    if (from === value) {
      paint(value);
      return;
    }

    let frame = 0;
    let idle = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start: number | null = null;
    const tick = (now: number) => {
      // Time from the first frame, so a late start doesn't skip ahead
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      paint(Math.round(from + (value - from) * easeOutCubic(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const begin = () => {
      frame = requestAnimationFrame(tick);
    };

    // Right after mount the page is still hydrating, loading data and drawing
    // the chart; wait for an idle moment (at most 500ms) so slow phones don't
    // drop frames. Safari lacks requestIdleCallback, so it gets a short delay.
    // Replays and later value updates start right away.
    if (!mountRef.current) mountRef.current = { at: performance.now(), replayKey };
    const pageSettling =
      replayKey === mountRef.current.replayKey && performance.now() - mountRef.current.at < 600;
    if (pageSettling && 'requestIdleCallback' in window) {
      idle = window.requestIdleCallback(begin, { timeout: 500 });
    } else if (pageSettling) {
      timer = setTimeout(begin, 150);
    } else {
      begin();
    }
    return () => {
      if (idle) window.cancelIdleCallback(idle);
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, replayKey, duration]);

  return <span ref={elRef} className="count-up" />;
}
