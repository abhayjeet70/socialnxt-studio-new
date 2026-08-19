import { useEffect, useRef } from "react";

/**
 * Persists a dialog/pop-up's in-progress form state to sessionStorage while it's open,
 * and restores it if the component remounts (e.g. the user switched to another in-app
 * section — which unmounts the route and would otherwise silently discard unsaved input).
 * Call `clearDraft()` on successful submit or explicit cancel so stale drafts don't reappear.
 */
export function useDraftPersist<T>(
  key: string,
  active: boolean,
  values: T,
  setValues: (v: T) => void,
) {
  const restoredKey = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      restoredKey.current = null;
      return;
    }
    if (restoredKey.current === key) return;
    restoredKey.current = key;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) setValues(JSON.parse(raw));
    } catch {
      // corrupt/unavailable draft — ignore and start fresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(values));
      } catch {
        // storage full/unavailable — ignore, draft persistence is best-effort
      }
    }, 300);
    return () => clearTimeout(t);
  }, [active, key, values]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return { clearDraft };
}
