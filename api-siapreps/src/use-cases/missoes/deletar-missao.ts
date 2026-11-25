import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Missoes from "../../models/Missoes";
import { GetMissaoParamsRequest } from "../../types/Missoes-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number()
    .required()
    .error(() => new Error("id inválido")),
});

export default class DeletarMissaoUseCase {
  static async valida(params: GetMissaoParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(params: GetMissaoParamsRequest): Promise<void> {
    const { id } = params;
    const missao = await Missoes.findByPk(id);
    if (!missao || missao.deletado_em) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Missão ${id} não encontrada`);
    }
    await missao.destroy();
  }
}