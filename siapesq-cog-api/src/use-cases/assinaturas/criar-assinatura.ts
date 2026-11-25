import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";
import Usuarios from "../../models/Usuarios";
import Planos from "../../models/Planos";

import { StatusAssinatura } from "../../models/enums/statusAssinaturasEnum";

import {
  CriarAssinaturaBodyRequest,
  CriarAssinaturaResponse,
  toAssinaturaResponse,
} from "../../types/assinaturas-types";

import {
  AtorAutenticado,
  exigeDonoOuAdmin,
} from "../../utils/autorizacao-recurso";

export default class CriarAssinaturaUseCase {
  static async valida(
    body: CriarAssinaturaBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_usuario: Joi.string().uuid().required(),
      id_plano: Joi.string().uuid().required(),

      status: Joi.string()
        .valid(...Object.values(StatusAssinatura))
        .required(),

      data_inicio: Joi.date().required(),
      data_fim: Joi.date().required(),

      renovacao_automatica: Joi.boolean().required(),

      provedor_pagamento: Joi.string().optional().allow(null, ""),
      id_assinatura_externa: Joi.string().optional().allow(null, ""),
    });

    try {
      await schema.validateAsync(body);

      if (new Date(body.data_fim) <= new Date(body.data_inicio)) {
        throw {
          message: "A data_fim deve ser maior que a data_inicio",
          status: httpStatus.BAD_REQUEST,
        };
      }
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: CriarAssinaturaBodyRequest,
    ator: AtorAutenticado
  ): Promise<CriarAssinaturaResponse> {
    try {
      // Autoriza antes de validar/consultar: o corpo é controlado pelo cliente.
      exigeDonoOuAdmin(ator, body?.id_usuario);

      await this.valida(body);

      const usuario = await Usuarios.findByPk(body.id_usuario);

      if (!usuario) {
        throw {
          message: "Usuário não encontrado",
          status: httpStatus.NOT_FOUND,
        };
      }

      const plano = await Planos.findByPk(body.id_plano);

      if (!plano) {
        throw {
          message: "Plano não encontrado",
          status: httpStatus.NOT_FOUND,
        };
      }

      if (body.status === StatusAssinatura.ATIVA) {
        const assinaturaAtiva = await Assinaturas.findOne({
          where: {
            id_usuario: body.id_usuario,
            status: StatusAssinatura.ATIVA,
          },
        });

        if (assinaturaAtiva) {
          throw {
            message: "Usuário já possui uma assinatura ativa",
            status: httpStatus.BAD_REQUEST,
          };
        }
      }

      const assinatura = await Assinaturas.create({
        id_usuario: body.id_usuario,
        id_plano: body.id_plano,
        status: body.status,
        data_inicio: body.data_inicio,
        data_fim: body.data_fim,
        renovacao_automatica: body.renovacao_automatica,
        provedor_pagamento: body.provedor_pagamento ?? null,
        id_assinatura_externa: body.id_assinatura_externa ?? null,
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