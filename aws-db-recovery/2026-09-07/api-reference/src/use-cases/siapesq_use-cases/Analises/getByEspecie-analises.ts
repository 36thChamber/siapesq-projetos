// src/use-cases/siapesq_use-cases/Analises/get-Analises-por-Especie.ts
import http_status from "../../../consts/http-status-enum";
import Joi from "joi";
import analises from "../../../models/siapesq/Analises";
import {
  GetAnaliseResponse,
} from "../../../types/siapesq_types/Analises-types";

export type GetAnalisesPorEspecieParams = {
  id_especie: string;
};

export type GetAnalisesPorEspecieResponse = GetAnaliseResponse[];

export default class GetAnalisesPorEspecieUseCase {
  static async valida(params: GetAnalisesPorEspecieParams) {
    const schema = Joi.object({
      id_especie: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(
    params: GetAnalisesPorEspecieParams
  ): Promise<GetAnalisesPorEspecieResponse> {
    try {
      const lista = await analises.findAll({
        where: { id_especie: params.id_especie }
      });

      return lista.map((a) => ({
        id_analise: a.id_analise,
        id_especie: a.id_especie,
        nome_pasta: a.nome_pasta,
        nome_arquivo: a.nome_arquivo,
        nome_arquivo_30: a.nome_arquivo_30,
        nome_arquivo_nacional: a.nome_arquivo_nacional,
        nome_arquivo_otimista: a.nome_arquivo_otimista,
        nome_arquivo_pessimista: a.nome_arquivo_pessimista,
      }));
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}
