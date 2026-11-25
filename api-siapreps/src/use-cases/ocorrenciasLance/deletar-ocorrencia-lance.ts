import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import OcorrenciasLance from "../../models/OcorrenciasLance";
import {
  AtualizarOcorrenciaLanceResponse,
  GetOcorrenciaLanceParamsRequest,
  toOcorrenciaLanceResponse,
} from "../../types/ocorrencias-lance-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .error(() => new Error("id da ocorrência inválido")),
});

export default class DeletarOcorrenciaLanceUseCase {
  static async valida(params: GetOcorrenciaLanceParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    params: GetOcorrenciaLanceParamsRequest,
  ): Promise<AtualizarOcorrenciaLanceResponse> {
    try {
      const { id } = params;
      const ocorrencia = await OcorrenciasLance.findByPk(id);
      if (!ocorrencia) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Ocorrência ${id} não encontrada`);
      }

      await OcorrenciasLance.update(
        { ativo: false, deletado_em: new Date() },
        { where: { id }, fields: ["ativo", "deletado_em"] },
      );

      const ocorrenciaAtualizada = await OcorrenciasLance.findByPk(id, {
        paranoid: false,
      });
      if (!ocorrenciaAtualizada) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Ocorrência ${id} não encontrada`);
      }

      return toOcorrenciaLanceResponse(ocorrenciaAtualizada);
    } catch (err) {
      throw err;
    }
  }
}