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
      };
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}