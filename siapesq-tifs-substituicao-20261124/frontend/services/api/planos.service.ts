// services/api/planos.service.ts
import { get, post, put, patch, del } from "@/services/api/apiClient";
import {
  Plano,
  CriarPlanoPayload,
  AtualizarPlanoPayload,
  GetPlanoResponse,
  CriarPlanoBody,
} from "@/services/types/plano.types";

export async function getPlanos(): Promise<Plano[]> {
  try {
    return await get<Plano[]>("/planos");
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Não foi possível buscar os planos.",
    );
  }
}

export async function createPlano(
  data: CriarPlanoPayload,
): Promise<Plano> {
  try {
    return await post<Plano, CriarPlanoPayload>("/planos", data);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao criar plano.");
  }
}

export async function getPlanosAtivos(): Promise<Plano[]> {
  try {
    return await get<Plano[]>("/planos/ativos");
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao buscar planos ativos.",
    );
  }
}

export async function getPlanosInativos(): Promise<Plano[]> {
  try {
    return await get<Plano[]>("/planos/inativos");
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao buscar planos inativos.",
    );
  }
}

export async function getPlanoById(
  id: string,
): Promise<Plano> {
  try {
    return await get<Plano>(`/planos/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao buscar plano.");
  }
}

export async function updatePlano(
  id: string,
  data: AtualizarPlanoPayload,
): Promise<Plano> {
  try {
    return await put<Plano, AtualizarPlanoPayload>(
      `/planos/${id}`,
      data,
    );
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao atualizar plano.",
    );
  }
}

export async function ativarPlano(id: string) {
  try {
    return await patch<any>(`/planos/${id}/ativar`, {});
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao ativar plano.");
  }
}

export async function desativarPlano(id: string) {
  try {
    return await patch<any>(`/planos/${id}/desativar`, {});
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao desativar plano.",
    );
  }
}

export async function deletePlano(id: string) {
  try {
    return await del<any>(`/planos/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao deletar plano.");
  }
}

export async function restaurarPlano(id: string) {
  try {
    return await patch<any>(`/planos/${id}/restaurar`, {});
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao restaurar plano.",
    );
  }
}

export type { GetPlanoResponse, CriarPlanoBody };
