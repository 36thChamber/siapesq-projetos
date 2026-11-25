// services/api/gruposEspecies.service.ts
import { get, post } from "@/services/api/apiClient";
import {
  GrupoEspecie,
  CriarGrupoEspeciePayload,
  RespostaPaginadaGruposEspecies,
} from "@/services/types/grupoEspecie.types";
import { Especie } from "@/services/types/especie.types";

type GrupoEspecieComEspecies = GrupoEspecie & {
  especies?: Especie[];
  especie?: Especie[];
  data?: Especie[];
};

type ListarGruposEspeciesResponse =
  | GrupoEspecie[]
  | RespostaPaginadaGruposEspecies
  | { gruposEspecies: GrupoEspecie[] };

type GrupoEspecieResponse =
  GrupoEspecie | { grupoEspecie: GrupoEspecie } | { data: GrupoEspecie };

type ListarEspeciesDoGrupoResponse =
  | Especie[]
  | { data: Especie[] }
  | { especies: Especie[] }
  | { grupoEspecie: GrupoEspecieComEspecies };

function extrairGruposEspecies(
  response: ListarGruposEspeciesResponse,
): GrupoEspecie[] {
  if (Array.isArray(response)) {
    return response;
  }

  if ("data" in response) {
    return response.data;
  }

  return response.gruposEspecies;
}

function extrairGrupoEspecie(response: GrupoEspecieResponse): GrupoEspecie {
  if ("data" in response) {
    return response.data;
  }

  if ("grupoEspecie" in response) {
    return response.grupoEspecie;
  }

  return response;
}

function extrairEspeciesDoGrupo(
  response: ListarEspeciesDoGrupoResponse,
): Especie[] {
  let especies: Especie[];

  if (Array.isArray(response)) {
    especies = response;
  } else if ("data" in response) {
    especies = response.data;
  } else if ("especies" in response) {
    especies = response.especies;
  } else {
    especies =
      response.grupoEspecie.especies ??
      response.grupoEspecie.especie ??
      response.grupoEspecie.data ??
      [];
  }

  return especies.map((especie) => {
    const informacoes =
      especie.informacoes ?? especie.informacoesEspecies ?? [];

    return {
      ...especie,
      informacoes,
      informacoesEspecies: informacoes,
    };
  });
}

export async function listarGruposEspecies(): Promise<GrupoEspecie[]> {
  const response = await get<ListarGruposEspeciesResponse>("/gruposEspecies");
  return extrairGruposEspecies(response);
}

export async function buscarGrupoEspeciePorId(
  id: string,
): Promise<GrupoEspecie> {
  const response = await get<GrupoEspecieResponse>(`/gruposEspecies/${id}`);
  return extrairGrupoEspecie(response);
}

export async function criarGrupoEspecie(
  data: CriarGrupoEspeciePayload,
): Promise<GrupoEspecie> {
  const response = await post<GrupoEspecieResponse, CriarGrupoEspeciePayload>(
    "/gruposEspecies",
    data,
  );
  return extrairGrupoEspecie(response);
}

export async function listarEspeciesDoGrupo(
  id: string,
): Promise<Especie[]> {
  const idGrupo = encodeURIComponent(id);
  const response = await get<ListarEspeciesDoGrupoResponse>(
    `/gruposEspecies/${idGrupo}/especies`,
  );
  return extrairEspeciesDoGrupo(response);
}

// Aliases para compatibilidade
export const getCategories = listarGruposEspecies;
export const getCategoriesById = buscarGrupoEspeciePorId;
export const createGrupoEspecie = criarGrupoEspecie;
export const createGrupo = criarGrupoEspecie;
export const getGrupoEspecies = listarEspeciesDoGrupo;
