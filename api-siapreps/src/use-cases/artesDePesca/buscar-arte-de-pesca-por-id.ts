import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import ArtesDePesca from "../../models/ArtesDePesca";
import { AppError } from "../../errors/app-error";
import {
  GetArteDePescaParamsRequest,
  GetArteDePescaResponse,
  toArteDePescaResponse,
} from "../../types/artes-de-pesca-types";

const req_params_schema = Joi.object({
  id: Joi.number().required().error(() => new Error("id de Artes de pesca inválido")),
});
export default class BuscarArteDePescaPorIdUseCase {
  static async valida(params: GetArteDePescaParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(
        http_status.BAD_REQUEST,
        'VALIDATION_ERROR',
        err.message
      );
    }
  }

  static async executa(params: GetArteDePescaParamsRequest): Promise<GetArteDePescaResponse> {
    try {
      const { id } = params;
      const arteDePesca = await ArtesDePesca.findByPk(id);
      if (!arteDePesca) {
        throw new AppError(
          http_status.NOT_FOUND,
          'NOT_FOUND',
          `ArtesDePesca ${id} não encontrada`
        );
      }

      return toArteDePescaResponse(arteDePesca);
    } catch (err) {
      throw err;
    }
  }
}