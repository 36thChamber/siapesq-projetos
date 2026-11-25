import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Analises from "../../models/Analises";

import {
  BuscarAnalisePorIdParamsRequest,
  BuscarAnalisePorIdResponse,
  toAnaliseResponse,
} from "../../types/analises-types";

export default class BuscarAnalisePorIdUseCase {
  static async valida(
    params: BuscarAnalisePorIdParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_analise: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    params: BuscarAnalisePorIdParamsRequest
  ): Promise<BuscarAnalisePorIdResponse> {
    try {
      await this.valida(params);

      const analise = await Analises.findByPk(
        params.id_analise
      );

      if (!analise) {
        throw {
          message: "Análise não encontrada",
          status: httpStatus.NOT_FOUND,
        };
      }

      return toAnaliseResponse(analise);
    } catch (err: any) {
      if (err.status) {
        throw err;
      }

      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }
}