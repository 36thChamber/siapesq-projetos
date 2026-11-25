import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Especies from "../../models/Especies";
import InformacoesEspecies from "../../models/InformacoesEspecies";

import {
  BuscarEspeciePorIdParamsRequest,
  BuscarEspeciePorIdResponse,
  toEspecieResponse,
} from "../../types/especies-types";

export default class BuscarEspeciePorIdUseCase {
  static async valida(
    params: BuscarEspeciePorIdParamsRequest
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
    params: BuscarEspeciePorIdParamsRequest
  ): Promise<BuscarEspeciePorIdResponse> {
    try {
      await this.valida(params);

      const especie = await Especies.findByPk(params.id_especie, {
        include: [
          {
            model: InformacoesEspecies,
            as: "informacoesEspecies",
          },
        ],
      });

      if (!especie) {
        throw {
          message: `Espécie ${params.id_especie} não encontrada`,
          status: httpStatus.NOT_FOUND,
        };
      }

      return toEspecieResponse(especie);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}