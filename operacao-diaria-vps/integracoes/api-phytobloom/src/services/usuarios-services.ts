import {
  UsuarioLoginBodyRequest,
  CriarUsuarioBodyRequest,
  ListarUsuariosQueryRequest,
  AtualizarUsuarioBodyRequest,
} from "../types/usuarios-types";
import login_use_case from "../use-cases/login";
import criar_use_case from "../use-cases/usuarios/criar-usuario";
import delete_use_case from "../use-cases/usuarios/delete-usuario";
import get_use_case from "../use-cases/usuarios/get-usuario";
import list_use_case from "../use-cases/usuarios/list-usuarios";
import update_use_case from "../use-cases/usuarios/update-usuario";

export default class UsuariosService {
  static async login(body: UsuarioLoginBodyRequest) {
    await login_use_case.valida(body);
    return await login_use_case.executa(body);
  }

  static async create(body: CriarUsuarioBodyRequest) {
    await criar_use_case.valida(body);
    return await criar_use_case.executa(body);
  }

  static async list(query: ListarUsuariosQueryRequest) {
    await list_use_case.valida(query);
    return await list_use_case.executa(query);
  }

  static async get(id_usuario: number | string) {
    return await get_use_case.executa(id_usuario);
  }

  static async update(body: AtualizarUsuarioBodyRequest, id_usuario: number) {
    await update_use_case.valida(body);
    return await update_use_case.executa(body, id_usuario);
  }

  static async delete(id_usuario: number) {
    await delete_use_case.valida({ id: id_usuario });
    return await delete_use_case.executa({ id: id_usuario });
  }
}
