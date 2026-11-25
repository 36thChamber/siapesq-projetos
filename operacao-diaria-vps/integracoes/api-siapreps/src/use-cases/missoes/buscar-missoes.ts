import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Missoes from "../../models/Missoes";
import {
  ListarMissoesQueryRequest,
  ListarMissoesResponse,
  toMissaoResponse,
} from "../../types/Missoes-types";
import { Op } from "sequelize";
import { AppError } from "../../errors/app-error";

const req_query_schema = Joi.object({
  limit: Joi.number()
    .default(10)
    .error(() => new Error("limit inválido")),
  offset: Joi.number()
    .default(0)
    .error(() => new Error("offset inválido")),
  updated_after: Joi.date()
    .iso()
    .optional()
    .error(() => new Error("updated_after inválido")),
  id_usuario: Joi.number()
    .integer()
    .positive()
    .optional()
    .error(() => new Error("id_usuario inválido")),
});

export default class BuscarMissoesUseCase {
  static async valida(query: ListarMissoesQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    query: ListarMissoesQueryRequest,
  ): Promise<ListarMissoesResponse> {
    const { limit, offset, updated_after, id_usuario } = query;

    let where: any = { deletado_em: { [Op.is]: null } };
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

    if (id_usuario) {
      where = { [Op.and]: [where, { id_usuario }] };
    }

    const { count, rows } = await Missoes.findAndCountAll({
      where,
      limit,
      offset,
      paranoid,
      order: [["id", "DESC"]],
    });
    return {
      missoes: rows.map(toMissaoResponse),
      total: count,
    };
  }
}