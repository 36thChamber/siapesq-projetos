import { useState, useEffect, useRef } from "react";
import { getImageListOfSpecies } from "@/services/api/gbif.service";


export interface SpeciesData {
  nome_cientifico: string;
  gbifImage: string;
}

export function useSlider() {
  const [species, setSpecies] = useState<SpeciesData[]>([]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  


  useEffect(() => {
    void getImageListOfSpecies()
      .then((data) => {
        setSpecies(data as SpeciesData[]);
      })
      .catch((error) => {
        console.error("Erro ao carregar imagens do carrossel:", error);
      });
  }, []);

  
  useEffect(() => {
    const { current } = sliderRef;
    if (!current) return;

    let frameId: number;
    const delay = 6000;
    let lastFrame = 0;

    const animate = (time: number) => {
      if (!paused.current && time - lastFrame >= delay) {
        lastFrame = time;
        
        if (
          current.scrollLeft + current.clientWidth >=
          current.scrollWidth - 10
        ) {
          current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          
          current.scrollBy({
            left: current.offsetWidth,
            behavior: "smooth",
          });
        }
      }
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [species]);

  return {
    sliderRef,
    species,
  };
}

