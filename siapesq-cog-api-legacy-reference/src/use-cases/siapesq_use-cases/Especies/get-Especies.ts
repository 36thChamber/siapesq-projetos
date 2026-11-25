import Joi from "joi";
import http_status from "../../../consts/http-status-enum";
import Especies from "../../../models/siapesq/Especies";
import {
  GetEspecieParamsRequest,
  GetEspeciesResponse,
} from "../../../types/siapesq_types/Especies-types";
import informacoesEspecies from "../../../models/siapesq/InformacoesEspecies";
const req_params_schema = Joi.object({
  id: Joi.string()
    .required()
    .error(() => new Error("id da especie inválido")),
});
export default class GetEspecieUseCase {
  static async valida(params: GetEspecieParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
  static async executa(
    params: GetEspecieParamsRequest
  ): Promise<GetEspeciesResponse> {
    try {
      const { id } = params;
      const especie = await Especies.findByPk(id, {
        include: [
          {
            model: informacoesEspecies,
            as: "informacoesEspecies",
          },
        ],
      });
      if (!especie) {
        throw {
          message: `Especie ${id} não encontrado`,
          status: http_status.NOT_FOUND,
        };
      }
      return {
        id_especies: especie.id_especie,
        nome: especie.nome,
        nome_cientifico: especie.nome_cientifico,
        id_gruposespecies: especie.id_gruposespecies,
        pesquisador: especie.pesquisador,
        descricao: especie.descricao,
        criado_em: especie.criado_em,
        atualizado_em: especie.atualizado_em,
        deletado_em: especie.deletado_em,

        informacoes: especie.informacoesEspecies?.map((info) => ({
          id_informacaoespecie: info.id_informacaoespecie,
          tipo_informacao: info.tipo_informacao,
          informacao: info.informacao,
          fonte_referencia: info.fonte_referencia,
          link_fonte: info.link_fonte,
          criado_em: info.criado_em,
          atualizado_em: info.atualizado_em,
          deletado_em: info.deletado_em,
        })),
      };
    } catch (err) {
      throw err;
    }
  }
}
