// services/api/usuarios.service.ts
import { get, post, put } from "@/services/api/apiClient";
import {
  LoginUsuarioPayload,
  LoginUsuarioResponse,
  CriarUsuarioPayload,
  Usuario,
  AtualizarUsuarioPayload,
  AtualizarUsuarioResponse,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  EnviarEmailVerificacaoPayload,
  VerificarEmailParams,
  RefreshTokenResponse,
} from "@/services/types/usuario.types";

export async function loginUsuario(
  data: LoginUsuarioPayload,
): Promise<LoginUsuarioResponse> {
  return post<LoginUsuarioResponse>("/auth/login", data);
}

export async function criarUsuario(
  data: CriarUsuarioPayload,
): Promise<Usuario> {
  return post<Usuario>("/usuarios", data);
}

// Token removido
export async function listarUsuarios(): Promise<Usuario[]> {
  return get<Usuario[]>("/usuarios");
}

// Token removido
export async function buscarUsuarioPorId(
  id: string,
): Promise<Usuario> {
  return get<Usuario>(`/usuarios/${id}`);
}

// Lógica complexa simplificada: recebe apenas o payload
export async function atualizarUsuario(
  data: AtualizarUsuarioPayload,
): Promise<AtualizarUsuarioResponse> {
  return put<AtualizarUsuarioResponse>("/usuarios", data);
}

// Token removido
export async function refreshToken(): Promise<RefreshTokenResponse> {
  return get<RefreshTokenResponse>("/auth/me");
}

export async function forgotPassword(
  data: ForgotPasswordPayload,
): Promise<void> {
  await post<void>("/usuarios/forgot-password", data);
}

export async function resetPassword(
  data: ResetPasswordPayload,
): Promise<void> {
  await post<void>("/usuarios/reset-password", data);
}

export async function verificarEmail(
  params: VerificarEmailParams,
): Promise<void> {
  const query = new URLSearchParams({ token: params.token }).toString();
  await get<void>(`/usuarios/verify-email?${query}`);
}

export async function enviarEmailVerificacao(
  data: EnviarEmailVerificacaoPayload,
): Promise<void> {
  await post<void>("/usuarios/send-verification-email", data);
}

export async function logoutAccount(): Promise<void> {
  await post<void>("/auth/logout");
}

// Token removido
export async function getAllUsers() {
  try {
    const response = await get<any>("/usuarios");
    return response;
  } catch (e) {
    console.error("Erro ao buscar todos os usuários:", e);
    throw e;
  }
}

// Assinatura limpa, recebe apenas a query
export async function searchUsers(query: string) {
  const { searchUsers: adminSearchUsers } = await import(
    "@/services/api/admin.service"
  );
  return adminSearchUsers(query);
}

// Token removido da chamada para o admin.service
export async function updateStatusUser(
  id_usuario: string,
  status: "APROVADO" | "REPROVADO",
) {
  const { updateStatusUser: adminUpdateStatusUser } = await import(
    "@/services/api/admin.service"
  );
  return adminUpdateStatusUser(id_usuario, status);
}

// Token removido. Mantivemos o id_usuario na assinatura da função
// caso seus componentes ainda enviem, mas ele não vai pro atualizarUsuario
// se o backend atualizar o usuário com base no cookie de sessão
export async function updateUserField<K extends keyof AtualizarUsuarioPayload>(
  id_usuario: string,
  field: K,
  value: AtualizarUsuarioPayload[K],
): Promise<AtualizarUsuarioResponse> {
  return atualizarUsuario({
    [field]: value,
  } as AtualizarUsuarioPayload);
}

export async function forgotPwd(email: string) {
  return forgotPassword({ email });
}

export async function register(userData: CriarUsuarioPayload) {
  return criarUsuario(userData);
}

export async function loginAccount(email: string, senha: string) {
  try {
    const user = await loginUsuario({ email, senha });
    return { user };
  } catch (error: any) {
    if (error.response?.status === 401) {
      return { error: "Credenciais inválidas." };
    }
    return { 
      error: error.response?.data?.message || "Erro no servidor. Tente novamente mais tarde." 
    };
  }
}
