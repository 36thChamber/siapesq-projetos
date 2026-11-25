import Joi from 'joi';
import { ListarArtigosResponse } from '../../../types/siapesq_types/Artigos-types';
import http_status from '../../../consts/http-status-enum';
import artigos from '../../../models/siapesq/Artigos';

type ListarArtigosQuery = {
  limit: number;
  offset: number;
};

const req_query_schema = Joi.object({
    limit: Joi.number().default(10).error(() => new Error("limit inválido")),
    offset: Joi.number().default(0).error(() => new Error("offset inválido"))
});

export default class ListandoArtigos {
    static async valida(query: ListarArtigosQuery) {
        try {
            await req_query_schema.validateAsync(query);
        }
        catch (err: any) {
            throw ({ message: err.message, status: http_status.BAD_REQUEST });
        }
    }

    static async executa(query: ListarArtigosQuery): Promise<ListarArtigosResponse> {
        try {
            const { limit, offset } = query;
            const { rows, count } = await artigos.findAndCountAll({ limit, offset });
            
            return {
                artigos: rows,
                total: count
            };
        }
        catch (err: any) {
            throw (err);
        }
    }
}