import { useState, useEffect, useRef } from "react";
import { useSpecies } from "@/hook/useSpecies"; 
import { Especie as Specie } from "@/services/types/especie.types";

interface UseSpeciesListProps {
  category: string;
  onSelectSpecie: (specie: Specie) => void;
}

export function useSpeciesList({ category, onSelectSpecie }: UseSpeciesListProps) {
  const { species, categoryName, loading, error } = useSpecies(category);
  
  const [selection, setSelection] = useState<string | null>(null);
  const selectedId = species.find(specie=>specie.id_especie===selection)?.id_especie ?? species[0]?.id_especie ?? null;
  const notified = useRef<string | null>(null);
  useEffect(() => {
    const selected=species.find(specie=>specie.id_especie===selectedId);
    if(selected && notified.current!==selected.id_especie){notified.current=selected.id_especie;onSelectSpecie(selected);}
  },[species,selectedId,onSelectSpecie]);
  const selectSpecie = (specie:Specie) => {notified.current=specie.id_especie;setSelection(specie.id_especie);onSelectSpecie(specie);};

  return {
    species,
    categoryName,
    selectedId,
    selectSpecie,
    loading,
    error
  };
}
