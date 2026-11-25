import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import InformacoesEspecies from "../../models/InformacoesEspecies";

import {
  BuscarInformacaoEspeciePorIdParamsRequest,
  BuscarInformacaoEspeciePorIdResponse,
  toInformacaoEspecieResponse,
} from "../../types/informacoes-especies-types";

export default class BuscarInformacaoEspeciePorIdUseCase {
  static async valida(
    params: BuscarInformacaoEspeciePorIdParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_informacaoespecies: Joi.string().uuid().required(),
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
    params: BuscarInformacaoEspeciePorIdParamsRequest
  ): Promise<BuscarInformacaoEspeciePorIdResponse> {
    try {
      await this.valida(params);

      const informacaoEspecie = await InformacoesEspecies.findByPk(
        params.id_informacaoespecies
      );

      if (!informacaoEspecie) {
        throw {
          message: `Informação da espécie ${params.id_informacaoespecies} não encontrada`,
          status: httpStatus.NOT_FOUND,
        };
      }

      return toInformacaoEspecieResponse(informacaoEspecie);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}