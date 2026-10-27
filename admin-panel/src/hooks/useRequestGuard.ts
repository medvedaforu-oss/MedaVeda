import { useCallback, useEffect, useRef } from "react";

/** Every list read is bound to its filter scope and component lifetime. */
export default function useRequestGuard(scope: string) {
  const latestScope = useRef(scope);
  latestScope.current = scope;
  const sequence = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return useCallback(() => {
    if (!mounted.current || latestScope.current !== scope) return () => false;
    const request = ++sequence.current;
    return () => mounted.current && latestScope.current === scope && sequence.current === request;
  }, [scope]);
}
