import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";
import Planos from "../../models/Planos";

import {
  AssinaturaResponse,
  toAssinaturaResponse,
} from "../../types/assinaturas-types";

import {
  AtorAutenticado,
  exigeDonoOuAdmin,
} from "../../utils/autorizacao-recurso";

export type BuscarAssinaturaPorUsuarioParamsRequest = {
  id_usuario: string;
};

export type BuscarAssinaturaPorUsuarioResponse =
  AssinaturaResponse;

export default class BuscarAssinaturaPorUsuarioUseCase {
  static async valida(
    params: BuscarAssinaturaPorUsuarioParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_usuario: Joi.string().uuid().required(),
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
    params: BuscarAssinaturaPorUsuarioParamsRequest,
    ator: AtorAutenticado
  ): Promise<BuscarAssinaturaPorUsuarioResponse> {
    try {
      await this.valida(params);

      exigeDonoOuAdmin(ator, params.id_usuario);

      const assinatura = await Assinaturas.findOne({
        where: {
          id_usuario: params.id_usuario,
        },
        include: [
          {
            model: Planos,
            as: "plano",
          },
        ],
        order: [["criado_em", "DESC"], ["data_inicio", "DESC"], ["id_assinatura", "DESC"]],
      });

      if (!assinatura) {
        throw {
          message: "Assinatura não encontrada para este usuário",
          status: httpStatus.NOT_FOUND,
        };
      }

      return toAssinaturaResponse(assinatura);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}