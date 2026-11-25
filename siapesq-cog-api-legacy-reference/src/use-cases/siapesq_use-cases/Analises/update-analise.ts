import http_status from "../../../consts/http-status-enum";
import Joi from "joi";
import analises from "../../../models/siapesq/Analises";
import {
  UpdateAnaliseBody,
  UpdateAnaliseResponse,
} from "../../../types/siapesq_types/Analises-types";

export default class UpdateAnaliseUseCase {
  static async valida(body: UpdateAnaliseBody) {
    const schema = Joi.object({
      id_analise: Joi.string().uuid().required(),
      id_especie: Joi.string().uuid().required(),
      nome_pasta: Joi.string().required(),
      nome_arquivo: Joi.string().required(),
      // opcional, pode ser null
      nome_arquivo_30: Joi.string().allow(null).optional(),
    });

    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(
    body: UpdateAnaliseBody,
  ): Promise<UpdateAnaliseResponse> {
    try {
      const analise = await analises.findByPk(body.id_analise);

      if (!analise) {
        throw {
          message: "Análise não encontrada",
          status: http_status.NOT_FOUND,
        };
      }

      analise.id_especie = body.id_especie;
      analise.nome_pasta = body.nome_pasta;
      analise.nome_arquivo = body.nome_arquivo;
      analise.nome_arquivo_30 =
        body.nome_arquivo_30 !== undefined
          ? body.nome_arquivo_30
          : analise.nome_arquivo_30;
      await analise.save();

      return {
        id_analise: analise.id_analise,
        id_especie: analise.id_especie,
        nome_pasta: analise.nome_pasta,
        nome_arquivo: analise.nome_arquivo,
        nome_arquivo_30: analise.nome_arquivo_30,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}
