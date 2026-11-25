import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Artigos from "../../models/Artigos";

import {
  AtualizarArtigoBodyRequest,
  AtualizarArtigoResponse,
  BuscarArtigoPorIdParamsRequest,
  toArtigoResponse,
} from "../../types/artigos-types";

export default class AtualizarArtigoUseCase {
  static async valida(
    params: BuscarArtigoPorIdParamsRequest,
    body: AtualizarArtigoBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      params: Joi.object({
        id_artigo: Joi.number().required(),
      }).required(),

      body: Joi.object({
        artigo: Joi.string().optional(),
        referencia_texto: Joi.string().optional(),
        referencia_completa: Joi.string().optional(),
        link_drive: Joi.string().uri().optional().allow(null, ""),
        id_especie: Joi.string().uuid().optional().allow(null, ""),
        nome_especie: Joi.string().optional().allow(null, ""),
        nome_artigo: Joi.string().optional().allow(null, ""),
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
    params: BuscarArtigoPorIdParamsRequest,
    body: AtualizarArtigoBodyRequest
  ): Promise<AtualizarArtigoResponse> {
    try {
      await this.valida(params, body);

      const artigo = await Artigos.findByPk(params.id_artigo);

      if (!artigo) {
        throw {
          message: "Artigo não encontrado para atualização",
          status: httpStatus.NOT_FOUND,
        };
      }

      await artigo.update(body);

      return toArtigoResponse(artigo);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}