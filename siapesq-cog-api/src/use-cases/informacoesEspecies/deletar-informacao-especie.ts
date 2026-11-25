import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import InformacoesEspecies from "../../models/InformacoesEspecies";

import {
  DeletarInformacaoEspecieParamsRequest,
  DeletarInformacaoEspecieResponse,
  toInformacaoEspecieResponse,
} from "../../types/informacoes-especies-types";

export default class DeletarInformacaoEspecieUseCase {
  static async valida(
    params: DeletarInformacaoEspecieParamsRequest
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
    params: DeletarInformacaoEspecieParamsRequest
  ): Promise<DeletarInformacaoEspecieResponse> {
    try {
      await this.valida(params);

      const informacaoEspecie = await InformacoesEspecies.findByPk(
        params.id_informacaoespecies
      );

      if (!informacaoEspecie) {
        throw {
          message: "Informação da espécie não encontrada",
          status: httpStatus.NOT_FOUND,
        };
      }

      const response = toInformacaoEspecieResponse(informacaoEspecie);

      await informacaoEspecie.destroy();

      return response;
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}