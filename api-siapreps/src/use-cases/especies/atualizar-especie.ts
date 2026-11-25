import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Especies from "../../models/Especies";
import {
  AtualizarEspecieBodyRequest,
  AtualizarEspecieResponse,
  GetEspecieParamsRequest,
  toEspecieResponse,
} from "../../types/especies-types";
import { AppError } from "../../errors/app-error";

const update_body_schema = Joi.object({
  nome: Joi.string().messages({
    "string.empty": "Nome da especie nao pode ser vazio",
  }),
  imagem: Joi.string().messages({
    "string.empty": "URL da imagem nao pode ser vazia",
  }),
  ativo: Joi.boolean().messages({
    "boolean.base": "Ativo invalido",
  }),
})
  .min(1)
  .messages({
    "object.min": "Informe pelo menos um campo para atualizar",
  });

const req_params_schema = Joi.object({
  id: Joi.number().required().messages({
    "any.required": "Id da especie e obrigatorio",
    "number.base": "Id da especie invalido",
  }),
});

export default class AtualizarEspecieUseCase {
  static async valida(
    params: GetEspecieParamsRequest,
    body: AtualizarEspecieBodyRequest
  ) {
    try {
      await req_params_schema.validateAsync(params);
      await update_body_schema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    id: number,
    body: AtualizarEspecieBodyRequest
  ): Promise<AtualizarEspecieResponse> {
    const especie = await Especies.findByPk(id);

    if (!especie) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Especie ${id} nao encontrada`);
    }

    await especie.update(body);

    return toEspecieResponse(especie);
  }
}