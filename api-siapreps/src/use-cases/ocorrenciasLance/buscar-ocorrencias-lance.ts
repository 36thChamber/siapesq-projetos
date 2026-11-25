import Joi from "joi";
import { Op } from "sequelize";

import http_status from "../../consts/http-status-enum";
import OcorrenciasLance, {
  TIPOS_OCORRENCIA_LANCE,
  TipoOcorrenciaLance,
} from "../../models/OcorrenciasLance";
import {
  ListarOcorrenciasLanceParamsRequest,
  ListarOcorrenciasLanceQueryRequest,
  ListarOcorrenciasLanceResponse,
  toOcorrenciaLanceResponse,
} from "../../types/ocorrencias-lance-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id_lance: Joi.number()
    .integer()
    .positive()
    .required()
    .error(() => new Error("id do lance inválido")),
});

const req_query_schema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(0)
    .default(10)
    .error(() => new Error("limit inválido")),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .error(() => new Error("offset inválido")),
  tipo_ocorrencia: Joi.string()
    .valid(...TIPOS_OCORRENCIA_LANCE)
    .optional()
    .error(() => new Error("tipo_ocorrencia inválido")),
  updated_after: Joi.date()
    .iso()
    .optional()
    .error(() => new Error("updated_after inválido")),
});

export default class BuscarOcorrenciasLanceUseCase {
  static async valida(
    params: ListarOcorrenciasLanceParamsRequest,
    query: ListarOcorrenciasLanceQueryRequest,
  ) {
    try {
      await req_params_schema.validateAsync(params);
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    params: ListarOcorrenciasLanceParamsRequest,
    query: ListarOcorrenciasLanceQueryRequest,
  ): Promise<ListarOcorrenciasLanceResponse> {
    try {
      let where: any = { id_lance: params.id_lance };
      let paranoid = true;

      if (query.updated_after) {
        paranoid = false;
        where[Op.or] = [
          { atualizado_em: { [Op.gte]: query.updated_after } },
          { deletado_em: { [Op.gte]: query.updated_after } },
        ];
      } else {
        where.ativo = true;
      }

      if (query.tipo_ocorrencia) {
        where.tipo_ocorrencia = query.tipo_ocorrencia;
      }

      const { rows, count } = await OcorrenciasLance.findAndCountAll({
        limit: query.limit,
        offset: query.offset,
        where,
        paranoid,
      });

      return {
        ocorrencias: rows.map(toOcorrenciaLanceResponse),
        total: count,
      };
    } catch (err) {
      throw err;
    }
  }
}