import Joi from "joi";
import http_status from "../../../consts/http-status-enum";
import {
  GetInformacoesEspeciesParamsRequest,
  GetInformaçoesEspeciesResponse,
} from "../../../types/siapesq_types/InformaçoesEspecies-type";
import informacoesEspecies from "../../../models/siapesq/InformacoesEspecies";

const req_params_schema = Joi.object({
  id_informacaoespecies: Joi.string()
    .required()
    .error(() => new Error("id da informação inválido")),
});
export default class GetInformacoesEspeciesUseCase {
  static async valida(params: GetInformacoesEspeciesParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
  static async executa(
    params: GetInformacoesEspeciesParamsRequest
  ): Promise<GetInformaçoesEspeciesResponse> {
    try {
      const { id_informacaoespecies } = params;
      const novaInformacao = await informacoesEspecies.findByPk(
        id_informacaoespecies
      );
      if (!novaInformacao) {
        throw {
          message: `novaInformacao ${id_informacaoespecies} não encontrado`,
          status: http_status.NOT_FOUND,
        };
      }
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
    } catch (err) {
      throw err;
    }
  }
}
