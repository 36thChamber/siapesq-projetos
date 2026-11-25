import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import InformacoesEspecies from "../../models/InformacoesEspecies";

import {
  AtualizarInformacaoEspecieBodyRequest,
  AtualizarInformacaoEspecieResponse,
  BuscarInformacaoEspeciePorIdParamsRequest,
  toInformacaoEspecieResponse,
} from "../../types/informacoes-especies-types";

export default class AtualizarInformacaoEspecieUseCase {
  static async valida(
    params: BuscarInformacaoEspeciePorIdParamsRequest,
    body: AtualizarInformacaoEspecieBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      params: Joi.object({
        id_informacaoespecies: Joi.string().uuid().required(),
      }).required(),

      body: Joi.object({
        id_especie: Joi.string().uuid().optional(),
        tipo_informacao: Joi.string().optional(),
        informacao: Joi.string().optional(),
        fonte_referencia: Joi.string().optional().allow(null, ""),
        link_fonte: Joi.string().optional().allow(null, ""),
        referencia_texto: Joi.string().optional().allow(null, ""),
        referencia_completa: Joi.string().optional().allow(null, ""),
      }).required(),
    });

    try {
      await schema.validateAsync({ params, body });
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    params: BuscarInformacaoEspeciePorIdParamsRequest,
    body: AtualizarInformacaoEspecieBodyRequest
  ): Promise<AtualizarInformacaoEspecieResponse> {
    try {
      await this.valida(params, body);

      const informacaoEspecie = await InformacoesEspecies.findByPk(
        params.id_informacaoespecies
      );

      if (!informacaoEspecie) {
        throw {
          message: `Informação da espécie ${params.id_informacaoespecies} não encontrada`,
          status: httpStatus.NOT_FOUND,
        };
      }

      await informacaoEspecie.update(body);

      return toInformacaoEspecieResponse(informacaoEspecie);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}