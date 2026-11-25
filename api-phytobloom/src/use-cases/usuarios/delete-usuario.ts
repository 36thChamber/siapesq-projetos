import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import { DeleteUsuarioParamsRequest, DeleteUsuarioResponse } from "../../types/usuarios-types";
const req_params_schema = Joi.object({
  id: Joi.number().required().error(() => new Error("id do usuario invalido")),
});

export default class DeletarUsuarioUseCase {
  static async valida(params: DeleteUsuarioParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(params: DeleteUsuarioParamsRequest): Promise<DeleteUsuarioResponse> {
    const usuario = await Usuarios.findByPk(params.id);

    if (!usuario) {
      throw {
        message: "Usuario nao encontrado.",
        status: http_status.NOT_FOUND,
      };
    }

    await usuario.destroy();
    return { message: "Usuario deletado com sucesso" };
  }
}
