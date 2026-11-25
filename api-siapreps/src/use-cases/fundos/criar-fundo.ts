import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Fundos from "../../models/Fundos";
import {
  CriarFundoBodyRequest,
  CriarFundoResponse,
  toFundoResponse,
} from "../../types/fundos-types";
import { AppError } from "../../errors/app-error";

export default class CriarFundoUseCase {
  static async valida(
    body: CriarFundoBodyRequest,
  ): Promise<CriarFundoBodyRequest> {
    const schema = Joi.object({
      nome: Joi.string().required().messages({
        "any.required": "Nome do fundo nao informado",
        "string.empty": "Nome do fundo nao informado",
      }),
    });

    const { error, value } = schema.validate(body);

    if (error) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', error.details[0].message);
    }

    return value;
  }

  static async executa(
    body: CriarFundoBodyRequest,
  ): Promise<CriarFundoResponse> {
    const fundo = await Fundos.create({ ...body });
    return toFundoResponse(fundo);
  }
}