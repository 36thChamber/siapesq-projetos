import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import CamposArteDePesca from "../../models/CamposArteDePesca";
import { AppError } from "../../errors/app-error";
import {
  BuscarCamposPorArteDePescaParamsRequest,
  BuscarCamposPorArteDePescaResponse,
  toCampoArteDePescaResponse,
} from "../../types/campos-arte-de-pesca-types";

const req_params_schema = Joi.object({
  id_arte_pesca: Joi.number()
    .required()
    .error(() => new Error("id_arte_pesca inválido")),
});

export default class BuscarCamposPorArteDePescaUseCase {
  static async valida(params: BuscarCamposPorArteDePescaParamsRequest) {
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

  static async executa(
    params: BuscarCamposPorArteDePescaParamsRequest,
  ): Promise<BuscarCamposPorArteDePescaResponse> {
    const { id_arte_pesca } = params;

    const { rows, count } = await CamposArteDePesca.findAndCountAll({
      where: {
        id_arte_pesca,
        ativo: true,
      },
      order: [["id", "ASC"]],
    });

    return {
      campos: rows.map(toCampoArteDePescaResponse),
      total: count,
    };
  }
}