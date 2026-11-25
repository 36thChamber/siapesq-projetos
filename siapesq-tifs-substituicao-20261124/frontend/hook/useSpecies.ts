import { useEffect, useState } from "react";
import {
  buscarGrupoEspeciePorId,
  listarEspeciesDoGrupo,
} from "@/services/api/gruposEspecies.service";
import { Especie as Specie } from "@/services/types/especie.types";

export function useSpecies(category: string) {
  const [result, setResult] = useState<{category:string;species:Specie[];categoryName:string;error:string|null}>({category:"",species:[],categoryName:"",error:null});
  useEffect(() => {
    if (!category) return;
    let active = true;
    async function load() {
      try {
        const [groupSpecies, group] = await Promise.all([
          listarEspeciesDoGrupo(category),
          buscarGrupoEspeciePorId(category),
        ]);

        if (!active) return;

        setResult({category,species:groupSpecies,categoryName:group.nome,error:null});
      } catch (err) {
        if (!active) return;
        console.error("Erro ao buscar espécies:", err);
        setResult({category,species:[],categoryName:"",error:"Não foi possível carregar as espécies."});
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [category]);

  return result.category === category ? {...result,loading:false} : {species:[],categoryName:"",error:null,loading:Boolean(category)};
}
