// services/api/informacoesEspecies.service.ts
import { get, post, del } from "@/services/api/apiClient";
import {
  InformacaoEspecie,
  CriarInformacaoEspeciePayload,
  RespostaPaginadaInformacoesEspecies,
} from "@/services/types/informacaoEspecie.types";

type ListarInformacoesEspeciesResponse =
  | InformacaoEspecie[]
  | RespostaPaginadaInformacoesEspecies
  | { informacoesEspecies: InformacaoEspecie[] };
type InformacaoEspecieResponse =
  | InformacaoEspecie
  | { informacaoEspecie: InformacaoEspecie }
  | { data: InformacaoEspecie };

function extrairInformacoesEspecies(
  response: ListarInformacoesEspeciesResponse,
): InformacaoEspecie[] {
  if (Array.isArray(response)) {
    return response;
  }

  if ("data" in response) {
    return response.data;
  }

  return response.informacoesEspecies;
}

function extrairInformacaoEspecie(
  response: InformacaoEspecieResponse,
): InformacaoEspecie {
  if ("data" in response) {
    return response.data;
  }

  if ("informacaoEspecie" in response) {
    return response.informacaoEspecie;
  }

  return response;
}

export async function listarInformacoesEspecies(): Promise<InformacaoEspecie[]> {
  const response = await get<ListarInformacoesEspeciesResponse>(
    "/informacoesEspecies",
  );

  return extrairInformacoesEspecies(response);
}

export async function buscarInformacaoEspeciePorId(
  id: string,
): Promise<InformacaoEspecie> {
  const response = await get<InformacaoEspecieResponse>(
    `/informacoesEspecies/${id}`,
  );

  return extrairInformacaoEspecie(response);
}

export async function criarInformacaoEspecie(
  data: CriarInformacaoEspeciePayload,
): Promise<InformacaoEspecie> {
  const response = await post<
    InformacaoEspecieResponse,
    CriarInformacaoEspeciePayload
  >("/informacoesEspecies", data);

  return extrairInformacaoEspecie(response);
}

export async function excluirInformacaoEspecie(
  id: string,
): Promise<void> {
  return del<void>(`/informacoesEspecies/${id}`);
}

export const createInformacaoEspecie = criarInformacaoEspecie;
