import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Portos from "../../models/Portos";
import { GetPortoParamsRequest, GetPortoResponse, toPortoResponse } from "../../types/portos-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number().required().error(() => new Error("id do porto inválido")),
});

export default class BuscarPortoPorIdUseCase {
  static async valida(params: GetPortoParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(params: GetPortoParamsRequest): Promise<GetPortoResponse> {
    try {
      const { id } = params;
      const porto = await Portos.findByPk(id);
      if (!porto) {
        throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Porto ${id} não encontrado`);
      }
      return toPortoResponse(porto);
    } catch (err) {
      throw err;
    }
  }
}