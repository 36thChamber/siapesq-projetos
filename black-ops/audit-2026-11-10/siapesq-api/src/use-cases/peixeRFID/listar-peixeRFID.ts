import Joi from 'joi';
import http_status from '../../consts/http-status-enum';
import PeixeRFID from '../../models/PeixeRFID';
import { ListarPeixesRFIDQueryRequest, ListarPeixesRFIDResponse } from '../../types/peixeRFID-types';

const req_query_schema = Joi.object({
    limit: Joi.number().default(10).error(() => new Error("limit inválido")),
    offset: Joi.number().default(0).error(() => new Error("offset inválido"))
});

export default class ListarPeixesRFIDUseCase {
    static async valida(query: ListarPeixesRFIDQueryRequest) {
        try {
            await req_query_schema.validateAsync(query);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    static async executa(query: ListarPeixesRFIDQueryRequest): Promise<ListarPeixesRFIDResponse> {
        try {
            const { limit, offset } = query;
            const { rows, count } = await PeixeRFID.findAndCountAll({ limit, offset });
            return {
                peixesRFID: rows,
                total: count
            };
        } catch (err) {
            throw err;
        }
    }
}
