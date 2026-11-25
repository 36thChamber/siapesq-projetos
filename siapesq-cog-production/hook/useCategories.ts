import { useEffect, useState } from "react";
import { listarGruposEspecies } from "@/services/api/gruposEspecies.service";
import { useAuth } from "@/context/AuthContext";
import { GrupoEspecie } from "@/services/types/grupoEspecie.types";

export function useCategories() {
  const { user } = useAuth();

  const [categories, setCategories] = useState<GrupoEspecie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;

      try {
        // CORREÇÃO: Removemos o envio do token. O BFF se encarrega disso.
        const data = await listarGruposEspecies();
        setCategories(data);
      } catch (e) {
        setError("Erro ao carregar categorias");
        console.error("Detalhe do erro nas categorias:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  return { categories, loading, error };
}