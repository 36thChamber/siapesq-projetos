import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import GruposEspecies from "../../models/GrupoEspecies";

import {
  CriarGrupoEspecieBodyRequest,
  CriarGrupoEspecieResponse,
  toGrupoEspecieResponse,
} from "../../types/grupo-especies-types";

export default class CriarGrupoEspecieUseCase {
  static async valida(
    body: CriarGrupoEspecieBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      nome: Joi.string().required(),
      quantidade: Joi.number().integer().min(0).required(),
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
    body: CriarGrupoEspecieBodyRequest
  ): Promise<CriarGrupoEspecieResponse> {
    try {
      await this.valida(body);

      const grupoEspecie = await GruposEspecies.create({
        nome: body.nome,
        quantidade: body.quantidade,
      });

      return toGrupoEspecieResponse(grupoEspecie);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}