import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import CamposArteDePesca from '../../models/CamposArteDePesca';
import { AppError } from '../../errors/app-error';
import { GetCampoArteDePescaParamsRequest } from '../../types/campos-arte-de-pesca-types';

const paramsSchema = Joi.object({
  id: Joi.number().required().error(() => new Error('id inválido')),
});

export default class DeletarCampoArteDePescaUseCase {
  static async valida(params: GetCampoArteDePescaParamsRequest) {
    try {
      await paramsSchema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(
        http_status.BAD_REQUEST,
        'VALIDATION_ERROR',
        err.message
      );
    }
  }

  static async executa(params: GetCampoArteDePescaParamsRequest): Promise<void> {
    const campo = await CamposArteDePesca.findByPk(params.id);
    if (!campo || campo.deletado_em) {
      throw new AppError(
        http_status.NOT_FOUND,
        'NOT_FOUND',
        'Campo não encontrado'
      );
    }
    await campo.destroy(); // soft delete
  }
}