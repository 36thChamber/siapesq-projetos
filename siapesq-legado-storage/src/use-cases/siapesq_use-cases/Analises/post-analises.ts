import http_status from "../../../consts/http-status-enum";
import Joi from "joi";
import analises from "../../../models/siapesq/Analises";
import {
  CriarAnaliseBody,
  CriarAnaliseResponse,
} from "../../../types/siapesq_types/Analises-types";

export default class CriarAnaliseUseCase {
  static async valida(body: CriarAnaliseBody) {
    const schema = Joi.object({
      id_especie: Joi.string().uuid().required(),
      nome_pasta: Joi.string().required(),
      nome_arquivo: Joi.string().required(),
      // opcional, pode ser null
      nome_arquivo_30: Joi.string().allow(null).optional(), // allow(null) + optional [web:18][web:22]
      nome_arquivo_nacional: Joi.string().allow(null).optional(),
      nome_arquivo_otimista: Joi.string().allow(null).optional(),
      nome_arquivo_pessimista: Joi.string().allow(null).optional(),
      nome_arquivo_rs_otimista: Joi.string().allow(null).optional(),
      nome_arquivo_rs_pessimista: Joi.string().allow(null).optional(),
      nome_arquivo_30_otimista: Joi.string().allow(null).optional(),
      nome_arquivo_30_pessimista: Joi.string().allow(null).optional(),
      nacional_incerteza: Joi.string().allow(null).optional(),
      nacional_ssp245_incerteza: Joi.string().allow(null).optional(),
      rs_ssp245_incerteza: Joi.string().allow(null).optional(),
      rs_ssp585_incerteza: Joi.string().allow(null).optional(),
      poligono_ssp245_incerteza: Joi.string().allow(null).optional(),
      poligono_ssp585_incerteza: Joi.string().allow(null).optional(),
      rs_incerteza: Joi.string().allow(null).optional(),
      poligono_incerteza: Joi.string().allow(null).optional(),
    });

    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(body: CriarAnaliseBody): Promise<CriarAnaliseResponse> {
    try {
      const novaAnalise = await analises.create({
        id_especie: body.id_especie,
        nome_pasta: body.nome_pasta,
        nome_arquivo: body.nome_arquivo,
        nome_arquivo_30: body.nome_arquivo_30 ?? null,
        nome_arquivo_nacional: body.nome_arquivo_nacional ?? null,
        nome_arquivo_otimista: body.nome_arquivo_otimista ?? null,
        nome_arquivo_pessimista: body.nome_arquivo_pessimista ?? null,
        nome_arquivo_rs_otimista: body.nome_arquivo_rs_otimista ?? null,
        nome_arquivo_rs_pessimista: body.nome_arquivo_rs_pessimista ?? null,
        nome_arquivo_30_otimista: body.nome_arquivo_30_otimista ?? null,
        nome_arquivo_30_pessimista: body.nome_arquivo_30_pessimista ?? null,
        nacional_incerteza: body.nacional_incerteza ?? null,
        nacional_ssp245_incerteza: body.nacional_ssp245_incerteza ?? null,
        rs_ssp245_incerteza: body.rs_ssp245_incerteza ?? null,
        rs_ssp585_incerteza: body.rs_ssp585_incerteza ?? null,
        poligono_ssp245_incerteza: body.poligono_ssp245_incerteza ?? null,
        poligono_ssp585_incerteza: body.poligono_ssp585_incerteza ?? null,
        rs_incerteza: body.rs_incerteza ?? null,
        poligono_incerteza: body.poligono_incerteza ?? null,
      });

      return {
        id_analise: novaAnalise.id_analise,
        id_especie: novaAnalise.id_especie,
        nome_pasta: novaAnalise.nome_pasta,
        nome_arquivo: novaAnalise.nome_arquivo,
        nome_arquivo_30: novaAnalise.nome_arquivo_30,
        nome_arquivo_nacional: novaAnalise.nome_arquivo_nacional,
        nome_arquivo_otimista: novaAnalise.nome_arquivo_otimista,
        nome_arquivo_pessimista: novaAnalise.nome_arquivo_pessimista,
        nome_arquivo_rs_otimista: novaAnalise.nome_arquivo_rs_otimista,
        nome_arquivo_rs_pessimista: novaAnalise.nome_arquivo_rs_pessimista,
        nome_arquivo_30_otimista: novaAnalise.nome_arquivo_30_otimista,
        nome_arquivo_30_pessimista: novaAnalise.nome_arquivo_30_pessimista,
        nacional_incerteza: novaAnalise.nacional_incerteza,
        nacional_ssp245_incerteza: novaAnalise.nacional_ssp245_incerteza,
        rs_ssp245_incerteza: novaAnalise.rs_ssp245_incerteza,
        rs_ssp585_incerteza: novaAnalise.rs_ssp585_incerteza,
        poligono_ssp245_incerteza: novaAnalise.poligono_ssp245_incerteza,
        poligono_ssp585_incerteza: novaAnalise.poligono_ssp585_incerteza,
        rs_incerteza: novaAnalise.rs_incerteza,
        poligono_incerteza: novaAnalise.poligono_incerteza,
      };
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}
