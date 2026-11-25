import {
  get_list_especies_por_grupo,
  get_list_grupos_especies,
} from "../controllers/grupo-especies-controller";
import { getBy_id_especie } from "../controllers/analises-controller";
import { type_especie_do_grupo } from "../controllers/types/grupo-especies-types";
import { GrupoEspecieFront } from "../components/molecules/GroupButtons";

export const ordemGrupos = ["Primatas", "Aves", "Plantas", "Mamíferos", "Oceanicos"];

export const getIconByName = (nome: string) => {
  const nomeLower = nome.toLowerCase();
  if (nomeLower.includes("primata")) return "/images/icons/primates.svg";
  if (nomeLower.includes("ave")) return "/images/icons/birds.svg";
  if (nomeLower.includes("planta")) return "/images/icons/plants.svg";
  return "/images/icons/paw.svg";
};

export async function fetchGruposService(): Promise<GrupoEspecieFront[]> {
  const token = await window.auth.getToken();
  if (!token) return [];

  const response = await get_list_grupos_especies(token, {
    limit: 100,
    offset: 0,
  });

  if (!response || !response.gruposEspecies) return [];

  const gruposOrdenados = ordemGrupos
    .map((nome) => {
      const grupo = response.gruposEspecies.find((g: any) => g.nome === nome);
      if (!grupo) return null;

      return {
        id_gruposespecies: grupo.id_gruposespecies,
        nome: grupo.nome,
        quantidade: grupo.quantidade,
        icon: getIconByName(grupo.nome),
        disabled: nome !== "Primatas",
      } as GrupoEspecieFront;
    })
    .filter(Boolean) as GrupoEspecieFront[];

  return gruposOrdenados;
}

export async function fetchEspeciesByGrupoService(
  idGrupo: string,
  grupos: GrupoEspecieFront[]
) {
  const response = (await get_list_especies_por_grupo(idGrupo)) as any;

  if (!response || !response.grupoEspecie || !response.grupoEspecie.especies) {
    return [];
  }

  const grupoAtual = grupos.find((g) => g.id_gruposespecies === idGrupo);
  const nomeGrupo = grupoAtual ? grupoAtual.nome : "";

  const listaFormatada = response.grupoEspecie.especies.map(
    (esp: type_especie_do_grupo) => ({
      id: String(esp.id_especie),
      nome: esp.nome,
      grupo: nomeGrupo,
    })
  );

  return listaFormatada;
}

export const getSelectPlaceholderService = (
  isLoadingSpecies: boolean,
  especiesListLength: number
) => {
  if (isLoadingSpecies) return "Carregando...";
  if (especiesListLength === 0) return "Nenhuma espécie encontrada.";
  return "Selecione uma espécie...";
};

export async function fetchAnalisesByEspecieService(especieId: string) {
  const token = await window.auth.getToken();
  if (!token || !especieId) return [];

  const analises = await getBy_id_especie(token, especieId);
  return analises;
}