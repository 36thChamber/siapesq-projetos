import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Incidentes, { GrupoIncidente } from "../../models/Incidentes";
import Missoes from "../../models/Missoes";
import { AppError } from "../../errors/app-error";

const paramsSchema = Joi.object({
  usuarioId: Joi.number().integer().positive().required(),
  missaoId: Joi.number().integer().positive().required(),
});

const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  grupo: Joi.string()
    .valid(...Object.values(GrupoIncidente))
    .optional(),
});

export default class ListarIncidentesPorMissaoUseCase {
  static async valida(params: {
    usuarioId: number;
    missaoId: number;
    limit?: number;
    offset?: number;
    grupo?: GrupoIncidente;
  }) {
    const { usuarioId, missaoId, limit, offset, grupo } = params;

    try {
      await paramsSchema.validateAsync({ usuarioId, missaoId });
      await querySchema.validateAsync({ limit, offset, grupo });
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }

    const missao = await Missoes.findOne({
      where: { id: missaoId, id_usuario: usuarioId },
    });

    if (!missao) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', "Missão não encontrada ou não pertence ao usuário");
    }
  }

  static async executa(params: {
    missaoId: number;
    limit?: number;
    offset?: number;
    grupo?: GrupoIncidente;
  }) {
    const { missaoId, limit, offset, grupo } = params;

    const where: any = {
      id_missao: missaoId,
      deletado_em: null,
    };

    if (grupo) where.grupo = grupo;

    const { rows, count } = await Incidentes.findAndCountAll({
      where,
      limit: limit || 50,
      offset: offset || 0,
      order: [["criado_em", "DESC"]],
    });

    return {
      incidentes: rows,
      total: count,
    };
  }
}