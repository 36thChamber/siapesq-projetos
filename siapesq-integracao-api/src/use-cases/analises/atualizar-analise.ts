import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Analises from "../../models/Analises";
import { TipoUsuario } from "../../models/enums/tipoUsuarioEnum";
import { resolverTifAdequabilidade } from "../../utils/analise-tif-storage";

import {
  AtualizarAnaliseBodyRequest,
  AtualizarAnaliseResponse,
  BuscarAnalisePorIdParamsRequest,
  toAnaliseResponse,
} from "../../types/analises-types";

export default class AtualizarAnaliseUseCase {
  static async valida(
    params: BuscarAnalisePorIdParamsRequest,
    body: AtualizarAnaliseBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      params: Joi.object({
        id_analise: Joi.string().uuid().required(),
      }).required(),

      body: Joi.object({
        id_especie: Joi.string().uuid().optional(),
        nome_pasta: Joi.string().optional(),
        nome_dataset: Joi.string().allow(null).optional(),
        cenario: Joi.string().allow(null).optional(),
        nome_arquivo: Joi.string().optional(),
        nome_arquivo_30: Joi.string().allow(null).optional(),
      }).required(),
    });

    try {
      await schema.validateAsync({ params, body });
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    params: BuscarAnalisePorIdParamsRequest,
    body: AtualizarAnaliseBodyRequest,
    tipo_usuario?: string,
  ): Promise<AtualizarAnaliseResponse> {
    try {
      await this.valida(params, body);

      const analise = await Analises.findByPk(params.id_analise);

      if (!analise) {
        throw {
          message: "Análise não encontrada",
          status: httpStatus.NOT_FOUND,
        };
      }

      if (
        tipo_usuario !== TipoUsuario.ADMIN &&
        (analise.nome_dataset != null || analise.cenario != null ||
          body.nome_dataset !== undefined || body.cenario !== undefined)
      ) {
        throw { status: httpStatus.FORBIDDEN, message: "Somente administradores podem alterar TIFFs mapeados." };
      }

      const storage = {
        nome_dataset: body.nome_dataset !== undefined ? body.nome_dataset : analise.nome_dataset,
        nome_pasta: body.nome_pasta ?? analise.nome_pasta,
        cenario: body.cenario !== undefined ? body.cenario : analise.cenario,
        nome_arquivo: body.nome_arquivo ?? analise.nome_arquivo,
      };
      if (storage.nome_dataset != null || storage.cenario != null) {
        try {
          resolverTifAdequabilidade(storage);
        } catch {
          throw { status: httpStatus.BAD_REQUEST, message: "Mapeamento de TIFF inválido." };
        }
      }

      await analise.update({
        id_especie: body.id_especie ?? analise.id_especie,
        nome_pasta: body.nome_pasta ?? analise.nome_pasta,
        nome_dataset: storage.nome_dataset,
        cenario: storage.cenario,
        nome_arquivo: body.nome_arquivo ?? analise.nome_arquivo,
        nome_arquivo_30:
          body.nome_arquivo_30 !== undefined
            ? body.nome_arquivo_30
            : analise.nome_arquivo_30,
      });

      return toAnaliseResponse(analise);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.BAD_REQUEST,
      };
    }
  }
}
