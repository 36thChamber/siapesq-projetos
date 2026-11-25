import { useSyncExternalStore } from "react";

const EVENT = "siapesq:storage-changed";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(EVENT, callback); };
}
export function setStoredString(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* Storage may be unavailable in private browsing. */ }
  window.dispatchEvent(new Event(EVENT));
}
export function useStoredString(key: string, fallback = "") {
  return useSyncExternalStore(subscribe, () => {
    try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }, () => fallback);
}
