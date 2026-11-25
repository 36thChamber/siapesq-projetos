import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Especies from "../../models/Especies";

import {
  CriarEspecieBodyRequest,
  CriarEspecieResponse,
  toEspecieResponse,
} from "../../types/especies-types";

export default class CriarEspecieUseCase {
  static async valida(body: CriarEspecieBodyRequest): Promise<void> {
    const schema = Joi.object({
      nome: Joi.string().required(),
      nome_cientifico: Joi.string().required(),
      id_gruposespecies: Joi.string().uuid().required(),
      pesquisador: Joi.string().required(),
      descricao: Joi.string().optional().allow(null, ""),
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
    body: CriarEspecieBodyRequest
  ): Promise<CriarEspecieResponse> {
    try {
      await this.valida(body);

      const especie = await Especies.create({
        nome: body.nome,
        nome_cientifico: body.nome_cientifico,
        id_gruposespecies: body.id_gruposespecies,
        pesquisador: body.pesquisador,
        descricao: body.descricao ?? null,
      });

      return toEspecieResponse(especie);
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}