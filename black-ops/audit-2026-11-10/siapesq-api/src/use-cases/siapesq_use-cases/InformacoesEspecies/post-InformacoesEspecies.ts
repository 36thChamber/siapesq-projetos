import Joi, { ref } from "joi";
import {
  CriarInformaçoesEspeciesBody,
  GetInformaçoesEspeciesResponse,
} from "../../../types/siapesq_types/InformaçoesEspecies-type";
import http_status from "../../../consts/http-status-enum";
import informacoesEspecies from "../../../models/siapesq/InformacoesEspecies";
const schema = Joi.object({
  id_especie: Joi.string()
    .required()
    .error(new Error("Id da especie invalido")),
  tipo_informacao: Joi.string()
    .required()
    .error(new Error("Tipo de informacao invalido")),
  informacao: Joi.string().required().error(new Error("Informação invalida")),
  fonte_referencia: Joi.string().required().error(new Error("Fonte inválida")),
  link_fonte: Joi.string()
    .required()
    .error(new Error("Link da fonte inválido")),
    referencia_completa: Joi.string().optional(),
    referencia_texto: Joi.string().optional(),
});
export default class CriarInformacaoEspecieUseCase {
  static async valida(body: CriarInformaçoesEspeciesBody) {
    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(
    body: CriarInformaçoesEspeciesBody
  ): Promise<GetInformaçoesEspeciesResponse> {
    try {
      const novaInformacao = await informacoesEspecies.create({
        id_especie: body.id_especie,
        tipo_informacao: body.tipo_informacao,
        informacao: body.informacao,
        fonte_referencia: body.fonte_referencia,
        link_fonte: body.link_fonte,
        referencia_completa: body.referencia_completa,
        referencia_texto: body.referencia_texto 
      });

      return {
        id_informacaoespecies: novaInformacao.id_informacaoespecie,
        id_especie: novaInformacao.id_especie,
        tipo_informacao: novaInformacao.tipo_informacao,
        informacao: novaInformacao.informacao,
        fonte_referencia: novaInformacao.fonte_referencia,
        link_fonte: novaInformacao.link_fonte,
        referencia_completa: novaInformacao.referencia_completa,
        referencia_texto: novaInformacao.referencia_texto,
      };
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}
