import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Iscas from "../../models/Iscas";
import { GetIscaParamsRequest, GetIscaResponse, toIscaResponse } from "../../types/iscas-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number().required().messages({
    "any.required": "Id da isca e obrigatorio",
    "number.base": "Id da isca invalido",
  }),
});

export default class BuscarIscaPorIdUseCase {
  static async valida(params: GetIscaParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(params: GetIscaParamsRequest): Promise<GetIscaResponse> {
    const { id } = params;
    const isca = await Iscas.findByPk(id);

    if (!isca) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Isca ${id} nao encontrada`);
    }

    return toIscaResponse(isca);
  }
}