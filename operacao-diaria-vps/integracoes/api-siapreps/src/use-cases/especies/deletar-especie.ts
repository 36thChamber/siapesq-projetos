import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Especies from "../../models/Especies";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number()
    .required()
    .messages({
      "any.required": "Id da especie e obrigatorio",
      "number.base": "Id da especie invalido",
    }),
});

export default class DeletarEspecieUseCase {
  static async valida(params: { id: number }) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(id: number): Promise<void> {
    const especie = await Especies.findByPk(id);

    if (!especie) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Especie ${id} nao encontrada`);
    }

    await especie.destroy();
  }
}