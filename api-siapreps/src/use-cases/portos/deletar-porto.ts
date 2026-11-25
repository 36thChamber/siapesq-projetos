import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Portos from "../../models/Portos";
import {
  AtualizarPortoResponse,
  GetPortoParamsRequest,
  toPortoResponse,
} from "../../types/portos-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number()
    .required()
    .error(() => new Error("id do porto inválido")),
});

export default class DeletarPortoUseCase {
  static async valida(params: GetPortoParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    params: GetPortoParamsRequest,
  ): Promise<AtualizarPortoResponse> {
    try {
      const { id } = params;
      const porto = await Portos.findByPk(id);
      if (!porto) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Porto ${id} não encontrado`);
      }

      await Portos.update(
        { ativo: false, deletado_em: new Date() },
        { where: { id }, fields: ["ativo", "deletado_em"] },
      );

      const portoAtualizado = await Portos.findByPk(id, { paranoid: false });
      if (!portoAtualizado) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Porto ${id} não encontrado`);
      }

      return toPortoResponse(portoAtualizado);
    } catch (err) {
      throw err;
    }
  }
}