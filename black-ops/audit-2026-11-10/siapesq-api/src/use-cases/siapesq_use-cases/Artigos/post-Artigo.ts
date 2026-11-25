import http_status from "../../../consts/http-status-enum";
import Joi from "joi";
import artigos from "../../../models/siapesq/Artigos";
import {
  CriarArtigoBody,
  ArtigoResponse,
} from "../../../types/siapesq_types/Artigos-types";

const schema = Joi.object({
  id_artigo: Joi.number().required(),
  artigo: Joi.string().required(),
  referencia_texto: Joi.string().required(),
  referencia_completa: Joi.string().required(),
  link_drive: Joi.string().uri().optional().allow(null, ""),
  id_especie: Joi.string().uri().optional().allow(null, ""),
  nome_especie: Joi.string().optional().allow(null, ""),
  nome_artigo: Joi.string().optional().allow(null, ""),
});

export default class CriarArtigoUseCase {
  static async valida(body: CriarArtigoBody) {
    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(body: CriarArtigoBody): Promise<ArtigoResponse> {
    try {
      const {
        id_artigo,
        artigo,
        referencia_texto,
        referencia_completa,
        link_drive,
        nome_especie,
        nome_artigo,
      } = body;

      const checa_id = await artigos.findByPk(id_artigo);
      if (checa_id) {
        throw {
          message: `O ID de artigo ${id_artigo} já foi cadastrado`,
          status: http_status.CONFLICT,
        };
      }

      const novoArtigo = await artigos.create({
        id_artigo,
        artigo,
        referencia_texto,
        referencia_completa,
        link_drive,
        nome_especie,
        nome_artigo,
      });

      return {
        id_artigo: novoArtigo.id_artigo,
        artigo: novoArtigo.artigo,
        referencia_texto: novoArtigo.referencia_texto,
        referencia_completa: novoArtigo.referencia_completa,
        link_drive: novoArtigo.link_drive,
        id_especie: novoArtigo.id_especie,
        nome_especie: novoArtigo.nome_especie,
        nome_artigo: novoArtigo.nome_artigo,
      };
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      throw { message: err.message, status: statusCode };
    }
  }
}
