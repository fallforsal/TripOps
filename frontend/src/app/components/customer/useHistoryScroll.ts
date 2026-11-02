import { useCallback, useLayoutEffect, useRef, useState } from "react";

const ENTRY_KEY = "tripopsScrollEntry";
const PREVIOUS_ENTRY_KEY = "tripopsPreviousScrollEntry";
const STORAGE_KEY = "tripops:history-scroll:v2";

function entryKey(): string {
  const state = window.history.state;
  if (typeof state?.[ENTRY_KEY] === "string") return state[ENTRY_KEY];
  const key = crypto.randomUUID();
  window.history.replaceState({ ...state, [ENTRY_KEY]: key }, "");
  return key;
}

function readPositions(): Record<string, number> {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(
      ([, y]) => typeof y === "number" && Number.isFinite(y) && y >= 0,
    )) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Keeps each history entry's position separate, including repeated URLs. */
export function useHistoryScroll() {
  const [positions] = useState(readPositions);
  const [initialKey] = useState(entryKey);
  const activeKey = useRef(initialKey);
  const locked = useRef(true);
  const initialized = useRef(false);
  const cancelRestore = useRef<() => void>(() => {});
  const [request, setRequest] = useState<{ key: string; y: number } | null>(null);

  const savePosition = useCallback(() => {
    positions[activeKey.current] = window.scrollY;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {
      // Back/Forward still work in memory if storage is disabled.
    }
  }, [positions]);

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const onScroll = () => {
      // Scroll events queued by the outgoing DOM must never overwrite its saved Y.
      if (!locked.current && window.history.state?.[ENTRY_KEY] === activeKey.current) {
        savePosition();
      }
    };
    const onPageHide = () => { if (!locked.current) savePosition(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.history.scrollRestoration = previous;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      cancelRestore.current();
    };
  }, [savePosition]);

  // React has committed the destination DOM before this layout effect runs.
  useLayoutEffect(() => {
    if (!request) return;
    locked.current = true;
    let cancelled = false;
    let frame = 0;
    let attempts = 0;
    let settled = 0;
    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      locked.current = false;
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
    };
    const apply = () => {
      if (cancelled) return;
      const availableY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.min(request.y, availableY), behavior: "instant" });
      settled = availableY >= request.y && Math.abs(window.scrollY - request.y) < 2 ? settled + 1 : 0;
      // Retry only while layout is settling; a user gesture cancels immediately.
      if (settled >= 3 || ++attempts >= 120) {
        stop();
        savePosition();
      } else {
        frame = requestAnimationFrame(apply);
      }
    };
    cancelRestore.current = stop;
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("pointerdown", stop);
    window.addEventListener("keydown", stop);
    apply();
    return stop;
  }, [request, savePosition]);

  const restoreHistoryPosition = useCallback(() => {
    const key = entryKey();
    // hashchange can follow a navigation already handled by navigateForward.
    if (initialized.current && key === activeKey.current) return;
    cancelRestore.current();
    locked.current = true;
    initialized.current = true;
    activeKey.current = key;
    setRequest({ key, y: positions[key] ?? 0 });
  }, [positions]);

  const navigateForward = useCallback((action: () => void) => {
    const previousKey = activeKey.current;
    savePosition();
    cancelRestore.current();
    locked.current = true;
    initialized.current = true;
    action();
    activeKey.current = entryKey();
    if (activeKey.current !== previousKey) {
      window.history.replaceState(
        { ...window.history.state, [PREVIOUS_ENTRY_KEY]: previousKey },
        "",
      );
    }
    setRequest({ key: activeKey.current, y: 0 });
  }, [savePosition]);

  const goBack = useCallback((fallback: () => void) => {
    const previousKey = window.history.state?.[PREVIOUS_ENTRY_KEY];
    if (typeof previousKey === "string" && Object.prototype.hasOwnProperty.call(positions, previousKey)) {
      window.history.back();
    } else {
      // Direct links may have no preceding TripOps page; do not leave the site.
      fallback();
    }
  }, [positions]);

  return { navigateForward, restoreHistoryPosition, goBack };
}
