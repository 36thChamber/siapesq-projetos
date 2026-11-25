import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Especies from "../../models/Especies";
import {
  CriarEspecieBodyRequest,
  CriarEspecieResponse,
  toEspecieResponse,
} from "../../types/especies-types";
import { AppError } from "../../errors/app-error";

const create_body_schema = Joi.object({
  nome: Joi.string().required().messages({
    "any.required": "Nome da especie e obrigatorio",
    "string.empty": "Nome da especie nao pode ser vazio",
  }),
  imagem: Joi.string().required().messages({
    "any.required": "URL da imagem da especie e obrigatoria",
    "string.empty": "URL da imagem nao pode ser vazia",
  }),
});

export default class CriarEspecieUseCase {
  static async valida(body: CriarEspecieBodyRequest) {
    try {
      await create_body_schema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    body: CriarEspecieBodyRequest,
  ): Promise<CriarEspecieResponse> {
    const especie = await Especies.create(body as any);
    return toEspecieResponse(especie);
  }
}