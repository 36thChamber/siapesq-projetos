import http_status from "../../../consts/http-status-enum";
import Joi from "joi";
import Especie from "../../../models/siapesq/Especies";
import {
  CriarEspeciesBody,
  CriarEspeciesResponse,
} from "../../../types/siapesq_types/Especies-types";

export default class CriarEspecieUseCase {
  static async valida(body: CriarEspeciesBody) {
    const schema = Joi.object({
      nome: Joi.string().required(),
      nome_cientifico: Joi.string().required(),
      id_gruposespecies: Joi.string().required(),
      pesquisador: Joi.string().required(),
      descricao: Joi.string().optional(),
    });

    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(
    body: CriarEspeciesBody
  ): Promise<CriarEspeciesResponse> {
    try {
      const novaEspecie = await Especie.create({
        nome: body.nome,
        nome_cientifico: body.nome_cientifico,
        id_gruposespecies: body.id_gruposespecies,
        pesquisador: body.pesquisador,
        descricao: body.descricao,
      });

      return {
        id_especies: novaEspecie.id_especie,
        nome: novaEspecie.nome,
        nome_cientifico: novaEspecie.nome_cientifico,
        id_gruposespecies: novaEspecie.id_gruposespecies,
        pesquisador: novaEspecie.pesquisador,
        descricao: novaEspecie.descricao,
      };
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}
