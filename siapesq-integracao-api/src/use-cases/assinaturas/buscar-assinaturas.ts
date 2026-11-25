import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";
import Planos from "../../models/Planos";

import {
  AssinaturaResponse,
  ListarAssinaturasQueryRequest,
  toAssinaturaResponse,
} from "../../types/assinaturas-types";

import {
  AtorAutenticado,
  exigeAdmin,
} from "../../utils/autorizacao-recurso";

export default class ListarAssinaturasUseCase {
  static async valida(
    query: ListarAssinaturasQueryRequest
  ): Promise<void> {
    const schema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      offset: Joi.number().integer().min(0).default(0),
    });

    try {
      await schema.validateAsync(query);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    query: ListarAssinaturasQueryRequest,
    ator: AtorAutenticado
  ): Promise<AssinaturaResponse[]> {
    try {
      exigeAdmin(ator);

      await this.valida(query);

      const lista = await Assinaturas.findAll({
        limit: query.limit ?? 10,
        offset: query.offset ?? 0,
        order: [["criado_em", "DESC"]],
        include: [
          {
            model: Planos,
            as: "plano",
            required: false,
          },
        ],
      });

      return lista.map(toAssinaturaResponse);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}