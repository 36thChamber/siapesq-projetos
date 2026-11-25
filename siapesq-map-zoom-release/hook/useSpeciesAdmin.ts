import { useEffect, useState } from "react";
import {
  criarEspecie,
  listarEspecies,
} from "@/services/api/especies.service";
import {
  listarGruposEspecies,
  criarGrupoEspecie,
} from "@/services/api/gruposEspecies.service";
import {
  CriarEspeciePayload,
  Especie as Specie,
} from "@/services/types/especie.types";
import { CriarGrupoEspeciePayload } from "@/services/types/grupoEspecie.types";
import { useAuth } from "@/context/AuthContext";

export function useSpecieAdmin() {
  const { user } = useAuth();

  const [species, setSpecies] = useState<Specie[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Specie[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<{ id: string; nome: string }[]>([]);

  async function loadSpecies() {
    try {
      setLoading(true);
      setError(null);

      const especiesArray = await listarEspecies();

      setSpecies(especiesArray);
      setFilteredUsers(especiesArray);
      console.log("Resposta da API:", especiesArray);
    } catch (err) {
      setError("Erro ao carregar especies");
    } finally {
      setLoading(false);
    }
  }

  async function loadGroups() {
    if (!user) return;

    try {
      const gruposData = await listarGruposEspecies();
      if (Array.isArray(gruposData)) {
        setGroups(
          gruposData.map((g) => ({
            id: g.id_gruposespecies,
            nome: g.nome,
          })),
        );
      }
    } catch (err) {
      console.error("Erro ao carregar grupos:", err);
    }
  }

  async function handleSearch(value?: string) {
    const query = value ?? search;

    try {
      setLoading(true);
      setError(null);

      if (!query || query.trim() === "") {
        setFilteredUsers(species);
        return;
      }

      const normalizedQuery = query.trim().toLowerCase();
      const especiesArray = species.filter((specie) =>
        [specie.nome, specie.nome_cientifico, specie.pesquisador]
          .filter(Boolean)
          .some((val) => val!.toLowerCase().includes(normalizedQuery)),
      );

      setFilteredUsers(especiesArray);
    } catch (err) {
      setError("Erro ao buscar especies");
    } finally {
      setLoading(false);
    }
  }

  async function addSpecie(data: CriarEspeciePayload) {
    if (!user) return;

    try {
      setLoading(true);
      const newSpecie = await criarEspecie(data);

      setSpecies((prev) => [...prev, newSpecie]);
      setFilteredUsers((prev) => [...prev, newSpecie]);
    } catch (err) {
      setError("Erro ao criar especie");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function addGrupo(data: CriarGrupoEspeciePayload) {
    if (!user) return;

    try {
      setLoading(true);
      const newGrupo = await criarGrupoEspecie(data);

      setGroups((prev) => [
        ...prev,
        { id: newGrupo.id_gruposespecies, nome: newGrupo.nome },
      ]);
    } catch (err) {
      console.error(err);
      setError("Erro ao criar grupo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadSpecies();
      loadGroups();
    }
  }, [user]);

  return {
    filteredUsers,
    loading,
    error,
    search,
    setSearch,
    handleSearch,
    groups,
    addSpecie,
    addGrupo,
  };
}
