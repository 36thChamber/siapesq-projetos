import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Artigos from "../../models/Artigos";

import {
  BuscarArtigoPorIdParamsRequest,
  BuscarArtigoPorIdResponse,
  toArtigoResponse,
} from "../../types/artigos-types";

export default class BuscarArtigoPorIdUseCase {
  static async valida(
    params: BuscarArtigoPorIdParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_artigo: Joi.number().required(),
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
    params: BuscarArtigoPorIdParamsRequest
  ): Promise<BuscarArtigoPorIdResponse> {
    try {
      await this.valida(params);

      const artigo = await Artigos.findByPk(params.id_artigo);

      if (!artigo) {
        throw {
          message: `Artigo com ID ${params.id_artigo} não encontrado`,
          status: httpStatus.NOT_FOUND,
        };
      }

      return toArtigoResponse(artigo);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}