import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Analises from "../../models/Analises";

import {
  AnaliseResponse,
  toAnaliseResponse,
} from "../../types/analises-types";

export type BuscarAnalisesPorEspecieParamsRequest = {
  id_especie: string;
};

export type BuscarAnalisesPorEspecieResponse = AnaliseResponse[];

export default class BuscarAnalisesPorEspecieUseCase {
  static async valida(
    params: BuscarAnalisesPorEspecieParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_especie: Joi.string().uuid().required(),
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
    params: BuscarAnalisesPorEspecieParamsRequest
  ): Promise<BuscarAnalisesPorEspecieResponse> {
    try {
      await this.valida(params);

      const analises = await Analises.findAll({
        where: {
          id_especie: params.id_especie,
        },
      });

      return analises.map(toAnaliseResponse);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.BAD_REQUEST,
      };
    }
  }
}