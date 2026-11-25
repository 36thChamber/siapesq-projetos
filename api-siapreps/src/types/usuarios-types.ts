import Embarcacoes from "../models/Embarcacoes";
import type Usuarios from "../models/Usuarios";
import UsuariosAtivos from "../models/UsuariosAtivos";

export type UsuarioLoginRequestBody = {
  email: string;
  senha: string;
};

export type CriarUsuarioBodyRequest = {
  nome: string;
  documento: string;
  insc_capt_portos: string;
  telefone: string;
  email: string;
  senha: string;
};

export type AtualizarUsuarioBodyRequest = {
  nome?: string;
  email?: string;
  telefone?: string;
  senha?: string;
  antiga_senha?: string;
  insc_capt_portos?: string;
  documento?: string;
  ativo?: boolean;
};

export type BuscarUsuarioPorIdParamsRequest = {
  id: number;
};

export type ListarUsuariosQueryRequest = {
  limit?: number;
  offset?: number;
};

export type UsuarioResponse = {
  id: number;
  nome: string;
  insc_capt_portos: string;
  documento: string;
  email: string;
  administracao: boolean;
  telefone: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type UsuarioAutenticadoResponse = {
  id: number;
  nome: string;
  email: string;
  documento: string;
  insc_capt_portos: string;
  telefone: string;
  token: string;
};

export type UsuarioLoginResponse = {
  id: number;
  nome: string;
  email: string;
  documento: string;
  insc_capt_portos: string;
  telefone: string;
  administracao: boolean;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  embarcacoes: Embarcacoes[]
  token: string;
};

export type CriarUsuarioResponse = UsuarioAutenticadoResponse;

export type AtualizarUsuarioResponse = UsuarioResponse;

export type BuscarUsuarioPorIdResponse = UsuarioResponse & {
  embarcacoes: unknown[];
};

export type DeletarUsuarioResponse = UsuarioResponse;

export type ListarUsuariosResponse = {
  usuarios: UsuarioResponse[];
  total: number;
};


export type UsuarioPublicoResponse = Omit<UsuarioResponse, "documento" | "telefone">;

export function toUsuarioPublicoResponse(usuario: UsuarioResponse): UsuarioPublicoResponse {
  const { documento, telefone, ...resto } = usuario;
  return resto;
}

export function toUsuarioResponse(usuario: Usuarios): UsuarioResponse {
  return {
    id: usuario.id,
    nome: usuario.nome,
    insc_capt_portos: usuario.insc_capt_portos,
    documento: usuario.documento,
    email: usuario.email,
    administracao: usuario.administracao,
    telefone: usuario.telefone,
    ativo: usuario.ativo,
    criado_em: usuario.criado_em,
    atualizado_em: usuario.atualizado_em ?? null,
    deletado_em: usuario.deletado_em ?? null,
  };
}

export function toUsuarioAutenticadoResponse(
  usuario: Usuarios,
  token: string,
): UsuarioAutenticadoResponse {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    documento: usuario.documento,
    insc_capt_portos: usuario.insc_capt_portos,
    telefone: usuario.telefone,
    token,
  };
}

export function toUsuarioLoginResponse(
  usuario: Usuarios,
  token: string,
): UsuarioLoginResponse {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    documento: usuario.documento,
    insc_capt_portos: usuario.insc_capt_portos,
    telefone: usuario.telefone,
    administracao: usuario.administracao,
    ativo: usuario.ativo,
    criado_em: usuario.criado_em,
    atualizado_em: usuario.atualizado_em ?? null,
    token,
    embarcacoes: usuario.embarcacoes ?? [],
  };
}
