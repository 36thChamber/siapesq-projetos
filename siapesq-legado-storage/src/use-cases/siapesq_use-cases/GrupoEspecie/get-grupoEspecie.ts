import Joi from "joi";
import http_status from "../../../consts/http-status-enum";
import {
  GetGruposEspecieParamsRequest,
  GetGrupoEspecieResponse,
} from "../../../types/siapesq_types/grupoEspecie-types";
import gruposEspecies from "../../../models/siapesq/GrupoEspecies";

const req_params_schema = Joi.object({
  id: Joi.string()
    .required()
    .error(() => new Error("id da especie inválido")),
});

export default class GetGrupoEspecieUseCase {
  static async valida(params: GetGruposEspecieParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
  static async executa(
    params: GetGruposEspecieParamsRequest
  ): Promise<GetGrupoEspecieResponse> {
    try {
      const { id } = params;
      const especie = await gruposEspecies.findByPk(id);
      if (!especie) {
        throw {
          message: `grupo ${id} não encontrado`,
          status: http_status.NOT_FOUND,
        };
      }
      return {
        id_gruposespecies: especie.id_gruposespecies,
        nome: especie.nome,
        quantidade: especie.quantidade,
      };
    } catch (err) {
      throw err;
    }
  }
}
