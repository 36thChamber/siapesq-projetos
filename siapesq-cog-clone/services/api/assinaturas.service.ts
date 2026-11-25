// services/api/assinaturas.service.ts
import { get, post, put, patch } from "@/services/api/apiClient";
import {
  Assinatura,
  CriarAssinaturaPayload,
  AtualizarAssinaturaPayload,
  GetAssinaturaResponse,
  CriarAssinaturaBody,
} from "@/services/types/assinatura.types";

export async function getAssinaturas(): Promise<Assinatura[]> {
  try {
    return await get<Assinatura[]>("/assinaturas");
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao buscar assinaturas.",
    );
  }
}

export async function createAssinatura(
  data: CriarAssinaturaPayload,
): Promise<Assinatura> {
  try {
    return await post<Assinatura, CriarAssinaturaPayload>(
      "/assinaturas",
      data,
    );
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao criar assinatura.",
    );
  }
}

export async function getAssinaturasAtivas(): Promise<Assinatura[]> {
  try {
    return await get<Assinatura[]>("/assinaturas/ativas");
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao buscar assinaturas ativas.",
    );
  }
}

export async function getAssinaturasUsuario(
  id_usuario: string,
): Promise<Assinatura | null> {
  try {
    return await get<Assinatura>(`/assinaturas/usuario/${id_usuario}`);
  } catch (error: any) {
    // O backend retorna 404 quando não há assinatura para o usuário.
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(
      error.response?.data?.message || "Erro ao buscar assinaturas do usuário.",
    );
  }
}

export async function getAssinaturaById(
  id: string,
): Promise<Assinatura> {
  try {
    return await get<Assinatura>(`/assinaturas/${id}`);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao buscar assinatura.",
    );
  }
}

export async function updateAssinatura(
  id: string,
  data: AtualizarAssinaturaPayload,
): Promise<Assinatura> {
  try {
    return await put<Assinatura, AtualizarAssinaturaPayload>(
      `/assinaturas/${id}`,
      data,
    );
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao atualizar assinatura.",
    );
  }
}

export async function ativarAssinatura(id: string) {
  try {
    return await patch<any>(`/assinaturas/${id}/ativar`, {});
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao ativar assinatura.",
    );
  }
}

export async function cancelarAssinatura(id: string) {
  try {
    return await patch<any>(`/assinaturas/${id}/cancelar`, {});
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao cancelar assinatura.",
    );
  }
}

export async function expirarAssinatura(id: string) {
  try {
    return await patch<any>(`/assinaturas/${id}/expirar`, {});
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Erro ao expirar assinatura.",
    );
  }
}

export type { GetAssinaturaResponse, CriarAssinaturaBody };
