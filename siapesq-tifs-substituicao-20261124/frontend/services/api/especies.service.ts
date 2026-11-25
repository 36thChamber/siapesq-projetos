// services/api/especies.service.ts
import { get, post } from "@/services/api/apiClient";
import {
  Especie,
  CriarEspeciePayload,
  RespostaPaginadaEspecies,
} from "@/services/types/especie.types";

type ListarEspeciesResponse =
  | Especie[]
  | RespostaPaginadaEspecies
  | { especies: Especie[] };
type EspecieResponse = Especie | { especie: Especie } | { data: Especie };

function extrairEspecies(response: ListarEspeciesResponse): Especie[] {
  let especies: Especie[];

  if (Array.isArray(response)) {
    especies = response;
  } else if ("data" in response) {
    especies = response.data;
  } else {
    especies = response.especies;
  }

  return especies.map(normalizarEspecie);
}

function extrairEspecie(response: EspecieResponse): Especie {
  let especie: Especie;

  if ("data" in response) {
    especie = response.data;
  } else if ("especie" in response) {
    especie = response.especie;
  } else {
    especie = response;
  }

  return normalizarEspecie(especie);
}

function normalizarEspecie(especie: Especie): Especie {
  const informacoes =
    especie.informacoes ?? especie.informacoesEspecies ?? [];

  return {
    ...especie,
    informacoes,
    informacoesEspecies: informacoes,
  };
}

export async function listarEspecies(): Promise<Especie[]> {
  const response = await get<ListarEspeciesResponse>("/especies");
  return extrairEspecies(response);
}

export async function buscarEspeciePorId(id: string): Promise<Especie> {
  const response = await get<EspecieResponse>(`/especies/${id}`);
  return extrairEspecie(response);
}

export async function criarEspecie(
  data: CriarEspeciePayload,
): Promise<Especie> {
  const response = await post<EspecieResponse, CriarEspeciePayload>(
    "/especies",
    data,
  );
  return extrairEspecie(response);
}

// Aliases para compatibilidade
export const getEspecies = buscarEspeciePorId;
export const getAllEspecies = listarEspecies;
export const createEspecie = criarEspecie;

export async function searchEspecie(search: string) {
  const { searchEspecie: adminSearchEspecie } = await import(
    "@/services/api/admin.service"
  );
  return adminSearchEspecie(search);
}
