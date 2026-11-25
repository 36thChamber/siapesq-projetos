import { GetGruposEspecieParamsRequest } from "./../../../types/siapesq_types/grupoEspecie-types";
import Joi from "joi";
import httpStatusEnum from "../../../consts/http-status-enum";
import gruposEspecies from "../../../models/siapesq/GrupoEspecies";
import especies from "../../../models/siapesq/Especies";

const req_params_schema = Joi.object({
  id: Joi.string()
    .required()
    .error(() => new Error("id da espécie inválido")),
});

export default class ListarEspeciesPeloGrupoUseCase {
  static async valida(params: GetGruposEspecieParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatusEnum.BAD_REQUEST,
      };
    }
  }

  static async execute(params: GetGruposEspecieParamsRequest) {
    try {
      const { id } = params;

      const grupoEspecie = await gruposEspecies.findByPk(id, {
        include: [
          {
            model: especies,
            as: "especies",
          },
        ],
      });

      if (!grupoEspecie) {
        throw {
          message: `grupo ${id} não encontrado`,
          status: httpStatusEnum.NOT_FOUND,
        };
      }

      return {
        grupoEspecie,
      };
    } catch (err) {
      throw err;
    }
  }
}
