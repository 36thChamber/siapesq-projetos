import LoginUseCase from "../use-cases/login";
import CriarUsuarioUseCase from "../use-cases/usuarios/criar-usuario";
import BuscarUsuariosPorIdUseCase from "../use-cases/usuarios/buscar-usuario-por-id";
import AtualizarUsuarioUseCase from "../use-cases/usuarios/atualizar-usuario";
import DeletarUsuarioUseCase from "../use-cases/usuarios/deletar-usuario";
import BuscarUsuariosUseCase from "../use-cases/usuarios/buscar-usuarios";
import SolicitarRecuperacaoSenhaUseCase from "../use-cases/usuarios/solicitar-recuperacao-senha";
import RedefinirSenhaUseCase from "../use-cases/usuarios/redefinir-senha";
import AtualizarStatusUsuarioUseCase from "../use-cases/usuarios/atualizar-status-usuario";
import {
  UsuarioLoginRequestBody,
  CriarUsuarioBodyRequest,
  AtualizarUsuarioBodyRequest,
  ListarUsuariosQueryRequest,
} from "../types/usuarios-types";

export default class UsuariosService {
  static async solicitarRecuperacaoSenha(body: { email: string }) {
    return SolicitarRecuperacaoSenhaUseCase.executa(body);
  }

  static async redefinirSenha(body: { token: string; senha: string }) {
    return RedefinirSenhaUseCase.executa(body);
  }
  static async delete(id_usuario: number | string) {
    try {
      return await DeletarUsuarioUseCase.executa(id_usuario);
    } catch (err) {
      throw err;
    }
  }
  static async login(body: UsuarioLoginRequestBody) {
    try {
      await LoginUseCase.valida(body);
      return await LoginUseCase.executa(body);
    } catch (err) {
      throw err;
    }
  }
  static async create(body: CriarUsuarioBodyRequest) {
    try {
      await CriarUsuarioUseCase.valida(body);
      return await CriarUsuarioUseCase.executa(body);
    } catch (err) {
      throw err;
    }
  }
  static async get(id_usuario: number | string) {
    try {
      return await BuscarUsuariosPorIdUseCase.executa(id_usuario);
    } catch (err) {
      throw err;
    }
  }
  static async update(
    body: AtualizarUsuarioBodyRequest,
    id_usuario: number | string,
  ) {
    try {
      await AtualizarUsuarioUseCase.valida(body);
      return await AtualizarUsuarioUseCase.executa(body, id_usuario);
    } catch (err) {
      throw err;
    }
  }
  static async list(query: ListarUsuariosQueryRequest) {
    await BuscarUsuariosUseCase.valida(query);
    return BuscarUsuariosUseCase.executa(query);
  }

  static async atualizarStatus(id_usuario: number | string, body: { ativo?: boolean }) {
    await AtualizarStatusUsuarioUseCase.valida(body);
    return AtualizarStatusUsuarioUseCase.executa(id_usuario, body.ativo!);
  }
}
