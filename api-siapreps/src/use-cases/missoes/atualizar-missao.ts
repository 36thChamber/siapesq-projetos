import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import Missoes from '../../models/Missoes';
import { AtualizarMissaoBodyRequest, GetMissaoParamsRequest, MissaoResponse, toMissaoResponse } from '../../types/Missoes-types';
import { AppError } from '../../errors/app-error';

const req_params_schema = Joi.object({
  id: Joi.number().required().error(() => new Error('id inválido')),
  versaoEsperada: Joi.number().integer().required()
    .error(() => new Error('If-Match ou campo versao é obrigatório para esta operação')),
});

const updateBodySchema = Joi.object({
  id_usuario: Joi.number().optional(),
  id_embarcacao: Joi.number().optional(),
  id_porto_saida: Joi.number().optional(),
  id_porto_chegada: Joi.number().allow(null).optional(),
  id_arte_pesca: Joi.number().optional(),
  id_especie_alvo: Joi.number().allow(null).optional(),
  nome_armador: Joi.string().allow(null).optional(),
  iniciou_em: Joi.date().optional(),
  terminou_em: Joi.date().allow(null).optional(),
  status: Joi.string().allow(null).optional(),
})
  .min(1)
  .error(() => new Error('Nenhum campo informado para atualizar a missão'));

export default class AtualizarMissaoUseCase {
  static async valida(params: GetMissaoParamsRequest, body: AtualizarMissaoBodyRequest) {
    try {
      await req_params_schema.validateAsync(params);
      await updateBodySchema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }

    // validação extra de data (terminou_em >= iniciou_em)
    if (body.iniciou_em && body.terminou_em && new Date(body.terminou_em) < new Date(body.iniciou_em)) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', 'terminou_em não pode ser anterior a iniciou_em');
    }
  }

  static async executa(
    params: GetMissaoParamsRequest,
    body: AtualizarMissaoBodyRequest,
  ): Promise<MissaoResponse> {
    const missao = await Missoes.findByPk(params.id);
    if (!missao || missao.deletado_em) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', 'Missão não encontrada');
    }

    // Se for atualizar a data de início, validar com a data de término existente
    if (body.iniciou_em && missao.terminou_em && new Date(missao.terminou_em) < new Date(body.iniciou_em)) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', 'terminou_em existente é anterior à nova iniciou_em');
    }
    if (body.terminou_em && missao.iniciou_em && new Date(body.terminou_em) < new Date(missao.iniciou_em)) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', 'novo terminou_em não pode ser anterior a iniciou_em');
    }

    const [rowsUpdated, [missaoAtualizada]] = await Missoes.update(
      { ...body, versao: missao.versao + 1 },
      { where: { id: params.id, versao: params.versaoEsperada }, returning: true },
    );

    if (rowsUpdated === 0) {
      const atual = await Missoes.findByPk(params.id);
      if (!atual || atual.deletado_em) {
        throw { message: 'Missão não encontrada', status: http_status.NOT_FOUND };
      }
      throw {
        message: 'Versão desatualizada',
        status: http_status.CONFLICT,
        code: 'VERSION_MISMATCH',
      };
    }

    return toMissaoResponse(missaoAtualizada);
  }
}