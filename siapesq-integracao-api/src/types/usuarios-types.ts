import { TipoUsuario } from "../models/enums/tipoUsuarioEnum";
import { StatusUsuario } from "../models/enums/statususuarioEnum";
import Usuarios from "../models/Usuarios";

export type UsuarioResponse = {
  id_usuario: string;
  nome: string;
  email: string;
  curriculo_lattes?: string | null;
  contato: string;
  cpf: string;
  titulo_cientifico: boolean;
  tipo_usuario: TipoUsuario;
  email_verificado: boolean;
  ultimo_acesso: Date | null;
  status: StatusUsuario;
  criado_em?: Date;
  atualizado_em?: Date | null;
  deletado_em?: Date | null;
};

export type UsuarioLoginBodyRequest = {
  email: string;
  senha: string;
};

export type UsuarioLoginResponse = UsuarioResponse & {
  token: string;
};

export type CriarUsuarioBodyRequest = {
  comprovante?: import("../services/scientific-certificates").CertificateInput;
  nome: string;
  email: string;
  senha: string;
  curriculo_lattes?: string | null;
  contato: string;
  cpf: string;
  titulo_cientifico: boolean;
};

export type AtualizarUsuarioBodyRequest = {
  id_usuario?: string;
  nome?: string;
  email?: string;
  senha?: string;
  antiga_senha?: string;
  curriculo_lattes?: string | null;
  contato?: string;
  cpf?: string;
  titulo_cientifico?: boolean;
};

export type BuscarUsuarioPorIdParamsRequest = {
  id_usuario: string;
};

export type DeletarUsuarioParamsRequest = {
  id_usuario: string;
};

export type ListarUsuariosQueryRequest = {
  limit?: number;
  offset?: number;
};

export type CriarUsuarioResponse = UsuarioResponse & {
  // Indica o envio, não a entrega. O endpoint de reenvio permanece disponível.
  email_verificacao_enviado?: boolean;
};

export type AtualizarUsuarioResponse = UsuarioResponse & {
  // Presente apenas quando o e-mail foi alterado. Indica o envio, não a entrega.
  email_verificacao_enviado?: boolean;
};

export type BuscarUsuarioPorIdResponse = UsuarioResponse;
export type DeletarUsuarioResponse = UsuarioResponse;

export type ListarUsuariosResponse = {
  usuarios: UsuarioResponse[];
  total: number;
};

export function toUsuarioResponse(usuario: Usuarios): UsuarioResponse {
  return {
    id_usuario: usuario.id_usuario,
    nome: usuario.nome,
    email: usuario.email,
    curriculo_lattes: usuario.curriculo_lattes ?? null,
    contato: usuario.contato,
    cpf: usuario.cpf,
    titulo_cientifico: usuario.titulo_cientifico,
    tipo_usuario: usuario.tipo_usuario,
    email_verificado: usuario.email_verificado,
    ultimo_acesso: usuario.ultimo_acesso ?? null,
    status: usuario.status,
    criado_em: usuario.criado_em,
    atualizado_em: usuario.atualizado_em ?? null,
    deletado_em: usuario.deletado_em ?? null,
  };
}
