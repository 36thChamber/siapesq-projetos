import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import Lances from '../../models/Lances';
import { GetLanceParamsRequest, LanceResponse, toLanceResponse } from '../../types/Lances-types';
import { AppError } from '../../errors/app-error';

const req_params_schema = Joi.object({
  id: Joi.number().required().error(() => new Error("id do lance inválido")),
});

export default class BuscarLancePorIdUseCase {
  static async valida(params: GetLanceParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(params: GetLanceParamsRequest): Promise<LanceResponse> {
    const { id } = params;
    const lance = await Lances.findByPk(id);
    if (!lance || lance.deletado_em) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Lance ${id} não encontrado`);
    }
    return toLanceResponse(lance);
  }
}