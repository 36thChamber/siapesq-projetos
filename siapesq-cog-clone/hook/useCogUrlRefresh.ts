import { useCallback, useEffect, useRef } from "react";

export type ExpiringCog = { id: string; url?: string; renewAt?: number };
export function cogExpiry(expiresIn: number, now = Date.now()) {
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error("Validade COG inválida.");
  const ttl = Math.min(expiresIn, 7 * 86400) * 1000;
  return { expiresAt: now + ttl, renewAt: now + ttl - Math.min(60000, ttl / 5) };
}

/** One renewal per selected resource; a suspended tab rechecks its absolute deadline. */
export function useCogUrlRefresh(resources: ExpiringCog[], refresh: (id: string) => Promise<void>, enabled = true) {
  const current = useRef({ resources, refresh, enabled });
  useEffect(() => { current.current = { resources, refresh, enabled }; }, [resources, refresh, enabled]);
  const inFlight = useRef(new Set<string>());
  const retries = useRef(new Map<string, { key: string; after: number }>());
  const active = useRef(false);
  const forced = useRef(new Set<string>());

  const renew = useCallback(async (id: string, force = false) => {
    const state = current.current;
    const resource = state.resources.find(item => item.id === id);
    if (!active.current || !state.enabled || !resource?.url || inFlight.current.has(id)) return;
    if (force) forced.current.add(id);
    const key = `${resource.url}:${resource.renewAt}`;
    const retry = retries.current.get(id);
    if (retry?.after === Infinity && retry.key === key) return;
    if (retry && Number.isFinite(retry.after) && retry.after > Date.now() && (force || retry.key === key)) return;
    inFlight.current.add(id);
    // Also bounds failures triggered by tileerror/focus while a request is settling.
    retries.current.set(id, { key, after: Date.now() + 15000 });
    try {
      await state.refresh(id);
      forced.current.delete(id);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if ([401, 403, 404, 409].includes(status ?? 0)) { retries.current.set(id, { key, after: Infinity }); forced.current.delete(id); }
    } finally { inFlight.current.delete(id); }
  }, []);

  const hasResources = enabled && resources.some(resource => Boolean(resource.url));
  useEffect(() => {
    if (!hasResources) return;
    active.current = true;
    const check = () => {
      const state = current.current;
      const ids = new Set(state.resources.map(item => item.id));
      for (const id of retries.current.keys()) if (!ids.has(id)) retries.current.delete(id);
      for (const id of forced.current) if (!ids.has(id)) forced.current.delete(id);
      if (!state.enabled) return;
      for (const resource of state.resources) {
        if (resource.url && (forced.current.has(resource.id) || (resource.renewAt !== undefined && resource.renewAt <= Date.now()))) void renew(resource.id, forced.current.has(resource.id));
      }
    };
    const visible = () => { if (document.visibilityState === "visible") check(); };
    const timer = setInterval(check, 1000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", visible);
    check();
    return () => {
      active.current = false; clearInterval(timer);
      window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", visible);
    };
  }, [renew, hasResources]);
  return useCallback((id: string) => renew(id, true), [renew]);
}
