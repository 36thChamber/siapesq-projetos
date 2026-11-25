import CriarUsuarioAtivoUseCase from "../use-cases/usuariosAtivos/criar-usuario-ativo";
import BuscarUsuarioAtivoPorIdUseCase from "../use-cases/usuariosAtivos/buscar-usuario-ativo-por-id";
import DeletarUsuarioAtivoUseCase from "../use-cases/usuariosAtivos/deletar-usuario-ativo";
import AtualizarUsuarioAtivoUseCase from "../use-cases/usuariosAtivos/atualizar-usuario-ativo";
import BuscarUsuariosAtivosUseCase from "../use-cases/usuariosAtivos/buscar-usuarios-ativos";

import {
  CriarUsuarioAtivoBodyRequest,
  AtualizarUsuarioAtivoBodyRequest,
  DeletarUsuarioAtivoParamsRequest,
  ListarUsuariosAtivosQueryRequest,
} from "../types/usuarios-ativos-types";

export default class UsuariosAtivosServices {
  static async create(body: CriarUsuarioAtivoBodyRequest) {
    await CriarUsuarioAtivoUseCase.valida(body);
    return CriarUsuarioAtivoUseCase.executa(body);
  }

  static async get(id_usuario: number) {
    return BuscarUsuarioAtivoPorIdUseCase.executa(id_usuario);
  }

  static async update(body: AtualizarUsuarioAtivoBodyRequest) {
    await AtualizarUsuarioAtivoUseCase.valida(body);
    return AtualizarUsuarioAtivoUseCase.executa(body);
  }

  static async delete(params: DeletarUsuarioAtivoParamsRequest) {
    await DeletarUsuarioAtivoUseCase.valida(params);
    return DeletarUsuarioAtivoUseCase.executa(params);
  }

  static async list(query: ListarUsuariosAtivosQueryRequest) {
    await BuscarUsuariosAtivosUseCase.valida(query);
    return BuscarUsuariosAtivosUseCase.executa(query);
  }
}