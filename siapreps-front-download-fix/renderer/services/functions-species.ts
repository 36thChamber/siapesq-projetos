// renderer/services/functions-species.ts
import {
  get_list_grupos_especies,
  get_list_especies_por_grupo,
} from "../controllers/grupo-especies-controller";
import {
  type_grupo_especie_model,
  type_especie_do_grupo,
} from "../controllers/types/grupo-especies-types";
import { get_list_informacoes_especies } from "../controllers/informacoes-especies-controller";
import { getGbifImages, getGbifUsageKey } from "../controllers/gbif-controller";
import { GrupoEspecieFront } from "../components/molecules/GroupButtons";

// --- Função Auxiliar de Ícones ---
export const getIconByName = (nome: string) => {
  const nomeLower = nome.toLowerCase();
  if (nomeLower.includes("primata")) return "/images/icons/primates.svg";
  if (nomeLower.includes("ave")) return "/images/icons/birds.svg";
  if (nomeLower.includes("planta")) return "/images/icons/plants.svg";
  return "/images/icons/paw.svg";
};

// --- 1. Busca e Formata os Grupos ---
export async function serviceGetGrupos(token: string) {
  try {
    const response = await get_list_grupos_especies(token, {
      limit: 100,
      offset: 0,
    });

    if (response && response.gruposEspecies) {
      const allowedGroups = ["Primatas", "Aves", "Plantas"];

      const gruposFormatados: GrupoEspecieFront[] = response.gruposEspecies.map(
        (g: type_grupo_especie_model) => ({
          id_gruposespecies: g.id_gruposespecies,
          nome: g.nome,
          quantidade: g.quantidade,
          icon: getIconByName(g.nome),
          disabled: !allowedGroups.includes(g.nome),
        })
      );
      return gruposFormatados;
    }
    return [];
  } catch (error) {
    console.error("Erro no serviceGetGrupos:", error);
    throw error;
  }
}

// --- 2. Busca e Formata as Espécies de um Grupo ---
export async function serviceGetSpeciesByGroup(idGrupo: string, grupos: GrupoEspecieFront[]) {
  try {
    console.log("Buscando espécies do grupo:", idGrupo);
    const response = (await get_list_especies_por_grupo(idGrupo)) as any;

    if (response && response.grupoEspecie && response.grupoEspecie.especies) {
      const grupoAtual = grupos.find((g) => g.id_gruposespecies === idGrupo);
      const nomeGrupo = grupoAtual ? grupoAtual.nome : "";

      const listaFormatada = response.grupoEspecie.especies.map(
        (esp: type_especie_do_grupo) => ({
          id: String(esp.id_especie),
          nome_cientifico: esp.nome_cientifico || esp.nome,
          nome: esp.nome,
          grupo: nomeGrupo,
        })
      );
      return listaFormatada;
    }
    return [];
  } catch (error) {
    console.error("Erro no serviceGetSpeciesByGroup:", error);
    throw error;
  }
}

// --- 3. Busca Informações Detalhadas (Descrição) ---
export async function serviceGetSpeciesDetails(token: string, speciesId: string) {
  try {
    console.log("Buscando informações para espécie ID:", speciesId);
    // Busca tudo (limit 100) e filtra no front (workaround atual)
    const response = await get_list_informacoes_especies(token, { limit: 100, offset: 0 } as any);

    if (response && response.informacoesEspecies) {
      const infosDaEspecie = response.informacoesEspecies.filter(
        (info) => info.id_especie === speciesId
      );
      return infosDaEspecie;
    }
    return [];
  } catch (error) {
    console.error("Erro no serviceGetSpeciesDetails:", error);
    return [];
  }
}

// --- 4. Busca Imagens do GBIF ---
// services/functions-species.ts
// services/functions-species.ts
export async function serviceGetGbifImages(
  speciesName: string, 
  limit: number = 15,
  offset: number = 6
) {
  try {
    const usageKey = await getGbifUsageKey(speciesName);

    if (!usageKey) {
      console.warn("Nenhuma usageKey encontrada para:", speciesName);
      return [];
    }

    // ✅ Passa offset/limit pra getGbifImages
    const imagensGbif = await getGbifImages(usageKey, offset, limit);

    const formatted = imagensGbif.map((url, index) => ({
      id: `gbif_${speciesName}_${offset + index}`,
      url,
      source: speciesName
    }));
    
    return formatted;
  } catch (error) {
    console.error("Erro no serviceGetGbifImages:", error);
    return [];
  }
}
