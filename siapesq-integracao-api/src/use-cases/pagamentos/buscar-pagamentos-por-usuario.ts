import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";
import Pagamentos from "../../models/Pagamentos";
import Usuarios from "../../models/Usuarios";

import {
  BuscarPagamentosPorUsuarioParamsRequest,
  PagamentoResponse,
  toPagamentoResponse,
} from "../../types/pagamentos-types";

import {
  AtorAutenticado,
  exigeDonoOuAdmin,
} from "../../utils/autorizacao-recurso";

export default class BuscarPagamentosPorUsuarioUseCase {
  static async valida(
    params: BuscarPagamentosPorUsuarioParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_usuario: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }

    const usuario = await Usuarios.findByPk(params.id_usuario);

    if (!usuario) {
      throw {
        status: httpStatus.NOT_FOUND,
        message: "Usuário não encontrado",
      };
    }
  }

  static async executa(
    params: BuscarPagamentosPorUsuarioParamsRequest,
    ator: AtorAutenticado
  ): Promise<PagamentoResponse[]> {
    await this.valida(params);

    exigeDonoOuAdmin(ator, params.id_usuario);

    const pagamentos = await Pagamentos.findAll({
      where: { id_usuario: params.id_usuario },
      include: [{ model: Usuarios }, { model: Assinaturas }],
      order: [["criado_em", "DESC"]],
    });

    return pagamentos.map(toPagamentoResponse);
  }
}