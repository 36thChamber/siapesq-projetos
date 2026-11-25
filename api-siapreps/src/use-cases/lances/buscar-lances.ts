import Joi from 'joi';
import { Op } from 'sequelize';
import http_status from '../../consts/http-status-enum';
import Lances from '../../models/Lances';
import Missoes from '../../models/Missoes';
import { ListarLancesQueryRequest, ListarLancesResponse, toLanceResponse } from '../../types/Lances-types';
import { AppError } from '../../errors/app-error';

const req_query_schema = Joi.object({
  limit: Joi.number().default(10).error(() => new Error('limit inválido')),
  offset: Joi.number().default(0).error(() => new Error('offset inválido')),
  updated_after: Joi.date().iso().optional().error(() => new Error('updated_after inválido')),
  id_usuario: Joi.number().integer().positive().optional().error(() => new Error('id_usuario inválido')),
});

export default class BuscarLancesUseCase {
  static async valida(query: ListarLancesQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(query: ListarLancesQueryRequest): Promise<ListarLancesResponse> {
    const { limit, offset, updated_after, id_usuario } = query;

    let where: any = { deletado_em: null };
    let paranoid = true;
    if (updated_after) {
      paranoid = false;
      where = {
        [Op.or]: [
          { atualizado_em: { [Op.gte]: updated_after } },
          { deletado_em: { [Op.gte]: updated_after } },
        ],
      };
    }

    const { count, rows } = await Lances.findAndCountAll({
      where,
      limit,
      offset,
      paranoid,
      // O dono do lance é o dono da missão. paranoid:false mantém os lances de
      // missões removidas na sincronização incremental (updated_after).
      include: id_usuario
        ? [
            {
              model: Missoes,
              as: 'missao',
              attributes: [],
              where: { id_usuario },
              required: true,
              paranoid: false,
            },
          ]
        : [],
      order: [['id', 'DESC']],
    });
    return { lances: rows.map(toLanceResponse), total: count };
  }
}