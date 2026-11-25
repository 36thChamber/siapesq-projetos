import http_status from "../../../consts/http-status-enum";
import Joi from "joi";
import artigos from "../../../models/siapesq/Artigos";
import { UpdateArtigoBody } from "../../../types/siapesq_types/Artigos-types";

const schema = Joi.object({
  id_artigo: Joi.number().required(),
  artigo: Joi.string().optional(),
  referencia_texto: Joi.string().optional(),
  referencia_completa: Joi.string().optional(),
  link_drive: Joi.string().uri().optional().allow(null, ""),
  id_especie: Joi.string().uri().optional().allow(null, ""),
  nome_especie: Joi.string().optional().allow(null, ""),
  nome_artigo: Joi.string().optional().allow(null, ""),
});

export default class AtualizarArtigoUseCase {
  static async valida(body: UpdateArtigoBody) {
    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(body: UpdateArtigoBody, id_artigo: number) {
    try {
      const artigoExistente = await artigos.findByPk(id_artigo);

      if (!artigoExistente) {
        throw {
          message: "Artigo não encontrado para atualização",
          status: http_status.NOT_FOUND,
        };
      }

      await artigoExistente.update(body);

      return artigoExistente;
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      throw { message: err.message, status: statusCode };
    }
  }
}
