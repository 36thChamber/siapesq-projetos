import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Fundos from "../../models/Fundos";
import { AtualizarFundoBodyRequest, AtualizarFundoResponse } from "../../types/fundos-types";
import { AppError } from "../../errors/app-error";

export default class AtualizarFundoUseCase {
  static async valida(body: AtualizarFundoBodyRequest): Promise<AtualizarFundoBodyRequest> {
    const schema = Joi.object({
      nome: Joi.string().optional(),
    }).min(1).messages({
      "object.min": "Informe ao menos um campo para atualizar",
    });

    const { error, value } = schema.validate(body);

    if (error) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', error.details[0].message);
    }

    return value;
  }

  static async executa(id: number, body: AtualizarFundoBodyRequest): Promise<AtualizarFundoResponse> {
    const fundo = await Fundos.findByPk(id);

    if (!fundo) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Fundo ${id} nao encontrado`);
    }

    await fundo.update(body);

    return fundo.toJSON() as AtualizarFundoResponse;
  }
}