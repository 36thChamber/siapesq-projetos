// services/api/admin.service.ts
import apiClient, { get, put } from "@/services/api/apiClient";
import { DashboardStats } from "@/services/types/admin.types";
import { AprovarUsuarioPayload } from "@/services/types/usuario.types";

export { type DashboardStats } from "@/services/types/admin.types";

export async function getPlatformStats(): Promise<DashboardStats> {
  // Não precisamos mais passar o token, o cookie gerencia a sessão
  return get<DashboardStats>("/admin/dados_plataforma");
}

export async function searchUsers(query: string) {
  try {
    const config = {
      params: { q: query },
    };
    // O apiClient já vai enviar o cookie automaticamente
    const response = await apiClient.get("/admin/buscar-usuario", config);
    return response.data;
  } catch (error: any) {
    console.error(
      "Erro ao buscar usuários:",
      error.response?.data || error.message,
    );
    throw new Error("Não foi possível buscar os usuários.");
  }
}

export async function updateStatusUser(
  id_usuario: string,
  status: "APROVADO" | "REPROVADO",
) {
  try {
    const payload: AprovarUsuarioPayload = { id_usuario, status };
    // Removemos o token daqui também
    return await put<any, AprovarUsuarioPayload>(
      "/admin/aprovar-usuario",
      payload
    );
  } catch (error: any) {
    console.error(
      "Erro ao atualizar status do usuário:",
      error.response?.data || error.message,
    );
    throw new Error("Não foi possível atualizar o status do usuário.");
  }
}

export async function searchEspecie(search: string) {
  try {
    const config = {
      params: { search },
    };
    // O header de Authorization injetado manualmente foi removido
    const response = await apiClient.get("/admin/buscar-especie", config);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar espécies:", error);
    throw error;
  }
}
