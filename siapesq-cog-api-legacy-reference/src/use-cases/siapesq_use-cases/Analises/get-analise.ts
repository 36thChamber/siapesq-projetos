import http_status from "../../../consts/http-status-enum";
import Joi from "joi";
import analises from "../../../models/siapesq/Analises";
import {
  GetAnaliseParamsRequest,
  GetAnaliseResponse,
} from "../../../types/siapesq_types/Analises-types";

export default class GetAnaliseUseCase {
  static async valida(params: GetAnaliseParamsRequest) {
    const schema = Joi.object({
      id_analise: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(
    params: GetAnaliseParamsRequest
  ): Promise<GetAnaliseResponse> {
    try {
      const analise = await analises.findByPk(params.id_analise);

      if (!analise) {
        throw { message: "Análise não encontrada", status: http_status.NOT_FOUND };
      }

      return {
        id_analise: analise.id_analise,
        id_especie: analise.id_especie,
        nome_pasta: analise.nome_pasta,
        nome_arquivo: analise.nome_arquivo,
        nome_arquivo_30: analise.nome_arquivo_30
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}
