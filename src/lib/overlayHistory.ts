'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Makes the browser/OS back gesture close overlays (drawers, modals, sheets)
 * instead of navigating the page underneath them.
 *
 * Every open overlay layer owns one same-URL history entry. Back pops that
 * entry and closes the top layer. Closing a layer from the UI (X, backdrop,
 * Esc) removes its entry with history.go(), and any push that races with that
 * traversal (e.g. Next.js navigating right after a drawer closes) is held
 * until the traversal lands, so the new route never gets popped by mistake.
 */

type HistoryWrite = () => void;

let installed = false;
let nativePush: History['pushState'];
let nativeReplace: History['replaceState'];

// Entries we pushed that sit above the base entry.
let entries = 0;
// Self-initiated traversals still waiting for their popstate.
let pendingPops = 0;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let queue: HistoryWrite[] = [];
let closeTopLayer: (() => void) | null = null;
let currentDepth = 0;

function flushQueue() {
  const ops = queue;
  queue = [];
  ops.forEach((op) => op());
}

function settlePendingPop() {
  pendingPops = Math.max(0, pendingPops - 1);
  if (pendingPops === 0) {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = null;
    flushQueue();
  }
}

function goBack(count: number) {
  if (count <= 0) return;
  entries -= count;
  pendingPops += 1;
  if (pendingTimer) clearTimeout(pendingTimer);
  // Safety net: never hold navigation hostage if the popstate never comes.
  pendingTimer = setTimeout(() => {
    pendingPops = 0;
    pendingTimer = null;
    flushQueue();
  }, 600);
  window.history.go(-count);
}

function pushOverlayEntry() {
  const state = { ...(window.history.state ?? {}), __dotOverlay: true };
  nativePush(state, '', window.location.href);
  entries += 1;
}

// Brings the number of overlay entries in line with the open layer count.
function reconcile() {
  if (pendingPops > 0) {
    queue.push(reconcile);
    return;
  }
  if (currentDepth > entries) {
    for (let i = entries; i < currentDepth; i++) pushOverlayEntry();
  } else if (currentDepth < entries) {
    goBack(entries - currentDepth);
  }
}

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  nativePush = window.history.pushState.bind(window.history);
  nativeReplace = window.history.replaceState.bind(window.history);

  window.history.pushState = function pushState(...args: Parameters<History['pushState']>) {
    if (pendingPops > 0) {
      queue.push(() => window.history.pushState(...args));
      return;
    }
    // Overlay entries left behind by a layer that closed in the same tick:
    // drop them first so the new route replaces them in the stack.
    const stale = entries - currentDepth;
    if (stale > 0) {
      queue.push(() => window.history.pushState(...args));
      goBack(stale);
      return;
    }
    return nativePush(...args);
  };

  window.history.replaceState = function replaceState(...args: Parameters<History['replaceState']>) {
    if (pendingPops > 0) {
      queue.push(() => window.history.replaceState(...args));
      return;
    }
    return nativeReplace(...args);
  };

  // Capture phase on window runs before Next.js' own popstate listener.
  window.addEventListener(
    'popstate',
    (event) => {
      if (pendingPops > 0) {
        event.stopImmediatePropagation();
        settlePendingPop();
        return;
      }
      if (entries > 0 && currentDepth > 0) {
        event.stopImmediatePropagation();
        entries -= 1;
        currentDepth -= 1;
        closeTopLayer?.();
      }
    },
    true
  );
}

/**
 * @param depth number of overlay layers currently open
 * @param closeTop closes the top-most open layer
 */
export function useOverlayBackStack(depth: number, closeTop: () => void) {
  const closeTopRef = useRef(closeTop);
  closeTopRef.current = closeTop;

  useLayoutEffect(() => {
    install();
    closeTopLayer = () => closeTopRef.current();
    return () => {
      closeTopLayer = null;
    };
  }, []);

  // Layout effect so the stack is in sync before any transition commit
  // (Next.js writes history in an insertion effect of a later commit).
  useLayoutEffect(() => {
    currentDepth = depth;
    reconcile();
  }, [depth]);
}
