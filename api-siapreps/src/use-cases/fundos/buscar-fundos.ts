import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Fundos from "../../models/Fundos";
import {
  ListarFundosQueryRequest,
  ListarFundosResponse,
  toFundoResponse,
} from "../../types/fundos-types";
import { AppError } from "../../errors/app-error";

export default class BuscarFundosUseCase {
  static async valida(query: ListarFundosQueryRequest): Promise<ListarFundosQueryRequest> {
    const schema = Joi.object({
      limit: Joi.number().default(10),
      offset: Joi.number().default(0),
    });

    const { error, value } = schema.validate(query);

    if (error) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', error.details[0].message);
    }

    return value;
  }

  static async executa(query: ListarFundosQueryRequest): Promise<ListarFundosResponse> {
    const { limit, offset } = query;

    const { rows, count } = await Fundos.findAndCountAll({
      limit,
      offset,
      where: { ativo: true },
    });

    return {
      fundos: rows.map(toFundoResponse),
      total: count,
    };
  }
}