import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import GruposEspecies from "../../models/GrupoEspecies";
import Especies from "../../models/Especies";

import {
  BuscarGrupoEspeciePorIdParamsRequest,
  GrupoEspecieResponse,
  toGrupoEspecieResponse,
} from "../../types/grupo-especies-types";

export type ListarEspeciesPeloGrupoResponse = GrupoEspecieResponse;

export default class ListarEspeciesPeloGrupoUseCase {
  static async valida(
    params: BuscarGrupoEspeciePorIdParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      id_gruposespecies: Joi.string().uuid().required(),
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
    params: BuscarGrupoEspeciePorIdParamsRequest
  ): Promise<ListarEspeciesPeloGrupoResponse> {
    try {
      await this.valida(params);

      const grupoEspecie = await GruposEspecies.findByPk(
        params.id_gruposespecies,
        {
          include: [
            {
              model: Especies,
              as: "especies",
            },
          ],
        }
      );

      if (!grupoEspecie) {
        throw {
          message: `Grupo ${params.id_gruposespecies} não encontrado`,
          status: httpStatus.NOT_FOUND,
        };
      }

      return toGrupoEspecieResponse(grupoEspecie);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}