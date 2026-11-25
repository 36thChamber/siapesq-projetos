import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";
import Pagamentos from "../../models/Pagamentos";
import Usuarios from "../../models/Usuarios";

import {
  BuscarPagamentosPorAssinaturaParamsRequest,
  PagamentoResponse,
  toPagamentoResponse,
} from "../../types/pagamentos-types";

import {
  AtorAutenticado,
  exigeDonoOuAdmin,
} from "../../utils/autorizacao-recurso";

export default class BuscarPagamentosPorAssinaturaUseCase {
  static async valida(
    params: BuscarPagamentosPorAssinaturaParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_assinatura: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }

    const assinatura = await Assinaturas.findByPk(params.id_assinatura);

    if (!assinatura) {
      throw {
        status: httpStatus.NOT_FOUND,
        message: "Assinatura não encontrada",
      };
    }
  }

  static async executa(
    params: BuscarPagamentosPorAssinaturaParamsRequest,
    ator: AtorAutenticado
  ): Promise<PagamentoResponse[]> {
    await this.valida(params);

    const assinatura = await Assinaturas.findByPk(params.id_assinatura);

    // assinatura já foi validada como existente em valida(), mas TypeScript precisa do guard
    if (!assinatura) {
      throw { status: 404, message: "Assinatura não encontrada" };
    }

    exigeDonoOuAdmin(ator, assinatura.id_usuario);

    const pagamentos = await Pagamentos.findAll({
      where: { id_assinatura: params.id_assinatura },
      include: [{ model: Usuarios }, { model: Assinaturas }],
      order: [["criado_em", "DESC"]],
    });

    return pagamentos.map(toPagamentoResponse);
  }
}