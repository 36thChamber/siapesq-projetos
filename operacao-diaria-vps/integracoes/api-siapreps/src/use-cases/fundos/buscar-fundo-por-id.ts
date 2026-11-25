import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Fundos from "../../models/Fundos";
import {
  GetFundoParamsRequest,
  GetFundoResponse,
} from "../../types/fundos-types";
import { AppError } from "../../errors/app-error";

export default class BuscarFundoPorIdUseCase {
  static async valida(params: GetFundoParamsRequest): Promise<GetFundoParamsRequest> {
    const schema = Joi.object({
      id: Joi.number().required().messages({
        "any.required": "Id do fundo invalido",
        "number.base": "Id do fundo invalido",
      }),
    });

    const { error, value } = schema.validate(params);

    if (error) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', error.details[0].message);
    }

    return value;
  }

  static async executa(params: GetFundoParamsRequest): Promise<GetFundoResponse> {
    const fundo = await Fundos.findByPk(params.id);

    if (!fundo) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Fundo ${params.id} nao encontrado`);
    }

    return fundo.toJSON() as GetFundoResponse;
  }
}