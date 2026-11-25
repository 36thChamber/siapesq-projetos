import ConfirmarEmailUseCase, {
  ConfirmarEmailBodyRequest,
} from "../use-cases/usuarios/confirmar-email";

import DeletarUsuarioUseCase from "../use-cases/usuarios/deletar-usuario";
import EsqueciSenhaUseCase, {
  EsqueciSenhaBodyRequest,
} from "../use-cases/usuarios/esqueceu-senha";

import BuscarUsuarioPorIdUseCase from "../use-cases/usuarios/buscar-usuario-por-id";
import CriarUsuarioUseCase from "../use-cases/usuarios/criar-usuario";
import ResetPasswordUseCase, {
  ResetPasswordBodyRequest,
} from "../use-cases/usuarios/alterar-senha";

import EnviarVerificacaoEmailUseCase, {
  EnviarVerificacaoEmailBodyRequest,
} from "../use-cases/usuarios/verificar-email";

import AtualizarUsuarioUseCase from "../use-cases/usuarios/atualizar-usuario";
import LoginUseCase from "../use-cases/login";
import ListarUsuariosUseCase from "../use-cases/usuarios/buscar-usuarios";
import RefreshTokenUseCase, {
  RefreshTokenParamsRequest,
} from "../use-cases/usuarios/atualizar-token";

import {
  AtualizarUsuarioBodyRequest,
  BuscarUsuarioPorIdParamsRequest,
  CriarUsuarioBodyRequest,
  DeletarUsuarioParamsRequest,
  ListarUsuariosQueryRequest,
  UsuarioLoginBodyRequest,
} from "../types/usuarios-types";

export default class UsuariosService {
  static async confirmarEmail(body: ConfirmarEmailBodyRequest) {
    return ConfirmarEmailUseCase.executa(body);
  }

  static async deletar(params: DeletarUsuarioParamsRequest) {
    return DeletarUsuarioUseCase.executa(params);
  }

  static async esqueciSenha(body: EsqueciSenhaBodyRequest) {
    return EsqueciSenhaUseCase.executa(body);
  }

  static async buscarPorId(
    params: BuscarUsuarioPorIdParamsRequest,
    idUsuarioAutenticado: string
  ) {
    return BuscarUsuarioPorIdUseCase.executa(params, idUsuarioAutenticado);
  }

  static async listar(query: ListarUsuariosQueryRequest) {
    return ListarUsuariosUseCase.executa(query);
  }

  static async criar(body: CriarUsuarioBodyRequest) {
    return CriarUsuarioUseCase.executa(body);
  }

  static async resetarSenha(body: ResetPasswordBodyRequest) {
    return ResetPasswordUseCase.executa(body);
  }

  static async enviarVerificacaoEmail(
    body: EnviarVerificacaoEmailBodyRequest
  ) {
    return EnviarVerificacaoEmailUseCase.executa(body);
  }

  static async atualizar(
    params: BuscarUsuarioPorIdParamsRequest,
    body: AtualizarUsuarioBodyRequest
  ) {
    return AtualizarUsuarioUseCase.executa(params, body);
  }

  static async login(body: UsuarioLoginBodyRequest) {
    return LoginUseCase.executa(body);
  }

  static async atualizarToken(params: RefreshTokenParamsRequest) {
    return RefreshTokenUseCase.executa(params);
  }
}
