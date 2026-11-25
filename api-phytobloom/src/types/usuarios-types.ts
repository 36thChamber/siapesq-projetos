import type Usuarios from "../models/Usuarios";
import type { ReservatorioResponse } from "./reservatorios-types";

export type UsuarioLoginBodyRequest = {
  email: string;
  senha: string;
};

export type CriarUsuarioBodyRequest = {
  nome: string;
  documento: string;
  email: string;
  senha: string;
  telefone: string;
};

export type AtualizarUsuarioBodyRequest = {
  nome?: string;
  documento?: string;
  email?: string;
  telefone?: string;
  senha?: string;
  antiga_senha?: string;
  ativo?: boolean;
  user_verify?: boolean;
};

export type GetUsuarioParamsRequest = {
  id: number;
};

export type DeleteUsuarioParamsRequest = {
  id: number;
};

export type ListarUsuariosQueryRequest = {
  limit?: number;
  offset?: number;
  ativo?: boolean;
  user_verify?: boolean;
};

export type UsuarioResponse = {
  id: number;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  ativo: boolean;
  user_verify: boolean;
  is_admin: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type UsuarioLoginResponse = UsuarioResponse & {
  token: string;
};

export type CriarUsuarioResponse = UsuarioResponse & {
  token: string;
};

export type AtualizarUsuarioResponse = UsuarioResponse;

export type GetUsuarioResponse = UsuarioResponse & {
  reservatorios?: ReservatorioResponse[];
};

export type DeleteUsuarioResponse = {
  message: string;
};

export type ListarUsuariosResponse = {
  usuarios: UsuarioResponse[];
  total: number;
};

export function toUsuarioResponse(usuario: Usuarios): UsuarioResponse {
  return {
    id: usuario.id,
    nome: usuario.nome,
    documento: usuario.documento,
    email: usuario.email,
    telefone: usuario.telefone,
    ativo: usuario.ativo,
    user_verify: usuario.user_verify,
    is_admin: usuario.is_admin,
    criado_em: usuario.criado_em,
    atualizado_em: usuario.atualizado_em,
    deletado_em: usuario.deletado_em,
  };
}