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
      analise.nome_arquivo_nacional =
        body.nome_arquivo_nacional !== undefined
          ? body.nome_arquivo_nacional
          : analise.nome_arquivo_nacional;
      analise.nome_arquivo_otimista =
        body.nome_arquivo_otimista !== undefined
          ? body.nome_arquivo_otimista
          : analise.nome_arquivo_otimista;
      analise.nome_arquivo_pessimista =
        body.nome_arquivo_pessimista !== undefined
          ? body.nome_arquivo_pessimista
          : analise.nome_arquivo_pessimista;
      analise.nome_arquivo_rs_otimista =
        body.nome_arquivo_rs_otimista !== undefined
          ? body.nome_arquivo_rs_otimista
          : analise.nome_arquivo_rs_otimista;
      analise.nome_arquivo_rs_pessimista =
        body.nome_arquivo_rs_pessimista !== undefined
          ? body.nome_arquivo_rs_pessimista
          : analise.nome_arquivo_rs_pessimista;
      analise.nome_arquivo_30_otimista =
        body.nome_arquivo_30_otimista !== undefined
          ? body.nome_arquivo_30_otimista
          : analise.nome_arquivo_30_otimista;
      analise.nome_arquivo_30_pessimista =
        body.nome_arquivo_30_pessimista !== undefined
          ? body.nome_arquivo_30_pessimista
          : analise.nome_arquivo_30_pessimista;
      analise.nacional_incerteza =
        body.nacional_incerteza !== undefined
          ? body.nacional_incerteza
          : analise.nacional_incerteza;
      analise.nacional_ssp245_incerteza =
        body.nacional_ssp245_incerteza !== undefined
          ? body.nacional_ssp245_incerteza
          : analise.nacional_ssp245_incerteza;
      analise.rs_ssp245_incerteza =
        body.rs_ssp245_incerteza !== undefined
          ? body.rs_ssp245_incerteza
          : analise.rs_ssp245_incerteza;
      analise.rs_ssp585_incerteza =
        body.rs_ssp585_incerteza !== undefined
          ? body.rs_ssp585_incerteza
          : analise.rs_ssp585_incerteza;
      analise.poligono_ssp245_incerteza =
        body.poligono_ssp245_incerteza !== undefined
          ? body.poligono_ssp245_incerteza
          : analise.poligono_ssp245_incerteza;
      analise.poligono_ssp585_incerteza =
        body.poligono_ssp585_incerteza !== undefined
          ? body.poligono_ssp585_incerteza
          : analise.poligono_ssp585_incerteza;
      analise.rs_incerteza =
        body.rs_incerteza !== undefined
          ? body.rs_incerteza
          : analise.rs_incerteza;
      analise.poligono_incerteza =
        body.poligono_incerteza !== undefined
          ? body.poligono_incerteza
          : analise.poligono_incerteza;
      await analise.save();

      return {
        id_analise: analise.id_analise,
        id_especie: analise.id_especie,
        nome_pasta: analise.nome_pasta,
        nome_arquivo: analise.nome_arquivo,
        nome_arquivo_30: analise.nome_arquivo_30,
        nome_arquivo_nacional: analise.nome_arquivo_nacional,
        nome_arquivo_otimista: analise.nome_arquivo_otimista,
        nome_arquivo_pessimista: analise.nome_arquivo_pessimista,
        nome_arquivo_rs_otimista: analise.nome_arquivo_rs_otimista,
        nome_arquivo_rs_pessimista: analise.nome_arquivo_rs_pessimista,
        nome_arquivo_30_otimista: analise.nome_arquivo_30_otimista,
        nome_arquivo_30_pessimista: analise.nome_arquivo_30_pessimista,
        nacional_incerteza: analise.nacional_incerteza,
        nacional_ssp245_incerteza: analise.nacional_ssp245_incerteza,
        rs_ssp245_incerteza: analise.rs_ssp245_incerteza,
        rs_ssp585_incerteza: analise.rs_ssp585_incerteza,
        poligono_ssp245_incerteza: analise.poligono_ssp245_incerteza,
        poligono_ssp585_incerteza: analise.poligono_ssp585_incerteza,
        rs_incerteza: analise.rs_incerteza,
        poligono_incerteza: analise.poligono_incerteza,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}
