import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Fundos from "../../models/Fundos";
import { AppError } from "../../errors/app-error";

export default class DeletarFundoUseCase {
  static async valida(params: { id: number }): Promise<{ id: number }> {
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

  static async executa(id: number): Promise<void> {
    const fundo = await Fundos.findByPk(id);

    if (!fundo) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Fundo ${id} nao encontrado`);
    }

    await fundo.destroy();
  }
}