import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import { ListarInformacoesEspeciesQueryRequest, ListarInformacoesEspeciesResponse } from '../../../types/siapesq_types/InformaçoesEspecies-type'
import informacoesEspecies from '../../../models/siapesq/InformacoesEspecies';
const req_query_schema = Joi.object({
    limit: Joi.number().default(10).error(() => new Error("limit inválido")),
    offset: Joi.number().default(0).error(() => new Error("offset inválido"))
})
export default class ListarInformacoesEspeciesUseCase {
    static async valida(query: ListarInformacoesEspeciesQueryRequest) {
        try {
            await req_query_schema.validateAsync(query)
        }
        catch (err: any) {
            throw ({ message: err.message, status: http_status.BAD_REQUEST })
        }
    }
    static async executa(query: ListarInformacoesEspeciesQueryRequest): Promise<ListarInformacoesEspeciesResponse> {
        try {
            const { limit, offset } = query
            const { rows, count } = await informacoesEspecies.findAndCountAll({ limit, offset })
            return {
                informacoesEspecies: rows,
                total: count
            }
        }
        catch (err) {
            throw (err)
        }
    }
}