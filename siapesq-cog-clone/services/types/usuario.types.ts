// types/usuario.types.ts

// --- Payloads ---
export interface LoginUsuarioPayload {
  email: string;
  senha: string;
}

export interface CriarUsuarioPayload {
  comprovante?: import("../api/certificates.service").CertificateInput;
  nome: string;
  email: string;
  senha: string;
  contato?: string;
  cpf?: string;
  titulo_cientifico?: boolean;
  tipo_usuario?: 'PESQUISADOR' | 'ADMIN' | 'PADRAO';
  curriculo_lattes?: string; // <-- adicione esta linha
}

export interface AtualizarUsuarioPayload {
  nome?: string;
  email?: string;
  contato?: string;
  cpf?: string;
  titulo_cientifico?: boolean;
  curriculo_lattes?: string | null;
  senha?: string;
  antiga_senha?: string;
}

export type AtualizarUsuarioResponse = Omit<Usuario, "plano" | "foto"> & {
  email_verificacao_enviado?: boolean;
};

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  novaSenha: string;
}

export interface EnviarEmailVerificacaoPayload {
  email: string;
}

export interface VerificarEmailParams {
  token: string;
}

// --- Admin ---
export interface AprovarUsuarioPayload {
  id_usuario: string;
  status: 'APROVADO' | 'REPROVADO';
}

// --- Respostas / Entidades ---
export interface Usuario {
  id_usuario: string;
  nome: string;
  email: string;
  contato: string;
  cpf: string;
  curriculo_lattes?: string | null;
  titulo_cientifico: boolean;
  tipo_usuario: "PESQUISADOR" | "ADMIN" | "PADRAO";
  email_verificado: boolean;
  status?: "PENDENTE" | "APROVADO" | "REPROVADO";
  ultimo_acesso: string | null;
  criado_em: string;
  atualizado_em: string;
  plano: number;
  foto?: string;
}

// O BFF remove credenciais antes de devolver o perfil ao JavaScript cliente.
export type LoginUsuarioResponse = Usuario;

export type RefreshTokenResponse = Usuario;

export type RegisterData = Omit<
  Usuario,
  | "id_usuario"
  | "email_verificado"
  | "ultimo_acesso"
  | "criado_em"
  | "atualizado_em"
  | "plano"
> & {
  senha: string;
  curriculo_lattes?: string;
};

export type EditableUserFields =
  | "nome"
  | "email"
  | "contato"
  | "cpf"
  | "curriculo_lattes"
  | "titulo_cientifico"
  ;


export type UserData = Usuario;

export interface BuscarUsuarioQuery {
  query: string;
}
