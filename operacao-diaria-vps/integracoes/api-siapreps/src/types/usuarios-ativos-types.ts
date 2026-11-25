import type UsuariosAtivos from "../models/UsuariosAtivos";

export type CriarUsuarioAtivoBodyRequest = {
  id_usuario: number;
  tipo_assinatura: string;
  ativo?: boolean;
  data_criacao?: Date;
  data_fim?: Date | null;
};

export type AtualizarUsuarioAtivoBodyRequest = {
  id_usuario?: number;
  tipo_assinatura?: string;
  ativo?: boolean;
  data_criacao?: Date;
  data_fim?: Date | null;
};

export type BuscarUsuarioAtivoPorIdParamsRequest = {
  id: number;
};

export type DeletarUsuarioAtivoParamsRequest = {
  id: number;
};

export type ListarUsuariosAtivosQueryRequest = {
  limit?: number;
  offset?: number;
};

export type UsuarioAtivoResponse = {
  id: number;
  id_usuario: number;
  tipo_assinatura: string;
  ativo: boolean;
  data_criacao: Date;
  data_fim: Date | null;
};

export type CriarUsuarioAtivoResponse =
  UsuarioAtivoResponse;

export type AtualizarUsuarioAtivoResponse =
  UsuarioAtivoResponse;

export type BuscarUsuarioAtivoPorIdResponse =
  UsuarioAtivoResponse;

export type DeletarUsuarioAtivoResponse =
  UsuarioAtivoResponse;

export type ListarUsuariosAtivosResponse = {
  usuariosAtivos: UsuarioAtivoResponse[];
  total: number;
};

export function toUsuarioAtivoResponse(
  usuarioAtivo: UsuariosAtivos,
): UsuarioAtivoResponse {
  return {
    id: usuarioAtivo.id,
    id_usuario: usuarioAtivo.id_usuario,
    tipo_assinatura: usuarioAtivo.tipo_assinatura,
    ativo: usuarioAtivo.ativo,
    data_criacao: usuarioAtivo.data_criacao,
    data_fim: usuarioAtivo.data_fim ?? null,
  };
}