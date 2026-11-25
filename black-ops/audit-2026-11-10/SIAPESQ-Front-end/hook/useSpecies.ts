import { useEffect, useState } from "react";
import {
  buscarGrupoEspeciePorId,
  listarEspeciesDoGrupo,
} from "@/services/api/gruposEspecies.service";
import { Especie as Specie } from "@/services/types/especie.types";

export function useSpecies(category: string) {
  const [species, setSpecies] = useState<Specie[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSpecies([]);
    setCategoryName("");
    setError(null);

    if (!category) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    async function load() {
      try {
        const [groupSpecies, group] = await Promise.all([
          listarEspeciesDoGrupo(category),
          buscarGrupoEspeciePorId(category),
        ]);

        if (!active) return;

        setSpecies(groupSpecies);
        setCategoryName(group.nome);
      } catch (err) {
        if (!active) return;
        console.error("Erro ao buscar espécies:", err);
        setError("Não foi possível carregar as espécies.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [category]);

  return { species, categoryName, loading, error };
}
