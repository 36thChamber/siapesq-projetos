import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Iscas from "../../models/Iscas";
import { GetIscaResponse, toIscaResponse } from "../../types/iscas-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number().required().messages({
    "any.required": "Id da isca e obrigatorio",
    "number.base": "Id da isca invalido",
  }),
});

export default class AtivarIscaUseCase {
  static async valida(params: { id: number }) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(id: number): Promise<GetIscaResponse> {
    const isca = await Iscas.findByPk(id);

    if (!isca) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Isca ${id} nao encontrada`);
    }

    await isca.update({ ativo: true });

    return toIscaResponse(isca);
  }
}