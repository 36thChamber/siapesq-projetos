import { TipoUsuario } from "../../models/siapesq/enums/tipoUsuarioEnum";
import usuarios from "../../models/siapesq/Usuarios";

export type UsuarioLoginRequestBody = {
  email: string;
  senha: string;
};
export type UsuarioLoginResponse = {
  id_usuario: string;
  nome: string;
  email: string;
  senha: string;
  contato: string;
  cpf: string;
  titulo_cientifico: boolean;
  tipo_usuario: TipoUsuario;
  email_verificado: boolean;
  ultimo_acesso: Date;
  criado_em: Date;
  atualizado_em: Date;
  token: string;
};

export type CriarUsuarioBody = {
  nome: string;
  email: string;
  senha: string;
  contato: string;
  cpf: string;
  titulo_cientifico: boolean;
  tipo_usuario: TipoUsuario;
  email_verificado: boolean;
  ultimo_acesso: Date;
};

export type CriarUsuarioResponse = {
  id_usuario: string;
  nome: string;
  email: string;
  contato: string;
  cpf: string;
  titulo_cientifico: boolean;
  tipo_usuario: TipoUsuario;
  email_verificado: boolean;
  ultimo_acesso: Date | null;
  token: string;
};

export type GetUsuarioResponse = {
  id_usuario: string;
  nome: string;
  email: string;
  contato: string;
  cpf: string;
  titulo_cientifico: boolean;
  tipo_usuario: TipoUsuario;
  email_verificado: boolean;
  ultimo_acesso: Date | null;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date | null;
};

export type UpdateUsuarioBody = {
  id_usuario: string;
  nome?: string;
  email?: string;
  senha?: string;
  antiga_senha?: string;
  contato?: string;
  cpf?: string;
  titulo_cientifico?: boolean;
  tipo_usuario?: TipoUsuario;
  email_verificado?: boolean;
  ultimo_acesso?: Date;
};

export type UpdateUsuarioResponse = {
  id_usuario: string;
  nome: string;
  email: string;
  contato: string;
  cpf: string;
  titulo_cientifico: boolean;
  tipo_usuario: TipoUsuario;
  email_verificado: boolean;
  ultimo_acesso: Date | null;
  atualizado_em: Date;
};

export type DeleteUsuarioBody = {
  id_usuario: string;
};

export type DeleteUsuarioResponse = {
  id_usuario: string;
  nome: string;
  email: string;
  contato: string;
};

export type ListarUsuarios = {
  limit: number;
  offset: number;
};

export type ListarUsuariosResponse = {
  usuarios: usuarios[];
  total: number;
};
