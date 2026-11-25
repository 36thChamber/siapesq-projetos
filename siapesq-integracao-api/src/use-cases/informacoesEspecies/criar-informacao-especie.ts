import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import InformacoesEspecies from "../../models/InformacoesEspecies";
import Artigos from "../../models/Artigos";
import InformacoesEspeciesArtigos from "../../models/InformacoesEspeciesArtigos";

import {
  CriarInformacaoEspecieBodyRequest,
  CriarInformacaoEspecieResponse,
  toInformacaoEspecieResponse,
} from "../../types/informacoes-especies-types";

export default class CriarInformacaoEspecieUseCase {
  static async valida(
    body: CriarInformacaoEspecieBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_especie: Joi.string().uuid().required(),
      tipo_informacao: Joi.string().required(),
      informacao: Joi.string().required(),
      fonte_referencia: Joi.string().optional().allow(null, ""),
      link_fonte: Joi.string().optional().allow(null, ""),
      referencia_completa: Joi.string().optional().allow(null, ""),
      referencia_texto: Joi.string().optional().allow(null, ""),

      artigos_ids: Joi.array()
        .items(Joi.number().integer())
        .optional(),
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
    body: CriarInformacaoEspecieBodyRequest
  ): Promise<CriarInformacaoEspecieResponse> {
    try {
      await this.valida(body);

      const informacaoEspecie = await InformacoesEspecies.create({
        id_especie: body.id_especie,
        tipo_informacao: body.tipo_informacao,
        informacao: body.informacao
      });

      if (body.artigos_ids && body.artigos_ids.length > 0) {
        const artigosIdsUnicos = [...new Set(body.artigos_ids)];

        for (const id_artigo of artigosIdsUnicos) {
          const artigoExiste = await Artigos.findByPk(id_artigo);

          if (!artigoExiste) {
            throw {
              message: `Artigo ${id_artigo} não encontrado`,
              status: httpStatus.NOT_FOUND,
            };
          }

          await InformacoesEspeciesArtigos.findOrCreate({
            where: {
              id_informacaoespecie:
                informacaoEspecie.id_informacaoespecie,
              id_artigo,
            },
          });
        }
      }

      const informacaoComArtigos = await InformacoesEspecies.findByPk(
        informacaoEspecie.id_informacaoespecie,
        {
          include: [
            {
              model: Artigos,
              as: "artigos",
              through: {
                attributes: [],
              },
            },
          ],
        }
      );

      return toInformacaoEspecieResponse(
        informacaoComArtigos ?? informacaoEspecie
      );
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}