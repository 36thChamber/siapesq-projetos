import Joi from 'joi';
import { Op } from 'sequelize';
import http_status from '../../consts/http-status-enum';
import CamposArteDePesca from '../../models/CamposArteDePesca';
import { AppError } from '../../errors/app-error';
import {
  ListarCamposArteDePescaQueryRequest,
  ListarCamposArteDePescaResponse,
} from '../../types/campos-arte-de-pesca-types';

const querySchema = Joi.object({
  limit: Joi.number().default(10).error(() => new Error('limit inválido')),
  offset: Joi.number().default(0).error(() => new Error('offset inválido')),
});

export default class ListarCamposArteDePescaUseCase {
  static async valida(query: ListarCamposArteDePescaQueryRequest) {
    try {
      await querySchema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(
        http_status.BAD_REQUEST,
        'VALIDATION_ERROR',
        err.message
      );
    }
  }

  static async executa(
    query: ListarCamposArteDePescaQueryRequest,
  ): Promise<ListarCamposArteDePescaResponse> {
    const { limit, offset } = query;
    const { count, rows } = await CamposArteDePesca.findAndCountAll({
      where: { deletado_em: { [Op.is]: null } },
      limit,
      offset,
      order: [['id', 'DESC']],
    });
    return {
      campos: rows,
      total: count,
    };
  }
}