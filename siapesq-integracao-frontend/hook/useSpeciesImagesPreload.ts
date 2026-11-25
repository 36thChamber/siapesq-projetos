import { useEffect } from "react";
import { useGbifImages } from "@/context/GbifImagesContext";
import { getGbifUsageKey } from "@/services/api/gbif.service";
import { Especie as Specie } from "@/services/types/especie.types";

export function useSpeciesImagesPreload(species: Specie[]) {
  const { preloadImages } = useGbifImages();

  useEffect(() => {
    if (!species || species.length === 0) return;

    species.forEach(async (specie) => {
      const key = specie.is_aggregate ? null : specie.gbifUsageKey ?? await getGbifUsageKey(specie.nome_cientifico);
      if (key) {
        preloadImages(key);
      }
    });
  }, [species, preloadImages]);
}
