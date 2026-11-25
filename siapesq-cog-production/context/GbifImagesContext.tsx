"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { getGbifImages } from "@/services/api/gbif.service";

type GbifContextType = {
  imagesCache: Record<number, string[]>;
  preloadImages: (usageKey: number) => void;
};

const GbifImagesContext = createContext<GbifContextType | null>(null);

export const GbifImagesProvider = ({ children }: { children: React.ReactNode }) => {
  const [imagesCache, setImagesCache] = useState<Record<number, string[]>>({});

  // Chaves já buscadas ou em andamento, fora do estado de render. Se
  // `preloadImages` checasse `imagesCache` (estado) para decidir se já tem
  // cache, ela precisaria dessa dependência e seria recriada a cada busca
  // concluída — o que recriava o efeito consumidor (useSpeciesImagesPreload)
  // e disparava a lista inteira de volta para o GBIF, causando o loop de
  // chamadas da issue #173. Um ref resolve isso sem acoplar a função ao
  // estado, e também evita duas chamadas concorrentes para a mesma chave.
  const requestedKeysRef = useRef<Set<number>>(new Set());

  const preloadImages = useCallback((usageKey: number) => {
    if (requestedKeysRef.current.has(usageKey)) return;
    requestedKeysRef.current.add(usageKey);

    void getGbifImages(usageKey)
      .then((imgs) => {
        setImagesCache((prev) => ({ ...prev, [usageKey]: imgs }));
      })
      .catch((error) => {
        requestedKeysRef.current.delete(usageKey);
        console.error("Erro ao buscar imagens da espécie:", error);
      });
  }, []);

  const value = useMemo(
    () => ({ imagesCache, preloadImages }),
    [imagesCache, preloadImages],
  );

  return (
    <GbifImagesContext.Provider value={value}>
      {children}
    </GbifImagesContext.Provider>
  );
};

export const useGbifImages = () => {
  const context = useContext(GbifImagesContext);
  if (!context) throw new Error("Imagens do gbif devem ser usadas com provider");
  return context;
};
