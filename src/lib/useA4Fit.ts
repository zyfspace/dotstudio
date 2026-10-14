import { useCallback, useLayoutEffect, useState } from 'react';

// Width of an A4 page at 96dpi; the page keeps this layout on every screen
export const A4_WIDTH = 794;

/**
 * Shrinks the A4 page to fit its container (like a PDF viewer), so narrow
 * screens and live previews show exactly the layout that prints.
 * Print resets the zoom in CSS.
 */
export function useA4Fit() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const host = el?.parentElement;
    if (!host) return;
    const fit = () => setZoom(Math.min(1, host.clientWidth / A4_WIDTH));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, [el]);
  const ref = useCallback((node: HTMLDivElement | null) => setEl(node), []);
  return { ref, style: zoom < 1 ? { zoom } : undefined };
}
