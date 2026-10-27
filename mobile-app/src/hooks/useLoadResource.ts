import { useEffect, useRef, useState } from "react";
import { logError } from "../utils/logger";

/** The caller memoizes load for its route/course. A retry or route change
 * cancels the older result, including its loading/error updates. */
export default function useLoadResource<T>(load: (onFallback: () => void) => Promise<T>, initial: T, enabled = true) {
  const initialValue = useRef(initial);
  const [value, setValue] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setValue(initialValue.current);
    void (async () => {
      try {
        let usedFallback = false;
        const result = await load(() => { usedFallback = true; });
        if (active) { setValue(result); setError(usedFallback); }
      } catch (err) {
        logError("Could not load content", err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [load, enabled, attempt]);
  return { value, loading, error, retry: () => setAttempt(n => n + 1) };
}
