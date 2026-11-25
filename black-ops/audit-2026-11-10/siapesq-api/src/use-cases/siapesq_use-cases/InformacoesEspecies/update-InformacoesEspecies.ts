import Joi from "joi";
import informacoesEspecies from "../../../models/siapesq/InformacoesEspecies";
import {
  UpdateInformaçoesEspeciesBody,
  UpdateInformaçoesEspeciesResponse,
} from "../../../types/siapesq_types/InformaçoesEspecies-type";
import http_status from "../../../consts/http-status-enum";
const update_usuario_schema = Joi.object({
  id_informacoesespecies: Joi.string().error(new Error("id invalido")),
  id_especie: Joi.string().error(new Error("id da especie invalido")),
  tipo_informacao: Joi.string().error(
    new Error("Tipo de informcacao invalido")
  ),
  informacao: Joi.string().error(new Error("informcacao invalido")),
  descricao: Joi.string().error(new Error("Descrição inválida")),
  fonte_referencia: Joi.string().error(
    new Error("Fonte de referencia inválida")
  ),
  link_fonte: Joi.string().error(new Error("Link da fonte inválido")),
  referencia_texto: Joi.string().optional(),
  referencia_completa: Joi.string().optional(),
});
export default class UpdateInformacoesEspeciesUseCase {
  static async valida(body: UpdateInformaçoesEspeciesBody) {
    try {
      await update_usuario_schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
  static async executa(
    body: UpdateInformaçoesEspeciesBody,
    id_informacoesEspecies: number
  ): Promise<UpdateInformaçoesEspeciesResponse> {
    try {
      const novaInformacao = await informacoesEspecies.findByPk(
        id_informacoesEspecies
      );
      if (!novaInformacao) {
        throw {
          message: `informacoesEspecies(${id_informacoesEspecies}) não encontrado`,
          status: 404,
        };
      }
      await novaInformacao.update(body);
      return {
        id_informacaoespecies: novaInformacao.id_informacaoespecie,
        id_especie: novaInformacao.id_especie,
        tipo_informacao: novaInformacao.tipo_informacao,
        informacao: novaInformacao.informacao,
        fonte_referencia: novaInformacao.fonte_referencia,
        link_fonte: novaInformacao.link_fonte,
        referencia_texto: novaInformacao.referencia_texto,  
        referencia_completa: novaInformacao.referencia_completa,
        criado_em: novaInformacao.criado_em,
        atualizado_em: novaInformacao.atualizado_em,
        deletado_em: novaInformacao.deletado_em,
      };
    } catch (err) {
      throw err;
    }
  }
}
