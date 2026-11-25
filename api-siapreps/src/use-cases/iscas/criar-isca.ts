import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Iscas from "../../models/Iscas";
import {
  CriarIscaBodyRequest,
  CriarIscaResponse,
  toIscaResponse,
} from "../../types/iscas-types";
import { AppError } from "../../errors/app-error";

const create_body_schema = Joi.object({
  nome: Joi.string().required().messages({
    "any.required": "Nome da isca e obrigatorio",
    "string.empty": "Nome da isca nao pode ser vazio",
  }),
});

export default class CriarIscaUseCase {
  static async valida(body: CriarIscaBodyRequest) {
    try {
      await create_body_schema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(body: CriarIscaBodyRequest): Promise<CriarIscaResponse> {
    const isca = await Iscas.create(body as any);
    return toIscaResponse(isca);
  }
}