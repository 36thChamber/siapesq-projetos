import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";

import { StatusAssinatura } from "../../models/enums/statusAssinaturasEnum";

import {
  AtualizarAssinaturaResponse,
  BuscarAssinaturaPorIdParamsRequest,
  toAssinaturaResponse,
} from "../../types/assinaturas-types";

import {
  AtorAutenticado,
  exigeAdmin,
} from "../../utils/autorizacao-recurso";

export default class ExpirarAssinaturaUseCase {
  static async valida(
    params: BuscarAssinaturaPorIdParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_assinatura: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    params: BuscarAssinaturaPorIdParamsRequest,
    ator: AtorAutenticado
  ): Promise<AtualizarAssinaturaResponse> {
    try {
      exigeAdmin(ator);

      await this.valida(params);

      const assinatura = await Assinaturas.findByPk(
        params.id_assinatura
      );

      if (!assinatura) {
        throw {
          message: "Assinatura não encontrada",
          status: httpStatus.NOT_FOUND,
        };
      }

      await assinatura.update({
        status: StatusAssinatura.EXPIRADA,
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