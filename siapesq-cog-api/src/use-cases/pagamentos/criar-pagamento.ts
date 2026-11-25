import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";
import Pagamentos from "../../models/Pagamentos";
import Usuarios from "../../models/Usuarios";

import { ProvedorPagamento } from "../../models/enums/provedorPagamentoEnum";
import { StatusPagamento } from "../../models/enums/statusPagamentosEnum";

import {
  CriarPagamentoBodyRequest,
  CriarPagamentoResponse,
  toPagamentoResponse,
} from "../../types/pagamentos-types";

import {
  AtorAutenticado,
  exigeDonoOuAdmin,
} from "../../utils/autorizacao-recurso";

export default class CriarPagamentoUseCase {
  static async valida(body: CriarPagamentoBodyRequest): Promise<void> {
    const schema = Joi.object({
      id_usuario: Joi.string().uuid().required(),

      id_assinatura: Joi.string().uuid().optional().allow(null, ""),

      provedor_pagamento: Joi.string()
        .valid(...Object.values(ProvedorPagamento))
        .required(),

      id_pagamento_provedor: Joi.string().required(),

      id_fatura_provedor: Joi.string().optional().allow(null, ""),

      valor: Joi.number().greater(0).required(),

      moeda: Joi.string().optional(),

      status: Joi.string()
        .valid(...Object.values(StatusPagamento))
        .optional(),

      url_fatura: Joi.string().optional().allow(null, ""),

      data_pagamento: Joi.date().optional().allow(null),
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
    body: CriarPagamentoBodyRequest,
    ator: AtorAutenticado
  ): Promise<CriarPagamentoResponse> {
    // Autoriza antes de validar/consultar: o corpo é controlado pelo cliente.
    exigeDonoOuAdmin(ator, body?.id_usuario);

    await this.valida(body);

    const usuario = await Usuarios.findByPk(body.id_usuario);

    if (!usuario) {
      throw {
        status: httpStatus.NOT_FOUND,
        message: "Usuário não encontrado",
      };
    }

    if (body.id_assinatura) {
      const assinatura = await Assinaturas.findByPk(body.id_assinatura);

      if (!assinatura) {
        throw {
          status: httpStatus.NOT_FOUND,
          message: "Assinatura não encontrada",
        };
      }
    }

    const pagamentoExistente = await Pagamentos.findOne({
      where: {
        id_pagamento_provedor: body.id_pagamento_provedor,
        provedor_pagamento: body.provedor_pagamento,
      },
    });

    if (pagamentoExistente) {
      throw {
        status: httpStatus.BAD_REQUEST,
        message:
          "Já existe um pagamento com esse id_pagamento_provedor para este provedor",
      };
    }

    const pagamento = await Pagamentos.create({
      id_usuario: body.id_usuario,
      id_assinatura: body.id_assinatura || null,
      provedor_pagamento: body.provedor_pagamento,
      id_pagamento_provedor: body.id_pagamento_provedor,
      id_fatura_provedor: body.id_fatura_provedor || null,
      valor: Number(body.valor),
      moeda: body.moeda || "BRL",
      status: body.status || StatusPagamento.PENDENTE,
      url_fatura: body.url_fatura || null,
      data_pagamento: body.data_pagamento || null,
    });

    return toPagamentoResponse(pagamento);
  }
}