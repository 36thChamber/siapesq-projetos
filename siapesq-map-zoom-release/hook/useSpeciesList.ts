import { useState, useEffect } from "react";
import { useSpecies } from "@/hook/useSpecies"; 
import { Especie as Specie } from "@/services/types/especie.types";

interface UseSpeciesListProps {
  category: string;
  onSelectSpecie: (specie: Specie) => void;
}

export function useSpeciesList({ category, onSelectSpecie }: UseSpeciesListProps) {
  const { species, categoryName, loading, error } = useSpecies(category);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (species && species.length > 0) {
      const currentSelectedExists = species.find(s => s.id_especie === selectedId);
      
      if (!selectedId || !currentSelectedExists) {
        const firstSpecie = species[0];
        setSelectedId(firstSpecie.id_especie);
        onSelectSpecie(firstSpecie);
      }
    }
  }, [species, selectedId, onSelectSpecie]);

  const selectSpecie = (specie: Specie) => {
    setSelectedId(specie.id_especie);
    onSelectSpecie(specie);
  };

  return {
    species,
    categoryName,
    selectedId,
    selectSpecie,
    loading,
    error
  };
}
