import { useEffect, useState } from "react";
import { getImageListOfSpecies } from "@/services/api/gbif.service";
import type { GalleryImage } from "@/components/ImageGallery";

type HomeSpeciesImagesState = {
  images: GalleryImage[];
  loading: boolean;
  error: boolean;
};

export function useHomeSpeciesImages(): HomeSpeciesImagesState {
  const [state, setState] = useState<HomeSpeciesImagesState>({
    images: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    let active = true;

    getImageListOfSpecies()
      .then((species) => {
        if (!active) return;
        const images = species
          .filter((s): s is typeof s & { gbifImage: string } => Boolean(s.gbifImage))
          .map((s) => ({
            src: s.gbifImage,
            alt: `Foto de ${s.nome_cientifico}`,
            caption: s.nome_cientifico,
            credit: s.gbifImageDetails,
          }));
        setState({ images, loading: false, error: false });
      })
      .catch((error) => {
        if (!active) return;
        console.error("Erro ao carregar imagens da Home:", error);
        setState({ images: [], loading: false, error: true });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
