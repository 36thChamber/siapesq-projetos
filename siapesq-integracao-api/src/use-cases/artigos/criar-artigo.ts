import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Artigos from "../../models/Artigos";

import {
  CriarArtigoBodyRequest,
  CriarArtigoResponse,
  toArtigoResponse,
} from "../../types/artigos-types";

export default class CriarArtigoUseCase {
  static async valida(
    body: CriarArtigoBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_artigo: Joi.number().required(),
      artigo: Joi.string().required(),
      referencia_texto: Joi.string().required(),
      referencia_completa: Joi.string().required(),
      link_drive: Joi.string().uri().optional().allow(null, ""),
      id_especie: Joi.string().uuid().optional().allow(null, ""),
      nome_especie: Joi.string().required(),
      nome_artigo: Joi.string().required(),
    });

    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: CriarArtigoBodyRequest
  ): Promise<CriarArtigoResponse> {
    try {
      await this.valida(body);

      const artigo = await Artigos.create({
        id_artigo: body.id_artigo,
        artigo: body.artigo,
        referencia_texto: body.referencia_texto,
        referencia_completa: body.referencia_completa,
        link_drive: body.link_drive ?? null,
        id_especie: body.id_especie ?? null,
        nome_especie: body.nome_especie,
        nome_artigo: body.nome_artigo,
      });

      return toArtigoResponse(artigo);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}