import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import Lances from '../../models/Lances';
import { GetLanceParamsRequest } from '../../types/Lances-types';
import { AppError } from '../../errors/app-error';

const req_params_schema = Joi.object({
  id: Joi.number().required().error(() => new Error('id inválido')),
});

export default class DeletarLanceUseCase {
  static async valida(params: GetLanceParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(params: GetLanceParamsRequest): Promise<void> {
    const lance = await Lances.findByPk(params.id);
    if (!lance || lance.deletado_em) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', 'Lance não encontrado');
    }
    await lance.destroy();
  }
}