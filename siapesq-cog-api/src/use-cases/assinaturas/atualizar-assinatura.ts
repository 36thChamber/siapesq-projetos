import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";
import { StatusAssinatura } from "../../models/enums/statusAssinaturasEnum";

import {
  AtualizarAssinaturaBodyRequest,
  AtualizarAssinaturaResponse,
  BuscarAssinaturaPorIdParamsRequest,
  toAssinaturaResponse,
} from "../../types/assinaturas-types";

import {
  AtorAutenticado,
  exigeAdmin,
} from "../../utils/autorizacao-recurso";

export default class AtualizarAssinaturaUseCase {
  static async valida(
    params: BuscarAssinaturaPorIdParamsRequest,
    body: AtualizarAssinaturaBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      params: Joi.object({
        id_assinatura: Joi.string().uuid().required(),
      }).required(),

      body: Joi.object({
        id_usuario: Joi.string().uuid().optional(),
        id_plano: Joi.string().uuid().optional(),

        status: Joi.string()
          .valid(...Object.values(StatusAssinatura))
          .optional(),

        data_inicio: Joi.date().optional(),
        data_fim: Joi.date().optional(),

        renovacao_automatica: Joi.boolean().optional(),

        provedor_pagamento: Joi.string().optional().allow(null, ""),
        id_assinatura_externa: Joi.string().optional().allow(null, ""),
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
    params: BuscarAssinaturaPorIdParamsRequest,
    body: AtualizarAssinaturaBodyRequest,
    ator: AtorAutenticado
  ): Promise<AtualizarAssinaturaResponse> {
    try {
      exigeAdmin(ator);

      await this.valida(params, body);

      const assinatura = await Assinaturas.findByPk(params.id_assinatura);

      if (!assinatura) {
        throw {
          message: "Assinatura não encontrada",
          status: httpStatus.NOT_FOUND,
        };
      }

      const novaDataInicio = body.data_inicio ?? assinatura.data_inicio;
      const novaDataFim = body.data_fim ?? assinatura.data_fim;

      if (new Date(novaDataFim) <= new Date(novaDataInicio)) {
        throw {
          message: "A data_fim deve ser maior que a data_inicio",
          status: httpStatus.BAD_REQUEST,
        };
      }

      const idUsuario = body.id_usuario ?? assinatura.id_usuario;

      if (body.status === StatusAssinatura.ATIVA) {
        const assinaturaAtiva = await Assinaturas.findOne({
          where: {
            id_usuario: idUsuario,
            status: StatusAssinatura.ATIVA,
          },
        });

        if (
          assinaturaAtiva &&
          assinaturaAtiva.id_assinatura !== assinatura.id_assinatura
        ) {
          throw {
            message: "Usuário já possui uma assinatura ativa",
            status: httpStatus.BAD_REQUEST,
          };
        }
      }

      await assinatura.update({
        id_usuario: body.id_usuario ?? assinatura.id_usuario,
        id_plano: body.id_plano ?? assinatura.id_plano,
        status: body.status ?? assinatura.status,
        data_inicio: novaDataInicio,
        data_fim: novaDataFim,
        renovacao_automatica:
          body.renovacao_automatica ?? assinatura.renovacao_automatica,
        provedor_pagamento:
          body.provedor_pagamento ?? assinatura.provedor_pagamento,
        id_assinatura_externa:
          body.id_assinatura_externa ?? assinatura.id_assinatura_externa,
      });

      return toAssinaturaResponse(assinatura);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}