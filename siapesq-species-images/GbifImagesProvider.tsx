"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSpeciesImages, type SpeciesImage } from '@/services/api/gbif.service';

type ContextValue = {
  imagesCache: Record<number, string[]>;
  imageDetailsCache: Record<number, SpeciesImage[]>;
  preloadImages: (usageKey: number) => void;
};
const Context = createContext<ContextValue | null>(null);
// The API signs for 60 minutes; refresh at 45 minutes, including HTTP cache margin.
const REFRESH_MS = 45 * 60 * 1000;

export function GbifImagesProvider({ children }: { children: React.ReactNode }) {
  const [imagesCache, setImagesCache] = useState<Record<number, string[]>>({});
  const [imageDetailsCache, setImageDetailsCache] = useState<Record<number, SpeciesImage[]>>({});
  const requested = useRef(new Map<number, { pending: boolean; fetchedAt: number }>());
  const mounted = useRef(false);
  const preloadImages = useCallback((usageKey: number) => {
    const entry = requested.current.get(usageKey);
    if (entry && (entry.pending || Date.now() - entry.fetchedAt < REFRESH_MS)) return;
    requested.current.set(usageKey, { pending: true, fetchedAt: 0 });
    getSpeciesImages(usageKey).then(({ images }) => {
      if (!mounted.current) return;
      requested.current.set(usageKey, { pending: false, fetchedAt: Date.now() });
      setImagesCache(previous => ({ ...previous, [usageKey]: images.map(image => image.url) }));
      setImageDetailsCache(previous => ({ ...previous, [usageKey]: images }));
    }).catch(error => {
      console.error('Erro ao carregar imagens do catálogo', error);
      // Keep this key scheduled, permitting a retry on the next interval/call.
      requested.current.set(usageKey, { pending: false, fetchedAt: 0 });
    });
  }, []);
  useEffect(() => {
    mounted.current = true;
    const refresh = () => { for (const key of requested.current.keys()) preloadImages(key); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [preloadImages]);
  const value = useMemo(() => ({ imagesCache, imageDetailsCache, preloadImages }), [imagesCache, imageDetailsCache, preloadImages]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useGbifImages() {
  const context = useContext(Context);
  if (!context) throw new Error('Imagens do GBIF devem ser usadas com provider');
  return context;
}
