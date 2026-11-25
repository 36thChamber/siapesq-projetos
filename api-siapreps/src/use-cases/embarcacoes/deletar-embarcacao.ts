import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Embarcacoes from "../../models/Embarcacoes";
import {
  AtualizarEmbarcacaoResponse,
  GetEmbarcacaoParamsRequest,
  toEmbarcacaoResponse,
} from "../../types/embarcacoes-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number().required().error(() => new Error("id da embarcação inválido")),
});

export default class DeletarEmbarcacaoUseCase {
  static async valida(params: GetEmbarcacaoParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(params: GetEmbarcacaoParamsRequest): Promise<AtualizarEmbarcacaoResponse> {
    try {
      const { id } = params;
      const embarcacao = await Embarcacoes.findByPk(id);
      if (!embarcacao) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Embarcação ${id} não encontrada`);
      }

      await Embarcacoes.update(
        { ativo: false, deletado_em: new Date() },
        { where: { id }, fields: ["ativo", "deletado_em"] },
      );

      const embarcacaoAtualizada = await Embarcacoes.findByPk(id, { paranoid: false });
      if (!embarcacaoAtualizada) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Embarcação ${id} não encontrada`);
      }

      return toEmbarcacaoResponse(embarcacaoAtualizada);
    } catch (err) {
      throw err;
    }
  }
}