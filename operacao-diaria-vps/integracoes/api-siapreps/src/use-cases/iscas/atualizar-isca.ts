import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Iscas from "../../models/Iscas";
import {
  toIscaResponse,
  AtualizarIscaBodyRequest,
  AtualizarIscaResponse,
} from "../../types/iscas-types";
import { AppError } from "../../errors/app-error";

const update_body_schema = Joi.object({
  nome: Joi.string().messages({
    "string.empty": "Nome da isca nao pode ser vazio",
  }),
})
  .min(1)
  .messages({
    "object.min": "Informe pelo menos um campo para atualizar",
  });

const req_params_schema = Joi.object({
  id: Joi.number().required().messages({
    "any.required": "Id da isca e obrigatorio",
    "number.base": "Id da isca invalido",
  }),
});

export default class AtualizarIscaUseCase {
  static async valida(params: { id: number }, body: AtualizarIscaBodyRequest) {
    try {
      await req_params_schema.validateAsync(params);
      await update_body_schema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    id: number,
    body: AtualizarIscaBodyRequest,
  ): Promise<AtualizarIscaResponse> {
    const isca = await Iscas.findByPk(id);

    if (!isca) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Isca ${id} nao encontrada`);
    }

    await isca.update(body as any);

    return toIscaResponse(isca);
  }
}