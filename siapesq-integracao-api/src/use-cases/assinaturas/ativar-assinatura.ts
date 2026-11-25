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

export default class AtivarAssinaturaUseCase {
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

      const assinaturaAtiva = await Assinaturas.findOne({
        where: {
          id_usuario: assinatura.id_usuario,
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

      await assinatura.update({
        status: StatusAssinatura.ATIVA,
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