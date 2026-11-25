import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import CamposArteDePesca from '../../models/CamposArteDePesca';
import ArtesDePesca from '../../models/ArtesDePesca';
import { AppError } from '../../errors/app-error';
import {
  AtualizarCampoArteDePescaBodyRequest,
  GetCampoArteDePescaParamsRequest,
  AtualizarCampoArteDePescaResponse,
  toCampoArteDePescaResponse,
} from '../../types/campos-arte-de-pesca-types';

const paramsSchema = Joi.object({
  id: Joi.number().required().error(() => new Error('id inválido')),
});

const updateBodySchema = Joi.object({
  id_arte_pesca: Joi.number().optional(),
  nome: Joi.string().optional(),
  tipo: Joi.string().allow(null).optional(),
  obrigatorio: Joi.boolean().allow(null).optional(),
  ativo: Joi.boolean().optional(),
})
  .min(1)
  .error(() => new Error('Nenhum campo informado para atualizar'));

export default class AtualizarCampoArteDePescaUseCase {
  static async valida(
    params: GetCampoArteDePescaParamsRequest,
    body: AtualizarCampoArteDePescaBodyRequest,
  ) {
    try {
      await paramsSchema.validateAsync(params);
      await updateBodySchema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(
        http_status.BAD_REQUEST,
        'VALIDATION_ERROR',
        err.message
      );
    }
  }

  static async executa(
    params: GetCampoArteDePescaParamsRequest,
    body: AtualizarCampoArteDePescaBodyRequest,
  ): Promise<AtualizarCampoArteDePescaResponse> {
    const campo = await CamposArteDePesca.findByPk(params.id);
    if (!campo || campo.deletado_em) {
      throw new AppError(
        http_status.NOT_FOUND,
        'NOT_FOUND',
        'Campo não encontrado'
      );
    }

    if (body.id_arte_pesca && body.id_arte_pesca !== campo.id_arte_pesca) {
      const arte = await ArtesDePesca.findByPk(body.id_arte_pesca);
      if (!arte || arte.deletado_em) {
        throw new AppError(
          http_status.NOT_FOUND,
          'NOT_FOUND',
          'Arte de pesca não encontrada'
        );
      }
    }

    await campo.update(body);
    return toCampoArteDePescaResponse(campo);
  }
}