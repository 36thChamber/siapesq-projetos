import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import CamposArteDePesca from '../../models/CamposArteDePesca';
import ArtesDePesca from '../../models/ArtesDePesca';
import { AppError } from '../../errors/app-error';
import {
  CriarCampoArteDePescaBodyRequest,
  CriarCampoArteDePescaResponse,
  toCampoArteDePescaResponse,
} from '../../types/campos-arte-de-pesca-types';

const createBodySchema = Joi.object({
  id_arte_pesca: Joi.number()
    .required()
    .error(() => new Error('id_arte_pesca é obrigatório')),
  nome: Joi.string().required().error(() => new Error('nome é obrigatório')),
  tipo: Joi.string().allow(null).optional(),
  obrigatorio: Joi.boolean().allow(null).optional(),
  ativo: Joi.boolean().optional(),
});

export default class CriarCampoArteDePescaUseCase {
  static async valida(body: CriarCampoArteDePescaBodyRequest) {
    try {
      await createBodySchema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(
        http_status.BAD_REQUEST,
        'VALIDATION_ERROR',
        err.message
      );
    }
  }

  static async executa(
    body: CriarCampoArteDePescaBodyRequest,
  ): Promise<CriarCampoArteDePescaResponse> {
    const arte = await ArtesDePesca.findByPk(body.id_arte_pesca);
    if (!arte || arte.deletado_em) {
      throw new AppError(
        http_status.NOT_FOUND,
        'NOT_FOUND',
        'Arte de pesca não encontrada'
      );
    }

    const campo = await CamposArteDePesca.create(body);
    return toCampoArteDePescaResponse(campo);
  }
}